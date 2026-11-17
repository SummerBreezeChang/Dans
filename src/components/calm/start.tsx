import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { askHandover, getHandover, getMayaWeek, getStart, saveConsent, sendNote, type Scope } from '@/lib/start.functions';
import { dayHeading, weekTitle } from '@/lib/week';
import { useCare } from '@/lib/careStore';
import { Check } from './join';

// Starting the circle. Maya agrees first (her own link), then Summer invites helpers.
// Drawn in Paper, "Dans · mobile flow", C3, C4 and M1 to M3.

type StartData = Awaited<ReturnType<typeof getStart>>;

async function share(text: string, path: string) {
  const url = `${window.location.origin}${path}`;
  try {
    if (navigator.share) { await navigator.share({ text, url }); return 'shared'; }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return 'copied';
  } catch {
    return 'none';
  }
}

export function Start() {
  const { state, nameLead, setOwner, setPatient, unname } = useCare();
  const [patientName, setPatientName] = useState('Maya');
  const [leadName, setLeadName] = useState('Summer');
  const [phone, setPhone] = useState('');
  const [data, setData] = useState<StartData | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let alive = true;
    const pull = () => getStart().then(d => { if (alive) setData(d); }).catch(() => undefined);
    pull();
    const t = setInterval(pull, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!state.named) return (
    <div className="c-join">
      <div className="c-join-top">
        <p className="c-eyebrow">1 of 3</p>
        <h1 className="c-title c-title-big">What's your name?</h1>
        <p className="c-body">You're setting this up, so Dans texts you when something needs you.</p>
        <label className="c-fill">Your first name<input value={leadName} onChange={e => setLeadName(e.target.value)} /></label>
        <label className="c-fill">Your mobile number<input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" /></label>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={leadName.trim().length < 1 || phone.trim().length < 7} onClick={() => void nameLead(leadName.trim(), phone.trim())}>Continue</button>
      </div>
    </div>
  );

  if (!state.owner) return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={unname}>Back</button><span className="c-eyebrow">2 of 3</span></div>
        <h1 className="c-title c-title-big">Who is setting this up?</h1>
        <p className="c-body">Dans words everything to match. You can hand it over later.</p>
        <div className="c-picks">
          <button type="button" className="c-pick is-on" onClick={() => { setPatient(undefined); setOwner('patient'); }}>
            <span className="c-stack c-grow"><strong>I'm the patient</strong><small>It's my week. I'll ask people to help me.</small></span>
          </button>
          <button type="button" className="c-pick is-on" onClick={() => setOwner('caretaker')}>
            <span className="c-stack c-grow"><strong>I'm caring for someone</strong><small>I'll ask them first, then invite helpers.</small></span>
          </button>
        </div>
      </div>
    </div>
  );

  if (state.owner === 'caretaker' && !state.patientName) return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => setOwner(undefined)}>Back</button><span className="c-eyebrow">3 of 3</span></div>
        <h1 className="c-title c-title-big">Who is this for?</h1>
        <p className="c-body">Just a first name.</p>
        <label className="c-fill c-fill-stack">First name<input value={patientName} onChange={e => setPatientName(e.target.value)} /></label>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={patientName.trim().length < 1} onClick={() => setPatient(patientName.trim())}>Continue</button>
      </div>
    </div>
  );

  if (!data) return <div className="c-join" aria-busy="true" />;

  if (!data.consent && state.owner !== 'patient') return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => setPatient(undefined)}>Back</button><span className="c-eyebrow">3 of 3</span></div>
        <h1 className="c-title c-title-big">Ask {state.patientName ?? 'Maya'} first</h1>
        <p className="c-body">She picks what helpers can see before anyone is invited.</p>
        <div className="c-soft">
          <span className="c-soft-label">What {state.patientName ?? 'Maya'} gets</span>
          <p>{state.patientName ?? 'Maya'}, I'd like to organize help for you. Take a look and tell me what you're OK with.</p>
        </div>
        {waiting && <p className="c-muted" role="status">Waiting for {state.patientName ?? 'Maya'}.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={async () => { const r = await share(`${state.patientName ?? 'Maya'}, I'd like to organize help for you. Take a look and tell me what you're OK with.`, '/maya'); if (r !== 'none') setWaiting(true); if (r === 'copied') setNote({ maya: 'Link copied' }); }}>{note['maya'] ?? 'Send Maya the link'}</button>
        <Link to="/maya" className="c-link c-center">She's with me</Link>
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top">
        <span className="c-eyebrow">{state.owner === 'patient' ? 'Your circle' : `${state.patientName ?? 'Maya'} said yes`}</span>
        <h1 className="c-title c-title-big">Who's helping?</h1>
        <p className="c-body">Each person gets their own link.</p>
        <ul className="c-people">
          {data.people.map(p => (
            <li key={p.id} className={p.joined ? 'c-person is-joined' : 'c-person'}>
              <span className="c-avatar" aria-hidden="true">{p.name.charAt(0)}</span>
              <strong className="c-grow">{p.name}</strong>
              {p.joined ? <span className="c-person-end c-person-status">Joined</span> : (
                <button type="button" className="c-person-end c-pill-btn" onClick={async () => { const r = await share(`${p.name}, I'd like your help with ${state.patientName ?? 'Maya'}'s care. Tell me what you can do:`, `/join/${p.id}`); setNote(n => ({ ...n, [p.id]: r === 'copied' ? 'Copied' : r === 'shared' ? 'Sent' : n[p.id] ?? '' })); }}>{note[p.id] || 'Send link'}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="c-join-end">
        <Link to="/" className="c-btn c-btn-main c-btn-full">Go to {weekTitle(state.owner, state.patientName)}</Link>
      </div>
    </div>
  );
}

const sees: { scope: Scope; title: string; sub: string }[] = [
  { scope: 'tasks', title: 'Times and tasks', sub: "Ride to Maya's visit, Thu 9:00 AM" },
  { scope: 'visits', title: 'And what the visit is', sub: 'Ride to chemotherapy, Thu 9:00 AM' },
];

/** Maya's own screens: the request, what helpers can see, thank you. */
export function Maya() {
  const [week, setWeek] = useState<Awaited<ReturnType<typeof getMayaWeek>> | null>(null);
  const [step, setStep] = useState<'ask' | 'see' | 'view' | 'later' | 'note' | 'saved' | 'runs'>('ask');
  const [handover, setHandover] = useState<'none' | 'asked' | 'took'>('none');
  const [words, setWords] = useState('');
  const [sent, setSent] = useState(false);
  const [scope, setScope] = useState<Scope>('tasks');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // Someone who has already agreed goes straight to their week. The week refreshes while it is open.
  useEffect(() => {
    let alive = true; let first = true;
    const pull = () => { getHandover().then(h => { if (alive) setHandover(h.state); }).catch(() => undefined); return getMayaWeek().then(w => { if (!alive) return; setWeek(w); if (first && w.consented) setStep('view'); first = false; }).catch(() => { if (alive && first) { setWeek({ consented: false, rows: [], notes: [] }); first = false; } }); };
    pull();
    const t = setInterval(pull, 10000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const yes = async () => {
    setSaving(true); setFailed(false);
    try { const r = await saveConsent({ data: { scope } }); if (r.ok) { setWeek(await getMayaWeek()); setStep('saved'); } else setFailed(true); } catch { setFailed(true); }
    setSaving(false);
  };

  const send = async () => {
    setSaving(true); setFailed(false);
    try { const r = await sendNote({ data: { text: words } }); if (r.ok) { setWords(''); setSent(true); setStep('view'); } else setFailed(true); } catch { setFailed(true); }
    setSaving(false);
  };

  if (!week) return <div className="c-join" aria-busy="true" />;

  if (step === 'ask') return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <span className="c-eyebrow">Summer asked</span>
        <h1 className="c-title c-title-big">Share your week?</h1>
        <p className="c-body">Summer wants to organize help for you, so you don't have to ask each person.</p>
        <div className="c-soft">
          <strong>You choose what they see</strong>
          <p>Nobody is invited until you say yes.</p>
        </div>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={() => setStep('see')}>Choose what they see</button>
        <button type="button" className="c-link c-center" onClick={() => setStep('later')}>Not now</button>
      </div>
    </div>
  );

  if (step === 'see') return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => setStep('ask')}>Back</button></div>
        <h1 className="c-title c-title-big">What can they see?</h1>
        <p className="c-body">Helpers only see their own tasks.</p>
        <div className="c-picks">
          {sees.map(s => (
            <button type="button" key={s.scope} className={scope === s.scope ? 'c-pick is-on' : 'c-pick'} aria-pressed={scope === s.scope} onClick={() => setScope(s.scope)}>
              <span className="c-stack c-grow"><strong>{s.title}</strong><small>{s.sub}</small></span>
              <Check on={scope === s.scope} />
            </button>
          ))}
        </div>
        {failed && <p className="c-body" role="alert">That didn't save. Try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={saving} onClick={yes}>{saving ? 'Saving' : 'Say yes'}</button>
      </div>
    </div>
  );

  if (step === 'saved') return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">Saved.</h1>
        <p className="c-body">Maya's choice is saved. Summer can invite helpers now.</p>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={() => setStep('view')}>See who's coming</button>
      </div>
    </div>
  );

  if (step === 'runs') return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => setStep('view')}>Back</button></div>
        <h1 className="c-title c-title-big">Who runs this?</h1>
        <p className="c-body">You can hand this to someone you trust. They will manage the week and see everything. You will still see who is coming, and can send notes.</p>
        <div className="c-note"><strong>Summer</strong><p>Main caretaker. Runs this today.</p></div>
        {failed && <p className="c-body" role="alert">That didn't send. Try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={saving || handover !== 'none'} onClick={async () => { setSaving(true); setFailed(false); try { const r = await askHandover(); if (r.ok) { setHandover('asked'); setStep('view'); } else setFailed(true); } catch { setFailed(true); } setSaving(false); }}>{saving ? 'Sending' : 'Ask Summer to take over'}</button>
        <button type="button" className="c-link c-center" onClick={() => setStep('view')}>Not now</button>
      </div>
    </div>
  );

  if (step === 'note') return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => setStep('view')}>Back</button></div>
        <h1 className="c-title c-title-big">Tell Summer</h1>
        <p className="c-body">What would help this week?</p>
        <div className="c-chips">
          {['A meal', 'A ride', 'Company'].map(c => <button type="button" key={c} className={words === c ? 'c-chip is-on' : 'c-chip'} onClick={() => setWords(c)}>{c}</button>)}
        </div>
        <label className="c-fill">In your words<textarea value={words} maxLength={280} onChange={e => setWords(e.target.value)} /></label>
        {failed && <p className="c-body" role="alert">That didn't send. Try again.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!words.trim() || saving} onClick={send}>{saving ? 'Sending' : 'Send to Summer'}</button>
      </div>
    </div>
  );

  if (step === 'view') return (
    <div className="c-join">
      <div className="c-join-top">
        <span className="c-eyebrow">Nov 16 to 22</span>
        <h1 className="c-title c-title-big">Who's coming</h1>
        {week.notes.slice(0, 1).map(n => (
          <div key={n.id} className={n.status === 'added' ? 'c-fill c-fill-mint c-fill-stack' : n.status === 'waiting' ? 'c-fill c-fill-peach c-fill-stack' : 'c-fill c-fill-stack'} role="status">
            <span className="c-eyebrow">You asked</span>
            <strong>{n.text}</strong>
            <span>{n.line}</span>
          </div>
        ))}
        {sent && !week.notes.length && <p className="c-muted" role="status">Sent to Summer.</p>}
        {handover === 'asked' && <p className="c-muted" role="status">You asked Summer to take over. She will see it.</p>}
        {handover === 'took' && <p className="c-muted" role="status">Summer runs this week now.</p>}
        {[...new Set(week.rows.map(r => r.day))].map(d => (
          <section key={d} className="c-day">
            <span className="c-eyebrow">{dayHeading(d)}</span>
            <ul className="c-people">
              {week.rows.filter(r => r.day === d).map(r => (
                <li key={r.id} className="c-person">
                  <span className="c-person-when">{r.time}</span>
                  <span className="c-stack c-grow"><strong>{r.who}</strong><small>{r.what}</small></span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!week.rows.length && (
          <div className="c-stack">
            <strong>Nobody is lined up yet.</strong>
            <span className="c-body">Summer is working on it. You will see names here as people say yes.</span>
          </div>
        )}
        {week.notes.length > 1 && (
          <section className="c-day">
            <span className="c-eyebrow">Earlier</span>
            <ul className="c-people">
              {week.notes.slice(1).map(n => (
                <li key={n.id} className="c-person"><span className="c-stack c-grow"><strong>{n.text}</strong><small>{n.line}</small></span></li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={() => { setSent(false); setStep('note'); }}>Tell Summer something</button>
        <button type="button" className="c-link c-center" onClick={() => setStep('see')}>Change what they see</button>
        {handover === 'none' && <button type="button" className="c-link c-center" onClick={() => setStep('runs')}>Who runs this</button>}
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">Not now.</h1>
        <p className="c-body">Summer will wait until you are ready.</p>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={() => setStep('ask')}>Ask me again</button>
      </div>
    </div>
  );
}
