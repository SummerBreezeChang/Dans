import { createHmac, timingSafeEqual } from 'node:crypto';

// Sign in with a phone number and a code sent by text. No password, and no new table:
// a code is worked out from a secret and the ten minute window it is sent in, so there is nothing to store.

export type Role = 'owner' | 'patient' | 'helper';
export interface Session { person: string; role: Role; exp: number }

export const cookieName = 'dans_session';
export const windowMs = 10 * 60 * 1000;
export const maxTries = 5;
export const maxSends = 3;
export const sessionDays = 30;

const mac = (secret: string, text: string) => createHmac('sha256', secret).update(text).digest();
const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const windowOf = (now = Date.now()) => Math.floor(now / windowMs);

/** The six digit code for one person in one window. */
export function codeFor(secret: string, person: string, window: number) {
  return String(mac(secret, `code:${person}:${window}`).readUInt32BE(0) % 1_000_000).padStart(6, '0');
}

/** A code is good in the window it was sent in and the one before it. Spaces and dashes are ignored. */
export function checkCode(secret: string, person: string, code: string, now = Date.now()) {
  const given = code.replace(/\D/g, '');
  if (given.length !== 6) return false;
  const w = windowOf(now);
  return [w, w - 1].some(x => same(codeFor(secret, person, x), given));
}

export const roleFor = (person: string, lead: string, patient = 'maya'): Role => (person === lead ? 'owner' : person === patient ? 'patient' : 'helper');

/** Where each person lands after signing in. */
export const homeFor = (role: Role, person: string) => (role === 'owner' ? '/' : role === 'patient' ? '/maya' : `/join/${person}`);

export const newSession = (person: string, role: Role, now = Date.now()): Session => ({ person, role, exp: now + sessionDays * 86_400_000 });

export function signSession(secret: string, s: Session) {
  const body = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${body}.${mac(secret, `session:${body}`).toString('base64url')}`;
}

/** Reads a cookie value. Returns null for anything missing, altered, expired or signed with another secret. */
export function readSession(secret: string, value: string | undefined, now = Date.now()): Session | null {
  if (!value) return null;
  const [body, sig] = value.split('.');
  if (!body || !sig || !same(mac(secret, `session:${body}`).toString('base64url'), sig)) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as Session;
    return s.person && s.role && s.exp > now ? s : null;
  } catch {
    return null;
  }
}
