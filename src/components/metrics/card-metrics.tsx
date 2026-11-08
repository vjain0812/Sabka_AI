'use client';
import { useId, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronRight, Info } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import type { BusinessBrief } from '@/lib/domain/brief';
import { priceLabelEs } from '@/lib/domain/i18n-es';
import {
  costMetric,
  evidenceCopy,
  frictionCopy,
  integrationFriction,
  levelCopy,
  roiScenario,
  setupDifficulty,
  type Evidence,
} from '@/lib/domain/tool-metrics';

type Copy = { en: string; es: string };

export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  const { locale } = useLanguage();
  const tone: Record<Evidence, string> = {
    verified: 'bg-[#e7f4e8] text-[#14401b]',
    vendor: 'bg-[#eaf0fb] text-[#1d3561]',
    estimated: 'bg-[#fff4bf] text-[#3d3200]',
    yours: 'bg-[#f1ecfb] text-[#3a2466]',
    unverified: 'bg-[#efefef] text-[#444]',
  };
  return (
    <span
      className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${tone[evidence]}`}
    >
      {locale === 'es' ? evidenceCopy[evidence].es : evidenceCopy[evidence].en}
    </span>
  );
}

/** The three things an owner asks: cost, how hard to set up, how hard to connect. */
export function CardMetrics({ record, brief }: { record: CatalogRecord; brief: BusinessBrief }) {
  const { t, locale } = useLanguage();
  const say = (c: Copy) => (locale === 'es' ? c.es : c.en);
  const cost = costMetric(record);
  const setup = setupDifficulty(record);
  const ifs = integrationFriction(record, brief.need);
  const cells: { label: string; value: string; evidence: Evidence }[] = [
    {
      label: t('Cost', 'Costo'),
      value: locale === 'es' ? priceLabelEs(cost.label) : cost.label,
      evidence: cost.evidence,
    },
    {
      label: t('Setup', 'Preparación'),
      value: say(levelCopy[setup.level]),
      evidence: setup.evidence,
    },
    {
      label: t('Connecting', 'Conexión'),
      value: say(frictionCopy[ifs.level]),
      evidence: ifs.evidence,
    },
  ];
  return (
    <div className="mt-4">
      <dl className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl bg-[#f6f6f3] px-2.5 py-2">
            <dt className="text-[10px] font-bold uppercase tracking-[.1em] text-[#555]">
              {c.label}
            </dt>
            <dd className="mt-0.5 text-[13px] font-semibold leading-5 text-[#111]">{c.value}</dd>
            <dd className="mt-1">
              <EvidenceChip evidence={c.evidence} />
            </dd>
          </div>
        ))}
      </dl>
      {ifs.unverifiedRequired.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-[#4a3b00]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t(
            `We couldn’t verify it connects with ${ifs.unverifiedRequired.join(
              ', ',
            )}. Ask the vendor before paying.`,
            `No pudimos verificar que se conecte con ${ifs.unverifiedRequired.join(
              ', ',
            )}. Pregunta al proveedor antes de pagar.`,
          )}
        </p>
      )}
      <WorthIt record={record} compact />
      <Link
        href={`/tools/${record.tool.slug}#metrics`}
        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#111] underline-offset-2 hover:underline"
      >
        {t('View detailed metrics', 'Ver métricas detalladas')}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

/* Owner's assumptions are shared across cards for this tab (sessionStorage). */
/** hours / percent / hourly, plus per-tool price and setup overrides keyed by slug. */
type Assumptions = Record<string, string> & { hours: string; percent: string; hourly: string };
const KEY = 'sabka-ai:v1:roi';
const fallback: Assumptions = { hours: '', percent: '25', hourly: '15' };
let current: Assumptions = fallback;
let loaded = false;
const listeners = new Set<() => void>();
function subscribe(l: () => void) {
  listeners.add(l);
  if (!loaded) {
    loaded = true;
    try {
      current = { ...fallback, ...JSON.parse(sessionStorage.getItem(KEY) ?? '{}') };
    } catch {
      /* Defaults for this page view. */
    }
    l();
  }
  return () => {
    listeners.delete(l);
  };
}
function setAssumptions(patch: Record<string, string>) {
  current = { ...current, ...patch };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* Kept in memory. */
  }
  listeners.forEach((l) => l());
}
const num = (v: string) => {
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
};

