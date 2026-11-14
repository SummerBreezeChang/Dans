import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/send-care-sms')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCareSms } = await import('@/lib/careSms.server');
        return handleCareSms(request);
      },
    },
  },
});