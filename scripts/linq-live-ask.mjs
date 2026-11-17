// Sends one real ask the way Dans does, so the answer can be followed end to end.
// Send:   node --env-file=.env scripts/linq-live-ask.mjs
// Check:  node --env-file=.env scripts/linq-live-ask.mjs check
// Asks Henry about the prescriptions pickup. Goes only to the test phone.
const base = 'https://api.linqapp.com/api/partner/v3';
const lh = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const sh = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
const e164 = v => { const d = v.replace(/\D/g, ''); return '+' + (d.length === 10 ? '1' + d : d); };
const from = e164(process.env.LINQ_FROM_NUMBER);
const get = async p => (await fetch(sb + p, { headers: sh })).json();

const people = await get('/care_caregivers?select=id,name');
const tasks = await get('/care_tasks?select=id,title,day,time,owner,status');
const name = id => people.find(p => p.id === id)?.name ?? 'nobody';
const task = tasks.find(t => /prescription/i.test(t.title));
const henry = people.find(p => /^henry/i.test(p.name));
// Henry is texted at his own number when one is saved, otherwise at the test phone, tagged.
const own = henry && (await get(`/care_caregivers?id=eq.${henry.id}&select=phone`))[0]?.phone;
const to = own ? e164(own) : e164(process.env.SMS_SANDBOX_TO);
if (!task || !henry) { console.log('Missing task or Henry', tasks.length, people.map(p => p.name)); process.exit(1); }

if (process.argv[2] === 'check') {
  console.log(`"${task.title}" is with ${name(task.owner)} · ${task.status}`);
  for (const a of await get('/care_activity?select=title,detail,created_at&order=created_at.desc&limit=3')) console.log('·', a.created_at.slice(11, 19), a.title, '|', a.detail);
  process.exit(0);
}

await fetch(`${sb}/care_tasks?id=eq.${task.id}`, { method: 'PATCH', headers: sh, body: JSON.stringify({ owner: henry.id, status: 'assigned', declined_by: [], updated_at: new Date().toISOString() }) });
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const question = `${own ? '' : '[To Henry] '}Henry, can you pick up Maya's prescriptions ${days[task.day]}, Nov ${16 + task.day} at ${task.time}?\n\n\u{1F44D} reply YES / \u{1F44E} reply PASS`;
const first = await fetch(`${base}/chats`, { method: 'POST', headers: lh, body: JSON.stringify({ from, to: [to], message: { parts: [{ type: 'text', value: question }] } }) });
const fj = await first.json().catch(() => ({}));
const questionId = fj.chat?.message?.id ?? fj.message?.id ?? fj.message_id;
console.log('question:', first.status, '| message id found:', !!questionId, questionId ? '' : Object.keys(fj.chat ?? fj));
const rows = [questionId].filter(Boolean).map(id => ({ key: `ask:${id}`, recipient: `${task.id}|${henry.id}|${to}`, ok: true }));
const log = await fetch(`${sb}/care_sms_log`, { method: 'POST', headers: sh, body: JSON.stringify(rows) });
console.log('remembered which task this is about:', log.status, `(${rows.length} messages)`);
