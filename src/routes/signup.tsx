import { createFileRoute } from '@tanstack/react-router';
import { ShowcaseAuth } from '@/components/care/showcase-auth';
export const Route = createFileRoute('/signup')({
  head: () => ({ meta: [{ title: 'Sign up | FirstCare+' }, { name: 'description', content: 'Showcase a prefilled care-circle signup and setup with Maya’s synthetic care plan.' }, { property: 'og:title', content: 'Sign up | FirstCare+' }, { property: 'og:description', content: 'Showcase a prefilled care-circle signup and setup with Maya’s synthetic care plan.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: () => <ShowcaseAuth signup />,
});