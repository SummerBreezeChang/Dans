import { describe, expect, it } from 'vitest';
import { initialPeople } from './careStore';
import { demoTasks, fits, nextOpen } from './weekPlan';

describe('demo week', () => {
  it('builds a short list for the lab and the longer list for chemo', () => {
    const tasks = demoTasks(['labs', 'chemo']);
    expect(tasks.filter(t => t.appointment === 'labs')).toHaveLength(1);
    expect(tasks.filter(t => t.appointment === 'chemo')).toHaveLength(5);
    expect(tasks.every(t => !t.owner && !t.published)).toBe(true);
  });

  it('suggests someone who is free then, and never Summer', () => {
    const tasks = demoTasks(['labs'], true);
    const ride = tasks[0]!;
    const names = fits(ride, tasks, initialPeople).map(p => p.id);
    expect(names).not.toContain('summer');
    expect(names[0]).toBe('henry');
    expect(nextOpen(tasks)?.id).toBe(ride.id);
  });
});
