import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCare } from '@/lib/careStore';
import { helpKinds, rescheduleTasks, type CareTask, type Category, type Help, type Slot } from '@/lib/assignmentEngine';
import { byTime, firstName, helpWord, list, numberWord, shortTitle, visitsFor, visitWhen } from '@/lib/week';
import { visitIds } from '@/lib/weekPlan';
import { PillTag } from './shell';
import { Check } from './join';
import { LineRow } from './parts';
import { Requests } from './requests';

const ME = 'summer';
const isCovered = (t: CareTask) => Boolean(t.owner) || t.status === 'done';

/** Every visit, with how much of its checklist is covered. */
const helpCategory: Record<Help, Category> = {
  Rides: 'Rides to & from Appointments',
  Meals: 'Meal Planning',
  Pickups: 'Medicine Pickup',
  'At home': 'At-Home Care',
  'Calls and paperwork': 'Follow-ups',
};

export function Review() {
  const { state, confirmWeek } = useCare();
  const [kept, setKept] = useState<string[]>([...visitIds]);
  const [saving, setSaving] = useState(false);
  const visits = visitsFor(false);
  const toggle = (id: string) => setKept(list => list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Nov 16 to 22</p>
        <h1 className="c-title">Review the week</h1>
        <p className="c-body">Dans asks helpers from this list.</p>
      </header>
      <Requests />
      <div className="c-fills">
        {visits.map(v => (
          <button type="button" key={v.id} className={kept.includes(v.id) ? 'c-fill c-fill-mint' : 'c-fill'} aria-pressed={kept.includes(v.id)} onClick={() => toggle(v.id)}>
            <span className="c-stack"><strong>{v.short}</strong><small>{kept.includes(v.id) ? visitWhen(v) : `${visitWhen(v)} · left out`}</small></span>
            <Check on={kept.includes(v.id)} />
          </button>
        ))}
      </div>
      <button type="button" className="c-btn c-btn-main c-btn-full" disabled={!kept.length || saving} onClick={() => { setSaving(true); void confirmWeek(kept).finally(() => setSaving(false)); }}>{saving ? 'Saving' : 'Confirm the week'}</button>
    </>
  );
}

export function Visits() {
  const { state } = useCare();
  if (!state.confirmed) return <Review />;
  const visits = visitsFor(state.rescheduled);
  return (
    <>
      <header className="c-head">
        <p className="c-eyebrow">Visits</p>
        <h1 className="c-title">{numberWord(visits.length)} visits coming up.</h1>
      </header>
      <ul className="c-rows c-card">
        {visits.map(v => {
          const tasks = state.tasks.filter(t => t.published && t.appointment === v.id);
          const done = tasks.filter(isCovered).length;
          return (
            <li key={v.id}>
              <Link to="/visits/$id" params={{ id: v.id }} className="c-row c-row-tall">
                <span className="c-stack">
                  <strong>{v.title}</strong>
                  <small>{visitWhen(v)}</small>
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
  const { state, releaseTask, addDemoTask } = useCare();
  const [adding, setAdding] = useState(false);
  const [help, setHelp] = useState<Help>('Rides');
  const [when, setWhen] = useState('Thursday, 6:00 PM');
  const visit = visitsFor(state.rescheduled).find(v => v.id === id);
  if (!visit) return <p className="c-body">That visit is not on the calendar. <Link to="/visits" className="c-link">Back to visits</Link></p>;
  const tasks = state.tasks.filter(t => t.published && t.appointment === id).sort(byTime);
  const covered = tasks.filter(isCovered).length;
  return (
    <>
      <div className="c-bar">
        <Link to="/visits" className="c-link">Visits</Link>
        <PillTag tone="soft">Sample visit</PillTag>
      </div>
      <header className="c-head c-head-tight">
        <h1 className="c-title">{visit.title}</h1>
        <p className="c-body">{visit.when} · {visit.time} · {visit.length}</p>
        <p className="c-muted">{visit.place}</p>
        {visit.movedFrom && <p className="c-muted">Moved from {visit.movedFrom}.</p>}
      </header>
      {id === 'chemo' && !state.rescheduled && (
        <Link to="/visits/$id/move" params={{ id }} className="c-btn-line">This visit moved</Link>
      )}
      <section>
        <div className="c-list-head">
          <span className="c-eyebrow">Checklist for this visit</span>
          <small>{covered} of {tasks.length} covered</small>
        </div>
        <div className="c-lines c-line-end">
          {tasks.map(t => (
            <div key={t.id}>
              <LineRow task={t} people={state.people} me={ME} sub={`${t.time} · ${helpWord(t)}`} title={shortTitle(t)} />
              {t.owner && t.status !== 'done' && <button type="button" className="c-link" onClick={() => releaseTask(t.id)}>They cancelled</button>}
            </div>
          ))}
        </div>
        <button type="button" className="c-link" onClick={() => setAdding(v => !v)}>Add a task to this visit</button>
        {adding && (
          <form className="c-fills" onSubmit={e => { e.preventDefault(); const time = when.split(',')[1]?.trim() || '6:00 PM'; void addDemoTask({ title: help, category: helpCategory[help], day: visit.day, slot: /am/i.test(time) ? 'Morning' : 'Evening', time, appointment: id }); setAdding(false); }}>
            <label className="c-fill">Kind of help
              <select value={help} onChange={e => setHelp(e.target.value as Help)}>{helpKinds.map(h => <option key={h}>{h}</option>)}</select>
            </label>
            <label className="c-fill">Day and time
              <input value={when} onChange={e => setWhen(e.target.value)} />
            </label>
            <button type="submit" className="c-btn c-btn-main c-btn-full">Add</button>
          </form>
        )}
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
        <ul className="c-rows c-card">
          {changes.map(({ now, outcome }) => (
            <li key={now.id} className="c-row c-row-tall">
              <span className="c-stack">
                <strong>{shortTitle(now)}</strong>
                <small>Fri {now.time}</small>
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
