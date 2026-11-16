import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/components/calm/home';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: "Maya's week | Dans" }, { name: 'description', content: 'See what is covered this week and the one thing that still needs someone.' }, { property: 'og:title', content: "Maya's week" }, { property: 'og:description', content: 'Tap to pick what works for you.' }, { property: 'og:image', content: 'https://dans-support.vercel.app/card-week.png' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Home,
});
