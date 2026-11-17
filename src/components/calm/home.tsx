import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { byTime, doesWhat, firstName, shortTitle, shortWhen, visitsFor, visitWhen } from '@/lib/week';
import { fits, nextOpen } from '@/lib/weekPlan';
import { KindIcon, TaskRow } from './parts';

// Home asks one question: who is next for the soonest open task.

const ME = 'summer';

export function Home() {
  const { state, askPerson, takeTask } = useCare();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string>();
  const tasks = state.tasks.filter(t => t.published);
  const ask = nextOpen(state.tasks);
  const options = ask ? fits(ask, state.tasks, state.people) : [];
  const who = options.find(p => p.id === picked) ?? options[0];
  const open = tasks.filter(t => !t.owner && t.status !== 'done');
  const covered = tasks.length - open.length;
  const visits = visitsFor(state.rescheduled);

  if (!state.confirmed) return (
    <>
      <header className="c-head">
        <h1 className="c-title c-title-big">Bring in Maya's visits.</h1>
        <p className="c-body">Dans builds the checklist from the visits you keep. Nobody is texted yet.</p>
      </header>
      <Link to="/visits" className="c-btn c-btn-main c-btn-full">Review the week</Link>
    </>
  );

  const headline = open.length ? 'The soonest open task needs someone.' : 'The week is covered.';
  const row = (t: typeof tasks[number]) => <TaskRow key={t.id} task={t} people={state.people} me={ME} title={shortTitle(t)} {...(t.appointment ? {} : { sub: shortWhen(t) })} />;

  return (
    <>
      <header className="c-head c-head-tight">
        <p className="c-eyebrow">Maya's week · Nov 16 to 22</p>
        <h1 className="c-title c-title-big">{headline}</h1>
        <p className="c-body c-quiet">{covered} of {tasks.length} covered this week</p>
      </header>

      {ask && (
        <section className="c-ask" aria-label="Needs someone">
          <div className="c-ask-top"><span className="c-eyebrow">Needs someone</span></div>
          <h2 className="c-ask-title">{ask.title}</h2>
          <p className="c-ask-body">
            {shortWhen(ask)}.{' '}
            {who ? <button type="button" className="c-link" onClick={() => setPicking(v => !v)}>{firstName(who)} is free then</button> : 'Nobody is free then.'}
            {who ? ` and ${doesWhat(ask)}.` : ''}
          </p>
          {picking && (
            <div className="c-fills" role="listbox" aria-label="People who can do this">
              {options.map(p => (
                <button type="button" key={p.id} className="c-fill c-fill-mint" onClick={() => { setPicked(p.id); setPicking(false); }}>
                  <strong>{firstName(p)}</strong>
                  <small>Free then</small>
                </button>
              ))}
            </div>
          )}
          <div className="c-ask-actions">
            {who && <button type="button" className="c-btn c-btn-main" onClick={() => askPerson(ask.id, who.id)}>Ask {firstName(who)}</button>}
            <button type="button" className={who ? 'c-btn c-btn-white' : 'c-btn c-btn-main'} onClick={() => takeTask(ask.id)}>I'll take it</button>
          </div>
        </section>
      )}

      <section className="c-groups">
        {visits.map(v => {
          const mine = tasks.filter(t => t.appointment === v.id).sort(byTime);
          if (!mine.length) return null;
          return (
            <div key={v.id}>
              <Link to="/visits/$id" params={{ id: v.id }} className="c-group-head">
                <span>{v.short}</span>
                <small>{visitWhen(v)}</small>
              </Link>
              <div className="c-fills">{mine.map(t => <div key={t.id} className={t.owner ? 'c-fill c-fill-mint' : 'c-fill c-fill-peach'}>{row(t)}</div>)}</div>
            </div>
          );
        })}
      </section>
    </>
  );
}
