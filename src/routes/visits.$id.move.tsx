import { createFileRoute } from '@tanstack/react-router';
import { MoveVisit } from '@/components/calm/visits';
export const Route = createFileRoute('/visits/$id/move')({
  head: () => ({ meta: [{ title: 'The visit moves | Dans' }] }),
  component: MovePage,
});
function MovePage() {
  const { id } = Route.useParams();
  return <MoveVisit id={id} />;
}
