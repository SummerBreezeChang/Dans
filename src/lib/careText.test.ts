import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => { const c: any = { inputValidator: () => c, validator: () => c, handler: (fn: unknown) => fn }; return c; },
}));

import { careText, smsKey } from './careSync.functions';
import { routeText } from './linq.server';

describe('texts for a schedule change', () => {
  it('asks in one question, then gives the two answers on their own line', () => {
    expect(careText('assigned', 'Henry Lin', 'Pick up prescriptions', { day: 3, time: '12:30 PM' }))
      .toBe("Henry, can you pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM?\n\n\u{1F44D} reply YES / \u{1F44E} reply PASS");
  });
  it('asks again with the new day and time when a task moves', () => {
    expect(careText('moved', 'Henry', 'Ride to chemotherapy', { day: 4, time: '1:00 PM' }))
      .toBe('Henry, plans changed. Can you still drive Maya to her appointment Fri, Nov 20 at 1:00 PM?\n\n\u{1F44D} reply YES / \u{1F44E} reply PASS');
  });
  it('uses the new time for someone who is handed a moved task', () => {
    expect(careText('reassigned', 'Nancy', 'Prepare a post-chemo meal', { day: 4, time: '6:00 PM' })).toContain('Nancy, can you prepare a post-chemo meal Fri, Nov 20 at 6:00 PM?');
  });
  it('texts again for a second move, but not twice for the same move', () => {
    const a = smsKey('task-3', 'srishti', 'moved', { day: 4, time: '1:00 PM' });
    expect(a).toBe(smsKey('task-3', 'srishti', 'moved', { day: 4, time: '1:00 PM' }));
    expect(a).not.toBe(smsKey('task-3', 'srishti', 'moved', { day: 5, time: '1:00 PM' }));
  });
  it('keeps a move text separate from an assignment text on the same day', () => {
    expect(smsKey('task-3', 'srishti', 'moved', { day: 4, time: '1:00 PM' }, '2026-11-15'))
      .not.toBe(smsKey('task-3', 'srishti', 'assigned', { day: 4, time: '1:00 PM' }, '2026-11-15'));
  });
});

describe('one-phone sandbox', () => {
  it('sends to the person when no sandbox number is set', () => {
    expect(routeText('+14155550142', 'Henry', undefined)).toEqual({ to: '+14155550142', prefix: '' });
  });
  it('skips a person with no phone when no sandbox number is set', () => {
    expect(routeText(null, 'Mary', undefined)).toBeNull();
  });
  it('sends every text to the sandbox phone, tagged with who it was for', () => {
    expect(routeText('+14155550142', 'Henry', '+14155550199')).toEqual({ to: '+14155550199', prefix: '[To Henry] ' });
    expect(routeText(null, 'Mary Lin', '(415) 555-0199')).toEqual({ to: '+14155550199', prefix: '[To Mary] ' });
  });
});
