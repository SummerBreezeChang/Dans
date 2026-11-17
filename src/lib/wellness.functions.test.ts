import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSharing } from './wellnessEngine';

const state = vi.hoisted(() => ({ live: false, keys: new Set<string>(), tasks: new Set<string>(), activity: new Set<string>() }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder,
    handler: (handler: (args: { data: unknown }) => unknown) => (args: { data: unknown }) => handler(args) };
  return builder;
} }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: () => new Request('https://dans-support.vercel.app/wearables') }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: (table: string) => {
  const result = table === 'care_caregivers' ? { data: [{ id: 'henry', phone: '+12025550142' }, { id: 'summer', phone: null }], error: null } : { data: null, error: null };
  const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { live_sms: state.live } }),
    upsert: async (row: { id: string }) => { (table === 'care_tasks' ? state.tasks : state.activity).add(row.id); return { error: null }; },
    insert: async (row: { key: string }) => { if (state.keys.has(row.key)) return { error: { code: '23505' } }; state.keys.add(row.key); return { error: null }; },
    update: () => chain,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  return chain;
} } }));
import { escalateWellness } from './wellness.functions';
const input = { scenario: 'urgent' as const, insight: 'cardio' as const, sharing: defaultSharing };
describe('Wellness escalation delivery', () => {
  beforeEach(() => { state.live = false; state.keys.clear(); state.tasks.clear(); state.activity.clear(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))); vi.stubEnv('SEND_CARE_SMS_SECRET', 'test-service-secret'); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('saves one task and one activity without sending in Demo mode', async () => {
    await escalateWellness({ data: input }); await escalateWellness({ data: input });
    expect(state.tasks.size).toBe(1); expect(state.activity.size).toBe(1); expect(fetch).not.toHaveBeenCalled();
  });
  it('sends only to mapped recipients through the protected endpoint once per daily alert', async () => {
    state.live = true;
    expect(await escalateWellness({ data: input })).toMatchObject({ sent: 1, failed: 0 });
    expect(await escalateWellness({ data: input })).toMatchObject({ sent: 0 });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(String(url)).toBe('https://dans-support.vercel.app/api/public/send-care-sms');
    const body = JSON.parse(String(options?.body));
    expect(body.to).toBe('+12025550142');
    expect(body.message).not.toContain('148'); expect(body.message).not.toContain('104');
    expect(body.message).toContain('DEMO');
  });
  it('rejects hidden vitals before creating tasks or sending alerts', async () => {
    await expect(escalateWellness({ data: { ...input, sharing: {} } })).rejects.toThrow('No shared alert');
    expect(state.tasks.size).toBe(0); expect(fetch).not.toHaveBeenCalled();
  });
  it('reports unavailable SMS configuration without sending', async () => {
    state.live = true; vi.stubEnv('SEND_CARE_SMS_SECRET', '');
    expect(await escalateWellness({ data: input })).toMatchObject({ mode: 'unconfigured', sent: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });
});