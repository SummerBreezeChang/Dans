import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { byTime, dayHeading, firstName, numberWord, shortTitle, weekTitle } from '@/lib/week';
import { visitsFor } from '@/lib/week';
import { LineRow } from './parts';
import { useRequests } from './requests';

// The whole week on one page, for Summer to read through. Drawn in Paper, screen D1.

const ME = 'summer';

export function Summary() {
  const { state } = useCare();
  const { items } = useRequests();
  const visits = visitsFor(state.rescheduled);
  const tasks = state.tasks.filter(t => t.published).sort(byTime);
  const open = tasks.filter(t => !t.owner && t.status !== 'done');
  const asked = tasks.filter(t => t.owner && t.status === 'assigned');
  const yes = tasks.filter(t => t.owner && (t.status === 'accepted' || t.status === 'done'));
  const days = [...new Set(tasks.map(t => t.day))].sort((a, b) => a - b);
  const waiting = items.filter(r => r.status === 'waiting');
  const nameOf = (id: string) => (id === ME ? 'You' : firstName(state.people.find(p => p.id === id)));
  const people = [...new Set(tasks.map(t => t.owner).filter((o): o is string => Boolean(o)))];
  const none = state.people.filter(p => !people.includes(p.id) && p.id !== ME).map(p => firstName(p));
  const headline = open.length ? `${numberWord(open.length)} ${open.length === 1 ? 'task still needs' : 'tasks still need'} someone.` : 'The week is covered.';
  return (
    <>
      <div className="c-bar"><Link to="/" className="c-link">Home</Link></div>
      <header className="c-head c-head-tight">
        <p className="c-eyebrow">{weekTitle(state.owner, state.patientName)} · Nov 16 to 22</p>
        <h1 className="c-title">{headline}</h1>
      </header>
      <div className="c-tiles">
        <div className="c-tilebox c-tilebox-mint"><b>{yes.length}</b>Said yes</div>
        <div className="c-tilebox"><b>{asked.length}</b>Asked</div>
        <div className="c-tilebox c-tilebox-peach"><b>{open.length}</b>Need someone</div>
      </div>
      {waiting.length > 0 && (
        <section className="c-note">
          <span className="c-eyebrow">Maya asked</span>
          {waiting.map(r => <p key={r.id} className="c-body">{r.text}</p>)}
          <Link to="/" className="c-link">Decide on Home</Link>
        </section>
      )}
      {!tasks.length && <p className="c-body">Nothing is on the week yet. <Link to="/visits" className="c-link">Review the visits</Link></p>}
      <section className="c-lines">
        {days.map(d => {
          const day = tasks.filter(t => t.day === d);
          return (
            <div key={d}>
              <div className="c-day-head"><span>{dayHeading(d)}</span><small>{day.length} {day.length === 1 ? 'task' : 'tasks'}</small></div>
              {day.map(t => <Link key={t.id} to="/visits/$id" params={{ id: t.appointment ?? visits[0]?.id ?? 'chemo' }} className="c-link-row"><LineRow task={t} people={state.people} me={ME} title={shortTitle(t)} sub={`${t.time}${t.appointment ? ` · ${visits.find(v => v.id === t.appointment)?.short ?? ''}` : ''}`} /></Link>)}
            </div>
          );
        })}
      </section>
      {tasks.length > 0 && (
        <section className="c-lines">
          <div className="c-day-head"><span>By person</span><Link to="/people" className="c-link">Open the circle</Link></div>
          {people.map(id => {
            const mine = tasks.filter(t => t.owner === id);
            const y = mine.filter(t => t.status !== 'assigned').length;
            const a = mine.length - y;
            return <div key={id} className="c-line"><span>{nameOf(id)}</span><small className="c-line-sub">{[y ? `${y} yes` : '', a ? `${a} asked` : ''].filter(Boolean).join(', ')}</small></div>;
          })}
          {none.length > 0 && <div className="c-line c-line-end"><span>{none.length > 1 ? `${none.slice(0, -1).join(', ')} and ${none[none.length - 1]}` : none[0]}</span><small className="c-line-sub">Nothing yet</small></div>}
        </section>
      )}
    </>
  );
}
