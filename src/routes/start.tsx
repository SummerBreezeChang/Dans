import { createFileRoute } from '@tanstack/react-router';
import { Start } from '@/components/calm/start';

export const Route = createFileRoute('/start')({
  head: () => ({ meta: [
    { title: 'Dans' },
    { name: 'description', content: 'Open to see what is needed.' },
    { property: 'og:title', content: 'Dans' },
    { property: 'og:description', content: 'Open to see what is needed.' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Start,
});
