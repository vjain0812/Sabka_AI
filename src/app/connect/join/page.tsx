import { ConnectJoin } from '@/components/connect/connect-join';
import { toolsLite } from '@/lib/server/connect-api';

export const metadata = { title: 'Join Connect' };
export const dynamic = 'force-dynamic';
export default async function JoinPage() {
  return <ConnectJoin tools={await toolsLite()} />;
}
