import { careQuestion, smsKey, leadId } from './careSync.functions';
import { answerLine } from './careSync.functions';
import { applyAnswers, changeText, checkinAnswerLine, checkinQuestion, checkinTitle, parseEntry, sentTitle, weekStart, type Presets, type WeekAnswer } from './checkin';
import { matchWeek } from './weekPlan';
import { routeText, sendAsk } from './linq.server';
import { todayInWeek } from './reminders.server';
import type { CareTask, Caregiver, Category, Help, Slot } from './assignmentEngine';

type Db = { from: (t: string) => any };

export const siteUrl = () => process.env['DANS_URL'] ?? 'https://dans-support.vercel.app';
export const checkinLink = (id: string) => `${siteUrl()}/checkin/${id}`;

export const peopleFromRows = (rows: any[] | null): Caregiver[] =>
  (rows ?? []).map(c => ({ id: c.id, name: c.name, initials: '', role: 'Secondary Caregiver', visibility: 'Task-only', cap: c.cap, availability: c.availability, ...(c.phone ? { contact: c.phone } : {}), ...(c.helps ? { helps: c.helps as Help[] } : {}) }));

export const tasksFromRows = (rows: any[] | null): CareTask[] =>
  (rows ?? []).map(t => ({ id: t.id, title: t.title, category: t.category as Category, day: t.day, slot: t.slot as Slot, time: t.time, duration: 0, owner: t.owner ?? undefined, status: t.status as CareTask['status'], approved: true, published: t.published, notes: '', declinedBy: t.declined_by }));

export const presetsOf = (p: Caregiver): Presets => ({ helps: p.helps ?? null, availability: p.availability, cap: p.cap });

/** This week's answers, newest per person. */
export async function weekAnswers(db: Db, week: string) {
  const { data } = await db.from('care_activity').select('detail,created_at').eq('title', checkinTitle).order('created_at', { ascending: false }).limit(300);
  const out = new Map<string, WeekAnswer>();
  for (const r of data ?? []) {
    const a = parseEntry(r.detail);
    if (a && a.week === week && !out.has(a.person)) out.set(a.person, a);
  }
  return out;
}

export async function saveWeekAnswer(db: Db, a: WeekAnswer) {
  const { error } = await db.from('care_activity').insert({ title: checkinTitle, detail: JSON.stringify(a) });
  return !error;
}

export async function checkinWentOut(db: Db, week: string) {
  const { data } = await db.from('care_activity').select('id').eq('title', sentTitle).eq('detail', week).limit(1);
  return !!data?.length;
}

const thisWeek = (now: Date) => weekStart(todayInWeek(now).date);

/** The Monday text to every helper. Once per person per week. Nothing is sent when texting is off. */
export async function sendCheckins(now = new Date()) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const week = thisWeek(now);
  const [{ data: settings }, { data: cg }] = await Promise.all([db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(), db.from('care_caregivers').select('*')]);
  if (!settings?.live_sms) return { sent: 0, week, reason: 'texting is off' };
  let sent = 0;
  for (const p of peopleFromRows(cg).filter(x => x.id !== leadId)) {
    const route = routeText(p.contact, p.name);
    if (!route) continue;
    const r = await sendAsk(`checkin:${week}:${p.id}`, route.to, route.prefix + checkinQuestion(p.name, presetsOf(p)), checkinAnswerLine, week, p.id, 'checkin');
    if (r.ok) sent++;
  }
  if (sent) await db.from('care_activity').insert({ title: sentTitle, detail: week });
  return { sent, week };
}

/**
 * Matches the whole week from the database. If a check-in went out this week, only people who answered are used,
 * with this week's answers. Otherwise everyone's usual week is used. Tasks that already have someone are left alone.
 */
export async function matchThisWeek(now = new Date()) {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const week = thisWeek(now);
  const [{ data: settings }, { data: cg }, { data: rows }, answers, askedFor] = await Promise.all([
    db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(),
    db.from('care_caregivers').select('*'),
    db.from('care_tasks').select('*'),
    weekAnswers(db, week),
    checkinWentOut(db, week),
  ]);
  const people = applyAnswers(peopleFromRows(cg), answers, askedFor);
  const tasks = tasksFromRows(rows);
  const matched = matchWeek(tasks, people);
  const assigned = matched.filter(t => t.owner && !tasks.find(o => o.id === t.id)?.owner);
  const stamp = new Date().toISOString();
  for (const t of assigned) await db.from('care_tasks').update({ owner: t.owner ?? null, status: 'assigned', updated_at: stamp }).eq('id', t.id);
  const open = matched.filter(t => t.published && !t.owner && t.status !== 'done').length;
  if (assigned.length || open) await db.from('care_activity').insert({ title: 'Dans matched the week', detail: `${assigned.length} asked${open ? `, ${open} still need someone` : ''}.` });
  let texted = 0;
  if (settings?.live_sms) {
    for (const t of assigned) {
      const person = (cg ?? []).find((c: any) => c.id === t.owner);
      const route = person ? routeText(person.phone, person.name) : null;
      if (!person || !route) continue;
      const at = { day: t.day, time: t.time };
      const r = await sendAsk(smsKey(t.id, person.id, 'assigned', at), route.to, route.prefix + careQuestion('assigned', person.name, t.title, at), answerLine, t.id, person.id);
      if (r.ok) texted++;
    }
  }
  return { week, assigned: assigned.map(t => ({ id: t.id, owner: t.owner! })), open, texted, usedAnswers: askedFor };
}

export { changeText };

/**
 * Called by the daily run. Monday morning: the check-in goes out. Tuesday morning: the week is matched from the answers.
 * The schedule runs once a day at 7 AM Pacific, so Tuesday's match happens then, not at 9.
 */
export async function runWeeklyCycle(now = new Date()) {
  const { date, hour } = todayInWeek(now);
  if (hour < 7) return { step: 'too early' };
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (weekday === 1) return { step: 'check-in', ...(await sendCheckins(now)) };
  if (weekday === 2) {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    if (await checkinWentOut(db, weekStart(date))) return { step: 'match', ...(await matchThisWeek(now)) };
  }
  return { step: 'none today' };
}
