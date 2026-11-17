import { careText } from './careSync.functions';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CareTask, Caregiver, Category, Help, Slot } from './assignmentEngine';
import { isUnavailableMessage, pickReplacement, upcomingTask } from './smartReassign';
import { routeText, sendOnce, toE164 } from './linq.server';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

function extract(payload: any): { from: string | null; text: string } {
  const d = payload?.data ?? payload;
  const msg = d?.message ?? d;
  const fromRaw = d?.sender_handle?.handle ?? msg?.sender_handle?.handle ?? d?.from ?? msg?.from ?? d?.handle;
  const parts: any[] = msg?.parts ?? d?.parts ?? [];
  const text = parts.filter(p => p?.type === 'text').map(p => p.value).join(' ') || msg?.text || d?.text || '';
  return { from: toE164(typeof fromRaw === 'string' ? fromRaw : null), text: String(text).slice(0, 2000) };
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
  if (payload?.event_type !== 'message.received' || payload?.data?.direction === 'outbound') return Response.json({ ignored: true });
  const { from, text } = extract(payload);
  if (!from || !isUnavailableMessage(text)) return Response.json({ ignored: true });

  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: cg }, { data: rows }] = await Promise.all([db.from('care_caregivers').select('*'), db.from('care_tasks').select('*')]);
  const people: Caregiver[] = (cg ?? []).map(c => ({ id: c.id, name: c.name, initials: '', role: 'Secondary Caregiver', visibility: 'Task-only', cap: c.cap, availability: c.availability, ...(c.phone ? { contact: c.phone } : {}), ...(c.helps ? { helps: c.helps as Help[] } : {}) }));
  const tasks: CareTask[] = (rows ?? []).map(t => ({ id: t.id, title: t.title, category: t.category as Category, day: t.day, slot: t.slot as Slot, time: t.time, duration: 0, owner: t.owner ?? undefined, status: t.status as CareTask['status'], approved: true, published: t.published, notes: '', declinedBy: t.declined_by }));
  const sender = people.find(p => toE164(p.contact) === from);
  if (!sender) return Response.json({ ignored: true });
  const task = upcomingTask(sender.id, tasks);
  if (!task) {
    await sendOnce(`wh:${id}:none`, from, `Thanks, ${sender.name.split(' ')[0]}. You have nothing coming up right now.`);
    return Response.json({ reassigned: false });
  }
  const next = pickReplacement(task, sender.id, people, tasks);
  const when = `${days[task.day]} ${task.time}`;
  await db.from('care_tasks').update({ owner: next?.id ?? null, status: next ? 'assigned' : 'unclaimed', declined_by: [...task.declinedBy!, sender.id], updated_at: new Date().toISOString() }).eq('id', task.id);
  await db.from('care_activity').insert({ title: next ? 'Task reassigned by text' : 'Task needs a new helper', detail: `${sender.name} replied they're unavailable for "${task.title}" (${when}).${next ? ` Now with ${next.name}.` : ''}` });
  await sendOnce(`wh:${id}:orig`, from, `No problem, ${sender.name.split(' ')[0]}. I'll ask someone else.`);
  const nextRoute = next ? routeText(next.contact, next.name) : null;
  if (next && nextRoute) await sendOnce(`wh:${id}:new`, nextRoute.to, nextRoute.prefix + careText('reassigned', next.name, task.title, { day: task.day, time: task.time }));
  return Response.json({ reassigned: true, task: task.id, to: next?.id ?? null });
}
