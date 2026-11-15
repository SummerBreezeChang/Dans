import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCare } from '@/lib/careStore';

// Guided setup for a new care circle. Presentation and local state only:
// nothing here reads or writes the care store, the database, or sends a message.

const LAST = 9;
const stepOf = [0, 1, 2, 2, 2, 3, 4, 5, 5, 5];
const conditions = ['Cancer treatment', 'Dialysis', 'After surgery', 'Something else'];

const phases = [
  {
    when: 'Now', name: '1. Chemotherapy', note: 'Every two weeks · 6 tasks',
    groups: [
      { title: 'Each chemo visit', tasks: [['Ride there', '1 hour before'], ['Ride home, and stay an hour', 'When it ends'], ['A meal that evening', 'Same day, 6:00 PM']] },
      { title: 'Between visits', tasks: [['Ride to the lab blood draw', 'Day before chemo'], ['Pick up prescriptions', 'Before each visit'], ['Check in with Maya', 'The day after']] },
    ],
  },
  {
    when: 'Next', name: '2. Surgery', note: 'When a date comes in · 5 tasks',
    groups: [
      { title: 'Around the surgery', tasks: [['Ride to the hospital and home', 'Surgery day'], ['Someone staying the first night', 'Surgery day'], ['Meals for the first week', 'Daily'], ['Help around the house', 'First week'], ['Ride to the first follow-up', 'About a week after']] },
    ],
  },
  {
    when: 'Later', name: '3. Recovery and follow-up', note: 'After surgery · 4 tasks',
    groups: [
      { title: 'As Maya recovers', tasks: [['Rides to follow-up visits', 'As scheduled'], ['Pick up prescriptions', 'As needed'], ['A regular check-in', 'Twice a week'], ['Company on a short walk', 'When she feels up to it']] },
    ],
  },
] as const;

function Footer({ back, backLabel = 'Back', children }: { back: () => void; backLabel?: string; children: ReactNode }) {
  return <div className="setup-footer"><button type="button" className="setup-link" onClick={back}>{backLabel}</button>{children}</div>;
}

