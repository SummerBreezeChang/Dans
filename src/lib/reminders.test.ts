import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => { const c: any = { inputValidator: () => c, validator: () => c, handler: (fn: unknown) => fn }; return c; },
}));

import { leadText, reminderText } from './careSync.functions';
import { askRef, parseAskRef } from './linq.server';
import { todayInWeek } from './reminders.server';

describe('reminders and passes', () => {
  it('reminds in Summer\'s words', () => {
    expect(reminderText('Henry', 'Pick up prescriptions', '12:30 PM')).toBe("Henry, today at 12:30 PM you will pick up Maya's prescriptions. Are you still able to do it?");
  });
  it('tells the lead who passed and who is free', () => {
    expect(leadText('Summer Chang', 'Henry', 'Pick up prescriptions', { day: 3, time: '12:30 PM' }, 'Nancy'))
      .toBe("Summer, Henry can't pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM. Nancy is free then. Ask Nancy?");
  });
  it('says so when nobody is free', () => {
    expect(leadText('Summer', 'Henry', 'Ride to blood draw', { day: 2, time: '7:45 AM' }, undefined)).toContain("Nobody else is free then. It's open in Dans.");
  });
  it('knows which day of the week it is, in Pacific time', () => {
    expect(todayInWeek(new Date('2026-11-19T15:00:00Z'))).toEqual({ date: '2026-11-19', day: 3, hour: 7 });
    expect(todayInWeek(new Date('2026-11-17T03:00:00Z')).day).toBe(0);
  });
  it('remembers whether an ask went to a helper or to the lead', () => {
    expect(parseAskRef(askRef('task-3', 'henry', '+14155550100'))).toMatchObject({ taskId: 'task-3', personId: 'henry', kind: 'helper' });
    expect(parseAskRef(askRef('task-3', 'nancy', '+14155550100', 'lead'))).toMatchObject({ personId: 'nancy', kind: 'lead' });
  });
});

import { passedText } from './careSync.functions';
import { defaultPrefs, parsePrefs } from './notify';

describe('passes handled by Dans', () => {
  it('tells the lead who Dans already asked', () => {
    expect(passedText('Summer Chang', 'Henry', 'Pick up prescriptions', { day: 3, time: '12:30 PM' }, 'Nancy'))
      .toBe("Summer, Henry can't pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM. I asked Nancy.");
  });
  it('says so when nobody is free', () => {
    expect(passedText('Summer', 'Henry', 'Ride to blood draw', { day: 2, time: '7:45 AM' }, undefined)).toContain("It's open in Dans.");
  });
  it('asks the next person automatically unless told to check first', () => {
    expect(defaultPrefs).toEqual({ pass: 'auto', nobody: true, passed: false, note: true });
    expect(parsePrefs('{"pass":"check","nobody":false,"passed":true}')).toEqual({ pass: 'check', nobody: false, passed: true, note: true });
    expect(parsePrefs('not json')).toEqual(defaultPrefs);
    expect(parsePrefs('{"pass":"nonsense"}').pass).toBe('auto');
  });
});
