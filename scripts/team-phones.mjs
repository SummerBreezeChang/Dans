// Saves teammates' phone numbers so Dans texts them directly. Numbers stay in .env and the database, never in git.
// In .env add one line:   TEAM_PHONES=hardika:+14155550100,nancy:+14155550101
// An id that is not in the circle yet is added as a new helper named after the id.
// Run:  node --env-file=.env scripts/team-phones.mjs
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const h = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
const entries = (process.env.TEAM_PHONES || '').split(',').map(x => x.trim()).filter(Boolean);
if (!entries.length) { console.log('TEAM_PHONES is empty. Add id:+1415... lines to .env first.'); process.exit(1); }
const e164 = v => { const d = v.replace(/\D/g, ''); return d.length === 10 ? '+1' + d : d.length === 11 && d[0] === '1' ? '+' + d : null; };
// A rough free week for someone new: afternoons and evenings, a limit of three.
const rough = [0, 1, 2, 3, 4, 5, 6].flatMap(d => [`${d}-Afternoon`, `${d}-Evening`]);
for (const entry of entries) {
  const [id, raw] = entry.split(':');
  const phone = e164(raw || '');
  if (!/^[a-z]{2,20}$/.test(id || '') || !phone) { console.log('Skipped an entry: use id:+14155550100 (id in lowercase letters)'); continue; }
  const found = await (await fetch(`${sb}/care_caregivers?id=eq.${id}&select=id`, { headers: h })).json();
  const res = found.length
    ? await fetch(`${sb}/care_caregivers?id=eq.${id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ phone }) })
    : await fetch(`${sb}/care_caregivers`, { method: 'POST', headers: h, body: JSON.stringify({ id, name: id[0].toUpperCase() + id.slice(1), phone, cap: 3, availability: rough, helps: null }) });
  console.log(id, found.length ? 'updated' : 'added', res.ok ? '·' : 'FAILED ' + res.status, '+…' + phone.slice(-4));
}
