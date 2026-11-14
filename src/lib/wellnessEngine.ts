import type { CareTask } from './assignmentEngine';

export type WellnessScenario = 'baseline' | 'decline' | 'urgent';
export type VitalKey = 'Sleep' | 'Heart rate' | 'Blood pressure' | 'Steps';
export type Risk = 'Normal' | 'Gradual Decline' | 'Urgent Alert';
export interface Reading { day: number; sleep: number; quality: number; heart: number; systolic: number; diastolic: number; steps: number }
export interface Insight { id: 'sleep' | 'cardio'; risk: Risk; title: string; detail: string; metrics: VitalKey[] }
export const wellnessScenarios = [
  { id: 'baseline', label: 'Steady Baseline' },
  { id: 'decline', label: '30-Day Sleep Decline' },
  { id: 'urgent', label: 'Urgent BP / Heart Rate Spike' },
] as const;
export const defaultSharing = { Sleep: true, Steps: true, 'Heart rate': true, 'Blood pressure': true };

/** Synthetic device-shaped samples, never measurements from a real wearable. */
export function generateReadings(scenario: WellnessScenario): Reading[] {
  return Array.from({ length: 30 }, (_, day) => {
    const wave = Math.sin(day * 1.7);
    const decline = scenario === 'decline';
    const urgent = scenario === 'urgent' && day === 29;
    return { day, sleep: Number((decline ? 8 - day * .09 : 7.5 + wave * .2).toFixed(1)),
      quality: Math.round(decline ? 92 - day * 1.3 : 88 + wave * 3),
      heart: urgent ? 104 : Math.round(66 + wave * 2),
      systolic: urgent ? 148 : Math.round(118 + wave * 3), diastolic: urgent ? 94 : Math.round(76 + wave * 2),
      steps: Math.round(5200 + wave * 600) };
  });
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
/** Coordination thresholds, not clinical diagnosis. Hidden metrics never drive shared alerts. */
export function analyzeWellness(rows: Reading[], sharing: Record<string, boolean>): Insight[] {
  const last = rows.at(-1);
  if (!last) return [];
  const insights: Insight[] = [];
  const elevated: VitalKey[] = [];
  if (sharing['Heart rate'] && (last.heart >= 100 || last.heart < 45)) elevated.push('Heart rate');
  if (sharing['Blood pressure'] && (last.systolic >= 140 || last.diastolic >= 90 || last.systolic < 90 || last.diastolic < 60)) elevated.push('Blood pressure');
  if (elevated.length) insights.push({ id: 'cardio', risk: 'Urgent Alert', title: 'Maya needs a prompt check-in',
    detail: elevated.map(key => key === 'Heart rate' ? `Resting heart rate ${last.heart} bpm` : `Blood pressure ${last.systolic}/${last.diastolic} mmHg`).join(' · '), metrics: elevated });
  if (sharing['Sleep'] && rows.length >= 14) {
    const first = rows.slice(0, 7); const recent = rows.slice(-7);
    const durationDrop = average(first.map(r => r.sleep)) - average(recent.map(r => r.sleep));
    const qualityDrop = average(first.map(r => r.quality)) - average(recent.map(r => r.quality));
    const weeks = Array.from({ length: Math.floor(rows.length / 7) }, (_, i) => rows.slice(i * 7, i * 7 + 7));
    const falling = weeks.every((week, i) => i === 0 || average(week.map(r => r.sleep)) < average((weeks[i - 1] ?? []).map(r => r.sleep)));
    if (falling && (durationDrop >= 1 || qualityDrop >= 15)) insights.push({ id: 'sleep', risk: 'Gradual Decline', title: 'Sleep is gradually declining',
      detail: `Last 7 nights vs first 7: ${durationDrop.toFixed(1)} fewer hours · quality down ${Math.round(qualityDrop)} points over ${rows.length} days.`, metrics: ['Sleep'] });
  }
  return insights;
}

export function wellnessTask(insight: Insight, day: number, slot: CareTask['slot']): CareTask {
  const urgent = insight.risk === 'Urgent Alert';
  return { id: `wellness-${insight.id}`, title: urgent ? 'Urgent: Check in on Maya — call the care nurse' : 'Priority: Check in on Maya — sleep trend',
    category: 'At-Home Care', day, slot, time: urgent ? 'As soon as possible' : 'Today', duration: 20,
    approved: true, published: true, status: 'unclaimed', notes: 'Wellness coordination check-in. Review Maya’s preferences and contact her care team if needed.', priority: urgent ? 'urgent' : 'high' };
}