import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { defaultPrefs, parsePrefs, prefsTitle, type Prefs } from './notify';

export async function loadPrefs(db: { from: (t: string) => any }): Promise<Prefs> {
  const { data } = await db.from('care_activity').select('detail').eq('title', prefsTitle).order('created_at', { ascending: false }).limit(1);
  return data?.[0] ? parsePrefs(data[0].detail) : defaultPrefs;
}

export const getPrefs = createServerFn({ method: 'GET' }).handler(async () => {
    const { guard } = await import('./auth.server');
    await guard('owner');
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  return loadPrefs(db);
});

export const savePrefs = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ pass: z.enum(['auto', 'check']), nobody: z.boolean(), passed: z.boolean(), note: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { guard } = await import('./auth.server');
    await guard('owner');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { error } = await db.from('care_activity').insert({ title: prefsTitle, detail: JSON.stringify(data) });
    return { ok: !error };
  });
