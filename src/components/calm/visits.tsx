import { Link, useNavigate } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { rescheduleTasks, type CareTask } from '@/lib/assignmentEngine';
import { byTime, firstName, helpWord, list, numberWord, pillFor, visitsFor } from '@/lib/week';
import { PillTag } from './shell';

const ME = 'summer';
const isCovered = (t: CareTask) => Boolean(t.owner) || t.status === 'done';

/** Every visit, with how much of its checklist is covered. */
export function Visits() {
  const { state } = useCare();
  const visits = visitsFor(state.rescheduled);
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Visits</p>
        <h1 className="c-title">{numberWord(visits.length)} visits coming up.</h1>
      </header>
      <ul className="c-rows c-rows-closed">
        {visits.map(v => {
          const tasks = state.tasks.filter(t => t.published && t.appointment === v.id);
          const done = tasks.filter(isCovered).length;
          return (
            <li key={v.id}>
              <Link to="/visits/$id" params={{ id: v.id }} className="c-row c-row-tall">
                <span className="c-stack">
                  <strong>{v.title}</strong>
                  <small>{v.date} · {v.time}</small>
                </span>
                <PillTag tone={done === tasks.length ? 'mint' : 'peach'}>{done} of {tasks.length} covered</PillTag>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** One visit and the tasks that hang off it. */
export function Visit({ id }: { id: string }) {
  const { state } = useCare();
  const visit = visitsFor(state.rescheduled).find(v => v.id === id);
  if (!visit) return <p className="c-body">That visit is not on the calendar. <Link to="/visits" className="c-link">Back to visits</Link></p>;
  const tasks = state.tasks.filter(t => t.published && t.appointment === id).sort(byTime);
  const covered = tasks.filter(isCovered).length;
  return (
    <>
      <div className="c-bar">
        <Link to="/visits" className="c-link">Visits</Link>
        <PillTag tone="soft">From Kaiser</PillTag>
      </div>
      <header className="c-head c-head-tight">
        <h1 className="c-title">{visit.title}</h1>
        <p className="c-body">{visit.when} · {visit.time} · {visit.length}</p>
        <p className="c-muted">{visit.place}</p>
        {visit.movedFrom && <p className="c-muted">Moved from {visit.movedFrom}.</p>}
      </header>
      {id === 'chemo' && !state.rescheduled && (
        <Link to="/visits/$id/move" params={{ id }} className="c-btn c-btn-line">This visit moved</Link>
      )}
      <section>
        <div className="c-list-head">
          <span className="c-eyebrow">Checklist for this visit</span>
          <small>{covered} of {tasks.length} covered</small>
        </div>
        <ul className="c-rows c-rows-closed">
          {tasks.map(t => {
            const pill = pillFor(t, state.people, ME);
            return (
              <li key={t.id} className="c-row c-row-tall">
                <span className="c-stack">
                  <strong>{t.title}</strong>
                  <small>{t.time} · {helpWord(t)}</small>
                </span>
                <PillTag tone={pill.tone}>{pill.label}</PillTag>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/** Check what a move changes before anyone is texted. */
export function MoveVisit({ id }: { id: string }) {
  const { state, reschedule, liveSms } = useCare();
  const navigate = useNavigate();
  const name = (pid: string | undefined) => (pid === ME ? 'You' : firstName(state.people.find(p => p.id === pid)));
  const after = rescheduleTasks(state.tasks, state.people);
  const changes = state.tasks
    .filter(t => t.published && t.appointment === 'chemo')
    .map(before => {
      const now = after.find(t => t.id === before.id) ?? before;
      let outcome: string;
      if (before.owner && now.owner === before.owner) outcome = before.owner === ME ? 'Stays with you' : `Stays with ${name(before.owner)}`;
      else if (before.owner && now.owner) outcome = `${name(before.owner)} can't then. ${name(now.owner)} is asked.`;
      else if (before.owner) outcome = `${name(before.owner)} can't then. Needs someone.`;
      else if (now.owner) outcome = `${name(now.owner)} is asked.`;
      else outcome = 'Still needs someone.';
      return { now, outcome };
    })
    .sort((a, b) => byTime(a.now, b.now));
  const hears = [...new Set(changes.map(c => c.now.owner).filter((o): o is string => Boolean(o) && o !== ME))].map(name);

  if (id !== 'chemo' || state.rescheduled) {
    return <p className="c-body">Nothing to move here. <Link to="/visits" className="c-link">Back to visits</Link></p>;
  }
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">The visit moves</p>
        <h1 className="c-title">Chemotherapy is now Friday at 2:00 PM.</h1>
        <p className="c-body">It was Thursday at 10:00 AM. Here is what moves with it.</p>
      </header>
      <section>
        <div className="c-list-head"><span className="c-eyebrow">What changes</span></div>
        <ul className="c-rows c-rows-closed">
          {changes.map(({ now, outcome }) => (
            <li key={now.id} className="c-row c-row-tall">
              <span className="c-stack">
                <strong>{now.title}</strong>
                <small>Friday, {now.time}</small>
              </span>
              <span className="c-outcome">{outcome}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="c-note">
        <span className="c-eyebrow">Who hears</span>
        <p className="c-body">
          {hears.length ? `${list(hears)} ${hears.length === 1 ? 'gets' : 'each get'} one text.` : 'Nobody needs a text.'}
          {!liveSms && hears.length > 0 && ' Texting is off, so nothing is sent yet.'}
        </p>
      </section>
      <div className="c-actions">
        <button type="button" className="c-btn c-btn-main" onClick={() => { reschedule(); void navigate({ to: '/visits/$id', params: { id } }); }}>
          {liveSms && hears.length ? `Confirm and text ${list(hears)}` : 'Confirm the move'}
        </button>
        <Link to="/visits/$id" params={{ id }} className="c-link c-center">Not yet</Link>
      </div>
    </>
  );
}
