import { createFileRoute } from '@tanstack/react-router';
import { Circle } from '@/components/care/circle';
export const Route = createFileRoute('/circle')({
 head: () => ({ meta: [{ title: 'Care Circle | FirstCare+' }, { name: 'description', content: 'Bring caregivers together with weekly availability and a balanced helping hand.' }, { property: 'og:title', content: 'Care Circle | FirstCare+' }, { property: 'og:description', content: 'Bring caregivers together with weekly availability and a balanced helping hand.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Circle,
});
