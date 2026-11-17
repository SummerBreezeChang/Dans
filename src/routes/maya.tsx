import { createFileRoute } from '@tanstack/react-router';
import { Maya } from '@/components/calm/start';

export const Route = createFileRoute('/maya')({
  head: () => ({ meta: [
    { title: 'A note for you | Dans' },
    { name: 'description', content: 'Open to see what is needed.' },
    { property: 'og:title', content: 'A note for you' },
    { property: 'og:description', content: 'Open to see what is needed.' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Maya,
});
