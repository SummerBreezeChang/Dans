import { describe, expect, it } from 'vitest';
import { assignTasks, canAssign, canHelp, declineTask, helpNeeded } from './assignmentEngine';
import { pickReplacement } from './smartReassign';
import { generateCareChecklist, initialPeople } from './careStore';

const person = (id: string) => initialPeople.find(p => p.id === id)!;
const task = (id: string) => generateCareChecklist().find(t => t.id === id)!;

describe('what each person can help with', () => {
  it('maps a task to the kind of help it needs', () => {
    expect(helpNeeded(task('task-1'))).toBe('Rides');
    expect(helpNeeded(task('task-2'))).toBe('Meals');
    expect(helpNeeded(task('task-3'))).toBe('Pickups');
    expect(helpNeeded(task('task-6'))).toBe('At home');
    expect(helpNeeded(task('task-5'))).toBe('Calls and paperwork');
  });
  it('treats a person with no list as able to help with anything', () => {
    expect(canHelp(person('henry'), task('task-1'))).toBe(true);
    expect(canHelp({ helps: [] }, task('task-1'))).toBe(false);
  });
  it('never gives a ride to Mary, who is free but does not drive', () => {
    const ride = task('task-4'); // Wednesday morning, when Mary is free
    expect(person('mary').availability).toContain(`${ride.day}-${ride.slot}`);
    expect(canAssign(person('mary'), ride, generateCareChecklist())).toBe(false);
    const after = declineTask(generateCareChecklist(), initialPeople, 'task-4', 'henry');
    expect(after.find(t => t.id === 'task-4')?.owner).not.toBe('mary');
  });
  it('still gives Mary a meal she is free for', () => {
    const meal = { ...task('task-7'), day: 4, slot: 'Evening' as const };
    expect(canAssign(person('mary'), meal, generateCareChecklist())).toBe(true);
  });
  it('keeps every assigned task with someone who does that kind of help', () => {
    for (const t of assignTasks(generateCareChecklist(), initialPeople)) {
      if (t.owner) expect(canHelp(person(t.owner), t)).toBe(true);
    }
  });
  it('does not fall back to someone who cannot do the task when a text reply hands it on', () => {
    const tasks = generateCareChecklist();
    const ride = tasks.find(t => t.id === 'task-1')!;
    const onlyNonDrivers = initialPeople.filter(p => ['summer', 'mary', 'karen'].includes(p.id));
    expect(pickReplacement(ride, 'summer', onlyNonDrivers, tasks)).toBeUndefined();
  });
});
