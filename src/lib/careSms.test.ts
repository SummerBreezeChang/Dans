import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleCareSms } from './careSms.server';

const payload = { to: '+12025550123', message: 'A care task needs your attention.', idempotencyKey: '11111111-1111-4111-8111-111111111111' };
const request = (body: unknown = payload, authorized = true) => new Request('http://localhost/api/public/send-care-sms', {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorized ? { Authorization: 'Bearer synthetic-service-secret' } : {}) }, body: JSON.stringify(body),
});

describe('Isolated LINQ care SMS endpoint', () => {
  beforeEach(() => {
    vi.stubEnv('SEND_CARE_SMS_SECRET', 'synthetic-service-secret');
    vi.stubEnv('LINQ_API_TOKEN', 'synthetic-provider-token');
    vi.stubEnv('LINQ_FROM_NUMBER', '+12025550124');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 201 })));
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it('blocks unauthenticated sending before contacting LINQ', async () => {
    expect((await handleCareSms(request(payload, false))).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects invalid recipient numbers', async () => {
    expect((await handleCareSms(request({ ...payload, to: '4157990095' }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires an idempotency key to avoid duplicate sends', async () => {
    expect((await handleCareSms(request({ to: payload.to, message: payload.message }))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('posts the documented chat body to the requested LINQ URL', async () => {
    expect(await (await handleCareSms(request())).json()).toEqual({ accepted: true });
    expect(fetch).toHaveBeenCalledWith('https://api.linqapp.com/api/partner/v3/chats', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ from: '+12025550124', to: [payload.to], message: { parts: [{ type: 'text', value: payload.message }], idempotency_key: payload.idempotencyKey } }),
    }));
  });
  it('keeps provider errors and personal data out of responses', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('private provider response', { status: 403 }));
    const result = await handleCareSms(request());
    expect(result.status).toBe(502);
    expect(await result.json()).toEqual({ error: 'LINQ did not accept the message', providerStatus: 403 });
  });
  it('does not call LINQ when configuration is missing', async () => {
    vi.stubEnv('LINQ_API_TOKEN', '');
    expect((await handleCareSms(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});