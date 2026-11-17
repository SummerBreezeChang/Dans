import { answerLine, reminderText } from './careSync.functions';
import { routeText, sendAsk } from './linq.server';

/** The week Dans knows starts Monday, Nov 16, 2026. Returns today's place in it (0 = Monday) and the hour, Pacific time. */
export function todayInWeek(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const date = `${parts['year']}-${parts['month']}-${parts['day']}`;
  const day = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse('2026-11-16T00:00:00Z')) / 86400000);
  return { date, day, hour: Number(parts['hour']) };
}

/**
 * The morning-of reminder. One text per task happening today, to whoever has it, asking if they can still do it.
 * Safe to call more than once: each task is reminded at most once a day, and never before 7 AM Pacific.
 */
export async function sendReminders(now = new Date()) {
  const { date, day, hour } = todayInWeek(now);
  if (day < 0 || day > 6 || hour < 7) return { sent: 0, reason: day < 0 || day > 6 ? 'outside the week' : 'before 7 AM' };
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: settings }, { data: people }, { data: tasks }] = await Promise.all([
    db.from('care_settings').select('live_sms').eq('id', 1).maybeSingle(),
    db.from('care_caregivers').select('id,name,phone'),
    db.from('care_tasks').select('id,title,day,time,owner,status,published').eq('day', day),
  ]);
  if (!settings?.live_sms) return { sent: 0, reason: 'texting is off' };
  let sent = 0;
  for (const t of tasks ?? []) {
    if (!t.published || !t.owner || (t.status !== 'assigned' && t.status !== 'accepted')) continue;
    const person = people?.find(p => p.id === t.owner);
    const route = person ? routeText(person.phone, person.name) : null;
    if (!person || !route) continue;
    const r = await sendAsk(`remind:${t.id}:${person.id}:${date}`, route.to, route.prefix + reminderText(person.name, t.title, t.time), answerLine, t.id, person.id);
    if (r.ok) sent++;
  }
  return { sent };
}
