import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Help } from '@/lib/assignmentEngine';
import { getInvite, helpKinds, saveHelper } from '@/lib/join.functions';
import { KindIcon } from './parts';

// A helper joins from an invite link. One question per screen. Drawn in Paper, "Dans · mobile flow", A1 to A5.

const about: Record<Help, string> = {
  Rides: 'To and from visits',
  Pickups: 'Prescriptions and errands',
  Meals: 'Cook or drop off food',
  'At home': 'Tidying, laundry, small things',
  'Calls and paperwork': 'Scheduling, insurance, forms',
};
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const slots = ['Morning', 'Afternoon', 'Evening'] as const;

export function Check({ on }: { on: boolean }) {
  return (
    <span className={on ? 'c-check is-on' : 'c-check'} aria-hidden="true">
      {on && <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg>}
    </span>
  );
}

export function Join({ who }: { who: string }) {
  const [invite, setInvite] = useState<{ name: string; lead: string } | null | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [helps, setHelps] = useState<Help[]>([]);
  const [free, setFree] = useState<string[]>([]);
  const [cap, setCap] = useState(3);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => { getInvite({ data: { who } }).then(setInvite).catch(() => setInvite(null)); }, [who]);

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  const finish = async () => {
    setSaving(true); setFailed(false);
    try {
      const r = await saveHelper({ data: { who, helps, availability: free, cap } });
      if (r.ok) setStep(4); else setFailed(true);
    } catch { setFailed(true); }
    setSaving(false);
  };

  if (invite === undefined) return <div className="c-join" aria-busy="true" />;
  if (invite === null) return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">This invite has ended</h1>
        <p className="c-body">Ask the person who sent it for a new link.</p>
      </div>
    </div>
  );

  const top = (n: number) => (
    <div className="c-step">
      <button type="button" className="c-link" onClick={() => setStep(step - 1)}>Back</button>
      <span className="c-eyebrow">{n} of 3</span>
    </div>
  );

  if (step === 0) return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <span className="c-eyebrow">{invite.lead} invited you</span>
        <h1 className="c-title c-title-big">Help Maya this week?</h1>
        <p className="c-body">{invite.lead} is organizing the people who want to help.</p>
        <div className="c-soft">
          <strong>Three quick questions</strong>
          <p>What you can do, when you're free, and how many a week. You only do what you say yes to.</p>
        </div>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={() => setStep(1)}>I'd like to help</button>
        <Link to="/" className="c-link c-center">Not right now</Link>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="c-join">
      <div className="c-join-top">
        {top(1)}
        <h1 className="c-title c-title-big">What can you do?</h1>
        <p className="c-body">You'll only be asked for these.</p>
        <div className="c-picks">
          {helpKinds.map(k => {
            const on = helps.includes(k);
            return (
              <button type="button" key={k} className={on ? 'c-pick is-on' : 'c-pick'} aria-pressed={on} onClick={() => setHelps(toggle(helps, k))}>
                <span className="c-tile c-pick-tile"><KindIcon help={k} /></span>
                <span className="c-stack c-grow"><strong>{k}</strong><small>{about[k]}</small></span>
                <Check on={on} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!helps.length} onClick={() => setStep(2)}>{helps.length ? `Continue with ${helps.length}` : 'Pick at least one'}</button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="c-join">
      <div className="c-join-top">
        {top(2)}
        <h1 className="c-title c-title-big">When are you free?</h1>
        <p className="c-body">A rough week is enough.</p>
        <div className="c-week" role="group" aria-label="Times you are usually free">
          <div className="c-week-row" aria-hidden="true"><span className="c-week-day" />{slots.map(s => <span key={s} className="c-week-head">{s}</span>)}</div>
          {dayNames.map((d, i) => (
            <div className="c-week-row" key={d}>
              <span className="c-week-day">{d}</span>
              {slots.map(s => {
                const key = `${i}-${s}`; const on = free.includes(key);
                return <button type="button" key={s} className={on ? 'c-cell is-on' : 'c-cell'} aria-pressed={on} aria-label={`${d} ${s.toLowerCase()}`} onClick={() => setFree(toggle(free, key))} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!free.length} onClick={() => setStep(3)}>{free.length ? `Continue with ${free.length} ${free.length === 1 ? 'time' : 'times'}` : 'Tap when you are free'}</button>
      </div>
    </div>
  );

  if (step === 3) return (
    <div className="c-join">
      <div className="c-join-top">
        {top(3)}
        <h1 className="c-title c-title-big">How many a week?</h1>
        <div className="c-stepper">
          <button type="button" className="c-stepper-btn" aria-label="One fewer" disabled={cap <= 1} onClick={() => setCap(cap - 1)}>−</button>
          <span className="c-stepper-num" aria-live="polite">{cap}</span>
          <button type="button" className="c-stepper-btn" aria-label="One more" disabled={cap >= 7} onClick={() => setCap(cap + 1)}>+</button>
        </div>
        <p className="c-muted">You won't be asked past this. Change it any week.</p>
        {failed && <p className="c-body" role="alert">That didn't save. Check your connection and try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={saving} onClick={finish}>{saving ? 'Saving' : 'Finish'}</button>
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">You're in, {invite.name}.</h1>
        <p className="c-body">Asks come by text. 👍 for yes, 👎 to pass.</p>
      </div>
      <div className="c-join-end">
        <Link to="/" className="c-btn c-btn-main c-btn-full">See Maya's week</Link>
      </div>
    </div>
  );
}
