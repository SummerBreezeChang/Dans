import { createFileRoute } from '@tanstack/react-router';
import { Maya } from '@/components/calm/start';

export const Route = createFileRoute('/maya')({
  head: () => ({ meta: [{ title: 'Share your week | Dans' }] }),
  component: Maya,
});
