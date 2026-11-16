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
 * With SMS_SANDBOX_TO set, every text goes to that one phone, tagged with who it was meant for,
 * so a whole circle can be tested from a single number. Otherwise it goes to the person's own phone.
 */
export function routeText(phone: string | null | undefined, name: string, sandbox: string | undefined = process.env['SMS_SANDBOX_TO']) {
  const test = toE164(sandbox);
  if (test) return { to: test, prefix: `[To ${name.split(' ')[0]}] ` };
  const to = toE164(phone);
  return to ? { to, prefix: '' } : null;
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
