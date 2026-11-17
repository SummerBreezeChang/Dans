import { answerLine, careQuestion, leadId, leadText, passedText, whenText } from './careSync.functions';
import { loadPrefs } from './notify.functions';
import { recordAnswer, viaFor } from './answers.server';
import { readChoice, readReply, readThumb, type Answer } from './answers';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CareTask, Caregiver, Category, Help, Slot } from './assignmentEngine';
import { pickReplacement, upcomingTask } from './smartReassign';
import { nextOpen } from './weekPlan';
import { currentReactions, parseAskRef, pollOptionText, routeText, sendAsk, sendOnce, toE164 } from './linq.server';

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
export async function readEvent(payload: any, optionText: (messageId: string, optionId: string) => Promise<string | null> = pollOptionText): Promise<{ from: string | null; messageId: string | null; answer: Answer | null; note: string; reaction?: string }> {
  const d = payload?.data ?? {};
  const type: string = payload?.event_type ?? '';
  const handle = (v: unknown) => toE164(typeof v === 'string' ? v : null);
  if (type === 'poll.vote.added') {
    const text = d.message_id && d.option_id ? await optionText(d.message_id, d.option_id) : null;
    return { from: handle(d.sender_handle?.handle), messageId: d.message_id ?? null, answer: readChoice(text), note: text ? `chose "${text.slice(0, 80)}"` : 'tapped a choice' };
  }
  if (type === 'reaction.added' || type === 'poll.reaction.added') {
    if (d.is_from_me) return { from: null, messageId: null, answer: null, note: '' };
    return { from: handle(d.from ?? d.from_handle?.handle), messageId: d.message_id ?? null, answer: readThumb(d.reaction_type), note: `reacted ${d.reaction_type ?? ''}`.trim(), reaction: String(d.reaction_type ?? '') };
  }
  if (type === 'message.received' && d.direction !== 'outbound') {
    const parts: any[] = d.parts ?? d.message?.parts ?? [];
    const text = String(parts.filter(p => p?.type === 'text').map(p => p.value).join(' ') || d.text || '').slice(0, 2000);
    const replied = d.reply_to?.message_id ?? d.reply_to?.id ?? (typeof d.reply_to === 'string' ? d.reply_to : null) ?? d.message?.reply_to?.message_id ?? null;
    return { from: handle(d.sender_handle?.handle ?? d.from), messageId: replied, answer: readReply(text), note: `wrote "${text.slice(0, 120)}"` };
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
  const { from, messageId, answer, note, reaction } = await readEvent(payload);
  if (!from) return Response.json({ ignored: true });
  // A thumb that was changed to another thumb: only the one on the message now counts.
  if (reaction !== undefined && messageId) {
    const now = await currentReactions(messageId);
    if (now && !now.includes(reaction)) return Response.json({ ignored: true, replaced: true });
  }

  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: cg }, { data: rows }] = await Promise.all([db.from('care_caregivers').select('*'), db.from('care_tasks').select('*')]);
  const people: Caregiver[] = (cg ?? []).map(c => ({ id: c.id, name: c.name, initials: '', role: 'Secondary Caregiver', visibility: 'Task-only', cap: c.cap, availability: c.availability, ...(c.phone ? { contact: c.phone } : {}), ...(c.helps ? { helps: c.helps as Help[] } : {}) }));
  const tasks: CareTask[] = (rows ?? []).map(t => ({ id: t.id, title: t.title, category: t.category as Category, day: t.day, slot: t.slot as Slot, time: t.time, duration: 0, owner: t.owner ?? undefined, status: t.status as CareTask['status'], approved: true, published: t.published, notes: '', declinedBy: t.declined_by }));

  // Which ask is this an answer to? A tap or a thumb points at its message. A typed reply answers the latest ask sent to that phone.
  const byMessage = messageId ? (await db.from('care_sms_log').select('recipient').eq('key', `ask:${messageId}`).limit(1)).data : null;
  const typed = payload.event_type === 'message.received';
  const { data: asked } = byMessage?.length || !typed
    ? { data: byMessage }
    : await db.from('care_sms_log').select('recipient').like('key', 'ask:%').like('recipient', `%|${from}`).order('created_at', { ascending: false }).limit(1);
  const ref = asked?.[0] ? parseAskRef(asked[0].recipient) : null;
  let person = ref ? people.find(p => p.id === ref.personId) : undefined;
  let task = ref ? tasks.find(t => t.id === ref.taskId) : undefined;
  if (!ref && typed && !messageId) {
    person = people.find(p => toE164(p.contact) === from);
    task = person ? upcomingTask(person.id, tasks) : undefined;
  }
  if (!person) return Response.json({ ignored: true });
  const lead = people.find(p => p.id === leadId);
  const isReaction = payload.event_type === 'reaction.added' || payload.event_type === 'poll.reaction.added';
  const via = viaFor(payload.event_type);

  // The lead answering Dans's suggestion: "Nancy is free then. Ask Nancy?"
  if (ref?.kind === 'lead') {
    const who = person.name.split(' ')[0];
    if (!task || !answer) {
      if (task && !isReaction) {
        await db.from('care_activity').insert({ title: 'Reply about an open task', detail: `Summer ${note} about "${task.title}". Dans did not change anything.` });
        await recordAnswer(db, { personId: leadId, taskId: task.id, answer: 'other', via, note });
      }
      return Response.json({ ignored: true });
    }
    await recordAnswer(db, { personId: leadId, taskId: task.id, answer, via, note: person.id === leadId ? 'take it' : `asked about ${person.id}` });
    if (task.owner || task.status === 'done') return Response.json({ changed: false });
    if (answer === 'pass') {
      await sendOnce(`wh:${id}:leadpass`, from, `OK. It's open in Dans for you to pick someone.`);
      return Response.json({ changed: false });
    }
    if (person.id === leadId) {
      await db.from('care_tasks').update({ owner: person.id, status: 'accepted', updated_at: new Date().toISOString() }).eq('id', task.id);
      await db.from('care_activity').insert({ title: `${who} took it`, detail: `${person.name} took "${task.title}" (${whenText({ day: task.day, time: task.time })}) because nobody else was free.` });
      await sendOnce(`wh:${id}:leadtook`, from, `Thank you, ${who}. It's yours.`);
      return Response.json({ changed: true, task: task.id, to: person.id });
    }
    await db.from('care_tasks').update({ owner: person.id, status: 'assigned', updated_at: new Date().toISOString() }).eq('id', task.id);
    await db.from('care_activity').insert({ title: `Asked ${who}`, detail: `Summer said yes. Dans asked ${person.name} about "${task.title}" (${whenText({ day: task.day, time: task.time })}).` });
    const route = routeText(person.contact, person.name);
    if (route) await sendAsk(`wh:${id}:new`, route.to, route.prefix + careQuestion('reassigned', person.name, task.title, { day: task.day, time: task.time }), answerLine, task.id, person.id);
    await sendOnce(`wh:${id}:leadyes`, from, `Done. I asked ${who}.`);
    return Response.json({ changed: true, task: task.id, to: person.id });
  }

  const first = person.name.split(' ')[0];
  if (!answer) {
    // Not a yes or a pass (a question, another reaction, a choice they added). Leave it for the lead to read.
    if (!isReaction) {
      await db.from('care_activity').insert({ title: `${first} replied by text`, detail: `${person.name} ${note}${task ? ` about "${task.title}"` : ''}. Dans did not change anything.` });
      await recordAnswer(db, { personId: person.id, taskId: task?.id, answer: 'other', via, note });
    }
    return Response.json({ ignored: true, noted: true });
  }
  if (!task || task.owner !== person.id || task.status === 'done') {
    await recordAnswer(db, { personId: person.id, taskId: task?.id, answer, via, note: 'task was no longer theirs' });
    if (!messageId) await sendOnce(`wh:${id}:none`, from, `Thanks, ${first}. You have nothing waiting on you right now.`);
    return Response.json({ changed: false });
  }
  await recordAnswer(db, { personId: person.id, taskId: task.id, answer, via });
  const at = { day: task.day, time: task.time };
  const when = whenText(at);

  if (answer === 'yes') {
    const already = task.status === 'accepted';
    if (!already) {
      await db.from('care_tasks').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', task.id);
      await db.from('care_activity').insert({ title: `${first} said yes`, detail: `${person.name} took "${task.title}" (${when}).` });
      const after = tasks.map(t => t.id === task.id ? { ...t, status: 'accepted' as const } : t);
      const nxt = nextOpen(after);
      const who = nxt ? pickReplacement(nxt, '', people.filter(p => p.id !== leadId), after) : undefined;
      const whoRoute = who ? routeText(who.contact, who.name) : null;
      if (nxt && who && whoRoute) {
        await db.from('care_tasks').update({ owner: who.id, status: 'assigned', updated_at: new Date().toISOString() }).eq('id', nxt.id);
        await sendAsk(`wh:${id}:next`, whoRoute.to, whoRoute.prefix + careQuestion('assigned', who.name, nxt.title, { day: nxt.day, time: nxt.time }), answerLine, nxt.id, who.id);
      }
    }
    await sendOnce(`wh:${id}:yes`, from, already ? `Thank you, ${first}.` : `Thank you, ${first}. It's yours.`);
    return Response.json({ changed: !already, task: task.id, status: 'accepted' });
  }

  // A pass. Dans finds the next free person (never the lead). By default it asks them straight away.
  // With "Check with me first" on, the task opens and the lead is asked before anyone else is.
  const prefs = await loadPrefs(db);
  const next = pickReplacement(task, person.id, people.filter(p => p.id !== leadId), tasks);
  const declined = [...(task.declinedBy ?? []), person.id];
  const leadRoute = lead ? routeText(lead.contact, lead.name) : null;
  const nextRoute = next ? routeText(next.contact, next.name) : null;

  if (prefs.pass === 'auto' && next) {
    await db.from('care_tasks').update({ owner: next.id, status: 'assigned', declined_by: declined, updated_at: new Date().toISOString() }).eq('id', task.id);
    await db.from('care_activity').insert({ title: `${first} passed, asked ${next.name.split(' ')[0]}`, detail: `${person.name} passed on "${task.title}" (${when}). Dans asked ${next.name}.` });
    await sendOnce(`wh:${id}:orig`, from, `No problem, ${first}. I'll ask someone else.`);
    if (nextRoute) await sendAsk(`wh:${id}:new`, nextRoute.to, nextRoute.prefix + careQuestion('reassigned', next.name, task.title, at), answerLine, task.id, next.id);
    if (prefs.passed && lead && leadRoute) await sendOnce(`wh:${id}:lead`, leadRoute.to, leadRoute.prefix + passedText(lead.name, person.name, task.title, at, next.name));
    return Response.json({ changed: true, task: task.id, asked: next.id });
  }

  await db.from('care_tasks').update({ owner: null, status: 'unclaimed', declined_by: declined, updated_at: new Date().toISOString() }).eq('id', task.id);
  await db.from('care_activity').insert({ title: `${first} passed`, detail: `${person.name} passed on "${task.title}" (${when}).${next ? ` ${next.name} is free then.` : ' Nobody else is free then.'}` });
  await sendOnce(`wh:${id}:orig`, from, `No problem, ${first}. I'll let ${lead?.name.split(' ')[0] ?? 'the family'} know.`);
  if (lead && leadRoute && (next || prefs.nobody)) {
    const text = leadRoute.prefix + leadText(lead.name, person.name, task.title, at, next?.name);
    if (next) await sendAsk(`wh:${id}:lead`, leadRoute.to, text, answerLine, task.id, next.id, 'lead');
    else await sendAsk(`wh:${id}:lead`, leadRoute.to, text, answerLine, task.id, leadId, 'lead');
  }
  return Response.json({ changed: true, task: task.id, suggested: next?.id ?? null });
}
