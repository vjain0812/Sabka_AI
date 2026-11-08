import { Suspense } from 'react';
import { SimpleBusiness } from '@/components/simple-business';
export const metadata = { title: 'Your business' };
export default function BusinessPage() {
  return (
    <Suspense fallback={<p role="status">Opening your brief…</p>}>
      <SimpleBusiness />
    </Suspense>
  );
}
