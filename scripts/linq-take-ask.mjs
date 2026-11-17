// Sends Summer the "Can you take it?" text for the open prescriptions task, the way Dans does when nobody is free.
// Send: node --env-file=.env scripts/linq-take-ask.mjs   Check: add "check"
const base = 'https://api.linqapp.com/api/partner/v3';
const lh = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const sh = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' };
const e164 = v => { const d = v.replace(/\D/g, ''); return '+' + (d.length === 10 ? '1' + d : d); };
const get = async p => (await fetch(sb + p, { headers: sh })).json();
const [task] = await get('/care_tasks?title=ilike.*prescription*&select=id,title,day,time,owner,status');
const [summer] = await get('/care_caregivers?id=eq.summer&select=name,phone');
if (process.argv[2] === 'check') {
  console.log(`"${task.title}" is with ${task.owner ?? 'nobody'} · ${task.status}`);
  for (const a of await get('/care_activity?select=title,detail,created_at&order=created_at.desc&limit=3')) console.log('·', a.created_at.slice(11, 19), a.title, '|', a.detail);
  process.exit(0);
}
if (task.owner || task.status === 'done') { console.log('The task is not open:', task.owner, task.status); process.exit(1); }
const to = summer.phone ? e164(summer.phone) : e164(process.env.SMS_SANDBOX_TO);
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const text = `${summer.phone ? '' : '[To Summer] '}Summer, Nancy can't pick up Maya's prescriptions ${days[task.day]}, Nov ${16 + task.day} at ${task.time}. Nobody else is free then. Can you take it?\n\n\u{1F44D} reply YES / \u{1F44E} reply PASS`;
const res = await fetch(`${base}/chats`, { method: 'POST', headers: lh, body: JSON.stringify({ from: e164(process.env.LINQ_FROM_NUMBER), to: [to], message: { parts: [{ type: 'text', value: text }] } }) });
const j = await res.json().catch(() => ({}));
const id = j.chat?.message?.id ?? j.message?.id ?? j.message_id;
console.log('sent:', res.status, '| message id found:', !!id);
if (id) { const log = await fetch(`${sb}/care_sms_log`, { method: 'POST', headers: sh, body: JSON.stringify([{ key: `ask:${id}`, recipient: `lead:${task.id}|summer|${to}`, ok: true }]) }); console.log('remembered:', log.status); }
