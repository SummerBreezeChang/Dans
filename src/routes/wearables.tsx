import { createFileRoute } from '@tanstack/react-router';
import { Wearables } from '@/components/care/wearables';
export const Route = createFileRoute('/wearables')({
 head: () => ({ meta: [{ title: 'Wellness & Wearables | FirstCare+' }, { name: 'description', content: 'Preview patient-controlled wellness sharing and thoughtful check-ins.' }, { property: 'og:title', content: 'Wellness & Wearables | FirstCare+' }, { property: 'og:description', content: 'Preview patient-controlled wellness sharing and thoughtful check-ins.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Wearables,
});
