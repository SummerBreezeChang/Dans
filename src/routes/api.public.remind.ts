import { createFileRoute } from '@tanstack/react-router';

// Called once each morning by Vercel (see vercel.json). Reminds whoever has a task today.
const run = async ({ request }: { request: Request }) => {
  // When CRON_SECRET is set, only Vercel's scheduler (which sends it) can run the reminders.
  const secret = process.env['CRON_SECRET'];
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({ error: 'Not allowed' }, { status: 401 });
  const { sendReminders } = await import('@/lib/reminders.server');
  const { runWeeklyCycle } = await import('@/lib/checkin.server');
  return Response.json({ reminders: await sendReminders(), weekly: await runWeeklyCycle() });
};

export const Route = createFileRoute('/api/public/remind')({
  server: { handlers: { GET: run, POST: run } },
});
