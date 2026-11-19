import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/components/calm/login';

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Sign in | Dans' }, { name: 'description', content: 'Open to see what is needed.' }, { property: 'og:title', content: 'Dans' }, { property: 'og:description', content: 'Open to see what is needed.' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Login,
});
