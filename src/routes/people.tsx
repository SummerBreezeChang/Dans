import { createFileRoute } from '@tanstack/react-router';
import { People } from '@/components/calm/people';
export const Route = createFileRoute('/people')({
  head: () => ({ meta: [{ title: 'Circle | Dans' }] }),
  component: People,
});
