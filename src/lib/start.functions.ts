import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { leadId } from './careSync.functions';
import { forMaya, minutes, whenLabel } from './week';

// Starting the circle: Maya agrees first, then the lead invites helpers.
// Maya's answer is kept as an entry in the activity log, which doubles as the record of her consent.

export const consentTitle = 'Maya shared her week';
export const scopes = ['tasks', 'visits'] as const;
export type Scope = (typeof scopes)[number];

export const getStart = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: people }, { data: log }, { data: consent }] = await Promise.all([
    db.from('care_caregivers').select('id,name'),
    db.from('care_activity').select('title,detail,created_at').like('title', '% joined').order('created_at', { ascending: false }).limit(100),
    db.from('care_activity').select('title,detail,created_at').eq('title', consentTitle).order('created_at', { ascending: false }).limit(1),
  ]);
  const consentRow = consent?.[0];
  const scope = consentRow?.detail?.replace('scope:', '');
  const joined = new Set((log ?? []).filter(a => a.title.endsWith(' joined')).map(a => a.title.replace(/ joined$/, '')));
  return {
    consent: consentRow && (scope === 'tasks' || scope === 'visits') ? { scope: scope as Scope, at: consentRow.created_at } : null,
    people: (people ?? []).filter(p => p.id !== leadId).map(p => ({ id: p.id, name: p.name.split(' ')[0] ?? p.name, joined: joined.has(p.name.split(' ')[0] ?? p.name) })),
  };
});

export const saveLead = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(40), phone: z.string().trim().min(7).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { error } = await db.from('care_caregivers').update({ name: data.name, phone: data.phone }).eq('id', leadId);
    return { ok: !error };
  });

export const saveConsent = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ scope: z.enum(scopes) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { error } = await db.from('care_activity').insert({ title: consentTitle, detail: `scope:${data.scope}` });
    return { ok: !error };
  });

/** Maya's week, read from the shared database so it is the same on her phone as on Summer's. */
export const getMayaWeek = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const [{ data: tasks }, { data: people }, { data: consent }] = await Promise.all([
    db.from('care_tasks').select('id,title,day,time,owner,status,published'),
    db.from('care_caregivers').select('id,name'),
    db.from('care_activity').select('id').eq('title', consentTitle).limit(1),
  ]);
  const rows = (tasks ?? [])
    .filter(t => t.published && t.owner && t.owner !== undefined && (t.status === 'assigned' || t.status === 'accepted'))
    .sort((a, b) => a.day - b.day || minutes(a.time) - minutes(b.time))
    .map(t => ({ id: t.id, when: whenLabel(t.day, t.time), who: people?.find(p => p.id === t.owner)?.name.split(' ')[0] ?? 'Someone', what: forMaya(t.title) }));
  return { consented: !!consent?.length, rows };
});

/** Maya tells Summer what she needs. It is kept in the log, and Summer is texted if she has that on. */
export const sendNote = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ text: z.string().trim().min(1).max(280) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { loadPrefs } = await import('./notify.functions');
    const { sendOnce, routeText } = await import('./linq.server');
    const { error } = await db.from('care_activity').insert({ title: 'Maya sent a note', detail: data.text });
    if (error) return { ok: false };
    const [prefs, { data: lead }] = await Promise.all([loadPrefs(db), db.from('care_caregivers').select('name,phone').eq('id', leadId).maybeSingle()]);
    const route = lead ? routeText(lead.phone, lead.name) : null;
    if (prefs.note && lead && route) await sendOnce(`note:${Date.now()}`, route.to, `${route.prefix}${lead.name.split(' ')[0]}, Maya says: ${data.text}`);
    return { ok: true };
  });
