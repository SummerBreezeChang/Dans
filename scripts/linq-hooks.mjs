// Lists webhook subscriptions without printing any secret. node --env-file=.env scripts/linq-hooks.mjs
const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim() };
const j = await (await fetch(`${base}/webhook-subscriptions`, { headers })).json();
for (const s of j.subscriptions || j.data || []) console.log(Object.fromEntries(Object.entries(s).map(([k, v]) => [k, /secret/i.test(k) ? '(hidden)' : v])));
