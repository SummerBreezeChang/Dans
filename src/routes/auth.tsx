import { createFileRoute } from '@tanstack/react-router';
import { ShowcaseAuth } from '@/components/care/showcase-auth';
export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Sign in | FirstCare+' }, { name: 'description', content: 'Open Maya’s prepopulated care circle in the FirstCare+ showcase demo.' }, { property: 'og:title', content: 'Sign in | FirstCare+' }, { property: 'og:description', content: 'Open Maya’s prepopulated care circle in the FirstCare+ showcase demo.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ShowcaseAuth,
});