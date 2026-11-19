import { createFileRoute } from '@tanstack/react-router';
import { Welcome } from '@/components/calm/login';

export const Route = createFileRoute('/welcome')({
  head: () => ({ meta: [{ title: 'Dans | Dans' }, { name: 'description', content: 'Open to see what is needed.' }, { property: 'og:title', content: 'Dans' }, { property: 'og:description', content: 'Open to see what is needed.' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Welcome,
});
