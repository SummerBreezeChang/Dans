import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const getCareSync = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [t, a, s] = await Promise.all([
    db.from('care_tasks').select('id,title,day,slot,time,published,owner,status,declined_by,updated_at'),
    db.from('care_activity').select('id,title,detail,created_at').order('created_at', { ascending: false }).limit(20),
    db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(),
  ]);
  return { tasks: t.data ?? [], activity: a.data ?? [], liveSms: s.data?.live_sms ?? true };
});

export const setLiveSms = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ live: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    await db.from('care_settings').update({ live_sms: data.live }).eq('id', 1);
    return { liveSms: data.live };
  });

const changeSchema = z.object({
  changes: z.array(z.object({
    id: z.string().regex(/^(task-\d{1,4}|wellness-(sleep|cardio))$/),
    owner: z.string().max(80).nullable(),
    status: z.enum(['unclaimed', 'assigned', 'accepted', 'done']),
    event: z.enum(['assigned', 'reassigned']),
  })).max(30),
});

/** Persists owner changes; texts the new owner only when Live SMS is on and they have a mapped number. */
export const syncAssignments = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => changeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { sendOnce } = await import('./linq.server');
    const [{ data: settings }, { data: people }, { data: tasks }] = await Promise.all([
      db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(),
      db.from('care_caregivers').select('id,name,phone'),
      db.from('care_tasks').select('id,title,day,time'),
    ]);
    let sent = 0;
    for (const c of data.changes) {
      const task = tasks?.find(t => t.id === c.id);
      if (!task) continue;
      await db.from('care_tasks').update({ owner: c.owner, status: c.status, updated_at: new Date().toISOString() }).eq('id', c.id);
      const person = people?.find(p => p.id === c.owner);
      if (!settings?.live_sms || !person?.phone) continue;
      const day = new Date().toISOString().slice(0, 10);
      const r = await sendOnce(`app:${c.id}:${person.id}:${day}`, person.phone,
        `FirstCare+: ${person.name.split(' ')[0]}, you've been ${c.event} "${task.title}" on ${days[task.day]} at ${task.time}. Reply "can't make it" if something comes up.`);
      if (r.ok) sent++;
    }
    return { sent };
  });
