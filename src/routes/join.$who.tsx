import { createFileRoute } from '@tanstack/react-router';
import { Join } from '@/components/calm/join';

function Page() {
  const { who } = Route.useParams();
  return <Join who={who} />;
}

export const Route = createFileRoute('/join/$who')({
  head: () => ({ meta: [{ title: 'Help Maya | Dans' }] }),
  component: Page,
});
