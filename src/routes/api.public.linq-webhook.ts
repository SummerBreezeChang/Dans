import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/linq-webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleLinqWebhook } = await import('@/lib/linqWebhook.server');
        return handleLinqWebhook(request);
      },
    },
  },
});
