import { createFileRoute } from '@tanstack/react-router';
import { Summary } from '@/components/calm/summary';

export const Route = createFileRoute('/summary')({
  head: () => ({ meta: [{ title: 'Week | Dans' }] }),
  component: Summary,
});
