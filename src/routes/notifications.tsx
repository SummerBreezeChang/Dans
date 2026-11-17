import { createFileRoute } from '@tanstack/react-router';
import { Notifications } from '@/components/calm/notifications';

export const Route = createFileRoute('/notifications')({
  head: () => ({ meta: [{ title: 'Notifications | Dans' }] }),
  component: Notifications,
});
