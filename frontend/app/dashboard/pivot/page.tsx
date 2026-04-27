// Server-component wrapper. The actual UI is a client component
// (`PivotClient.tsx`) — useSearchParams() needs a Suspense boundary
// for Next.js 15's static prerender to succeed at build time.
//   https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
//
// `dynamic = 'force-dynamic'` opts the page out of prerendering entirely.
// This page is auth-gated and URL-state-driven, so static rendering has
// no benefit anyway.
import { Suspense } from 'react';
import PivotClient from './PivotClient';

export const dynamic = 'force-dynamic';

export default function PivotPage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-muted">Loading pivot…</div>}>
      <PivotClient />
    </Suspense>
  );
}
