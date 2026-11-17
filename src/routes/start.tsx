import { createFileRoute } from '@tanstack/react-router';
import { Start } from '@/components/calm/start';

export const Route = createFileRoute('/start')({
  head: () => ({ meta: [{ title: 'Start the circle | Dans' }] }),
  component: Start,
});