export function Setup() {
  const { startShowcase } = useCare();
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState(conditions[0]);
  const [consent, setConsent] = useState(true);
  const [phase, setPhase] = useState(0);
  const next = () => setStep(s => Math.min(s + 1, LAST));
  const back = () => setStep(s => Math.max(s - 1, 0));
  const current = phases[phase] ?? phases[0];

  if (step === 3) {
    return <div className="setup-kaiser">
      <div className="kaiser-bar"><strong>KAISER PERMANENTE</strong><span>Signed in as Maya</span></div>
      <p className="kaiser-notice">Simulated screen for the demo. Not a real Kaiser Permanente page. Synthetic patient.</p>
      <main className="kaiser-main">
        <h1>Share your record with FirstCare+?</h1>
        <div className="kaiser-cols">
          <section className="kaiser-card">
            <div><h2>FirstCare+ would like to read</h2><ul><li>Appointments and visits</li><li>Medication list</li><li>After Visit Summaries and notes</li></ul><p>It cannot message your care team, see billing, or change your record. You can stop sharing at any time.</p></div>
            <div className="kaiser-actions"><button type="button" className="kaiser-allow" onClick={next}>Allow access</button><button type="button" className="kaiser-deny" onClick={back}>Don't allow</button></div>
          </section>
          <aside className="kaiser-side"><h2>Who is asking.</h2><p>Summer started a care circle for you on FirstCare+, an app that helps family and friends share rides, meals and pickups.</p><p>People in the circle see tasks only. They do not see your record unless you choose to share it.</p></aside>
        </div>
      </main>
    </div>;
  }

  const bare = step === 0 || step === LAST;
  return <div className="setup">
    <header className={bare ? 'setup-top setup-top-bare' : 'setup-top'}>
      <img className="setup-logo" src="/firstcare-logo.svg" alt="FirstCare+" width={81} height={44} />
      <div className="setup-quick-header"><Link to="/auth" className="setup-link">Sign in</Link><Button asChild variant="link" className="setup-link"><Link to="/board" onClick={startShowcase}>Skip to care board</Link></Button></div>
      {!bare && <span className="setup-progress" aria-hidden="true"><i data-step={stepOf[step]} /></span>}
      {step === 0 && <Link to="/board" className="setup-link">I was invited to help</Link>}
      {!bare && <span className="setup-count">{step === 8 ? 'Optional' : `Step ${stepOf[step]} of 5`}</span>}
      {step === LAST && <span className="setup-count">All set</span>}
    </header>

    {step === 0 && <main className="setup-col setup-center">
      <h1 className="setup-hero">Caring for someone is a lot. Share it.</h1>
      <p className="setup-lead">Set up the week once. The people who want to help each take a small piece.</p>
      <div className="setup-row"><button type="button" className="setup-btn" onClick={next}>Set up a care circle</button><span className="setup-muted">About ten minutes</span></div>
    </main>}

    {step === 1 && <main className="setup-col">
      <h1>Who are you caring for?</h1>
      <div className="setup-fields">
        <label className="setup-field"><span>Their name</span><input defaultValue="Maya Lin" /></label>
        <label className="setup-field"><span>You are her</span><input defaultValue="Friend" /></label>
      </div>
      <div className="setup-field"><span>What is she going through?</span>
        <div className="setup-chips">{conditions.map(c => <button type="button" key={c} aria-pressed={condition === c} className={condition === c ? 'setup-chip is-on' : 'setup-chip'} onClick={() => setCondition(c)}>{c}</button>)}</div>
        <small>This decides the starting checklist. You can change every task.</small>
      </div>
      <Footer back={back}><button type="button" className="setup-btn" onClick={next}>Continue</button></Footer>
    </main>}

    {step === 2 && <main className="setup-col">
      <h1>Bring in Maya's visits from Kaiser.</h1>
      <p className="setup-lead">So nobody has to copy appointments into a group chat.</p>
      <h2 className="setup-label">What comes in</h2>
      <ul className="setup-rows"><li><strong>Upcoming visits</strong><span>Date, time and place</span></li><li><strong>Medicines</strong><span>For pickup reminders</span></li><li><strong>Doctor's notes</strong><span>Only you and Maya can read them</span></li></ul>
      <p className="setup-note">Helpers only see tasks, like "ride on Thursday". Never the diagnosis, unless Maya chooses to share it.</p>
      <label className="setup-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Maya is with me and says yes.</span></label>
      <Footer back={() => setStep(4)} backLabel="Add visits by hand instead"><button type="button" className="setup-btn" disabled={!consent} onClick={next}>Continue to Kaiser</button></Footer>
    </main>}

    {step === 4 && <main className="setup-col">
      <span className="setup-tag">Connected to Kaiser</span>
      <h1>Here is what came in.</h1>
      <h2 className="setup-label">3 visits</h2>
      <ul className="setup-rows setup-visits"><li><b>Wed 18</b><strong>Lab blood draw</strong><span>8:30 AM</span></li><li><b>Thu 19</b><strong>Chemotherapy infusion</strong><span>10:00 AM</span></li><li><b>Mon 23</b><strong>Oncology follow-up</strong><span>11:00 AM</span></li></ul>
      <h2 className="setup-label">2 medicines</h2>
      <ul className="setup-rows"><li><strong>Ondansetron</strong></li><li><strong>Dexamethasone</strong></li></ul>
      <p className="setup-muted">Doctor's notes came in too. They stay between you and Maya.</p>
      <Footer back={() => setStep(2)}><button type="button" className="setup-btn" onClick={next}>Build the checklist</button></Footer>
    </main>}

    {step === 5 && <main className="setup-col setup-wide">
      <h1>A starting plan for Maya's breast cancer treatment.</h1>
      <p className="setup-lead">Treatment comes in phases. These are the everyday tasks for each one. Change anything. This is not medical advice.</p>
      <div className="setup-phases">{phases.map((p, i) => <button type="button" key={p.name} aria-pressed={phase === i} className={phase === i ? 'setup-phase is-on' : 'setup-phase'} onClick={() => setPhase(i)}><small>{p.when}</small><strong>{p.name}</strong><span>{p.note}</span></button>)}</div>
      <div className="setup-tasks">{current.groups.map(g => <section key={g.title}><h2 className="setup-label">{g.title}</h2><ul className="setup-rows">{g.tasks.map(([name, when]) => <li key={name}><strong>{name}</strong><span>{when}</span></li>)}</ul></section>)}</div>
      {phase > 0 && <p className="setup-muted">These switch on when a date comes in from Kaiser. Nobody is asked until then.</p>}
      <Footer back={back}><button type="button" className="setup-btn" onClick={next}>This looks right</button></Footer>
    </main>}

    {step === 6 && <main className="setup-col">
      <h1>Who has offered to help?</h1>
      <p className="setup-lead">They can say yes, swap or can't to anything. Nobody is signed up without agreeing.</p>
      <ul className="setup-people"><li><i className="mint">S</i><div><strong>Srishti</strong><span>(415) 555-0142 · sees tasks only</span></div></li><li><i className="peach">H</i><div><strong>Hardika</strong><span>(510) 555-0178 · sees tasks only</span></div></li></ul>
      <p className="setup-muted">"Tasks only" means they see the ride, not the reason. Maya can share more with anyone later.</p>
      <Footer back={back}><button type="button" className="setup-btn" onClick={next}>Continue with 2 people</button></Footer>
    </main>}

    {step === 7 && <main className="setup-col">
      <h1>Put everyone in one group text.</h1>
      <p className="setup-lead">Asks arrive there. People reply yes, swap or can't. No app to download.</p>
      <div className="setup-thread"><small>Maya's circle · you, Srishti, Hardika</small><p>Hi Srishti and Hardika. Summer set up a care circle for Maya. A few things could use a hand this week.</p><p>Srishti, could you drive Maya on Thursday at 9? Reply yes, swap or can't.</p><p className="me">Yes</p><p>Thank you. It's yours, Srishti.</p></div>
      <p className="setup-muted">Texts never mention health details. Only the task and a link. This preview sends nothing.</p>
      <Footer back={back}><button type="button" className="setup-btn" onClick={next}>Start the group text</button></Footer>
    </main>}

    {step === 8 && <main className="setup-col">
      <h1>Let your calendar say when you're free.</h1>
      <p className="setup-lead">We only read busy and free. Never what the event is. Tasks you take show up on your calendar too.</p>
      <ul className="setup-rows"><li><strong>Google Calendar</strong><span>Coming soon</span></li><li><strong>Apple Calendar</strong><span>Coming soon</span></li><li><strong>Outlook</strong><span>Coming soon</span></li></ul>
      <Footer back={back}><button type="button" className="setup-btn" onClick={next}>Skip for now</button></Footer>
    </main>}

    {step === LAST && <main className="setup-col setup-center">
      <h1 className="setup-hero">Maya's week has a plan.</h1>
      <p className="setup-lead">Asks go out to Srishti and Hardika in the group text. You'll hear as they answer.</p>
      <div className="setup-row"><Link to="/board" className="setup-btn" onClick={startShowcase}><Check size={18} /> See the week</Link><button type="button" className="setup-link" onClick={() => setStep(0)}>Start over</button></div>
    </main>}
  </div>;
}
