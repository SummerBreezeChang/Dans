import { createFileRoute } from '@tanstack/react-router';
import { Setup } from '@/components/care/setup';
export const Route = createFileRoute('/setup')({
 head: () => ({ meta: [{ title: 'Set up a care circle | FirstCare+' }, { name: 'description', content: 'A guided setup for a new care circle: who you are caring for, the hospital record, the checklist, and the people who help.' }, { property: 'og:title', content: 'Set up a care circle | FirstCare+' }, { property: 'og:description', content: 'Preview Maya’s prefilled care-circle setup and synthetic care plan.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Setup,
});
