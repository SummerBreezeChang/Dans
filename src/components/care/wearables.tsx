import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Moon, Footprints, Heart, Watch, Activity, ShieldCheck, AlertTriangle, Check, Plus, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageHeading } from './shared';
import { useCare } from '@/lib/careStore';
import { analyzeWellness, generateReadings, wellnessScenarios, type VitalKey, type Insight, type Reading } from '@/lib/wellnessEngine';
import maya from '@/assets/maya-lin.jpg';

const metrics: { key: VitalKey; label: string; unit: string; fields: (keyof Reading)[]; icon: typeof Heart; tone: string }[] = [
  { key: 'Sleep', label: 'Sleep duration & quality', unit: 'hours', fields: ['sleep'], icon: Moon, tone: 'sleep' },
  { key: 'Heart rate', label: 'Resting heart rate', unit: 'bpm', fields: ['heart'], icon: Heart, tone: 'heart' },
  { key: 'Blood pressure', label: 'Blood pressure', unit: 'mmHg', fields: ['systolic', 'diastolic'], icon: Activity, tone: 'pressure' },
  { key: 'Steps', label: 'Daily steps', unit: 'steps', fields: ['steps'], icon: Footprints, tone: 'steps' },
];
function Trend({ rows, fields, tone }: { rows: Reading[]; fields: (keyof Reading)[]; tone: string }) {
  return <div className={`vital-chart chart-${tone}`} role="img" aria-label={`${rows.length}-day ${tone} trend`}>
    <ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
      <XAxis dataKey="day" tickFormatter={day => `D${Number(day) + 1}`} interval="preserveStartEnd" minTickGap={30} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
      <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} axisLine={false} tickLine={false} />
      <Tooltip labelFormatter={day => `Day ${Number(day) + 1}`} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', borderRadius: 6, fontSize: 11 }} />
      {fields.map((field, i) => <Line key={field} type="monotone" dataKey={field} name={field} stroke={i ? 'var(--muted-foreground)' : 'var(--vital-line)'} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />)}
    </LineChart></ResponsiveContainer>
  </div>;
}
export function Wearables() {
  const { state, update, liveSms, createWellnessTask } = useCare();
  const [range, setRange] = useState<7 | 30>(7);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const attempted = useRef(new Set<string>());
  const scenario = state.wellnessScenario ?? 'baseline';
  const rows = useMemo(() => generateReadings(scenario), [scenario]);
  const insights = useMemo(() => analyzeWellness(rows, state.sharing), [rows, state.sharing]);
  const latest = rows.at(-1);
  const primary = state.role === 'Primary Caregiver';
  const patient = state.role === 'Patient';
  async function escalate(insight: Insight) {
    setBusy(insight.id);
    const message = await createWellnessTask(insight);
    setFeedback(f => ({ ...f, [insight.id]: message }));
    setBusy(null);
  }
  useEffect(() => {
    if (!primary) return;
    for (const insight of insights) {
      if (attempted.current.has(insight.id) || state.tasks.some(t => t.id === `wellness-${insight.id}`)) continue;
      attempted.current.add(insight.id);
      void escalate(insight);
    }
  }, [insights, primary, state.tasks]);
  if (!latest) return null;
  return <div className="wellness-page">
    <PageHeading eyebrow="MAYA’S WELLNESS" title="Wellness & vitals" description="Maya Lin · Daily rhythms and timely care check-ins" action={<Link to="/board" className="small-link">Care board <ArrowUpRight size={15} /></Link>} />
    <div className="wellness-feed-head"><img src={maya} alt="Maya Lin" width={48} height={48} /><div><h2>Maya Lin</h2><p>Scenario feed · No devices connected</p></div><div className="device-row"><span><Watch size={16} />Apple Watch</span><span><Activity size={16} />Oura Ring</span></div></div>
    <section className="wellness-scenarios" aria-label="Wellness scenarios"><span className="text-xs text-muted-foreground">Scenario</span><div className="filter-tabs">{wellnessScenarios.map(s => <Button key={s.id} variant="ghost" aria-pressed={scenario === s.id} className={scenario === s.id ? 'selected' : ''} disabled={!primary} onClick={() => { update(current => ({ ...current, wellnessScenario: s.id })); setFeedback({}); }}>{s.label}</Button>)}</div></section>
    <div className="wellness-overview"><div><span className={`risk-badge ${insights.some(i => i.risk === 'Urgent Alert') ? 'risk-urgent' : insights.length ? 'risk-decline' : 'risk-normal'}`}><Activity size={13} />{insights.some(i => i.risk === 'Urgent Alert') ? 'Urgent Alert' : insights.length ? 'Gradual Decline' : 'Normal'}</span><span className="text-xs text-muted-foreground">30-day analysis · Shared readings only</span></div><div className="view-toggle" aria-label="Trend period">{([7, 30] as const).map(n => <Button key={n} size="sm" variant="ghost" aria-pressed={range === n} className={range === n ? 'selected' : ''} onClick={() => setRange(n)}>{n}-Day</Button>)}</div></div>
    <div className="vitals-grid">{metrics.map(m => {
      const visible = patient || state.sharing[m.key];
      const insight = insights.find(i => i.metrics.includes(m.key));
      const value = m.key === 'Sleep' ? latest.sleep.toFixed(1) : m.key === 'Heart rate' ? latest.heart : m.key === 'Blood pressure' ? `${latest.systolic}/${latest.diastolic}` : latest.steps.toLocaleString();
      return <article className={`vital-card chart-${m.tone}`} key={m.key}><header><h3><m.icon size={16} />{m.label}</h3>{visible && <span className={`risk-badge ${insight?.risk === 'Urgent Alert' ? 'risk-urgent' : insight ? 'risk-decline' : 'risk-normal'}`}>{insight?.risk ?? 'Normal'}</span>}</header><div className="vital-value">{visible ? value : 'Not shared'}<small>{m.unit}</small></div>{visible ? <>
        <p className="vital-caption">{m.key === 'Sleep' ? `Sleep quality ${latest.quality}/100` : m.key === 'Blood pressure' ? 'Systolic / diastolic · Scenario measurement' : m.key === 'Heart rate' ? 'Resting baseline 66 bpm' : 'Daily movement'}</p>
        <Trend rows={rows.slice(-range)} fields={m.fields} tone={m.tone} />
        {m.key === 'Sleep' && <><div className="quality-label">Sleep quality / 100</div><Trend rows={rows.slice(-range)} fields={['quality']} tone="sleep" /></>}
      </> : <div className="unshared-vital"><ShieldCheck size={24} /><p>Not shared by Maya</p></div>}</article>;
    })}</div>
    <div className="wellness-bottom"><section><div className="section-title"><h2>Care insights</h2><span className="small-link">{liveSms ? 'Live SMS enabled' : 'SMS simulated'}</span></div>{insights.length ? insights.map(insight => <article className={`wellness-insight ${insight.risk === 'Urgent Alert' ? 'insight-urgent' : ''}`} key={insight.id}><div className="insight-heading"><AlertTriangle size={20} /><div><span className={`risk-badge ${insight.risk === 'Urgent Alert' ? 'risk-urgent' : 'risk-decline'}`}>{insight.risk}</span><h3>{insight.title}</h3></div></div><p>{insight.detail}</p><p>{insight.risk === 'Urgent Alert' ? 'Check on Maya promptly and contact her care nurse. If she has severe symptoms, contact emergency services.' : 'A supportive conversation and care-team review can help understand what changed.'}</p>{primary && <Button variant="outline" disabled={busy === insight.id} onClick={() => void escalate(insight)}><Plus size={14} />{busy === insight.id ? 'Adding check-in…' : 'Assign Check-in Task to Circle'}</Button>}{state.tasks.some(t => t.id === `wellness-${insight.id}`) && <Link to="/board" className="insight-board-link"><Check size={14} />Check-in on Care Board <ArrowUpRight size={13} /></Link>}<p role="status">{feedback[insight.id]}</p></article>) : <div className="wellness-normal"><ShieldCheck size={24} /><h3>No shared alerts detected</h3><p>Shared readings are within the coordination thresholds.</p></div>}</section>
    <section className="wellness-sharing"><h2><ShieldCheck size={18} />Maya decides what to share</h2><p className="text-xs text-muted-foreground mt-2">Wellness sharing is separate from hospital consent.</p>{metrics.map(m => <div className="toggle-row" key={m.key}><label htmlFor={`share-${m.key}`}>{m.label}</label><Switch id={`share-${m.key}`} checked={state.sharing[m.key] ?? false} disabled={!patient} onCheckedChange={checked => update(s => ({ ...s, sharing: { ...s.sharing, [m.key]: checked } }))} /></div>)}{!patient && <p className="text-xs text-muted-foreground mt-3">Only Maya can update her sharing preferences.</p>}</section></div>
    <p className="wellness-footer">Wellness insights support care coordination and are not a medical diagnosis</p>
  </div>;
}