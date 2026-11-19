import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server';
import { cookieName, newSession, readSession, sessionDays, signSession, type Role, type Session } from './auth';

const secret = () => process.env['SESSION_SECRET'] ?? '';

/** Sign in is on only when the switch and the secret are both set, so a missing secret can never lock the owner out. */
export const loginOn = () => process.env['LOGIN_REQUIRED'] === 'true' && secret() !== '';

export function currentSession(): Session | null {
  const s = secret();
  return s ? readSession(s, getCookie(cookieName)) : null;
}

/** Throws unless the caller is signed in with one of these roles. Does nothing while sign in is off. */
export async function guard(...roles: Role[]): Promise<void> {
  if (!loginOn()) return;
  const s = currentSession();
  if (!s || !roles.includes(s.role)) throw new Error('Sign in first');
}

export function beginSession(person: string, role: Role) {
  setCookie(cookieName, signSession(secret(), newSession(person, role)), { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax', path: '/', maxAge: sessionDays * 86_400 });
}

export const endSession = () => deleteCookie(cookieName, { path: '/' });
