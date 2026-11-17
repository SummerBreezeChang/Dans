import { describe, expect, it } from 'vitest';
import { initialPeople } from './careStore';
import { canHelp, type Caregiver } from './assignmentEngine';
import { demoTasks, fits, matchWeek, nextOpen, visitIds } from './weekPlan';

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

const helper = (id: string, availability: string[], cap = 1): Caregiver => ({ id, name: id, initials: id.slice(0, 2), role: 'Secondary Caregiver', visibility: 'Task-only', cap, availability, helps: ['Rides'] });

describe('matching the whole week', () => {
  it('gives every task to someone who does that help, is free then and is under their limit', () => {
    const week = demoTasks(visitIds, true);
    const matched = matchWeek(week, initialPeople);
    for (const t of matched.filter(x => x.owner)) {
      const person = initialPeople.find(p => p.id === t.owner)!;
      expect(person.availability).toContain(`${t.day}-${t.slot}`);
      expect(canHelp(person, t)).toBe(true);
      expect(t.status).toBe('assigned');
    }
    for (const p of initialPeople) expect(matched.filter(t => t.owner === p.id).length).toBeLessThanOrEqual(p.cap);
  });

  it('never gives a task to Summer, and leaves a task nobody can take open', () => {
    const matched = matchWeek(demoTasks(visitIds, true), initialPeople);
    expect(matched.some(t => t.owner === 'summer')).toBe(false);
    const nobody = matchWeek(demoTasks(['labs'], true), [helper('ana', [])]);
    expect(nobody.every(t => !t.owner)).toBe(true);
  });

  it('starts with the task the fewest people can take, so it is not left uncovered', () => {
    const morning = { ...demoTasks(['labs'], true)[0]!, id: 'a', day: 1, slot: 'Morning' as const, time: '8:00 AM' };
    const afternoon = { ...morning, id: 'b', slot: 'Afternoon' as const, time: '2:00 PM' };
    const both = helper('both', ['1-Morning', '1-Afternoon']);
    const morningOnly = helper('early', ['1-Morning']);
    const matched = matchWeek([morning, afternoon], [both, morningOnly]);
    expect(matched.find(t => t.id === 'b')!.owner).toBe('both');
    expect(matched.find(t => t.id === 'a')!.owner).toBe('early');
  });

  it('does not change a task that already has someone', () => {
    const [task] = demoTasks(['labs'], true);
    const taken = { ...task!, owner: 'nancy', status: 'accepted' as const };
    expect(matchWeek([taken], initialPeople)[0]).toMatchObject({ owner: 'nancy', status: 'accepted' });
  });

  it('uses the usual Monday for a task on the Monday after this week', () => {
    const next = { ...demoTasks(['labs'], true)[0]!, id: 'n', day: 7, slot: 'Morning' as const, time: '10:15 AM' };
    const monday = helper('monday', ['0-Morning']);
    expect(matchWeek([next], [monday])[0]!.owner).toBe('monday');
  });
});
