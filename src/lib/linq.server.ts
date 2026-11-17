import { createHash } from 'node:crypto';

export function toE164(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/**
 * Where a text for this person should go.
 * Someone with a phone saved is texted there, directly. That is how a teammate joins the test.
 * Everyone else goes to the one SMS_SANDBOX_TO phone, tagged with who it was meant for,
 * so a whole circle can be tested from a single number. With neither, nobody is texted.
 */
export function routeText(phone: string | null | undefined, name: string, sandbox: string | undefined = process.env['SMS_SANDBOX_TO']) {
  const own = toE164(phone);
  if (own) return { to: own, prefix: '' };
  const test = toE164(sandbox);
  return test ? { to: test, prefix: `[To ${name.split(' ')[0]}] ` } : null;
}

/** Deterministic UUID so retries of the same logical message never double-send. */
export function keyToUuid(key: string) {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function sendLinq(to: string, message: string, idempotencyKey: string): Promise<{ ok: boolean; status?: number }> {
  const apiToken = process.env['LINQ_API_TOKEN'];
  const from = toE164(process.env['LINQ_FROM_NUMBER']);
  const recipient = toE164(to);
  if (!apiToken || !from || !recipient) return { ok: false };
  try {
    const res = await fetch('https://api.linqapp.com/api/partner/v3/chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient], message: { parts: [{ type: 'text', value: message }], idempotency_key: idempotencyKey } }),
      signal: AbortSignal.timeout(15000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

/** Sends at most once per logical key, recorded in the SMS log. */
export async function sendOnce(key: string, to: string, message: string) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { error } = await supabaseAdmin.from('care_sms_log').insert({ key, recipient: to });
  if (error) return { ok: false, duplicate: true };
  const result = await sendLinq(to, message, keyToUuid(key));
  await supabaseAdmin.from('care_sms_log').update({ ok: result.ok }).eq('key', key);
  return result;
}

const api = 'https://api.linqapp.com/api/partner/v3';

async function post(path: string, body: unknown): Promise<{ ok: boolean; status?: number; json: any }> {
  const apiToken = process.env['LINQ_API_TOKEN'];
  if (!apiToken) return { ok: false, json: null };
  try {
    const res = await fetch(api + path, { method: 'POST', headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { ok: res.ok, status: res.status, json: await res.json().catch(() => null) };
  } catch {
    return { ok: false, json: null };
  }
}

/** Reads one option's text from a poll, so a vote can be understood. */
export async function pollOptionText(messageId: string, optionId: string): Promise<string | null> {
  const apiToken = process.env['LINQ_API_TOKEN'];
  if (!apiToken) return null;
  try {
    const res = await fetch(`${api}/messages/${messageId}/poll`, { headers: { Authorization: `Bearer ${apiToken}` }, signal: AbortSignal.timeout(15000) });
    const j: any = await res.json();
    return (j?.poll?.options ?? []).find((o: any) => o.option_id === optionId)?.text ?? null;
  } catch {
    return null;
  }
}

/** What an ask was about, stored beside the text log so an answer can find its task. */
export type AskKind = 'helper' | 'lead';
export const askRef = (taskId: string, personId: string, to: string, kind: AskKind = 'helper') => `${kind === 'lead' ? 'lead:' : ''}${taskId}|${personId}|${to}`;
/** personId is who the ask is about: the helper being asked, or for a lead ask, the helper Dans suggests. */
export function parseAskRef(ref: string) {
  const kind: AskKind = ref.startsWith('lead:') ? 'lead' : 'helper';
  const [taskId, personId, to] = ref.replace(/^lead:/, '').split('|');
  return taskId && personId && to ? { taskId, personId, to, kind } : null;
}

/**
 * Sends an ask as one message: the question, a blank line, then how to answer (thumb or one word).
 * Summer chose this over tappable poll choices on 2026-11-16: polls show a blank box on older iPhones
 * and let helpers add their own choices. At most once per key. Remembers which task the message was about.
 */
export async function sendAsk(key: string, to: string, question: string, typedAnswers: string, taskId: string, personId: string, kind: AskKind = 'helper') {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const from = toE164(process.env['LINQ_FROM_NUMBER']);
  const recipient = toE164(to);
  if (!from || !recipient) return { ok: false };
  const { error } = await supabaseAdmin.from('care_sms_log').insert({ key, recipient });
  if (error) return { ok: false, duplicate: true };

  const first = await post('/chats', { from, to: [recipient], message: { parts: [{ type: 'text', value: `${question}\n\n${typedAnswers}` }], idempotency_key: keyToUuid(key) } });
  await supabaseAdmin.from('care_sms_log').update({ ok: first.ok }).eq('key', key);
  if (!first.ok) return { ok: false, ...(first.status ? { status: first.status } : {}) };

  const questionId: string | undefined = first.json?.chat?.message?.id ?? first.json?.message?.id ?? first.json?.message_id;
  const ref = askRef(taskId, personId, recipient, kind);
  const rows = [{ key: `ask:${questionId ?? key}`, recipient: ref, ok: true }];
  await supabaseAdmin.from('care_sms_log').upsert(rows, { onConflict: 'key' });
  return { ok: true };
}
