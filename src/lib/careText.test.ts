import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => { const c: any = { inputValidator: () => c, validator: () => c, handler: (fn: unknown) => fn }; return c; },
}));

import { careText, smsKey } from './careSync.functions';
import { routeText } from './linq.server';

describe('texts for a schedule change', () => {
  it('tells the owner the new day and time when a task moves', () => {
    expect(careText('moved', 'Henry', 'Ride to chemotherapy', { day: 4, time: '1:00 PM' }))
      .toBe('FirstCare+: Henry, plans changed. "Ride to chemotherapy" is now Friday at 1:00 PM. Reply "can\'t make it" if that no longer works.');
  });
  it('uses the new time for someone who is handed a moved task', () => {
    expect(careText('reassigned', 'Nancy', 'Meal after chemo', { day: 4, time: '6:00 PM' })).toContain('on Friday at 6:00 PM');
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
