'use client';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { workspace } from '@/lib/client/workspace';
import { useLanguage } from '@/lib/client/language';
import { applyScenario, scenarioBySlug } from '@/lib/domain/scenarios';

/**
 * Starts (or reuses) the guest brief, prefills it from the scenario and opens the brief so the
 * owner reviews every answer and adds their own budget, setup time and consent.
 */
export function UseScenarioButton({
  slug,
  label = 'Use this workflow for my business',
  labelEs = 'Usar este flujo para mi negocio',
  variant = 'yellow',
}: {
  slug: string;
  label?: string;
  labelEs?: string;
  variant?: 'yellow' | 'white';
}) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  function start() {
    const scenario = scenarioBySlug(slug);
    if (!scenario) return;
    workspace.startGuest();
    const brief = workspace.getBrief();
    if (brief) workspace.update(applyScenario(brief, scenario, locale));
    router.push('/business?from=' + encodeURIComponent(slug));
  }
  return (
    <button
      type="button"
      onClick={start}
      className={`group flex items-center justify-center gap-3 rounded-full py-3.5 pl-6 pr-4 text-sm font-bold text-black transition-all hover:-translate-y-0.5 ${
        variant === 'yellow'
          ? 'bg-[#ffd200] shadow-[0_10px_30px_rgba(255,210,0,.2)] hover:bg-white'
          : 'bg-white hover:bg-[#ffd200]'
      }`}
    >
      {t(label, labelEs)}
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[#ffd200] transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}
