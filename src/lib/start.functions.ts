import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { leadId } from './careSync.functions';

// Starting the circle: Maya agrees first, then the lead invites helpers.
// Maya's answer is kept as an entry in the activity log, which doubles as the record of her consent.

export const consentTitle = 'Maya shared her week';
export const scopes = ['tasks', 'visits'] as const;
export type Scope = (typeof scopes)[number];

export const getStart = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: people }, { data: log }] = await Promise.all([
    db.from('care_caregivers').select('id,name'),
    db.from('care_activity').select('title,detail,created_at').order('created_at', { ascending: false }).limit(300),
  ]);
  const consentRow = (log ?? []).find(a => a.title === consentTitle);
  const scope = consentRow?.detail?.replace('scope:', '');
  const joined = new Set((log ?? []).filter(a => a.title.endsWith(' joined')).map(a => a.title.replace(/ joined$/, '')));
  return {
    consent: consentRow && (scope === 'tasks' || scope === 'visits') ? { scope: scope as Scope, at: consentRow.created_at } : null,
    people: (people ?? []).filter(p => p.id !== leadId).map(p => ({ id: p.id, name: p.name.split(' ')[0] ?? p.name, joined: joined.has(p.name.split(' ')[0] ?? p.name) })),
  };
});

export const saveConsent = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ scope: z.enum(scopes) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { error } = await db.from('care_activity').insert({ title: consentTitle, detail: `scope:${data.scope}` });
    return { ok: !error };
  });
