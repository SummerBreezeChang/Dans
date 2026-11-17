import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => { const c: any = { inputValidator: () => c, validator: () => c, handler: (fn: unknown) => fn }; return c; },
}));

import type { Caregiver } from './assignmentEngine';
import { applyAnswers, changeText, checkinQuestion, helpPhrase, parseEntry, weekStart, type WeekAnswer } from './checkin';
import { askRef, parseAskRef } from './linq.server';
import { readReply } from './answers';

const person = (id: string, cap = 3, helps?: Caregiver['helps']): Caregiver => ({ id, name: id, initials: id.slice(0, 2), role: 'Secondary Caregiver', visibility: 'Task-only', cap, availability: ['0-Morning'], ...(helps ? { helps } : {}) });
const answers = (...a: WeekAnswer[]) => new Map(a.map(x => [x.person, x]));

describe('the Monday check-in', () => {
  it('finds the Monday of any day in the week', () => {
    expect(weekStart('2026-11-16')).toBe('2026-11-16');
    expect(weekStart('2026-11-19')).toBe('2026-11-16');
    expect(weekStart('2026-11-22')).toBe('2026-11-16');
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
  });

  it('asks in one line, with their usual week', () => {
    expect(checkinQuestion('Henry Lin', { helps: ['Rides', 'Meals'], availability: [], cap: 3 })).toBe('Henry, same as last week? Rides and meals, up to 3 a week.');
    expect(helpPhrase(null)).toBe('Anything');
    expect(helpPhrase(['Rides', 'Meals', 'At home'])).toBe('Rides, meals and help at home');
  });

  it('sends the page after a change', () => {
    expect(changeText('Henry Lin', 'https://x.test/checkin/henry')).toBe('No problem, Henry. Tell us what changed: https://x.test/checkin/henry');
  });

  it('reads CHANGE as a no, and keeps YES as a yes', () => {
    expect(readReply('CHANGE')).toBe('pass');
    expect(readReply('change it')).toBe('pass');
    expect(readReply('YES')).toBe('yes');
  });

  it('reads a saved answer, and ignores one it cannot read', () => {
    const a: WeekAnswer = { person: 'henry', week: '2026-11-16', answer: 'changed', presets: { helps: ['Rides'], availability: ['0-Morning'], cap: 2 } };
    expect(parseEntry(JSON.stringify(a))).toEqual(a);
    expect(parseEntry('{"person":"henry","week":"x","answer":"maybe"}')).toBeNull();
    expect(parseEntry('nonsense')).toBeNull();
  });

  it('uses everyone\'s usual week when no check-in went out', () => {
    expect(applyAnswers([person('a'), person('b')], answers(), false).map(p => p.id)).toEqual(['a', 'b']);
  });

  it('leaves out someone who cannot help, and someone who did not answer once a check-in went out', () => {
    const people = [person('a'), person('b'), person('c')];
    const out = applyAnswers(people, answers({ person: 'a', week: 'w', answer: 'same' }, { person: 'b', week: 'w', answer: 'none' }), true);
    expect(out.map(p => p.id)).toEqual(['a']);
  });

  it('uses what someone changed for this week only', () => {
    const changed: WeekAnswer = { person: 'a', week: 'w', answer: 'changed', presets: { helps: ['Meals'], availability: ['3-Evening'], cap: 1 } };
    const [a] = applyAnswers([person('a', 5, ['Rides'])], answers(changed), true);
    expect(a).toMatchObject({ cap: 1, availability: ['3-Evening'], helps: ['Meals'] });
  });

  it('remembers that an ask was a check-in, and which week', () => {
    expect(parseAskRef(askRef('2026-11-16', 'henry', '+14155550100', 'checkin'))).toMatchObject({ kind: 'checkin', taskId: '2026-11-16', personId: 'henry' });
    expect(parseAskRef(askRef('task-3', 'henry', '+14155550100'))).toMatchObject({ kind: 'helper' });
    expect(parseAskRef(askRef('task-3', 'nancy', '+14155550100', 'lead'))).toMatchObject({ kind: 'lead' });
  });
});
