import { afterEach, describe, expect, it, vi } from 'vitest';

const jar: Record<string, string> = {};
vi.mock('@tanstack/react-start/server', () => ({
  getCookie: (name: string) => jar[name],
  setCookie: (name: string, value: string) => { jar[name] = value; },
  deleteCookie: (name: string) => { delete jar[name]; },
}));

import { checkCode, codeFor, homeFor, newSession, readSession, roleFor, signSession, windowMs, windowOf } from './auth';
import { beginSession, endSession, guard, loginOn } from './auth.server';

const secret = 'test-secret-with-enough-length-0123456789';
const now = Date.UTC(2026, 10, 19, 15, 0, 0);

describe('the code', () => {
  it('is six digits, the same each time, and different for each person and window', () => {
    const w = windowOf(now);
    expect(codeFor(secret, 'summer', w)).toMatch(/^\d{6}$/);
    expect(codeFor(secret, 'summer', w)).toBe(codeFor(secret, 'summer', w));
    expect(codeFor(secret, 'summer', w)).not.toBe(codeFor(secret, 'henry', w));
    expect(codeFor(secret, 'summer', w)).not.toBe(codeFor(secret, 'summer', w + 1));
    expect(codeFor('another secret', 'summer', w)).not.toBe(codeFor(secret, 'summer', w));
  });
  it('works in the window it was sent in and the one after, then stops', () => {
    const sent = codeFor(secret, 'summer', windowOf(now));
    expect(checkCode(secret, 'summer', sent, now)).toBe(true);
    expect(checkCode(secret, 'summer', sent, now + windowMs)).toBe(true);
    expect(checkCode(secret, 'summer', sent, now + 2 * windowMs)).toBe(false);
  });
  it('is refused for the wrong person, a wrong digit or a short code, and ignores spaces', () => {
    const sent = codeFor(secret, 'summer', windowOf(now));
    expect(checkCode(secret, 'henry', sent, now)).toBe(false);
    expect(checkCode(secret, 'summer', sent.replace(/\d$/, d => String((Number(d) + 1) % 10)), now)).toBe(false);
    expect(checkCode(secret, 'summer', sent.slice(0, 5), now)).toBe(false);
    expect(checkCode(secret, 'summer', `${sent.slice(0, 3)} ${sent.slice(3)}`, now)).toBe(true);
  });
});

describe('the session', () => {
  it('reads back what was signed', () => {
    const s = newSession('summer', 'owner', now);
    expect(readSession(secret, signSession(secret, s), now)).toEqual(s);
  });
  it('refuses a changed, expired or foreign cookie', () => {
    const s = newSession('henry', 'helper', now);
    const value = signSession(secret, s);
    const [body, sig] = value.split('.') as [string, string];
    const forged = Buffer.from(JSON.stringify({ ...s, role: 'owner' })).toString('base64url');
    expect(readSession(secret, `${forged}.${sig}`, now)).toBeNull();
    expect(readSession('another secret', value, now)).toBeNull();
    expect(readSession(secret, value, s.exp + 1)).toBeNull();
    expect(readSession(secret, `${body}.nonsense`, now)).toBeNull();
    expect(readSession(secret, 'garbage', now)).toBeNull();
    expect(readSession(secret, undefined, now)).toBeNull();
  });
  it('sends each person to their own place', () => {
    expect(roleFor('summer', 'summer')).toBe('owner');
    expect(roleFor('maya', 'summer')).toBe('patient');
    expect(roleFor('henry', 'summer')).toBe('helper');
    expect(homeFor('owner', 'summer')).toBe('/');
    expect(homeFor('patient', 'maya')).toBe('/maya');
    expect(homeFor('helper', 'henry')).toBe('/join/henry');
  });
});

describe('the guard', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; for (const k of Object.keys(jar)) delete jar[k]; });

  it('does nothing while sign in is off, or switched on without a secret', async () => {
    delete process.env['LOGIN_REQUIRED'];
    expect(loginOn()).toBe(false);
    await expect(guard('owner')).resolves.toBeUndefined();
    process.env['LOGIN_REQUIRED'] = 'true';
    delete process.env['SESSION_SECRET'];
    expect(loginOn()).toBe(false);
    await expect(guard('owner')).resolves.toBeUndefined();
  });
  it('turns away a caller with no cookie once sign in is on', async () => {
    process.env['LOGIN_REQUIRED'] = 'true';
    process.env['SESSION_SECRET'] = secret;
    expect(loginOn()).toBe(true);
    await expect(guard('owner')).rejects.toThrow('Sign in first');
  });
  it('lets the owner in, and turns away a helper and a forged cookie', async () => {
    process.env['LOGIN_REQUIRED'] = 'true';
    process.env['SESSION_SECRET'] = secret;
    beginSession('summer', 'owner');
    await expect(guard('owner')).resolves.toBeUndefined();
    beginSession('henry', 'helper');
    await expect(guard('owner')).rejects.toThrow('Sign in first');
    jar['dans_session'] = `${Buffer.from(JSON.stringify(newSession('henry', 'owner'))).toString('base64url')}.forged`;
    await expect(guard('owner')).rejects.toThrow('Sign in first');
    endSession();
    await expect(guard('owner')).rejects.toThrow('Sign in first');
  });
});
