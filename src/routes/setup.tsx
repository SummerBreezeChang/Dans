import { createFileRoute } from '@tanstack/react-router';
import { Setup } from '@/components/care/setup';
export const Route = createFileRoute('/setup')({
 head: () => ({ meta: [{ title: 'Set up a care circle | FirstCare+' }, { name: 'description', content: 'A guided setup for a new care circle: who you are caring for, the hospital record, the checklist, and the people who help.' }] }),
 component: Setup,
});
