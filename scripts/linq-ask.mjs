// Sends the one-message ask to the test phone, then reads back the answer.
// Send:   node --env-file=.env scripts/linq-ask.mjs
// Check:  node --env-file=.env scripts/linq-ask.mjs check

const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const digits = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const from = encodeURIComponent('+' + (digits.length === 10 ? '1' + digits : digits));

const chats = await (await fetch(`${base}/chats?from=${from}&limit=5`, { headers })).json();
const chat = (chats.chats || chats.data || [])[0];
if (!chat) { console.log('No chat found. Run scripts/linq-test.mjs first.'); process.exit(1); }

if (process.argv[2] === 'check') {
  const m = await (await fetch(`${base}/chats/${chat.id}/messages?limit=6`, { headers })).json();
  for (const x of (m.messages || m.data || []).slice(0, 6)) {
    const part = (x.parts || [])[0] || {};
    const reactions = (part.reactions || []).map(r => r.type).join(',');
    console.log(x.is_from_me ? 'sent    ' : 'RECEIVED', '·', String(part.value || part.type).replace(/\n/g, ' / ').slice(0, 60), reactions ? `· answer: ${reactions}` : '');
  }
  process.exit(0);
}

const ask = "Henry, can you pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM? \u{1F44D} : reply YES  or  \u{1F44E} : reply PASS";
const res = await fetch(`${base}/chats/${chat.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ message: { parts: [{ type: 'text', value: ask }] } }) });
console.log('ask sent:', res.status);
