import { EmptyState } from '@/components/ui';
export default function NotFound() {
  return (
    <EmptyState title="This page isn’t on your path." href="/" action="Return home">
      Let’s get you back to your business.
    </EmptyState>
  );
}
