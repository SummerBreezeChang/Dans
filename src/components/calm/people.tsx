import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { getStart } from '@/lib/start.functions';
import { firstName, numberWord, weekTitle } from '@/lib/week';

// The circle: who is sharing the week, what each person does, and how full they are.

const ME = 'summer';

export function People() {
  const { state } = useCare();
  const [joined, setJoined] = useState<Record<string, boolean> | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    getStart().then(d => { if (alive) setJoined(Object.fromEntries(d.people.map(p => [p.id, p.joined]))); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  const load = (id: string) => state.tasks.filter(t => t.published && t.owner === id && t.status !== 'done').length;
  const asked = (id: string) => state.tasks.filter(t => t.published && t.owner === id && t.status === 'assigned').length;
  const isOut = (id: string) => id !== ME && joined !== null && joined[id] === false;
  const out = state.people.filter(p => isOut(p.id));
  const here = state.people.length - out.length;
  const again = async (id: string, name: string) => {
    const url = `${window.location.origin}/join/${id}`;
    try {
      if (navigator.share) { await navigator.share({ text: `${name}, I'd like your help with Maya's care. Tell me what you can do:`, url }); setNote(n => ({ ...n, [id]: 'Sent' })); }
      else { await navigator.clipboard.writeText(url); setNote(n => ({ ...n, [id]: 'Link copied' })); }
    } catch { /* cancelled */ }
  };
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">{weekTitle(state.owner, state.patientName).replace('week', 'circle')}</p>
        <h1 className="c-title">{numberWord(here)} {here === 1 ? 'person is' : 'people are'} sharing this week.{out.length ? ` ${numberWord(out.length)} ${out.length === 1 ? 'is' : 'are'} invited.` : ''}</h1>
      </header>
      <div className="c-lines c-line-end">
        {state.people.map(p => {
          if (isOut(p.id)) return (
            <div key={p.id} className="c-person-line">
              <div className="c-top"><span>{firstName(p)}</span><span className="c-pill c-pill-peach">Invited, not joined</span></div>
              <button type="button" className="c-link c-left" onClick={() => void again(p.id, firstName(p))}>{note[p.id] ?? 'Not joined yet. Send the link again?'}</button>
            </div>
          );
          const n = load(p.id);
          const a = asked(p.id);
          const pct = p.cap ? Math.min(100, Math.round((n / p.cap) * 100)) : 0;
          return (
            <div key={p.id} className="c-person-line">
              <div className="c-top"><span>{p.id === ME ? 'You' : firstName(p)}</span><small>{n} of {p.cap}{a ? `, ${a} asked` : ''}</small></div>
              <span className="c-bar-wide" role="img" aria-label={`${n} of ${p.cap} tasks this week`}><i data-pct={Math.round(pct / 10) * 10} /></span>
              <small className="c-line-sub">{p.helps ? p.helps.join(', ') : 'Everything'}</small>
            </div>
          );
        })}
      </div>
      <Link to="/start" className="c-btn c-btn-main c-btn-full">Invite someone</Link>
    </>
  );
}

export function More() {
  const { liveSms, setLive, reset } = useCare();
  const [asking, setAsking] = useState<'reset' | 'live' | null>(null);
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Settings</p>
        <h1 className="c-title">Set things up your way.</h1>
      </header>
      <ul className="c-rows c-card">
        <li className="c-row c-row-tall">
          <span className="c-stack">
            <strong>Text messages</strong>
            <small>{liveSms ? 'On. Changes are texted to helpers.' : 'Off. Nothing is sent.'}</small>
          </span>
          <button type="button" className="c-btn c-btn-small" aria-pressed={liveSms} onClick={() => (liveSms ? setLive(false) : setAsking('live'))}>{liveSms ? 'Turn off' : 'Turn on'}</button>
        </li>
        <li><Link to="/notifications" className="c-row c-row-tall"><span className="c-stack"><strong>Notifications</strong><small>What Dans texts you about</small></span></Link></li>
        <li><Link to="/start" className="c-row c-row-tall"><span className="c-stack"><strong>Invite the circle</strong><small>Ask Maya first, then send links</small></span></Link></li>
        <li className="c-row c-row-tall">
          <span className="c-stack"><strong>Start the week over</strong><small>Puts the demo week back as it began</small></span>
          <button type="button" className="c-btn c-btn-small" onClick={() => setAsking('reset')}>Reset</button>
        </li>
      </ul>
      {asking && (
        <section className="c-note" role="alertdialog" aria-label="Are you sure">
          <span className="c-eyebrow">{asking === 'reset' ? 'Start the week over?' : 'Turn texting on?'}</span>
          <p className="c-body">{asking === 'reset' ? 'This puts the demo week back as it began. Anything you changed is lost.' : 'Real helpers get real texts when you change the week.'}</p>
          <div className="c-actions">
            <button type="button" className="c-btn c-btn-main" onClick={() => { if (asking === 'reset') reset(); else setLive(true); setAsking(null); }}>{asking === 'reset' ? 'Start over' : 'Turn on'}</button>
            <button type="button" className="c-link c-center" onClick={() => setAsking(null)}>Cancel</button>
          </div>
        </section>
      )}
      <p className="c-muted">Made-up data only. Not medical advice.</p>
    </>
  );
}
