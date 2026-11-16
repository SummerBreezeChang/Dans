import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import type { CareTask } from '@/lib/assignmentEngine';
import { byTime, firstName, helpWord, shortTitle, shortWhen, suggest, visitsFor, visitWhen } from '@/lib/week';
import { KindIcon, TaskRow } from './parts';

// Home answers one question: is the week covered? The one thing that is not sits on top.

const ME = 'summer';

export function Home() {
  const { state, update, addActivity } = useCare();
  const [skip, setSkip] = useState(0);
  const tasks = state.tasks.filter(t => t.published);
  const open = tasks.filter(t => !t.owner && t.status !== 'done').sort(byTime);
  const covered = tasks.length - open.length;
  const ask = open.length ? open[skip % open.length] : undefined;
  const who = ask ? suggest(ask, state.tasks, state.people, ME) : undefined;
  const visits = visitsFor(state.rescheduled);

  const give = (task: CareTask, owner: string, status: CareTask['status']) => {
    update(s => ({ ...s, tasks: s.tasks.map(t => (t.id === task.id ? { ...t, owner, status, updated: true } : t)) }));
    addActivity(owner === ME ? 'You took a task' : `${firstName(state.people.find(p => p.id === owner))} was asked`, task.title);
    setSkip(0);
  };

  const headline = open.length ? `${open.length} ${open.length === 1 ? 'needs' : 'need'} someone` : 'All covered';

  const row = (t: CareTask) => <TaskRow key={t.id} task={t} people={state.people} me={ME} title={shortTitle(t)} {...(t.appointment ? {} : { sub: shortWhen(t) })} />;

  const loose = tasks.filter(t => !t.appointment).sort(byTime);

  return (
    <>
      <header className="c-head c-head-tight">
        <h1 className="c-title c-title-big">{headline}</h1>
        <p className="c-body c-quiet">{covered} of {tasks.length} covered this week</p>
      </header>

      {ask && (
        <section className="c-ask" aria-label="Needs someone">
          <div className="c-ask-main">
            <span className="c-tile c-tile-ask"><KindIcon help={helpWord(ask)} /></span>
            <div className="c-grow">
              <h2 className="c-ask-title">{ask.title}</h2>
              <p className="c-ask-body">{shortWhen(ask)}</p>
            </div>
            {open.length > 1 && (
              <button type="button" className="c-next" aria-label="Show the next one" onClick={() => setSkip(n => n + 1)}>
                {(skip % open.length) + 1} / {open.length}
              </button>
            )}
          </div>
          <div className="c-ask-actions">
            {who && <button type="button" className="c-btn c-btn-main" onClick={() => give(ask, who.id, 'assigned')}>Ask {firstName(who)}</button>}
            <button type="button" className={who ? 'c-btn c-btn-white' : 'c-btn c-btn-main'} onClick={() => give(ask, ME, 'accepted')}>I'll take it</button>
          </div>
        </section>
      )}

      <section className="c-groups">
        {visits.map(v => {
          const mine = tasks.filter(t => t.appointment === v.id).sort(byTime);
          return (
            <div key={v.id} className="c-card">
              <Link to="/visits/$id" params={{ id: v.id }} className="c-group-head">
                <span>{v.short}</span>
                <small>{visitWhen(v)}</small>
              </Link>
              <ul className="c-rows">{mine.map(row)}</ul>
            </div>
          );
        })}
        {loose.length > 0 && (
          <div className="c-card">
            <div className="c-group-head"><span>Around the week</span></div>
            <ul className="c-rows">{loose.map(row)}</ul>
          </div>
        )}
      </section>
    </>
  );
}
