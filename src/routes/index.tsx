import { createFileRoute } from '@tanstack/react-router';
import { Board } from '@/components/care/board';
export const Route = createFileRoute('/')({
 head: () => ({ meta: [{ title: 'Care Board | FirstCare+' }, { name: 'description', content: 'Coordinate Maya’s care with a shared task board and balanced caregiver assignments.' }, { property: 'og:title', content: 'Care Board | FirstCare+' }, { property: 'og:description', content: 'Coordinate Maya’s care with a shared task board and balanced caregiver assignments.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Board,
});
