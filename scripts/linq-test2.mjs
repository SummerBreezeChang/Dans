// Round two of the one-phone Linq test: the weekly check-in as it would really arrive.
// Run:  node --env-file=.env scripts/linq-test2.mjs
// Sends into the existing chat with the test phone. Nothing goes to anyone else.

const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const digits = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const from = encodeURIComponent('+' + (digits.length === 10 ? '1' + digits : digits));
const site = process.env.DANS_URL || 'https://dans-support.vercel.app';

const page = await (await fetch(site)).text();
console.log('page offers a preview picture:', page.includes('og:image'));

const chats = await (await fetch(`${base}/chats?from=${from}&limit=5`, { headers })).json();
const chat = (chats.chats || chats.data || [])[0];
if (!chat) { console.log('No chat found. Run scripts/linq-test.mjs first.'); process.exit(1); }

async function send(label, message) {
  const res = await fetch(`${base}/chats/${chat.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ message }) });
  console.log(`${label}: ${res.status}`);
  await new Promise(r => setTimeout(r, 1800));
}

await send('A intro text', { parts: [{ type: 'text', value: 'Round 2. Hi Henry. Maya could use a hand with five things this week. Tap to pick what works for you.' }] });
await send('B link card', { parts: [{ type: 'link', value: `${site}/?w=47` }] });
await send('C our card as a picture', { parts: [{ type: 'media', url: `${site}/card-week.png` }] });
await send('D bold whole line', { parts: [{ type: 'text', value: 'Thu 12:30 PM · Pick up prescriptions', text_decorations: [{ range: [0, 36], style: 'bold' }] }] });
