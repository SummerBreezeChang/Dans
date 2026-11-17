import { createFileRoute } from '@tanstack/react-router';
import { Checkin } from '@/components/calm/checkin';

function Page() {
  const { who } = Route.useParams();
  return <Checkin who={who} />;
}

export const Route = createFileRoute('/checkin/$who')({
  head: () => ({ meta: [
    { title: 'This week | Dans' },
    { name: 'description', content: 'Open to see what is needed.' },
    { property: 'og:title', content: 'This week' },
    { property: 'og:description', content: 'Open to see what is needed.' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: Page,
});
