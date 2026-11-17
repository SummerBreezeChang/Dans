import type { Caregiver, Help } from './assignmentEngine';

// The Monday check-in: every helper is asked "same as last week?". Their answer is for this week only.
// Answers are saved as entries in the activity log, so no table is needed. The newest entry per person wins.

export const checkinTitle = 'Week check-in';
export const sentTitle = 'Check-in sent';
export const checkinAnswerLine = '\u{1F44D} reply YES / \u{1F44E} reply CHANGE';

/** A person's usual week: what they help with, when they are free, how many a week. */
export interface Presets { helps: Help[] | null; availability: string[]; cap: number }
export interface WeekAnswer { person: string; week: string; answer: 'same' | 'changed' | 'none'; presets?: Presets }

/** The Monday of the week a Pacific date falls in, as YYYY-MM-DD. */
export function weekStart(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const phrase: Record<Help, string> = { Rides: 'rides', Meals: 'meals', Pickups: 'pickups', 'At home': 'help at home', 'Calls and paperwork': 'calls and paperwork' };

/** "Rides and meals". Someone with no list helps with anything. */
export function helpPhrase(helps: Help[] | null | undefined) {
  if (!helps || !helps.length) return 'Anything';
  const list = helps.map(h => phrase[h]);
  const text = list.length === 1 ? list[0]! : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The Monday text. Wording to be approved by Summer. */
export const checkinQuestion = (name: string, presets: Presets) => `${name.split(' ')[0]}, same as last week? ${helpPhrase(presets.helps)}, up to ${presets.cap} a week.`;
/** What a helper who says CHANGE is sent, after a plain reply. */
export const changeText = (name: string, link: string) => `No problem, ${name.split(' ')[0]}. Tell us what changed: ${link}`;

export function parseEntry(detail: string | null | undefined): WeekAnswer | null {
  try {
    const j = JSON.parse(detail ?? '');
    if (typeof j?.person !== 'string' || typeof j?.week !== 'string' || !['same', 'changed', 'none'].includes(j.answer)) return null;
    const p = j.presets;
    const presets: Presets | undefined = p && Array.isArray(p.availability) && Number.isInteger(p.cap) ? { helps: Array.isArray(p.helps) ? p.helps : null, availability: p.availability, cap: p.cap } : undefined;
    return { person: j.person, week: j.week, answer: j.answer, ...(presets ? { presets } : {}) };
  } catch {
    return null;
  }
}

/**
 * This week's answers applied to the people. "I can't help this week" leaves someone out. "Changed" uses what they just said.
 * With requireAnswer on (a check-in went out), someone who has not answered is left out too.
 */
export function applyAnswers(people: Caregiver[], answers: Map<string, WeekAnswer>, requireAnswer: boolean): Caregiver[] {
  return people.flatMap(p => {
    const a = answers.get(p.id);
    if (!a) return requireAnswer ? [] : [p];
    if (a.answer === 'none') return [];
    if (a.answer === 'changed' && a.presets) {
      const { helps: _old, ...rest } = p;
      return [{ ...rest, availability: a.presets.availability, cap: a.presets.cap, ...(a.presets.helps ? { helps: a.presets.helps } : {}) }];
    }
    return [p];
  });
}
