import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/components/calm/home';
export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: "Maya's week | Dans" }, { name: 'description', content: 'See what is covered this week and the one thing that still needs someone.' }] }),
  component: Home,
});
