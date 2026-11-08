import { Building2, Cake, Dumbbell, Shirt, Sprout, Wrench } from 'lucide-react';
import type { Scenario } from '@/lib/domain/scenarios';

const icons = {
  dumbbell: Dumbbell,
  wrench: Wrench,
  building: Building2,
  shirt: Shirt,
  cake: Cake,
  sprout: Sprout,
} as const;

export function ScenarioIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: Scenario['icon'];
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon className={className} aria-hidden="true" />;
}
