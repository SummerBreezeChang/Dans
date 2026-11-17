// Shows the latest asks Dans remembers and the tally on each poll. node --env-file=.env scripts/linq-trace.mjs
const base = 'https://api.linqapp.com/api/partner/v3';
const lh = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim() };
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const sh = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY };
const rows = await (await fetch(`${sb}/care_sms_log?select=key,recipient,created_at&key=like.ask:*&order=created_at.desc&limit=4`, { headers: sh })).json();
for (const r of rows) {
  const id = r.key.slice(4);
  const p = await fetch(`${base}/messages/${id}/poll`, { headers: lh });
  const j = p.ok ? await p.json() : null;
  console.log(r.created_at.slice(11, 19), r.recipient.split('|').slice(0, 2).join(' / '), j ? '| poll: ' + j.poll.options.map(o => `${o.text} ${o.voters.length}`).join(', ') : '| question');
}
const wh = await (await fetch(`${sb}/care_sms_log?select=key,ok,created_at&key=like.wh:*&order=created_at.desc&limit=4`, { headers: sh })).json();
console.log('replies Dans sent:', wh.length ? wh.map(w => `${w.created_at.slice(11, 19)} ${w.key.split(':').pop()} ok=${w.ok}`).join(' · ') : 'none');
