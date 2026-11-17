import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { NavIcon } from './parts';

// The calm shell: one column, four places to go. Nothing else on the frame.

const places = [
  { to: '/', label: 'Home', icon: 'Home' },
  { to: '/visits', label: 'Visits', icon: 'Visits' },
  { to: '/people', label: 'Circle', icon: 'Circle' },
  { to: '/more', label: 'More', icon: 'Settings' },
] as const;

export function CalmShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const here = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  return (
    <div className="c-app">
      <main className="c-page">{children}</main>
      <nav className="c-nav" aria-label="Main">
        {places.map(p => (
          <Link key={p.to} to={p.to} className={here(p.to) ? 'c-nav-item is-here' : 'c-nav-item'} aria-current={here(p.to) ? 'page' : undefined}>
            <NavIcon name={p.icon} filled={here(p.to)} />
            <span>{p.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PillTag({ tone, children }: { tone: 'mint' | 'peach' | 'plain' | 'quiet' | 'soft'; children: ReactNode }) {
  return <span className={`c-pill c-pill-${tone}`}>{children}</span>;
}
