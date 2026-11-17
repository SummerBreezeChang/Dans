import { createFileRoute } from '@tanstack/react-router';

// Called once each morning by Vercel (see vercel.json). Reminds whoever has a task today.
const run = async () => {
  const { sendReminders } = await import('@/lib/reminders.server');
  return Response.json(await sendReminders());
};

export const Route = createFileRoute('/api/public/remind')({
  server: { handlers: { GET: run, POST: run } },
});
