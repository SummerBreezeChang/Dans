import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const inputSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{7,14}$/),
  message: z.string().trim().min(1).max(10000),
  idempotencyKey: z.string().uuid(),
}).strict();

// Server-to-server only. Never wire synthetic demo triggers to this handler.
export async function handleCareSms(request: Request): Promise<Response> {
  const serviceSecret = process.env['SEND_CARE_SMS_SECRET'];
  if (!serviceSecret) return Response.json({ error: 'SMS service is not configured' }, { status: 503 });
  const token = /^Bearer ([^\s,]+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (!token || !timingSafeEqual(digest(token), digest(serviceSecret))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return Response.json({ error: 'JSON required' }, { status: 415 });
  }
  let input: z.infer<typeof inputSchema>;
  try {
    const body = await request.text();
    if (body.length > 20000) return Response.json({ error: 'Request too large' }, { status: 413 });
    input = inputSchema.parse(JSON.parse(body));
  } catch {
    return Response.json({ error: 'Provide an E.164 recipient, message, and UUID idempotencyKey' }, { status: 400 });
  }
  const apiToken = process.env['LINQ_API_TOKEN'];
  const from = process.env['LINQ_FROM_NUMBER'];
  if (!apiToken || !from || !/^\+[1-9]\d{7,14}$/.test(from)) {
    return Response.json({ error: 'SMS service is not configured' }, { status: 503 });
  }
  try {
    const result = await fetch('https://api.linqapp.com/api/partner/v3/chats', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        message: { parts: [{ type: 'text', value: input.message }], idempotency_key: input.idempotencyKey },
      }),
      signal: AbortSignal.timeout(15000),
    });
    // Do not expose provider response bodies, which may include personal data.
    if (!result.ok) return Response.json({ error: 'LINQ did not accept the message', providerStatus: result.status }, { status: 502 });
    return Response.json({ accepted: true });
  } catch {
    return Response.json({ error: 'LINQ could not be reached; retry with the same idempotencyKey' }, { status: 502 });
  }
}