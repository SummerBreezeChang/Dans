import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { checkCode, codeFor, homeFor, maxSends, maxTries, roleFor, windowOf } from './auth';
import { leadId } from './careSync.functions';

// Sign in by text. Only people who already have a phone number saved in the circle can sign in.

const phone = z.string().trim().min(7).max(24);

async function findPerson(db: { from: (t: string) => any }, raw: string) {
  const { toE164 } = await import('./linq.server');
  const want = toE164(raw);
  if (!want) return null;
  const { data } = await db.from('care_caregivers').select('id,name,phone');
  const p = (data ?? []).find((x: { phone: string | null }) => toE164(x.phone) === want);
  return p ? { id: String(p.id), phone: want } : null;
}

/** Is sign in on, and is this browser signed in? */
export const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { loginOn, currentSession } = await import('./auth.server');
  const on = loginOn();
  const s = on ? currentSession() : null;
  return { required: on, session: s ? { person: s.person, role: s.role } : null };
});

export const requestCode = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ phone }).parse(d))
  .handler(async ({ data }) => {
    const { loginOn } = await import('./auth.server');
    if (!loginOn()) return { ok: false as const, reason: 'off' as const };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const person = await findPerson(db, data.phone);
    if (!person) return { ok: false as const, reason: 'unknown' as const };
    const w = windowOf();
    const { count } = await db.from('care_sms_log').select('key', { count: 'exact', head: true }).like('key', `otp:${person.id}:${w}:%`);
    const sent = count ?? 0;
    if (sent >= maxSends) return { ok: false as const, reason: 'slow' as const };
    const { sendOnce } = await import('./linq.server');
    const code = codeFor(process.env['SESSION_SECRET'] ?? '', person.id, w);
    const r = await sendOnce(`otp:${person.id}:${w}:${sent}`, person.phone, `Your Dans code is ${code}. Use it in the next 10 minutes.`);
    return r.ok ? { ok: true as const, tail: person.phone.slice(-4) } : { ok: false as const, reason: 'send' as const };
  });

export const verifyCode = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ phone, code: z.string().trim().min(1).max(12) }).parse(d))
  .handler(async ({ data }) => {
    const { loginOn, beginSession } = await import('./auth.server');
    if (!loginOn()) return { ok: false as const, reason: 'off' as const };
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const person = await findPerson(db, data.phone);
    if (!person) return { ok: false as const, reason: 'unknown' as const };
    const w = windowOf();
    const { count } = await db.from('care_sms_log').select('key', { count: 'exact', head: true }).like('key', `otp-try:${person.id}:${w}:%`);
    const used = count ?? 0;
    if (used >= maxTries) return { ok: false as const, reason: 'locked' as const };
    await db.from('care_sms_log').insert({ key: `otp-try:${person.id}:${w}:${used}-${Math.random().toString(36).slice(2, 8)}`, recipient: person.id, ok: false });
    if (!checkCode(process.env['SESSION_SECRET'] ?? '', person.id, data.code)) return { ok: false as const, reason: 'wrong' as const, left: maxTries - used - 1 };
    const role = roleFor(person.id, leadId);
    beginSession(person.id, role);
    return { ok: true as const, to: homeFor(role, person.id) };
  });

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const { endSession } = await import('./auth.server');
  endSession();
  return { ok: true };
});
