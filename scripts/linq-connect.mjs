// Tells Linq to send replies, thumbs and tapped choices to Dans.
// Run once:  node --env-file=.env scripts/linq-connect.mjs
// The signing secret Linq returns is shown only once. It is written straight into .env as
// WEBHOOK_SIGNING_SECRET and never printed. Add the same value to Vercel yourself.
import { appendFileSync } from 'node:fs';

if (process.env.WEBHOOK_SIGNING_SECRET) { console.log('.env already has WEBHOOK_SIGNING_SECRET. Nothing done.'); process.exit(0); }
const base = 'https://api.linqapp.com/api/partner/v3';
const headers = { Authorization: 'Bearer ' + process.env.LINQ_API_TOKEN.trim(), 'Content-Type': 'application/json' };
const digits = process.env.LINQ_FROM_NUMBER.replace(/\D/g, '');
const line = '+' + (digits.length === 10 ? '1' + digits : digits);
const target_url = (process.env.DANS_URL || 'https://dans-support.vercel.app') + '/api/public/linq-webhook';

const res = await fetch(`${base}/webhook-subscriptions`, { method: 'POST', headers, body: JSON.stringify({ target_url, subscribed_events: ['message.received', 'reaction.added', 'poll.vote.added', 'poll.reaction.added'], phone_numbers: [line] }) });
const j = await res.json().catch(() => ({}));
if (!res.ok || !j.signing_secret) { console.log('Not created:', res.status, JSON.stringify(j).slice(0, 300)); process.exit(1); }
appendFileSync('.env', `\nWEBHOOK_SIGNING_SECRET=${j.signing_secret}\n`);
console.log('Created', j.id, '->', j.target_url, j.subscribed_events.join(', '));
console.log('Secret saved to .env (', j.signing_secret.length, 'characters, starts with whsec_:', j.signing_secret.startsWith('whsec_'), ')');
