import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Help } from '@/lib/assignmentEngine';
import { helpPhrase } from '@/lib/checkin';
import { getCheckin, matchWeekNow, saveCheckin, startCheckin } from '@/lib/checkin.functions';
import { helpKinds } from '@/lib/join.functions';
import { Check } from './join';
import { KindIcon } from './parts';

// The Monday check-in page. A helper opens it from a text. It starts filled in from their usual week.
// Same as last week is one tap. Changing is the three questions from joining, saved for this week only.

const about: Record<Help, string> = {
  Rides: 'To and from visits',
  Pickups: 'Prescriptions and errands',
  Meals: 'Cook or drop off food',
  'At home': 'Tidying, laundry, small things',
  'Calls and paperwork': 'Scheduling, insurance, forms',
};
const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const slots = ['Morning', 'Afternoon', 'Evening'] as const;
const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter(x => x !== item) : [...list, item]);

type Info = Awaited<ReturnType<typeof getCheckin>>;

export function Checkin({ who }: { who: string }) {
  const [info, setInfo] = useState<Info | undefined>(undefined);
  const [step, setStep] = useState<'summary' | 'help' | 'free' | 'limit' | 'done' | 'none'>('summary');
  const [helps, setHelps] = useState<Help[]>([]);
  const [free, setFree] = useState<string[]>([]);
  const [cap, setCap] = useState(3);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getCheckin({ data: { who } }).then(i => {
      setInfo(i);
      if (i) { setHelps(i.presets.helps ?? [...helpKinds]); setFree(i.presets.availability); setCap(i.presets.cap); }
    }).catch(() => setInfo(null));
  }, [who]);

  const save = async (answer: 'same' | 'changed' | 'none') => {
    setSaving(true); setFailed(false);
    try {
      const r = await saveCheckin({ data: { who, answer, ...(answer === 'changed' ? { presets: { helps, availability: free, cap } } : {}) } });
      if (r.ok) setStep(answer === 'none' ? 'none' : 'done'); else setFailed(true);
    } catch { setFailed(true); }
    setSaving(false);
  };

  if (info === undefined) return <div className="c-join" aria-busy="true" />;
  if (info === null) return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">This link has ended</h1>
        <p className="c-body">Ask the person who sent it for a new one.</p>
      </div>
    </div>
  );

  const back = (to: typeof step) => <div className="c-step"><button type="button" className="c-link" onClick={() => setStep(to)}>Back</button></div>;

  if (step === 'done' || step === 'none') return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">Thank you, {info.name}.</h1>
        <p className="c-body">{step === 'done' ? 'Dans will ask you about what fits.' : "We'll leave you out this week."}</p>
      </div>
    </div>
  );

  if (step === 'help') return (
    <div className="c-join">
      <div className="c-join-top">
        {back('summary')}
        <h1 className="c-title c-title-big">What can you do?</h1>
        <p className="c-body">For this week only.</p>
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
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!helps.length} onClick={() => setStep('free')}>{helps.length ? 'Continue' : 'Pick at least one'}</button>
      </div>
    </div>
  );

  if (step === 'free') return (
    <div className="c-join">
      <div className="c-join-top">
        {back('help')}
        <h1 className="c-title c-title-big">When are you free?</h1>
        <p className="c-body">This week.</p>
        <div className="c-week" role="group" aria-label="Times you are free this week">
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
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!free.length} onClick={() => setStep('limit')}>{free.length ? 'Continue' : 'Tap when you are free'}</button>
      </div>
    </div>
  );

  if (step === 'limit') return (
    <div className="c-join">
      <div className="c-join-top">
        {back('free')}
        <h1 className="c-title c-title-big">How many this week?</h1>
        <div className="c-stepper">
          <button type="button" className="c-stepper-btn" aria-label="One fewer" disabled={cap <= 1} onClick={() => setCap(cap - 1)}>−</button>
          <span className="c-stepper-num" aria-live="polite">{cap}</span>
          <button type="button" className="c-stepper-btn" aria-label="One more" disabled={cap >= 7} onClick={() => setCap(cap + 1)}>+</button>
        </div>
        <p className="c-muted">Next week starts from your usual again.</p>
        {failed && <p className="c-body" role="alert">That didn't save. Try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={saving} onClick={() => save('changed')}>{saving ? 'Saving' : 'Save for this week'}</button>
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top">
        <span className="c-eyebrow">This week</span>
        <h1 className="c-title c-title-big">Same as last week?</h1>
        <ul className="c-people">
          <li className="c-person"><span className="c-stack c-grow"><strong>Helping with</strong><small>{helpPhrase(info.presets.helps)}</small></span></li>
          <li className="c-person"><span className="c-stack c-grow"><strong>Free</strong><small>{info.presets.availability.length} times a week</small></span></li>
          <li className="c-person"><span className="c-stack c-grow"><strong>At most</strong><small>{info.presets.cap} a week</small></span></li>
        </ul>
        {info.answered && <p className="c-muted">You can change your answer until Dans matches the week.</p>}
        {failed && <p className="c-body" role="alert">That didn't save. Try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={saving} onClick={() => save('same')}>{saving ? 'Saving' : 'Same as last week'}</button>
        <button type="button" className="c-link c-center" onClick={() => setStep('help')}>Change something</button>
        <button type="button" className="c-link c-center" disabled={saving} onClick={() => save('none')}>I can't help this week</button>
      </div>
    </div>
  );
}

/** Settings rows: start the check-in by hand, and match the week now. Each asks for a second tap, because it can text people. */
export function CheckinRows() {
  const [armed, setArmed] = useState<'checkin' | 'match' | null>(null);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState('');

  const run = async (kind: 'checkin' | 'match') => {
    if (armed !== kind) { setArmed(kind); setSaid(''); return; }
    setBusy(true); setArmed(null);
    try {
      if (kind === 'checkin') {
        const r = await startCheckin();
        setSaid(r.sent ? `Asked ${r.sent} helpers.` : r.reason === 'texting is off' ? 'Texting is off. Nothing was sent.' : 'Nobody to ask.');
      } else {
        const r = await matchWeekNow();
        setSaid(`${r.assigned.length} matched${r.open ? `, ${r.open} still need someone` : ''}${r.texted ? `, ${r.texted} texted` : ''}.`);
      }
    } catch { setSaid("That didn't work. Try again."); }
    setBusy(false);
  };

  return (
    <>
      <li className="c-row c-row-tall">
        <span className="c-stack"><strong>Monday check-in</strong><small>{said || 'Asks each helper: same as last week?'}</small></span>
        <button type="button" className="c-btn c-btn-small" disabled={busy} onClick={() => run('checkin')}>{armed === 'checkin' ? 'Tap to send' : 'Start'}</button>
      </li>
      <li className="c-row c-row-tall">
        <span className="c-stack"><strong>Match the week</strong><small>Uses this week's answers</small></span>
        <button type="button" className="c-btn c-btn-small" disabled={busy} onClick={() => run('match')}>{armed === 'match' ? 'Tap to match' : 'Match'}</button>
      </li>
    </>
  );
}
