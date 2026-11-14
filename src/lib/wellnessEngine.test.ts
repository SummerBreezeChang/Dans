import { describe, expect, it } from 'vitest';
import { analyzeWellness, defaultSharing, generateReadings, wellnessTask } from './wellnessEngine';
describe('Wellness coordination rules', () => {
  it('enables heart rate and blood pressure sharing by default', () => {
    expect(defaultSharing['Heart rate']).toBe(true); expect(defaultSharing['Blood pressure']).toBe(true);
  });
  it('keeps a steady 30-day baseline normal', () => {
    expect(analyzeWellness(generateReadings('baseline'), defaultSharing)).toEqual([]);
  });
  it('detects a gradual 30-day sleep decline', () => {
    expect(analyzeWellness(generateReadings('decline'), defaultSharing)).toEqual([expect.objectContaining({ id: 'sleep', risk: 'Gradual Decline' })]);
  });
  it('flags the requested 148/94 BP reading', () => {
    const rows = generateReadings('urgent'); expect(rows.at(-1)?.systolic).toBe(148); expect(rows.at(-1)?.diastolic).toBe(94);
    expect(analyzeWellness(rows, { 'Blood pressure': true })[0]?.metrics).toEqual(['Blood pressure']);
  });
  it('flags the requested 104 bpm heart rate', () => {
    const rows = generateReadings('urgent'); expect(rows.at(-1)?.heart).toBe(104);
    expect(analyzeWellness(rows, { 'Heart rate': true })[0]?.risk).toBe('Urgent Alert');
  });
  it('never escalates unshared measurements', () => {
    expect(analyzeWellness(generateReadings('urgent'), { Sleep: true, Steps: true })).toEqual([]);
    expect(analyzeWellness(generateReadings('decline'), { Sleep: false })).toEqual([]);
  });
  it('requires at least 14 days for a gradual decline', () => {
    expect(analyzeWellness(generateReadings('decline').slice(-7), defaultSharing)).toEqual([]);
  });
  it('creates an urgent board task with a deterministic identifier', () => {
    const insight = analyzeWellness(generateReadings('urgent'), defaultSharing)[0]; if (!insight) throw new Error('Missing alert');
    expect(wellnessTask(insight, 5, 'Evening')).toMatchObject({ id: 'wellness-cardio', priority: 'urgent', published: true, day: 5, slot: 'Evening' });
  });
});