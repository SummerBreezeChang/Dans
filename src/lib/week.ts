import { canAssign, days, helpNeeded, type CareTask, type Caregiver, type Help } from './assignmentEngine';

// The week as Summer reads it: visits, the tasks that hang off them, and who has each one.

export interface Visit { id: string; title: string; short: string; day: number; date: string; when: string; time: string; length: string; place: string; movedFrom?: string }

export const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekLabel = 'Nov 16 to 22';

export function visitsFor(rescheduled: boolean): Visit[] {
  const chemo: Visit = rescheduled
    ? { id: 'chemo', title: 'Chemotherapy infusion', short: 'Chemotherapy', day: 4, date: 'Fri 20', when: 'Friday, Nov 20', time: '2:00 PM', length: '3 hours', place: 'Kaiser infusion center', movedFrom: 'Thursday, 10:00 AM' }
    : { id: 'chemo', title: 'Chemotherapy infusion', short: 'Chemotherapy', day: 3, date: 'Thu 19', when: 'Thursday, Nov 19', time: '10:00 AM', length: '3 hours', place: 'Kaiser infusion center' };
  const labs: Visit = { id: 'labs', title: 'Lab blood draw', short: 'Lab blood draw', day: 2, date: 'Wed 18', when: 'Wednesday, Nov 18', time: '8:30 AM', length: '30 min', place: 'Kaiser laboratory, 2nd floor' };
  const oncology: Visit = { id: 'oncology', title: 'Oncology follow-up', short: 'Oncology follow-up', day: 7, date: 'Mon 23', when: 'Monday, Nov 23', time: '11:00 AM', length: '45 min', place: 'Kaiser oncology clinic' };
  return [labs, chemo, oncology].sort((a, b) => a.day - b.day);
}

/** Minutes since midnight for a time like "12:30 PM". */
export function minutes(time: string) {
  const m = /^(\d+):(\d+)\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return 0;
  const h = Number(m[1]) % 12 + (m[3]?.toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}

export const byTime = (a: CareTask, b: CareTask) => a.day - b.day || minutes(a.time) - minutes(b.time);

export const firstName = (p: Caregiver | undefined) => p?.name.split(' ')[0] ?? 'Someone';

export interface Pill { label: string; tone: 'mint' | 'peach' | 'plain' | 'quiet' }

export function pillFor(task: CareTask, people: Caregiver[], me: string): Pill {
  if (task.status === 'done') return { label: 'Done', tone: 'quiet' };
  if (!task.owner) return { label: 'Open', tone: 'peach' };
  if (task.owner === me) return { label: 'You', tone: 'mint' };
  const name = firstName(people.find(p => p.id === task.owner));
  return task.status === 'assigned' ? { label: `${name}, asked`, tone: 'plain' } : { label: name, tone: 'mint' };
}

/** The person to ask first: free then, does this kind of help, under their limit, lightest load. */
export function suggest(task: CareTask, tasks: CareTask[], people: Caregiver[], me: string) {
  const load = (id: string) => tasks.filter(t => t.owner === id && t.status !== 'done' && t.published).length;
  return people.filter(p => p.id !== me && canAssign(p, task, tasks)).sort((a, b) => load(a.id) - load(b.id))[0];
}

const does: Record<Help, string> = { Rides: 'drives', Meals: 'cooks', Pickups: 'does pickups', 'At home': 'helps at home', 'Calls and paperwork': 'handles calls' };
export const doesWhat = (task: CareTask) => does[helpNeeded(task)];
export const helpWord = (task: CareTask) => helpNeeded(task);

const words = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
export const numberWord = (n: number) => words[n] ?? String(n);

export function list(names: string[]) {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Thu 12:30 PM". One short form for every day and time on screen. */
export const shortWhen = (task: Pick<CareTask, 'day' | 'time'>) => `${days[task.day] ?? ''} ${task.time}`.trim();
export const visitWhen = (v: Visit) => `${v.day > 6 ? 'Next ' : ''}${v.date.split(' ')[0]} ${v.time}`;

const shortFor: Partial<Record<Help, string>> = { Rides: 'Ride there', Pickups: 'Prescriptions', Meals: 'Meal after' };
/** Under a visit heading the visit name is already said, so the task can be brief. */
export const shortTitle = (task: CareTask) => (task.appointment ? shortFor[helpNeeded(task)] ?? task.title : task.title);

/** A task as Maya reads it: what someone is doing for her. */
export function forMaya(title: string) {
  if (/^ride to /i.test(title)) return 'Driving you to your visit';
  if (/prescription/i.test(title)) return 'Picking up your prescriptions';
  if (/meal/i.test(title)) return 'Bringing a meal';
  return title;
}

/** "Thu 12:30 PM", and "Next Mon 11:00 AM" for the day after this week. */
export const whenLabel = (day: number, time: string) => `${day > 6 ? 'Next ' : ''}${days[day % 7] ?? ''} ${time}`.trim();

/** What the week is called. The patient's own week reads "Your week". */
export const weekTitle = (owner: 'patient' | 'caretaker' | undefined) => (owner === 'patient' ? 'Your week' : "Maya's week");
export const weekPossessive = (owner: 'patient' | 'caretaker' | undefined) => (owner === 'patient' ? 'your' : "Maya's");

/** "Wed 18", and "Mon 23" for the day after this week. */
export const dayHeading = (day: number) => `${days[day % 7] ?? ''} ${16 + day}`;
