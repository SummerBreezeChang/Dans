import { createFileRoute, redirect } from '@tanstack/react-router';

// The old circle page is retired. The Circle tab lives at /people.
export const Route = createFileRoute('/circle')({
  beforeLoad: () => { throw redirect({ to: '/people', replace: true }); },
});
