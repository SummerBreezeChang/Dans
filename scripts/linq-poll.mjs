// Sends the ask as a question followed by a poll: two tappable choices inside the message.
// Send:   node --env-file=.env scripts/linq-poll.mjs
// Check:  node --env-file=.env scripts/linq-poll.mjs check <messageId>
// iMessage only. Goes to the existing chat with the test phone.

const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const digits = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const from = encodeURIComponent('+' + (digits.length === 10 ? '1' + digits : digits));

if (process.argv[2] === 'check') {
  const res = await fetch(`${base}/messages/${process.argv[3]}/poll`, { headers });
  const j = await res.json();
  const poll = j.poll || j;
  for (const o of poll.options || []) console.log(`${o.text}: ${o.vote_count ?? (o.votes || []).length ?? 0} vote(s)`);
  if (!poll.options) console.log(res.status, Object.keys(j));
  process.exit(0);
}

const chats = await (await fetch(`${base}/chats?from=${from}&limit=5`, { headers })).json();
const chat = (chats.chats || chats.data || [])[0];
if (!chat) { console.log('No chat found. Run scripts/linq-test.mjs first.'); process.exit(1); }

const q = await fetch(`${base}/chats/${chat.id}/messages`, { method: 'POST', headers, body: JSON.stringify({ message: { parts: [{ type: 'text', value: "Henry, can you pick up Maya's prescriptions Thu, Nov 19 at 12:30 PM?" }] } }) });
console.log('question:', q.status);
await new Promise(r => setTimeout(r, 1500));
const p = await fetch(`${base}/chats/${chat.id}/polls`, { method: 'POST', headers, body: JSON.stringify({ poll: { options: [{ text: 'Got it' }, { text: 'Pass it on' }] } }) });
const pj = await p.json().catch(() => ({}));
console.log('poll:', p.status, '| poll message id:', pj.message_id || pj.poll?.message_id || JSON.stringify(pj).slice(0, 200));
