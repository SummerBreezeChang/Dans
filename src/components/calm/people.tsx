import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { firstName, numberWord } from '@/lib/week';

// The circle: who is sharing the week, what each person does, and how full they are.

const ME = 'summer';

export function People() {
  const { state } = useCare();
  const load = (id: string) => state.tasks.filter(t => t.published && t.owner === id && t.status !== 'done').length;
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Maya's circle</p>
        <h1 className="c-title">{numberWord(state.people.length)} people are sharing this week.</h1>
      </header>
      <ul className="c-rows c-card">
        {state.people.map(p => {
          const n = load(p.id);
          const pct = p.cap ? Math.min(100, Math.round((n / p.cap) * 100)) : 0;
          return (
            <li key={p.id} className="c-row c-row-tall">
              <span className="c-stack">
                <strong>{p.id === ME ? `${firstName(p)} (you)` : firstName(p)}</strong>
                <small>{p.helps ? p.helps.join(', ') : 'Anything'}</small>
              </span>
              <span className="c-load">
                <small>{n} of {p.cap}</small>
                <span className="c-meter" role="img" aria-label={`${n} of ${p.cap} tasks this week`}><i data-pct={Math.round(pct / 10) * 10} /></span>
              </span>
            </li>
          );
        })}
      </ul>
      <Link to="/circle" className="c-link">Change free times and limits</Link>
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
        <li><Link to="/wearables" className="c-row c-row-tall"><span className="c-stack"><strong>Wellness</strong><small>Sleep and heart readings Maya shares</small></span></Link></li>
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
