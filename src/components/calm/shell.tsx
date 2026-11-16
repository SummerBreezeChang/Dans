import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

// The calm shell: one column, four places to go. Nothing else on the frame.

const places = [
  { to: '/', label: 'Home' },
  { to: '/visits', label: 'Visits' },
  { to: '/people', label: 'Circle' },
  { to: '/more', label: 'More' },
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
            {p.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PillTag({ tone, children }: { tone: 'mint' | 'peach' | 'plain' | 'quiet' | 'soft'; children: ReactNode }) {
  return <span className={`c-pill c-pill-${tone}`}>{children}</span>;
}
