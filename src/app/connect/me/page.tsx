import { Suspense } from 'react';
import { ConnectMe } from '@/components/connect/connect-me';
import { toolsLite } from '@/lib/server/connect-api';

export const metadata = { title: 'Your Connect' };
export const dynamic = 'force-dynamic';
export default async function MePage() {
  return (
    <Suspense fallback={<p role="status">Opening your profile…</p>}>
      <ConnectMe tools={await toolsLite()} />
    </Suspense>
  );
}
