import { describe, expect, it } from 'vitest';
import { isUnavailableMessage, pickReplacement, upcomingTask } from './smartReassign';
import { generateCareChecklist, initialPeople } from './careStore';

describe('SMS smart reassignment', () => {
  it('recognises unavailable replies', () => {
    for (const t of ['I am not free', "Sorry can't make it", 'Something came up']) expect(isUnavailableMessage(t)).toBe(true);
    expect(isUnavailableMessage('Sounds good, see you')).toBe(false);
  });
  it("finds Priya's earliest open task", () => {
    expect(upcomingTask('priya', generateCareChecklist())?.id).toBe('task-4');
  });
  it('never reassigns back to the sender and picks the lowest load', () => {
    const tasks = generateCareChecklist();
    const task = tasks.find(t => t.id === 'task-2')!;
    const next = pickReplacement(task, 'priya', initialPeople, tasks);
    expect(next?.id).not.toBe('priya');
    expect(next?.id).toBe('marcus');
  });
});
