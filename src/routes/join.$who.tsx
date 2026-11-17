import { createFileRoute } from '@tanstack/react-router';
import { Join } from '@/components/calm/join';

function Page() {
  const { who } = Route.useParams();
  return <Join who={who} />;
}

export const Route = createFileRoute('/join/$who')({
  head: () => ({ meta: [
    { title: 'You are invited | Dans' },
    { name: 'description', content: 'Open to see what is needed.' },
    { property: 'og:title', content: 'You are invited' },
    { property: 'og:description', content: 'Open to see what is needed.' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Page,
});
