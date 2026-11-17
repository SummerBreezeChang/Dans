import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { helpKinds } from './join.functions';

// What the check-in page and Settings call. The logic is in checkin.server.ts.

const who = z.string().regex(/^[a-z]{2,20}$/);
const presets = z.object({
  helps: z.array(z.enum(helpKinds)).max(5).nullable(),
  availability: z.array(z.string().regex(/^[0-6]-(Morning|Afternoon|Evening)$/)).max(21),
  cap: z.number().int().min(1).max(7),
});

/** The person's usual week, and whether they have already answered this week. */
export const getCheckin = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ who }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { peopleFromRows, presetsOf, weekAnswers } = await import('./checkin.server');
    const { weekStart } = await import('./checkin');
    const { todayInWeek } = await import('./reminders.server');
    const { leadId } = await import('./careSync.functions');
    const { data: cg } = await db.from('care_caregivers').select('*').eq('id', data.who).limit(1);
    const person = peopleFromRows(cg)[0];
    if (!person || person.id === leadId) return null;
    const answered = (await weekAnswers(db, weekStart(todayInWeek().date))).get(person.id)?.answer ?? null;
    return { name: person.name.split(' ')[0] ?? person.name, presets: presetsOf(person), answered };
  });

/** This week's answer: the same as last week, a change, or "I can't help this week". */
export const saveCheckin = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ who, answer: z.enum(['same', 'changed', 'none']), presets: presets.optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { saveWeekAnswer } = await import('./checkin.server');
    const { weekStart } = await import('./checkin');
    const { todayInWeek } = await import('./reminders.server');
    const { leadId } = await import('./careSync.functions');
    if (data.who === leadId) return { ok: false };
    const { data: person } = await db.from('care_caregivers').select('id').eq('id', data.who).maybeSingle();
    if (!person) return { ok: false };
    const ok = await saveWeekAnswer(db, { person: data.who, week: weekStart(todayInWeek().date), answer: data.answer, ...(data.answer === 'changed' && data.presets ? { presets: data.presets } : {}) });
    return { ok };
  });

/** Summer starts the check-in by hand (the demo, or a week that needs one early). */
export const startCheckin = createServerFn({ method: 'POST' }).handler(async () => {
  const { sendCheckins } = await import('./checkin.server');
  return sendCheckins();
});

/** Matches the week from the database now. Used when Summer confirms the week, and by the Tuesday run. */
export const matchWeekNow = createServerFn({ method: 'POST' }).handler(async () => {
  const { matchThisWeek } = await import('./checkin.server');
  return matchThisWeek();
});
