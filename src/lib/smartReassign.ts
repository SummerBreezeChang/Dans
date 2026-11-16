import { canAssign, canHelp, type CareTask, type Caregiver } from './assignmentEngine';

const UNAVAILABLE = /(not free|can'?t make it|cannot make it|can ?not make it|something came up|unavailable|not available|can'?t do it|won'?t make it|busy)/i;
export const isUnavailableMessage = (text: string) => UNAVAILABLE.test(text.replace(/[’‘]/g, "'"));

const load = (id: string, tasks: CareTask[]) => tasks.filter(t => t.owner === id && t.status !== 'done' && t.published).length;

/** Next upcoming open task owned by this caregiver (earliest day, then slot order). */
export function upcomingTask(ownerId: string, tasks: CareTask[]) {
  const order = { Morning: 0, Afternoon: 1, Evening: 2 } as const;
  return tasks.filter(t => t.owner === ownerId && (t.status === 'assigned' || t.status === 'accepted'))
    .sort((a, b) => a.day - b.day || order[a.slot] - order[b.slot])[0];
}

/** Lowest current load wins; caregivers available for the slot are preferred. Only people who do this kind of help. */
export function pickReplacement(task: CareTask, fromId: string, people: Caregiver[], tasks: CareTask[]) {
  const others = people.filter(p => p.id !== fromId && p.role !== 'Patient' && !task.declinedBy?.includes(p.id));
  const byLoad = (list: Caregiver[]) => [...list].sort((a, b) => load(a.id, tasks) - load(b.id, tasks))[0];
  return byLoad(others.filter(p => canAssign(p, task, tasks))) ?? byLoad(others.filter(p => canHelp(p, task)));
}
