import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { byTime, dayHeading, dayNames, firstName, pillFor, shortTitle, weekTitle, whenLabel } from '@/lib/week';
import { useRequests } from './requests';

// The whole week on one page, for Summer to read through. Nothing here changes anything.

const ME = 'summer';

export function Summary() {
  const { state } = useCare();
  const { items } = useRequests();
  const tasks = state.tasks.filter(t => t.published).sort(byTime);
  const days = [...new Set(tasks.map(t => t.day))].sort((a, b) => a - b);
  const open = tasks.filter(t => !t.owner && t.status !== 'done').length;
  const waiting = items.filter(r => r.status === 'waiting');
  return (
    <>
      <div className="c-bar"><Link to="/" className="c-link">Home</Link></div>
      <header className="c-head c-head-tight">
        <p className="c-eyebrow">Nov 16 to 22</p>
        <h1 className="c-title">{weekTitle(state.owner)}</h1>
        <p className="c-body c-quiet">{tasks.length - open} of {tasks.length} covered{open ? `, ${open} open` : ''}</p>
      </header>
      {waiting.length > 0 && (
        <section className="c-note">
          <span className="c-eyebrow">Maya asked</span>
          {waiting.map(r => <p key={r.id} className="c-body">{r.text}</p>)}
          <Link to="/" className="c-link">Decide on Home</Link>
        </section>
      )}
      {!tasks.length && <p className="c-body">Nothing is on the week yet. <Link to="/visits" className="c-link">Review the visits</Link></p>}
      {days.map(d => (
        <section key={d}>
          <div className="c-list-head"><span className="c-eyebrow">{dayNames[d % 7]} {dayHeading(d).split(' ')[1]}</span></div>
          <ul className="c-rows c-card">
            {tasks.filter(t => t.day === d).map(t => {
              const pill = pillFor(t, state.people, ME);
              return (
                <li key={t.id} className="c-row c-row-tall">
                  <span className="c-stack c-grow"><strong>{shortTitle(t)}</strong><small>{whenLabel(t.day, t.time)}{t.owner ? `, ${t.owner === ME ? 'you' : firstName(state.people.find(p => p.id === t.owner))}` : ''}</small></span>
                  <span className={pill.tone === 'plain' || pill.tone === 'quiet' ? 'c-status c-status-quiet' : 'c-status'}>{pill.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
