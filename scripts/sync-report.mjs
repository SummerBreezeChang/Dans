// One page that shows whether texts, auto-assign and replies are recorded in the database, person by person.
// Read only. Run: node --env-file=.env scripts/sync-report.mjs
// Phone numbers are masked. No keys are printed.
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const h = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY };
const get = async p => { const r = await fetch(sb + p, { headers: h }); return r.ok ? r.json() : []; };
const mask = p => (p ? '+…' + String(p).replace(/\D/g, '').slice(-4) : 'none');
const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon+'];
const when = t => `${day[t.day] ?? t.day} ${t.time}`;
const sandbox = process.env.SMS_SANDBOX_TO;

const ansRes = await fetch(sb + '/care_answers?select=person_id,task_id,answer,via,note,created_at&order=created_at.desc&limit=400', { headers: h });
const answers = ansRes.ok ? await ansRes.json() : null;
const [people, tasks, log, acts] = await Promise.all([
  get('/care_caregivers?select=*'),
  get('/care_tasks?select=*&order=day,time'),
  get('/care_sms_log?select=key,recipient,ok,created_at&order=created_at.desc&limit=400'),
  get('/care_activity?select=title,detail,created_at&order=created_at.desc&limit=400'),
]);
const byId = Object.fromEntries(people.map(p => [p.id, p]));
const first = p => p.name.split(' ')[0];
const asks = log.filter(l => l.key.startsWith('ask:')).map(l => { const raw = l.recipient.replace(/^lead:/, ''); const [task, person] = raw.split('|'); return { ...l, lead: l.recipient.startsWith('lead:'), task, person }; });
const prefs = acts.find(a => a.title === 'Notification settings');
const consent = acts.find(a => a.title === 'Maya shared her week');

console.log('SETTINGS');
console.log('  Maya agreed to share      :', consent ? `yes, ${consent.detail}, ${consent.created_at.slice(0, 16)}` : 'not yet');
console.log('  Notification settings     :', prefs ? prefs.detail : 'none saved, defaults apply (auto, nobody on, passed off, note on)');
console.log('  Test phone (SMS_SANDBOX_TO):', mask(sandbox));
console.log('  care_answers table         :', answers ? `exists, ${answers.length} answers recorded` : 'MISSING. Run drizzle/migrations/0002_care_answers.sql in the Supabase SQL editor.');
console.log('  Tasks in the database      :', tasks.length, '| texts logged:', log.length, '| log entries:', acts.length);

console.log('\nPEOPLE');
for (const p of people) {
  const mine = tasks.filter(t => t.owner === p.id && t.status !== 'done');
  const declined = tasks.filter(t => (t.declined_by || []).includes(p.id));
  const sent = asks.filter(a => a.person === p.id);
  const events = acts.filter(a => a.title.startsWith(first(p) + ' ') || a.title.includes(' ' + first(p)));
  const joined = acts.some(a => a.title === first(p) + ' joined');
  console.log(`\n  ${p.name} (${p.id})`);
  console.log(`    texts go to : ${p.phone ? 'own phone ' + mask(p.phone) : sandbox ? 'test phone ' + mask(sandbox) + ', tagged [To ' + first(p) + ']' : 'nowhere (no number, no test phone)'}`);
  console.log(`    record      : helps ${p.helps ? p.helps.join(', ') : 'everything'} | free ${p.availability.length} times | limit ${p.cap} a week | joined: ${joined ? 'yes' : 'no'}`);
  console.log(`    tasks now   : ${mine.length ? mine.map(t => `${t.title} (${when(t)}, ${t.status})`).join('; ') : 'none'}`);
  console.log(`    passed on   : ${declined.length ? declined.map(t => t.title).join('; ') : 'none'}`);
  console.log(`    asks sent   : ${sent.length}${sent[0] ? ', last ' + sent[0].created_at.slice(5, 16).replace('T', ' ') + ' UTC' : ''}`);
  if (answers) { const a = answers.filter(x => x.person_id === p.id); console.log(`    answers     : ${a.filter(x => x.answer === 'yes').length} yes, ${a.filter(x => x.answer === 'pass').length} pass, ${a.filter(x => x.answer === 'other').length} other${a[0] ? ', last ' + a[0].answer + ' by ' + a[0].via + ' ' + a[0].created_at.slice(5, 16).replace('T', ' ') + ' UTC' : ''}`); }
  console.log(`    last events : ${events.slice(0, 2).map(e => e.created_at.slice(5, 16).replace('T', ' ') + ' ' + e.title).join(' | ') || 'none'}`);
}

console.log('\nTASKS');
for (const t of tasks) console.log(`  ${t.id.padEnd(8)} ${when(t).padEnd(11)} ${String(t.owner ?? 'nobody').padEnd(8)} ${t.status.padEnd(10)} ${t.published ? '' : '(not published) '}${t.title}`);

console.log('\nCHECKS');
const bad = [];
for (const t of tasks) {
  if ((t.status === 'assigned' || t.status === 'accepted') && !t.owner) bad.push(`${t.id} is ${t.status} but has no owner`);
  if (t.status === 'unclaimed' && t.owner) bad.push(`${t.id} is unclaimed but owned by ${t.owner}`);
  if (t.owner && !byId[t.owner]) bad.push(`${t.id} owner ${t.owner} is not in the circle`);
  for (const d of t.declined_by || []) if (!byId[d]) bad.push(`${t.id} declined_by has unknown ${d}`);
  if (t.owner && (t.declined_by || []).includes(t.owner)) bad.push(`${t.id} is owned by ${t.owner}, who passed on it`);
}
for (const a of asks) { if (!tasks.some(t => t.id === a.task)) bad.push(`ask ${a.key.slice(4, 12)} points at missing task ${a.task}`); if (!byId[a.person]) bad.push(`ask ${a.key.slice(4, 12)} points at missing person ${a.person}`); }
const failed = log.filter(l => l.ok === false);
if (failed.length) bad.push(`${failed.length} texts failed to send: ${failed.slice(0, 3).map(f => f.key.slice(0, 14)).join(', ')}`);
const open = tasks.filter(t => t.published && !t.owner && t.status !== 'done');
console.log(bad.length ? bad.map(b => '  PROBLEM  ' + b).join('\n') : '  ok       every task has an owner that matches its status, and every ask points at a real task and person');
console.log(`  open tasks nobody has: ${open.length}${open.length ? ' (' + open.map(t => t.id).join(', ') + ')' : ''}`);