/** "Is it worth trying?" A scenario from the owner's own numbers, never a promise. */
export function WorthIt({ record, compact = false }: { record: CatalogRecord; compact?: boolean }) {
  const { t } = useLanguage();
  const a = useSyncExternalStore(
    subscribe,
    () => current,
    () => fallback,
  );
  const id = useId();
  const cost = costMetric(record);
  const priceKey = `${KEY}:${record.tool.slug}`;
  const priceOverride = useSyncExternalStore(
    subscribe,
    () => current[priceKey] ?? '',
    () => '',
  );
  const setupKey = `${KEY}:${record.tool.slug}:setup`;
  const setupCost = useSyncExternalStore(
    subscribe,
    () => current[setupKey] ?? '',
    () => '',
  );
  const monthly = num(priceOverride) ?? cost.monthly ?? (cost.free ? 0 : null);
  const hours = num(a.hours);
  const percent = num(a.percent);
  const hourly = num(a.hourly);
  const result =
    hours !== null && percent !== null && hourly !== null && monthly !== null
      ? roiScenario({
          hoursPerWeek: hours,
          percentSaved: Math.min(100, percent),
          hourlyValue: hourly,
          monthlyCost: monthly,
          setupCost: num(setupCost) ?? 0,
        })
      : null;
  const field = (label: string, value: string, onChange: (v: string) => void, suffix?: string) => (
    <label className="text-[11px] font-semibold text-[#333]">
      {label}
      <span className="mt-1 flex items-center gap-1">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-[#d8d8d8] bg-white px-2 py-1.5 text-sm text-[#111]"
        />
        {suffix && <span className="text-[11px] text-[#555]">{suffix}</span>}
      </span>
    </label>
  );
  return (
    <details
      className={`group rounded-xl border border-[#e2e2df] ${compact ? 'mt-3' : ''} bg-white`}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold">
        <span className="flex items-center justify-between gap-2">
          {t('Is it worth trying? Do the maths', '¿Vale la pena? Haz las cuentas')}
          <ChevronRight
            className="h-4 w-4 transition-transform group-open:rotate-90"
            aria-hidden="true"
          />
        </span>
      </summary>
      <div className="border-t border-[#ececec] px-3 pb-3 pt-2.5">
        <div className="grid grid-cols-2 gap-2">
          {field(t('Hours a week on this task', 'Horas por semana en esta tarea'), a.hours, (v) =>
            setAssumptions({ hours: v }),
          )}
          {field(
            t('Time it might save', 'Tiempo que podría ahorrar'),
            a.percent,
            (v) => setAssumptions({ percent: v }),
            '%',
          )}
          {field(
            t('Value of one hour', 'Valor de una hora'),
            a.hourly,
            (v) => setAssumptions({ hourly: v }),
            '$',
          )}
          {field(
            t('Monthly cost', 'Costo mensual'),
            priceOverride || (monthly !== null ? String(monthly) : ''),
            (v) => setAssumptions({ [priceKey]: v }),
            '$',
          )}
          {field(
            t('One-time setup cost', 'Costo único de preparación'),
            setupCost,
            (v) => setAssumptions({ [setupKey]: v }),
            '$',
          )}
        </div>
        <p className="mt-1 text-[11px] text-[#555]">
          {cost.monthly !== null || cost.free
            ? t(
                'Monthly cost starts at the cheapest verified plan.',
                'El costo mensual empieza en el plan verificado más barato.',
              )
            : t(
                'We couldn’t verify a price. Enter the price you were quoted.',
                'No pudimos verificar un precio. Escribe el precio que te dieron.',
              )}
        </p>
        <div id={id} aria-live="polite" className="mt-3 rounded-lg bg-[#f6f6f3] p-3 text-sm">
          {result ? (
            <>
              <p>
                {t(
                  `Saves about ${result.hoursSavedPerMonth} hours a month, worth about $${result.valuePerMonth}.`,
                  `Ahorra unas ${result.hoursSavedPerMonth} horas al mes, que valen unos $${result.valuePerMonth}.`,
                )}
              </p>
              <p className="mt-1 font-semibold">
                {result.coversCost
                  ? t(
                      `Net benefit: about $${result.netPerMonth} a month after the subscription.`,
                      `Beneficio neto: unos $${result.netPerMonth} al mes después de la suscripción.`,
                    )
                  : t(
                      `On these numbers it costs about $${-result.netPerMonth} a month more than it saves.`,
                      `Con estos números cuesta unos $${-result.netPerMonth} al mes más de lo que ahorra.`,
                    )}
              </p>
              {result.paybackWeeks !== null && (
                <p className="mt-1">
                  {t(
                    `Setup cost paid back in about ${result.paybackWeeks} weeks.`,
                    `El costo de preparación se recupera en unas ${result.paybackWeeks} semanas.`,
                  )}
                </p>
              )}
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#555]">
                <EvidenceChip evidence="yours" />
                {t(
                  'Scenario estimate from your numbers. Assumes savings start now and stay steady. Not a guarantee.',
                  'Estimación con tus números. Supone que el ahorro empieza ya y se mantiene. No es una garantía.',
                )}
              </p>
            </>
          ) : (
            <p className="text-[#555]">
              {t(
                'Enter the hours you spend on this task to see if it pays for itself.',
                'Escribe las horas que dedicas a esta tarea para ver si se paga sola.',
              )}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
