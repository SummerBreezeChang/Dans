import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { getStart, saveConsent, type Scope } from '@/lib/start.functions';
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

  if (!data) return <div className="c-join" aria-busy="true" />;

  if (!data.consent) return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><Link to="/" className="c-link">Back</Link></div>
        <h1 className="c-title c-title-big">Ask Maya first</h1>
        <p className="c-body">She picks what helpers can see before anyone is invited.</p>
        <div className="c-soft">
          <span className="c-soft-label">What Maya gets</span>
          <p>Maya, I'd like to organize help for you. Take a look and tell me what you're OK with.</p>
        </div>
        {waiting && <p className="c-muted" role="status">Waiting for Maya.</p>}
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" onClick={async () => { const r = await share("Maya, I'd like to organize help for you. Take a look and tell me what you're OK with.", '/maya'); if (r !== 'none') setWaiting(true); if (r === 'copied') setNote({ maya: 'Link copied' }); }}>{note['maya'] ?? 'Send Maya the link'}</button>
        <Link to="/maya" className="c-link c-center">She's with me</Link>
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top">
        <span className="c-eyebrow">Maya said yes</span>
        <h1 className="c-title c-title-big">Who's helping?</h1>
        <p className="c-body">Each person gets their own link.</p>
        <ul className="c-people">
          {data.people.map(p => (
            <li key={p.id} className={p.joined ? 'c-person is-joined' : 'c-person'}>
              <span className="c-avatar" aria-hidden="true">{p.name.charAt(0)}</span>
              <strong className="c-grow">{p.name}</strong>
              {p.joined ? <span className="c-person-end c-person-status">Joined</span> : (
                <button type="button" className="c-person-end c-pill-btn" onClick={async () => { const r = await share(`${p.name}, I'd like your help with Maya's care. Tell me what you can do:`, `/join/${p.id}`); setNote(n => ({ ...n, [p.id]: r === 'copied' ? 'Copied' : r === 'shared' ? 'Sent' : n[p.id] ?? '' })); }}>{note[p.id] || 'Send link'}</button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="c-join-end">
        <Link to="/" className="c-btn c-btn-main c-btn-full">Go to Maya's week</Link>
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
  const [step, setStep] = useState<'ask' | 'see' | 'done' | 'later'>('ask');
  const [scope, setScope] = useState<Scope>('tasks');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const yes = async () => {
    setSaving(true); setFailed(false);
    try { const r = await saveConsent({ data: { scope } }); if (r.ok) setStep('done'); else setFailed(true); } catch { setFailed(true); }
    setSaving(false);
  };

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

  return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">{step === 'done' ? 'Saved.' : 'Not now.'}</h1>
        <p className="c-body">{step === 'done' ? "Maya's choice is saved. Summer can invite helpers now." : 'Summer will wait until Maya is ready.'}</p>
      </div>
    </div>
  );
}
