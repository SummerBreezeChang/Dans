import { answerLine, careQuestion, whenText } from './careSync.functions';
import { readChoice, readReply, readThumb, type Answer } from './answers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CareTask, Caregiver, Category, Help, Slot } from './assignmentEngine';
import { pickReplacement, upcomingTask } from './smartReassign';
import { parseAskRef, pollOptionText, routeText, sendAsk, sendOnce, toE164 } from './linq.server';

/** Standard Webhooks verification (webhook-id / webhook-timestamp / webhook-signature). */
export function verifySignature(secret: string, id: string, ts: string, body: string, header: string) {
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret);
  const expected = Buffer.from(createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64'));
  return header.split(' ').some(part => {
    const sig = Buffer.from(part.split(',')[1] ?? '');
    return sig.length === expected.length && timingSafeEqual(sig, expected);
  });
}

/** What came in: who answered, which message it points at (a tap or a thumb), and what they said. */
export async function readEvent(payload: any, optionText: (messageId: string, optionId: string) => Promise<string | null> = pollOptionText): Promise<{ from: string | null; messageId: string | null; answer: Answer | null; note: string }> {
  const d = payload?.data ?? {};
  const type: string = payload?.event_type ?? '';
  const handle = (v: unknown) => toE164(typeof v === 'string' ? v : null);
  if (type === 'poll.vote.added') {
    const text = d.message_id && d.option_id ? await optionText(d.message_id, d.option_id) : null;
    return { from: handle(d.sender_handle?.handle), messageId: d.message_id ?? null, answer: readChoice(text), note: text ? `chose "${text.slice(0, 80)}"` : 'tapped a choice' };
  }
  if (type === 'reaction.added' || type === 'poll.reaction.added') {
    if (d.is_from_me) return { from: null, messageId: null, answer: null, note: '' };
    return { from: handle(d.from ?? d.from_handle?.handle), messageId: d.message_id ?? null, answer: readThumb(d.reaction_type), note: `reacted ${d.reaction_type ?? ''}`.trim() };
  }
  if (type === 'message.received' && d.direction !== 'outbound') {
    const parts: any[] = d.parts ?? d.message?.parts ?? [];
    const text = String(parts.filter(p => p?.type === 'text').map(p => p.value).join(' ') || d.text || '').slice(0, 2000);
    return { from: handle(d.sender_handle?.handle ?? d.from), messageId: null, answer: readReply(text), note: `wrote "${text.slice(0, 120)}"` };
  }
  return { from: null, messageId: null, answer: null, note: '' };
}

export async function handleLinqWebhook(request: Request): Promise<Response> {
  const secret = process.env['WEBHOOK_SIGNING_SECRET'] ?? process.env['LINQ_WEBHOOK_SECRET'];
  if (!secret) return Response.json({ error: 'Webhook is not configured' }, { status: 503 });
  const body = await request.text();
  if (body.length > 100000) return Response.json({ error: 'Too large' }, { status: 413 });
  const id = request.headers.get('webhook-id') ?? '';
  const ts = request.headers.get('webhook-timestamp') ?? '';
  const sig = request.headers.get('webhook-signature') ?? '';
  if (!id || !ts || !sig || !verifySignature(secret, id, ts, body, sig)) return Response.json({ error: 'Invalid signature' }, { status: 401 });

  let payload: any;
  try { payload = JSON.parse(body); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const { from, messageId, answer, note } = await readEvent(payload);
  if (!from) return Response.json({ ignored: true });

  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: cg }, { data: rows }] = await Promise.all([db.from('care_caregivers').select('*'), db.from('care_tasks').select('*')]);
  const people: Caregiver[] = (cg ?? []).map(c => ({ id: c.id, name: c.name, initials: '', role: 'Secondary Caregiver', visibility: 'Task-only', cap: c.cap, availability: c.availability, ...(c.phone ? { contact: c.phone } : {}), ...(c.helps ? { helps: c.helps as Help[] } : {}) }));
  const tasks: CareTask[] = (rows ?? []).map(t => ({ id: t.id, title: t.title, category: t.category as Category, day: t.day, slot: t.slot as Slot, time: t.time, duration: 0, owner: t.owner ?? undefined, status: t.status as CareTask['status'], approved: true, published: t.published, notes: '', declinedBy: t.declined_by }));

  // Which ask is this an answer to? A tap or a thumb points at its message. A typed reply answers the latest ask sent to that phone.
  const { data: asked } = messageId
    ? await db.from('care_sms_log').select('recipient').eq('key', `ask:${messageId}`).limit(1)
    : await db.from('care_sms_log').select('recipient').like('key', 'ask:%').like('recipient', `%|${from}`).order('created_at', { ascending: false }).limit(1);
  const ref = asked?.[0] ? parseAskRef(asked[0].recipient) : null;
  let person = ref ? people.find(p => p.id === ref.personId) : undefined;
  let task = ref ? tasks.find(t => t.id === ref.taskId) : undefined;
  if (!ref && !messageId) {
    person = people.find(p => toE164(p.contact) === from);
    task = person ? upcomingTask(person.id, tasks) : undefined;
  }
  if (!person) return Response.json({ ignored: true });
  const first = person.name.split(' ')[0];

  if (!answer) {
    // Not a yes or a pass (a question, another reaction, a choice they added). Leave it for the lead to read.
    if (payload.event_type !== 'reaction.added' && payload.event_type !== 'poll.reaction.added') await db.from('care_activity').insert({ title: `${first} replied by text`, detail: `${person.name} ${note}${task ? ` about "${task.title}"` : ''}. Dans did not change anything.` });
    return Response.json({ ignored: true, noted: true });
  }
  if (!task || task.owner !== person.id || task.status === 'done') {
    if (!messageId) await sendOnce(`wh:${id}:none`, from, `Thanks, ${first}. You have nothing waiting on you right now.`);
    return Response.json({ changed: false });
  }
  const when = whenText({ day: task.day, time: task.time });

  if (answer === 'yes') {
    if (task.status === 'accepted') return Response.json({ changed: false });
    await db.from('care_tasks').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', task.id);
    await db.from('care_activity').insert({ title: `${first} said yes`, detail: `${person.name} took "${task.title}" (${when}).` });
    await sendOnce(`wh:${id}:yes`, from, `Thank you, ${first}. It's yours.`);
    return Response.json({ changed: true, task: task.id, status: 'accepted' });
  }

  const next = pickReplacement(task, person.id, people, tasks);
  await db.from('care_tasks').update({ owner: next?.id ?? null, status: next ? 'assigned' : 'unclaimed', declined_by: [...(task.declinedBy ?? []), person.id], updated_at: new Date().toISOString() }).eq('id', task.id);
  await db.from('care_activity').insert({ title: next ? `${first} passed, asking ${next.name.split(' ')[0]}` : `${first} passed, needs someone`, detail: `${person.name} passed on "${task.title}" (${when}).${next ? ` Dans asked ${next.name}.` : ' Nobody else is free then.'}` });
  await sendOnce(`wh:${id}:orig`, from, `No problem, ${first}. I'll ask someone else.`);
  const nextRoute = next ? routeText(next.contact, next.name) : null;
  if (next && nextRoute) await sendAsk(`wh:${id}:new`, nextRoute.to, nextRoute.prefix + careQuestion('reassigned', next.name, task.title, { day: task.day, time: task.time }), answerLine, task.id, next.id);
  return Response.json({ changed: true, task: task.id, to: next?.id ?? null });
}
