// Prints the raw poll record for a poll message. node --env-file=.env scripts/linq-raw.mjs <messageId>
const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim() };
const r = await fetch(`${base}/messages/${process.argv[2]}/poll`, { headers });
console.log(r.status, JSON.stringify(await r.json(), null, 1).replace(/\+\d{7}(\d{4})/g, '+…$1').slice(0, 2500));
