import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { requestCode, verifyCode } from '@/lib/auth.functions';

// The front door and sign in. Drawn in Paper, "Dans · mobile flow", G0 to G4.

/** G0. Where someone lands when they are not signed in. */
export function Welcome() {
  const [invited, setInvited] = useState(false);
  return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <span className="c-eyebrow">Dans</span>
        <h1 className="c-title c-title-big">Caring for someone is a lot. Share it.</h1>
        <p className="c-body">Set up the week once. The people who want to help each take a small piece.</p>
        {invited && <p className="c-soft" role="status">Use the link in the text you were sent. It opens your page, and you don't need to sign in.</p>}
      </div>
      <div className="c-join-end">
        <Link to="/start" className="c-btn c-btn-main c-btn-full">Start a circle</Link>
        <Link to="/login" className="c-btn c-btn-soft c-btn-full">Sign in</Link>
        <button type="button" className="c-link c-center" onClick={() => setInvited(true)}>I was invited to help</button>
      </div>
    </div>
  );
}

/** G1 to G4. A number, then the code that was texted to it. */
export function Login() {
  const [step, setStep] = useState<'phone' | 'code' | 'unknown'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [tail, setTail] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ title: string; line?: string }>();

  const send = async () => {
    setBusy(true); setProblem(undefined);
    try {
      const r = await requestCode({ data: { phone } });
      if (r.ok) { setTail(r.tail); setCode(''); setStep('code'); }
      else if (r.reason === 'unknown') setStep('unknown');
      else if (r.reason === 'slow') setProblem({ title: 'Too many codes.', line: 'Try again in a few minutes.' });
      else if (r.reason === 'off') setProblem({ title: 'Sign in is not switched on yet.' });
      else setProblem({ title: "We couldn't text that number.", line: 'Check it and try again.' });
    } catch {
      setProblem({ title: "That didn't send.", line: 'Check your connection and try again.' });
    }
    setBusy(false);
  };

  const check = async () => {
    setBusy(true); setProblem(undefined);
    try {
      const r = await verifyCode({ data: { phone, code } });
      if (r.ok) { window.location.assign(r.to); return; }
      if (r.reason === 'wrong') setProblem({ title: "That code didn't work.", line: `${r.left} ${r.left === 1 ? 'try' : 'tries'} left. Codes last 10 minutes.` });
      else if (r.reason === 'locked') setProblem({ title: 'Too many tries.', line: 'Wait a few minutes, then ask for a new code.' });
      else setProblem({ title: "That didn't work.", line: 'Ask for a new code.' });
    } catch {
      setProblem({ title: "That didn't send.", line: 'Check your connection and try again.' });
    }
    setBusy(false);
  };

  if (step === 'unknown') return (
    <div className="c-join">
      <div className="c-join-top c-join-hero">
        <h1 className="c-title c-title-big">We don't know this number.</h1>
        <p className="c-body">Dans signs in people who belong to a circle. If you're setting this up for someone, start one.</p>
      </div>
      <div className="c-join-end">
        <Link to="/start" className="c-btn c-btn-main c-btn-full">Start a circle</Link>
        <button type="button" className="c-link c-center" onClick={() => { setStep('phone'); setPhone(''); }}>Try another number</button>
      </div>
    </div>
  );

  if (step === 'code') return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><button type="button" className="c-link" onClick={() => { setStep('phone'); setProblem(undefined); }}>Back</button></div>
        <h1 className="c-title c-title-big">Enter the code</h1>
        {problem ? (
          <div className="c-notice" role="alert"><strong>{problem.title}</strong>{problem.line && <span>{problem.line}</span>}</div>
        ) : (
          <p className="c-body">We texted it to the number ending {tail}.</p>
        )}
        <label className="c-field c-field-code">Six digit code
          <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Six digit code" />
        </label>
        <button type="button" className="c-link" disabled={busy} onClick={send}>Send a new code</button>
      </div>
      <div className="c-join-end">
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={busy || code.length < 6} onClick={check}>{busy ? 'Checking' : problem ? 'Try again' : 'Sign in'}</button>
        {!problem && <button type="button" className="c-link c-center" onClick={() => { setStep('phone'); setCode(''); }}>Use a different number</button>}
      </div>
    </div>
  );

  return (
    <div className="c-join">
      <div className="c-join-top">
        <div className="c-step"><Link to="/welcome" className="c-link">Back</Link></div>
        <h1 className="c-title c-title-big">Sign in</h1>
        <p className="c-body">We'll text you a code.</p>
        {problem && <div className="c-notice" role="alert"><strong>{problem.title}</strong>{problem.line && <span>{problem.line}</span>}</div>}
        <label className="c-field">Your mobile number
          <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" aria-label="Your mobile number" />
        </label>
      </div>
      <div className="c-join-end">
        <p className="c-muted c-center-text">Invited to help? Use the link in your text. No sign in needed.</p>
        <button type="button" className="c-btn c-btn-main c-btn-full" disabled={busy || phone.replace(/\D/g, '').length < 10} onClick={send}>{busy ? 'Sending' : 'Send the code'}</button>
      </div>
    </div>
  );
}
