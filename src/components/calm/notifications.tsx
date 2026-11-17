import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { getPrefs, savePrefs } from '@/lib/notify.functions';
import { defaultPrefs, type Prefs } from '@/lib/notify';
import { Check } from './join';

// What Summer is texted about. Only Summer. Maya and helpers are never sent these.
// Drawn in Paper, "Dans · mobile flow", N1. Changes save as you tap.

const toggles: { key: 'nobody' | 'passed'; title: string; sub: string }[] = [
  { key: 'nobody', title: 'Nobody is free', sub: 'A task has no one left to ask' },
  { key: 'passed', title: 'Someone passes', sub: 'Each time a helper cannot make it' },
];

export function Notifications() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => { getPrefs().then(setPrefs).catch(() => setPrefs(defaultPrefs)); }, []);

  const change = async (next: Prefs) => {
    const before = prefs;
    setPrefs(next); setFailed(false);
    try { const r = await savePrefs({ data: next }); if (!r.ok) throw new Error('save'); } catch { setPrefs(before); setFailed(true); }
  };

  if (!prefs) return <div aria-busy="true" />;
  return (
    <>
      <header className="c-head">
        <Link to="/more" className="c-link">Settings</Link>
        <h1 className="c-title">Notifications</h1>
        <p className="c-body">Texts to you only. Maya gets none.</p>
      </header>
      <div className="c-picks">
        {toggles.map(t => (
          <button type="button" key={t.key} role="switch" aria-checked={prefs[t.key]} className={prefs[t.key] ? 'c-pick is-on' : 'c-pick'} onClick={() => change({ ...prefs, [t.key]: !prefs[t.key] })}>
            <span className="c-stack c-grow"><strong>{t.title}</strong><small>{t.sub}</small></span>
            <span className={prefs[t.key] ? 'c-switch is-on' : 'c-switch'} aria-hidden="true"><span /></span>
          </button>
        ))}
      </div>
      <p className="c-eyebrow">When someone passes</p>
      <div className="c-picks" role="radiogroup" aria-label="When someone passes">
        {([['auto', 'Ask the next person for me'], ['check', 'Check with me first']] as const).map(([value, label]) => (
          <button type="button" key={value} role="radio" aria-checked={prefs.pass === value} className={prefs.pass === value ? 'c-pick is-on' : 'c-pick'} onClick={() => change({ ...prefs, pass: value })}>
            <strong className="c-grow">{label}</strong>
            <Check on={prefs.pass === value} />
          </button>
        ))}
      </div>
      {failed && <p className="c-body" role="alert">That didn't save. Try again.</p>}
    </>
  );
}
