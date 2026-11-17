import { describe, expect, it } from 'vitest';
import { addedTitle, declinedTitle, deriveRequests, noteTitle, readRequest, resolutionDetail, statusLine } from './requests';

const note = (id: string, text: string, at: string) => ({ id, title: noteTitle, detail: text, created_at: at });

describe('deriveRequests', () => {
  it('lists notes newest first and marks them waiting', () => {
    const r = deriveRequests([note('a', 'A meal on Friday', '2026-11-17T10:00:00Z'), note('b', 'A ride', '2026-11-17T11:00:00Z')]);
    expect(r.map(x => x.id)).toEqual(['b', 'a']);
    expect(r.every(x => x.status === 'waiting')).toBe(true);
  });
  it('reads what Summer did, and which task it became', () => {
    const r = deriveRequests([
      note('a', 'A meal on Friday', '2026-11-17T10:00:00Z'),
      note('b', 'Company', '2026-11-17T11:00:00Z'),
      { id: 'x', title: addedTitle, detail: resolutionDetail('a', 'task-42'), created_at: '2026-11-17T12:00:00Z' },
      { id: 'y', title: declinedTitle, detail: resolutionDetail('b'), created_at: '2026-11-17T12:30:00Z' },
    ]);
    expect(r.find(x => x.id === 'a')).toMatchObject({ status: 'added', taskId: 'task-42' });
    expect(r.find(x => x.id === 'b')).toMatchObject({ status: 'declined' });
  });
  it('ignores empty notes and unrelated entries', () => {
    expect(deriveRequests([{ id: 'z', title: 'Henry said yes', detail: 'x', created_at: '2026-11-17T10:00:00Z' }, { id: 'e', title: noteTitle, detail: null, created_at: '2026-11-17T10:00:00Z' }])).toEqual([]);
  });
});

describe('readRequest', () => {
  it('reads kind, day and time from her words', () => {
    expect(readRequest('A meal on Friday')).toEqual({ help: 'Meals', day: 4, time: '6:00 PM' });
    expect(readRequest('Can someone drive me Wed at 8:30 am')).toEqual({ help: 'Rides', day: 2, time: '8:30 AM' });
    expect(readRequest('Pick up my prescription on Saturday')).toEqual({ help: 'Pickups', day: 5, time: '12:30 PM' });
  });
  it('falls back to company, Friday and a sensible time', () => {
    expect(readRequest('Some company would be nice')).toEqual({ help: 'At home', day: 4, time: '10:00 AM' });
  });
});

describe('statusLine', () => {
  it('says what happened to her request', () => {
    expect(statusLine('waiting')).toBe('Sent. Summer will see it.');
    expect(statusLine('declined')).toBe('Summer saw it.');
    expect(statusLine('added')).toBe('Summer added it. Dans is finding someone.');
    expect(statusLine('added', 'Mary')).toBe('Summer added it. Mary is on it.');
  });
});
