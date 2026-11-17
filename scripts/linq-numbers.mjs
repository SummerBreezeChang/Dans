// What Linq shows for this account: sender lines and the people we have chats with. Numbers are masked.
const base = 'https://api.linqapp.com/api/partner/v3';
const h = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim() };
const mask = s => String(s).replace(/\+?\d[\d\s().-]{7,}\d/g, m => '+…' + m.replace(/\D/g, '').slice(-4));
for (const path of ['/phonenumbers', '/phone_numbers', '/contacts']) {
  const r = await fetch(base + path, { headers: h });
  console.log(path, r.status, r.ok ? mask(JSON.stringify(await r.json())).slice(0, 600) : '');
}
const digits = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const from = encodeURIComponent('+' + (digits.length === 10 ? '1' + digits : digits));
const c = await (await fetch(`${base}/chats?from=${from}&limit=20`, { headers: h })).json();
for (const x of c.chats || c.data || []) console.log('chat', x.id.slice(0, 8), mask(JSON.stringify((x.handles || x.participants || []).map(p => p.handle || p))), x.created_at?.slice(0, 16));
