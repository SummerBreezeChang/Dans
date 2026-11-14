import { createFileRoute } from '@tanstack/react-router';
import { Wearables } from '@/components/care/wearables';
export const Route = createFileRoute('/wearables')({
 head: () => ({ meta: [{ title: 'Wellness & Vitals | FirstCare+' }, { name: 'description', content: 'Follow Maya’s wellness trends, manage sharing, and coordinate timely caregiver check-ins.' }, { property: 'og:title', content: 'Wellness & Vitals | FirstCare+' }, { property: 'og:description', content: 'Follow Maya’s wellness trends, manage sharing, and coordinate timely caregiver check-ins.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Wearables,
});
