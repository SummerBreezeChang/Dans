import type { Category, Help } from './assignmentEngine';

// Maya's requests. She asks, Summer approves, then Dans assigns.
// A request is her note in the activity log. What Summer did with it is a second entry that points back at it.

export const noteTitle = 'Maya sent a note';
export const addedTitle = 'Maya request added';
export const declinedTitle = 'Maya request declined';

export interface ActivityRow { id: string; title: string; detail: string | null; created_at: string }
export type RequestStatus = 'waiting' | 'added' | 'declined';
export interface Request { id: string; text: string; status: RequestStatus; taskId?: string; at: string }

/** "note:<id>" or "note:<id>|task:<id>". */
export function resolutionDetail(noteId: string, taskId?: string) {
  return taskId ? `note:${noteId}|task:${taskId}` : `note:${noteId}`;
}

/** Every note, newest first, with what Summer did about it. */
export function deriveRequests(rows: ActivityRow[]): Request[] {
  const done = new Map<string, { status: RequestStatus; taskId?: string }>();
  for (const r of rows) {
    if (r.title !== addedTitle && r.title !== declinedTitle) continue;
    const m = /^note:([^|]+)(?:\|task:(.+))?$/.exec(r.detail ?? '');
    if (!m?.[1] || done.has(m[1])) continue;
    done.set(m[1], { status: r.title === addedTitle ? 'added' : 'declined', ...(m[2] ? { taskId: m[2] } : {}) });
  }
  return rows
    .filter(r => r.title === noteTitle && r.detail)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(r => {
      const d = done.get(r.id);
      return { id: r.id, text: r.detail ?? '', status: d?.status ?? 'waiting', ...(d?.taskId ? { taskId: d.taskId } : {}), at: r.created_at };
    });
}

const helpWords: [RegExp, Help][] = [
  [/meal|food|dinner|lunch|cook|soup/i, 'Meals'],
  [/ride|drive|driv|lift|take me/i, 'Rides'],
  [/prescription|pharmacy|pick ?up|medicine|groceries|errand/i, 'Pickups'],
  [/call|insurance|form|paperwork|appointment/i, 'Calls and paperwork'],
];
const dayWords = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const defaultTime: Record<Help, string> = { Meals: '6:00 PM', Rides: '9:00 AM', Pickups: '12:30 PM', 'At home': '10:00 AM', 'Calls and paperwork': '10:00 AM' };

/** A first guess at what Maya means, so Summer confirms with one tap. She can change any part. */
export function readRequest(text: string): { help: Help; day: number; time: string } {
  const help = helpWords.find(([re]) => re.test(text))?.[1] ?? 'At home';
  const dayIndex = dayWords.findIndex(d => new RegExp(`\\b${d}`, 'i').test(text));
  const t = /(\d{1,2})(?::(\d{2}))?\s?(am|pm)/i.exec(text);
  const time = t ? `${Number(t[1])}:${t[2] ?? '00'} ${t[3]?.toUpperCase()}` : defaultTime[help];
  return { help, day: dayIndex >= 0 ? dayIndex : 4, time };
}

/** A task title that reads right after "can you". */
export const requestTitle: Record<Help, string> = {
  Meals: 'Bring Maya a meal',
  Rides: "Ride to Maya's visit",
  Pickups: 'Pick up prescriptions',
  'At home': 'Sit with Maya',
  'Calls and paperwork': 'Make a call for Maya',
};

export const requestCategory: Record<Help, Category> = {
  Rides: 'Rides to & from Appointments',
  Meals: 'Meal Planning',
  Pickups: 'Medicine Pickup',
  'At home': 'At-Home Care',
  'Calls and paperwork': 'Follow-ups',
};

/** What Maya reads under her own note. */
export function statusLine(status: RequestStatus, who?: string) {
  if (status === 'declined') return 'Summer saw it.';
  if (status === 'added') return who ? `Summer added it. ${who} is on it.` : 'Summer added it. Dans is finding someone.';
  return 'Sent. Summer will see it.';
}
