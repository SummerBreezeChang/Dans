import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { analyzeWellness, generateReadings, wellnessTask } from './wellnessEngine';

/** Auth protects the real SMS side effect; scenario content is always recomputed server-side. */
export const escalateWellness = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    scenario: z.enum(['baseline', 'decline', 'urgent']), insight: z.enum(['sleep', 'cardio']),
    sharing: z.record(z.boolean()),
  }).strict().parse(input))
  .handler(async ({ data }) => {
    const insight = analyzeWellness(generateReadings(data.scenario), data.sharing).find(i => i.id === data.insight);
    if (!insight) throw new Error('No shared alert to escalate');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const now = new Date(); const day = (now.getDay() + 6) % 7;
    const slot = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
    const task = wellnessTask(insight, day, slot);
    const { error } = await db.from('care_tasks').upsert({ id: task.id, title: task.title, day, slot, time: task.time, published: true }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) throw new Error('Could not save the wellness task');
    const { keyToUuid } = await import('./linq.server');
    const eventKey = `wellness:${insight.id}:${now.toISOString().slice(0, 10)}`;
    const { error: activityError } = await db.from('care_activity').upsert({ id: keyToUuid(eventKey), title: 'Wellness check-in added', detail: 'A simulated wellness alert created a care coordination task.' }, { onConflict: 'id', ignoreDuplicates: true });
    if (activityError) throw new Error('Could not save circle activity');
    const { data: settings } = await db.from('care_settings').select('live_sms').eq('id', 1).single();
    if (!settings?.live_sms) return { saved: true, sent: 0, failed: 0, mode: 'demo' as const };
    const serviceSecret = process.env['SEND_CARE_SMS_SECRET'];
    if (!serviceSecret) return { saved: true, sent: 0, failed: 0, mode: 'unconfigured' as const };
    const { data: people, error: peopleError } = await db.from('care_caregivers').select('id,phone');
    if (peopleError) throw new Error('Could not load alert recipients');
    let sent = 0; let failed = 0;
    for (const person of people ?? []) {
      if (!person.phone) continue;
      const key = `${eventKey}:${person.id}`;
      const { error: reserved } = await db.from('care_sms_log').insert({ key, recipient: person.phone });
      if (reserved?.code === '23505') continue;
      if (reserved) { failed++; continue; }
      // Same protected public endpoint; the service credential never enters the browser.
      try {
        const response = await fetch(new URL('/api/public/send-care-sms', getRequest().url), {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceSecret}` },
          body: JSON.stringify({ to: person.phone, idempotencyKey: keyToUuid(key),
            message: 'FirstCare+ DEMO wellness alert: a simulated reading needs a check-in. Review the care board securely. No medical readings are included in this text.' }),
          signal: AbortSignal.timeout(20000),
        });
        await db.from('care_sms_log').update({ ok: response.ok }).eq('key', key);
        if (response.ok) sent++; else failed++;
      } catch { failed++; }
    }
    return { saved: true, sent, failed, mode: 'live' as const };
  });