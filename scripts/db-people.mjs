// Lists the care circle as stored, with phone numbers hidden. node --env-file=.env scripts/db-people.mjs
const sb = process.env.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1';
const sh = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY };
for (const p of await (await fetch(sb + '/care_caregivers?select=*', { headers: sh })).json()) console.log({ ...p, phone: p.phone ? '(set)' : null });
for (const t of await (await fetch(sb + '/care_tasks?select=id,title,day,time,owner,status,published&order=day', { headers: sh })).json()) console.log(t.id, '|', t.title, '|', t.day, t.time, '|', t.owner, t.status, t.published ? '' : '(draft)');
