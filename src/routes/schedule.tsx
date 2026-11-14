import { createFileRoute } from '@tanstack/react-router';
import { Schedule } from '@/components/care/schedule';
export const Route = createFileRoute('/schedule')({
 head: () => ({ meta: [{ title: 'Appointments | FirstCare+' }, { name: 'description', content: 'Keep appointments and dependent care tasks in sync when plans change.' }, { property: 'og:title', content: 'Appointments | FirstCare+' }, { property: 'og:description', content: 'Keep appointments and dependent care tasks in sync when plans change.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Schedule,
});
