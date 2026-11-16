export type Slot = 'Morning' | 'Afternoon' | 'Evening';
export type Role = 'Patient' | 'Primary Caregiver' | 'Secondary Caregiver';
export type Category = 'Appointment Management' | 'Follow-ups' | 'At-Home Care' | 'Meal Planning' | 'Medicine Pickup' | 'Rides to & from Appointments' | 'Emergency Contacts';
export type Help = 'Rides' | 'Meals' | 'Pickups' | 'At home' | 'Calls and paperwork';
export const helpKinds: Help[] = ['Rides', 'Meals', 'Pickups', 'At home', 'Calls and paperwork'];
const helpFor: Record<Category, Help> = { 'Rides to & from Appointments': 'Rides', 'Meal Planning': 'Meals', 'Medicine Pickup': 'Pickups', 'At-Home Care': 'At home', 'Appointment Management': 'Calls and paperwork', 'Follow-ups': 'Calls and paperwork', 'Emergency Contacts': 'Calls and paperwork' };
/** What kind of help a task needs. */
export const helpNeeded = (task: Pick<CareTask, 'category'>) => helpFor[task.category];
/** A person with no list can help with anything. An empty list means nothing. */
export const canHelp = (person: Pick<Caregiver, 'helps'>, task: Pick<CareTask, 'category'>) => !person.helps || person.helps.includes(helpNeeded(task));
export interface Caregiver { id: string; name: string; initials: string; role: Role; visibility: 'Task-only' | 'Full medical details'; cap: number; availability: string[]; contact?: string; helps?: Help[] }
export interface CareTask { id: string; title: string; category: Category; day: number; slot: Slot; time: string; duration: number; appointment?: string | undefined; owner?: string | undefined; status: 'unclaimed' | 'assigned' | 'accepted' | 'done'; approved: boolean; published: boolean; updated?: boolean; notes: string; declinedBy?: string[]; priority?: 'high' | 'urgent' }
export const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const slots: Slot[] = ['Morning', 'Afternoon', 'Evening'];
export function canAssign(person: Caregiver, task: CareTask, tasks: CareTask[]) {
  return person.role !== 'Patient' && canHelp(person, task) && person.availability.includes(`${task.day}-${task.slot}`) && tasks.filter(t => t.owner === person.id && t.status !== 'done' && t.published).length < person.cap && !task.declinedBy?.includes(person.id);
}
export function assignTasks(tasks: CareTask[], people: Caregiver[]): CareTask[] {
  const result = tasks.map(t => ({ ...t }));
  for (const task of result) {
    if (task.owner || !task.published || task.status === 'done') continue;
    const eligible = people.filter(p => canAssign(p, task, result)).sort((a,b) => result.filter(t => t.owner === a.id && t.status !== 'done').length - result.filter(t => t.owner === b.id && t.status !== 'done').length);
    if (eligible[0]) { task.owner = eligible[0].id; task.status = 'assigned'; }
  }
  return result;
}
export function declineTask(tasks: CareTask[], people: Caregiver[], id: string, owner: string) {
  return assignTasks(tasks.map(t => t.id === id ? { ...t, owner: undefined, status: 'unclaimed' as const, updated: true, declinedBy: [...(t.declinedBy ?? []), owner] } : t), people);
}
export function rescheduleTasks(tasks: CareTask[], people: Caregiver[]) {
  const changed = tasks.map(t => {
    if (t.appointment !== 'chemo') return { ...t };
    const moved = { ...t, day: 4, slot: (t.category === 'Meal Planning' ? 'Evening' : 'Afternoon') as Slot, time: t.category === 'Meal Planning' ? '6:00 PM' : t.category === 'Medicine Pickup' ? '4:30 PM' : '1:00 PM', updated: true };
    const owner = people.find(p => p.id === moved.owner);
    if (owner && !owner.availability.includes(`${moved.day}-${moved.slot}`) && moved.status !== 'done') { moved.owner = undefined; moved.status = 'unclaimed'; }
    return moved;
  });
  return assignTasks(changed, people);
}

export function canViewMedical(role: Role, person: Caregiver | undefined) {
 return role === 'Patient' || role === 'Primary Caregiver' || person?.visibility === 'Full medical details';
}
