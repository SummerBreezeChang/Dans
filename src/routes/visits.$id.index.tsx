import { createFileRoute } from '@tanstack/react-router';
import { Visit } from '@/components/calm/visits';
export const Route = createFileRoute('/visits/$id/')({
  head: () => ({ meta: [{ title: 'Visit | Dans' }] }),
  component: VisitPage,
});
function VisitPage() {
  const { id } = Route.useParams();
  return <Visit id={id} />;
}
