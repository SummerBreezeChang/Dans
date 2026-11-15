import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCare } from '@/lib/careStore';

export function ShowcaseAuth({ signup = false }: { signup?: boolean }) {
  const { startShowcase } = useCare();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startShowcase();
    void navigate({ to: signup ? '/setup' : '/board' });
  }
  return <div className="setup">
    <header className="setup-top setup-top-bare"><Link to="/" className="setup-wordmark"><img className="setup-logo" src="/firstcare-logo.svg" alt="FirstCare+" width={81} height={44} /></Link><Link to={signup ? '/auth' : '/signup'} className="setup-link">{signup ? 'Sign in' : 'Sign up'}</Link></header>
    <main className="setup-col showcase-auth">
      <span className="setup-tag">Showcase demo</span>
      <h1>{signup ? 'A little help starts here.' : 'Welcome back.'}</h1>
      <p className="setup-lead">{signup ? 'Create your care circle.' : 'Your care circle is ready.'}</p>
      <form onSubmit={submit} noValidate className="showcase-form">
        {signup && <label className="setup-field"><span>Your name</span><input autoComplete="off" defaultValue="Hardika Narula" /></label>}
        <label className="setup-field"><span>Email</span><input type="email" autoComplete="off" defaultValue="showcase@example.com" /></label>
        <label className="setup-field"><span>Password</span><div className="showcase-password"><input type={visible ? 'text' : 'password'} autoComplete="off" defaultValue="FirstCareDemo2026" /><Button type="button" variant="ghost" size="icon" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff /> : <Eye />}</Button></div></label>
        <Button type="submit" className="setup-btn">{signup ? 'Sign up' : 'Sign in'}<ArrowRight size={18}/></Button>
      </form>
      <p className="setup-muted">Demo only. No account is created and these details are not saved.</p>
      <Button variant="link" className="setup-link showcase-skip" onClick={() => { startShowcase(); void navigate({ to: '/board' }); }}>Go straight to Maya’s care board <ArrowRight size={16}/></Button>
    </main>
  </div>;
}