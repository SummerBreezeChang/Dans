import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { leadId } from './careSync.functions';

// A helper joining from an invite. The invite names one person already in the circle;
// joining fills in what they can do, when they are free and how many tasks a week.

const who = z.string().regex(/^[a-z]{2,20}$/);
export const helpKinds = ['Rides', 'Pickups', 'Meals', 'At home', 'Calls and paperwork'] as const;

export const getInvite = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ who }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const [{ data: person }, { data: lead }] = await Promise.all([
      db.from('care_caregivers').select('id,name').eq('id', data.who).maybeSingle(),
      db.from('care_caregivers').select('name').eq('id', leadId).maybeSingle(),
    ]);
    if (!person || person.id === leadId) return null;
    return { name: person.name.split(' ')[0] ?? person.name, lead: lead?.name.split(' ')[0] ?? 'Your family' };
  });

const answers = z.object({
  who,
  helps: z.array(z.enum(helpKinds)).min(1).max(5),
  availability: z.array(z.string().regex(/^[0-6]-(Morning|Afternoon|Evening)$/)).min(1).max(21),
  cap: z.number().int().min(1).max(7),
});

export const saveHelper = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => answers.parse(d))
  .handler(async ({ data }) => {
    if (data.who === leadId) return { ok: false };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: person } = await db.from('care_caregivers').select('id,name').eq('id', data.who).maybeSingle();
    if (!person) return { ok: false };
    const { error } = await db.from('care_caregivers').update({ helps: [...new Set(data.helps)], availability: [...new Set(data.availability)], cap: data.cap }).eq('id', data.who);
    if (!error) await db.from('care_activity').insert({ title: `${person.name.split(' ')[0]} joined`, detail: `${person.name} can help with ${data.helps.join(', ').toLowerCase()}, up to ${data.cap} a week.` });
    return { ok: !error };
  });
