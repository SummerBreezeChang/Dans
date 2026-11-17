import { canAssign, type CareTask, type Caregiver, type Category, type Slot } from './assignmentEngine';
import { byTime } from './week';

// The checklist Dans creates from a kept visit. Ids stay task-N so texts can send.
// Oncology is the Monday after this week, so its day is 7.

const leadId = 'summer';

type Row = { id: string; title: string; category: Category; day: number; slot: Slot; time: string; appointment: string };

const rows: Row[] = [
  { id: 'task-11', title: 'Ride there', category: 'Rides to & from Appointments', day: 2, slot: 'Morning', time: '7:45 AM', appointment: 'labs' },
  { id: 'task-12', title: 'Ride there', category: 'Rides to & from Appointments', day: 3, slot: 'Morning', time: '9:00 AM', appointment: 'chemo' },
  { id: 'task-13', title: 'Sit with Maya', category: 'At-Home Care', day: 3, slot: 'Morning', time: '10:00 AM', appointment: 'chemo' },
  { id: 'task-14', title: 'Pick up prescriptions', category: 'Medicine Pickup', day: 3, slot: 'Afternoon', time: '12:30 PM', appointment: 'chemo' },
  { id: 'task-15', title: 'Ride home, and stay an hour', category: 'Rides to & from Appointments', day: 3, slot: 'Afternoon', time: '1:00 PM', appointment: 'chemo' },
  { id: 'task-16', title: 'A meal that evening', category: 'Meal Planning', day: 3, slot: 'Evening', time: '6:00 PM', appointment: 'chemo' },
  { id: 'task-17', title: 'Ride there', category: 'Rides to & from Appointments', day: 7, slot: 'Morning', time: '10:15 AM', appointment: 'oncology' },
  { id: 'task-18', title: 'Questions for the doctor', category: 'Follow-ups', day: 7, slot: 'Morning', time: '10:30 AM', appointment: 'oncology' },
];

export const visitIds = ['labs', 'chemo', 'oncology'] as const;

const asTask = (row: Row, published: boolean): CareTask => ({
  id: row.id,
  title: row.title,
  category: row.category,
  day: row.day,
  slot: row.slot,
  time: row.time,
  duration: 30,
  appointment: row.appointment,
  status: 'unclaimed',
  approved: true,
  published,
  notes: '',
});

/** Open tasks for the visits Summer kept. Nothing is assigned yet. */
export function demoTasks(kept: readonly string[] = visitIds, published = false): CareTask[] {
  return rows.filter(row => kept.includes(row.appointment)).map(row => asTask(row, published));
}

/** The soonest task that still needs a person. */
export function nextOpen(tasks: CareTask[]) {
  return tasks.filter(t => t.published && !t.owner && t.status !== 'done').sort(byTime)[0];
}

const load = (id: string, tasks: CareTask[]) => tasks.filter(t => t.owner === id && t.status !== 'done' && t.published).length;

/** People who do this kind of help and are free then. The lead is never included. */
export function fits(task: CareTask, tasks: CareTask[], people: Caregiver[]) {
  return people
    .filter(p => p.id !== leadId && canAssign(p, task, tasks))
    .sort((a, b) => load(a.id, tasks) - load(b.id, tasks));
}

/**
 * Matches the whole week at once. The task with the fewest people who could take it goes first,
 * so the hard ones are not left for last. Each pick is the free person with the lightest load.
 * The lead is never picked. A task nobody can take stays open for her.
 */
export function matchWeek(tasks: CareTask[], people: Caregiver[]): CareTask[] {
  const out = tasks.map(t => ({ ...t }));
  const open = () => out.filter(t => t.published && !t.owner && t.status !== 'done');
  for (;;) {
    const options = open().map(task => ({ task, who: fits(task, out, people) })).filter(o => o.who.length);
    if (!options.length) break;
    options.sort((a, b) => a.who.length - b.who.length || byTime(a.task, b.task));
    const { task, who } = options[0]!;
    task.owner = who[0]!.id;
    task.status = 'assigned';
    task.updated = true;
  }
  return out;
}
