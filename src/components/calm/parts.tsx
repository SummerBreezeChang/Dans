import type { ReactNode } from 'react';
import { helpNeeded, type CareTask, type Caregiver, type Help } from '@/lib/assignmentEngine';
import { pillFor } from '@/lib/week';

// Shared pieces for the calm screens. Icons say what kind of help a task is; colour says whether it is covered.
// Drawn in Paper on "Dans · Home options", option D.

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const kind: Record<Help, ReactNode> = {
  Rides: <><path d="M3 12l1.5-5h11L17 12v4H3z" /><circle cx="6.5" cy="13.5" r="1" /><circle cx="13.5" cy="13.5" r="1" /></>,
  Pickups: <><path d="M5 7h10l1 10H4z" /><path d="M7.5 7a2.5 2.5 0 0 1 5 0" /></>,
  Meals: <><path d="M3 10h14a7 7 0 0 1-14 0z" /><path d="M8 6c0-1 1-1 1-2M12 6c0-1 1-1 1-2" /></>,
  'At home': <path d="M3 9.5 10 3l7 6.5V17H3z" />,
  'Calls and paperwork': <><path d="M5 3h7l3 3v11H5z" /><path d="M8 10h4M8 13h4" /></>,
};

export function KindIcon({ help }: { help: Help }) {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" {...stroke}>{kind[help]}</svg>;
}

const nav = {
  Home: <path d="M3 9.5 10 3l7 6.5V17H3z" />,
  Visits: <><rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" /></>,
  Circle: <><circle cx="7" cy="7" r="3" /><path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" /><circle cx="14.5" cy="8" r="2.3" /><path d="M14 12.5c2.5 0 4 1.8 4 4.5" /></>,
  Settings: <><path d="M3 6h8M15 6h2M3 14h2M9 14h8" /><circle cx="13" cy="6" r="2" /><circle cx="7" cy="14" r="2" /></>,
} as const;

export function NavIcon({ name, filled }: { name: keyof typeof nav; filled?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 20 20" aria-hidden="true" {...stroke} fill={filled && name === 'Home' ? 'currentColor' : 'none'}>{nav[name]}</svg>;
}

/** One task: what kind, what it is, who has it. */
export function TaskRow({ task, people, me, sub, title }: { task: CareTask; people: Caregiver[]; me: string; sub?: string; title?: string }) {
  const pill = pillFor(task, people, me);
  return (
    <div className="c-row">
      <span className={`c-tile c-tile-${pill.tone}`}><KindIcon help={helpNeeded(task)} /></span>
      <span className="c-stack c-grow">
        <span>{title ?? task.title}</span>
        {sub && <small>{sub}</small>}
      </span>
      <span className={pill.tone === 'plain' || pill.tone === 'quiet' ? 'c-status c-status-quiet' : 'c-status'}>{pill.label}</span>
    </div>
  );
}
