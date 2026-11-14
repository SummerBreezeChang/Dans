import { createFileRoute } from '@tanstack/react-router';
import { Checklist } from '@/components/care/checklist';
export const Route = createFileRoute('/checklist')({
 head: () => ({ meta: [{ title: 'Care Checklist | FirstCare+' }, { name: 'description', content: 'Review and approve a thoughtful care checklist before sharing it with your circle.' }, { property: 'og:title', content: 'Care Checklist | FirstCare+' }, { property: 'og:description', content: 'Review and approve a thoughtful care checklist before sharing it with your circle.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Checklist,
});
