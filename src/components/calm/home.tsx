import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import type { CareTask } from '@/lib/assignmentEngine';
import { byTime, dayNames, doesWhat, firstName, numberWord, pillFor, suggest, visitsFor, weekLabel } from '@/lib/week';
import { PillTag } from './shell';

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

  const headline = open.length
    ? `${numberWord(covered)} of ${numberWord(tasks.length).toLowerCase()} are covered. ${numberWord(open.length)} ${open.length === 1 ? 'needs' : 'need'} someone.`
    : `All ${numberWord(tasks.length).toLowerCase()} are covered.`;

  const row = (t: CareTask) => {
    const pill = pillFor(t, state.people, ME);
    return (
      <li key={t.id} className="c-row">
        <span>{t.title}</span>
        <PillTag tone={pill.tone}>{pill.label}</PillTag>
      </li>
    );
  };

  const loose = tasks.filter(t => !t.appointment).sort(byTime);

  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Maya's week · {weekLabel}</p>
        <h1 className="c-title">{headline}</h1>
      </header>

      {ask && (
        <section className="c-ask" aria-label="Needs someone">
          <div className="c-ask-top">
            <span className="c-eyebrow c-ink">Needs someone</span>
            {open.length > 1 && <span className="c-count">{(skip % open.length) + 1} of {open.length}</span>}
          </div>
          <div>
            <h2 className="c-ask-title">{ask.title}</h2>
            <p className="c-ask-body">
              {dayNames[ask.day]}, {ask.time}. {who ? `${firstName(who)} is free then and ${doesWhat(ask)}.` : 'Nobody else is free then.'}
            </p>
          </div>
          <div className="c-ask-actions">
            {who && <button type="button" className="c-btn c-btn-main" onClick={() => give(ask, who.id, 'assigned')}>Ask {firstName(who)}</button>}
            <button type="button" className={who ? 'c-btn c-btn-white' : 'c-btn c-btn-main'} onClick={() => give(ask, ME, 'accepted')}>I'll take it</button>
          </div>
          {open.length > 1 && <button type="button" className="c-link" onClick={() => setSkip(s => s + 1)}>Show the next one</button>}
        </section>
      )}

      <section className="c-groups">
        {visits.map(v => {
          const mine = tasks.filter(t => t.appointment === v.id).sort(byTime);
          return (
            <div key={v.id} className="c-group">
              <Link to="/visits/$id" params={{ id: v.id }} className="c-group-head">
                <span>{v.date} · {v.short}</span>
                <small>{v.time}</small>
              </Link>
              <ul className="c-rows">{mine.map(row)}</ul>
            </div>
          );
        })}
        {loose.length > 0 && (
          <div className="c-group">
            <div className="c-group-head"><span>Around the week</span></div>
            <ul className="c-rows">{loose.map(row)}</ul>
          </div>
        )}
      </section>
    </>
  );
}
