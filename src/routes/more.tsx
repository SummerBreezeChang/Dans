import { createFileRoute } from '@tanstack/react-router';
import { More } from '@/components/calm/people';
export const Route = createFileRoute('/more')({
  head: () => ({ meta: [{ title: 'More | Dans' }] }),
  component: More,
});
