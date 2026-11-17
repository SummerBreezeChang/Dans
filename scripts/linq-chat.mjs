// Prints the latest messages in the chat with one number (last 4 digits), newest first. node --env-file=.env scripts/linq-chat.mjs 6998
const base = 'https://api.linqapp.com/api/partner/v3';
const h = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim() };
const d = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const from = encodeURIComponent('+' + (d.length === 10 ? '1' + d : d));
const chats = (await (await fetch(`${base}/chats?from=${from}&limit=20`, { headers: h })).json()).chats || [];
const chat = chats.find(c => JSON.stringify(c).includes(process.argv[2]));
if (!chat) { console.log('no chat'); process.exit(1); }
const m = (await (await fetch(`${base}/chats/${chat.id}/messages?limit=14`, { headers: h })).json()).messages || [];
for (const x of m) { const p = (x.parts || [])[0] || {}; const r = (p.reactions || []).map(r => r.type).join(','); console.log((x.is_from_me ? 'dans   ' : 'PERSON ') + '·', x.created_at?.slice(11, 19), '·', String(p.value || p.type).replace(/\n/g, ' / ').slice(0, 90), r ? '· ' + r : ''); }
