import { ConnectDirectory } from '@/components/connect/connect-directory';
import { toolsLite } from '@/lib/server/connect-api';

export const metadata = { title: 'Connect' };
export const dynamic = 'force-dynamic';
export default async function ConnectPage() {
  return <ConnectDirectory tools={await toolsLite()} />;
}
