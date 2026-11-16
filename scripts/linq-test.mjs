// Sends a short series of test texts to ONE phone, to see what Linq can show.
// Run:  node --env-file=.env scripts/linq-test.mjs
// Needs LINQ_API_TOKEN, LINQ_FROM_NUMBER and SMS_SANDBOX_TO (your own mobile) in .env.
// Pass "check" to only confirm the key works, without sending anything.

const token = process.env.LINQ_API_TOKEN;
const from = process.env.LINQ_FROM_NUMBER;
const to = process.env.SMS_SANDBOX_TO;
const base = 'https://api.linqapp.com/api/partner/v3';
const site = process.env.DANS_URL || 'https://dans-support.vercel.app';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const e164 = raw => {
  const d = String(raw || '').replace(/\D/g, '');
  if (String(raw || '').trim().startsWith('+')) return `+${d}`;
  return d.length === 10 ? `+1${d}` : d.length === 11 ? `+${d}` : null;
};

async function call(method, path, body) {
  const res = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

if (!token) { console.log('Missing LINQ_API_TOKEN'); process.exit(1); }

if (process.argv[2] === 'check') {
  const r = await call('GET', '/phonenumbers');
  const r2 = r.status === 404 ? await call('GET', '/phone_numbers') : r;
  console.log('key check status:', r2.status, '| lines on account:', Array.isArray(r2.json?.phone_numbers) ? r2.json.phone_numbers.length : 'unknown');
  process.exit(0);
}

if (!e164(from) || !e164(to)) { console.log('Missing LINQ_FROM_NUMBER or SMS_SANDBOX_TO. Nothing sent.'); process.exit(1); }

const wait = ms => new Promise(r => setTimeout(r, ms));
const steps = [];

// 1. Plain first message. Linq does not allow a link in the first message of a new chat.
const first = await call('POST', '/chats', {
  from: e164(from), to: [e164(to)],
  message: { parts: [{ type: 'text', value: 'Dans test 1 of 5. A plain text. Reply to it or give it a thumbs up, both get recorded.' }] },
});
const chatId = first.json?.chat?.id || first.json?.chat_id || first.json?.id;
steps.push(['1 plain text', first.status]);
if (!chatId) { console.log(steps, 'No chat id came back, stopping.', Object.keys(first.json || {})); process.exit(1); }

const send = (label, message) => call('POST', `/chats/${chatId}/messages`, { message }).then(r => steps.push([label, r.status]));

await wait(1500);
// 2. Bold and underline inside a text (iMessage only).
await send('2 bold and underline', { parts: [{ type: 'text', value: 'Thu 12:30 PM  Pick up prescriptions', text_decorations: [{ range: [0, 12], style: 'bold' }] }] });
await wait(1500);
// 3. A link on its own: shows as a card using the page's own picture and title.
await send('3 link card', { parts: [{ type: 'link', value: site }] });
await wait(1500);
// 4. A picture we design ourselves, with a line of text.
await send('4 our own picture', { parts: [{ type: 'text', value: 'Dans test 4 of 5. A picture in our own design.' }, { type: 'media', url: `${site}/icon-512.png` }] });
await wait(1500);
// 5. The yes or no ask.
await send('5 thumbs ask', { parts: [{ type: 'text', value: 'Dans test 5 of 5. Could you take this one? Thumbs up for yes, thumbs down if you can\'t.' }] });

console.log(steps.map(([l, s]) => `${l}: ${s}`).join('\n'));
