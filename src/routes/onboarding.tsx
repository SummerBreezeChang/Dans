import { createFileRoute } from '@tanstack/react-router';
import { Onboarding } from '@/components/care/onboarding';
export const Route = createFileRoute('/onboarding')({
 head: () => ({ meta: [{ title: 'Hospital Consent | FirstCare+' }, { name: 'description', content: 'Connect a synthetic hospital record with explicit patient privacy and consent.' }, { property: 'og:title', content: 'Hospital Consent | FirstCare+' }, { property: 'og:description', content: 'Connect a synthetic hospital record with explicit patient privacy and consent.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
 component: Onboarding,
});
