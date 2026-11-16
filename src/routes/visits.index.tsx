import { createFileRoute } from '@tanstack/react-router';
import { Visits } from '@/components/calm/visits';
export const Route = createFileRoute('/visits/')({
  head: () => ({ meta: [{ title: 'Visits | Dans' }] }),
  component: Visits,
});
