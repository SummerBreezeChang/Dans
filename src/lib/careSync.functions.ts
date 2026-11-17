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

type When = { day: number; time: string };

/** One text per person, task and event. A move is keyed by its new time, so each new time texts once. */
export function smsKey(taskId: string, personId: string, event: 'assigned' | 'reassigned' | 'moved', when: When, today = new Date().toISOString().slice(0, 10)) {
  return event === 'moved' ? `app:${taskId}:${personId}:moved:${when.day}-${when.time}` : `app:${taskId}:${personId}:${today}`;
}

const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** "Thu, Nov 19 at 12:30 PM". The demo week starts Monday, Nov 16. */
export const whenText = (when: When) => `${shortDays[when.day] ?? ''}, Nov ${16 + when.day} at ${when.time}`;

/** How to answer any ask: one tap, or one word. */
export const answerLine = '\u{1F44D} reply YES / \u{1F44E} reply PASS';

/** Turns a task title into what follows "can you". Rides and pickups name Maya, not the reason. */
export function askPhrase(title: string) {
  if (/^ride to /i.test(title)) return 'drive Maya to her appointment';
  if (/^pick up prescriptions/i.test(title)) return "pick up Maya's prescriptions";
  return title.charAt(0).toLowerCase() + title.slice(1);
}

/**
 * The text a caregiver receives. One question, a blank line, then the two answers.
 * Wording agreed with Summer on 2026-11-16 after testing on a phone.
 */
export function careText(event: 'assigned' | 'reassigned' | 'moved', name: string, title: string, when: When) {
  const first = name.split(' ')[0];
  const ask = event === 'moved'
    ? `${first}, plans changed. Can you still ${askPhrase(title)} ${whenText(when)}?`
    : `${first}, can you ${askPhrase(title)} ${whenText(when)}?`;
  return `${ask}\n\n${answerLine}`;
}

const changeSchema = z.object({
  changes: z.array(z.object({
    id: z.string().regex(/^(task-\d{1,4}|wellness-(sleep|cardio))$/),
    owner: z.string().max(80).nullable(),
    status: z.enum(['unclaimed', 'assigned', 'accepted', 'done']),
    event: z.enum(['assigned', 'reassigned', 'moved']),
    day: z.number().int().min(0).max(6).optional(),
    slot: z.enum(['Morning', 'Afternoon', 'Evening']).optional(),
    time: z.string().max(20).optional(),
  })).max(30),
});

/** Persists owner changes; texts the new owner only when Live SMS is on and they have a mapped number. */
export const syncAssignments = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => changeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { sendOnce, routeText } = await import('./linq.server');
    const [{ data: settings }, { data: people }, { data: tasks }] = await Promise.all([
      db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(),
      db.from('care_caregivers').select('id,name,phone'),
      db.from('care_tasks').select('id,title,day,time'),
    ]);
    let sent = 0;
    for (const c of data.changes) {
      const task = tasks?.find(t => t.id === c.id);
      if (!task) continue;
      const when = { day: c.day ?? task.day, time: c.time ?? task.time };
      await db.from('care_tasks').update({ owner: c.owner, status: c.status, ...(c.day !== undefined ? { day: c.day } : {}), ...(c.slot ? { slot: c.slot } : {}), ...(c.time ? { time: c.time } : {}), updated_at: new Date().toISOString() }).eq('id', c.id);
      const person = people?.find(p => p.id === c.owner);
      const route = person ? routeText(person.phone, person.name) : null;
      if (!settings?.live_sms || !person || !route) continue;
      const r = await sendOnce(smsKey(c.id, person.id, c.event, when), route.to, route.prefix + careText(c.event, person.name, task.title, when));
      if (r.ok) sent++;
    }
    return { sent };
  });
