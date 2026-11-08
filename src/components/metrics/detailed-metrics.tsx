'use client';
import { FlaskConical } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { useWorkspace } from '@/lib/client/workspace';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import { priceLabelEs } from '@/lib/domain/i18n-es';
import {
  METRICS_VERSION,
  costMetric,
  frictionCopy,
  integrationFriction,
  levelCopy,
  methodCopy,
  setupDifficulty,
  untestedMetrics,
} from '@/lib/domain/tool-metrics';
import { EvidenceChip, WorthIt } from './card-metrics';

type Copy = { en: string; es: string };

/** Methodology, assumptions and evidence behind every number on the recommendation card. */
export function DetailedMetrics({ record }: { record: CatalogRecord }) {
  const { t, locale } = useLanguage();
  const say = (c: Copy) => (locale === 'es' ? c.es : c.en);
  const brief = useWorkspace().session?.brief;
  const cost = costMetric(record);
  const setup = setupDifficulty(record);
  const ifs = brief ? integrationFriction(record, brief.need) : null;
  const card = 'rounded-[22px] border border-[#e2e2df] bg-white p-6';
  const h3 = 'flex flex-wrap items-center gap-2 text-base font-semibold';
  return (
    <section id="metrics" aria-labelledby="metrics-heading" className="mt-6 scroll-mt-24">
      <h2 id="metrics-heading" className="text-2xl font-semibold tracking-[-0.03em]">
        {t('Detailed metrics', 'Métricas detalladas')}
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-[#555]">
        {t(
          'How we got each number, what it assumes, and how sure we are. These metrics explain a recommendation; they don’t add extra points to its ranking.',
          'Cómo obtuvimos cada número, qué supone y qué tan seguros estamos. Estas métricas explican una recomendación; no suman puntos extra a su posición.',
        )}
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h3 className={h3}>
            {t('Cost', 'Costo')}: {locale === 'es' ? priceLabelEs(cost.label) : cost.label}
            <EvidenceChip evidence={cost.evidence} />
          </h3>
          <ul className="mt-3 space-y-1.5 text-sm text-[#333]">
            <li>
              {cost.evidence === 'verified'
                ? t(
                    'Prices are copied word-for-word from the vendor’s pricing page and expire 30 days after we checked.',
                    'Los precios se copian tal cual de la página del proveedor y caducan 30 días después de revisarlos.',
                  )
                : t(
                    'We couldn’t verify a current price. Ask the vendor for a quote.',
                    'No pudimos verificar un precio actual. Pide una cotización al proveedor.',
                  )}
            </li>
            {cost.trialDays !== null && (
              <li>
                {t(`Free trial: ${cost.trialDays} days.`, `Prueba gratis: ${cost.trialDays} días.`)}
              </li>
            )}
            {cost.usageLimit && (
              <li>
                {t('Usage limit', 'Límite de uso')}: {cost.usageLimit}
              </li>
            )}
          </ul>
        </div>

        <div className={card}>
          <h3 className={h3}>
            {t('Setup difficulty', 'Dificultad de preparación')}: {say(levelCopy[setup.level])} (
            {setup.score}/100) <EvidenceChip evidence="estimated" />
          </h3>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[.08em] text-[#555]">
              <tr>
                <th className="py-1 font-semibold">{t('Factor', 'Factor')}</th>
                <th className="py-1 font-semibold">{t('Points × weight', 'Puntos × peso')}</th>
                <th className="py-1 font-semibold">{t('Evidence', 'Evidencia')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f1ef]">
              {setup.factors.map((f) => (
                <tr key={f.key}>
                  <td className="py-2 pr-2">
                    <span className="font-semibold">{say(f.label)}</span>
                    <span className="block text-xs text-[#555]">{say(f.note)}</span>
                  </td>
                  <td className="py-2 pr-2 tabular-nums">
                    {f.points} × {f.weight}
                  </td>
                  <td className="py-2">
                    <EvidenceChip evidence={f.evidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {setup.vendorQuote && (
            <p className="mt-2 text-sm">
              <EvidenceChip evidence="vendor" /> “{setup.vendorQuote}”
            </p>
          )}
          <p className="mt-2 text-xs text-[#555]">
            {t(
              'Easy under 30, Moderate under 60, otherwise Advanced. This is a setup-complexity estimate from a documented rubric, not a measured usability or “cognitive load” score.',
              'Fácil por debajo de 30, Moderada por debajo de 60; si no, Avanzada. Es una estimación con una rúbrica documentada, no una medición de usabilidad o “carga cognitiva”.',
            )}
          </p>
        </div>

        <div className={card}>
          <h3 className={h3}>
            {t('Integration friction', 'Fricción de integración')}:{' '}
            {ifs
              ? say(frictionCopy[ifs.level])
              : t('Tell us your tools first', 'Primero dinos tus herramientas')}
            {ifs?.score !== null && ifs?.score !== undefined && ` (${ifs.score}/100)`}
            {ifs && <EvidenceChip evidence={ifs.evidence} />}
          </h3>
          <p className="mt-2 text-sm text-[#333]">
            IFS = 0.5 × I + 0.3 × S + 0.2 × T{' '}
            <span className="text-xs text-[#555]">
              {t(
                '(0 easiest, 100 hardest; weights provisional)',
                '(0 lo más fácil, 100 lo más difícil; pesos provisionales)',
              )}
            </span>
          </p>
          {ifs ? (
            <>
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  I · {t('integration method', 'método de integración')}:{' '}
                  {ifs.components.I ?? t('not verified', 'sin verificar')}
                </li>
                <li>
                  S · {t('setup effort', 'esfuerzo de preparación')}: {ifs.components.S}
                </li>
                <li>
                  T · {t('technical complexity', 'complejidad técnica')}: {ifs.components.T}
                </li>
              </ul>
              {ifs.systems.length ? (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {ifs.systems.map((s) => (
                    <li key={s.name} className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {s.required && (
                        <span className="text-xs text-[#9a3632]">
                          {t('required', 'obligatoria')}
                        </span>
                      )}
                      — {say(methodCopy[s.method])} <EvidenceChip evidence={s.evidence} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">
                  {t(
                    'You told us there’s nothing it must connect to.',
                    'Nos dijiste que no necesita conectarse con nada.',
                  )}
                </p>
              )}
            </>
          ) : null}
          <p className="mt-3 text-xs text-[#555]">
            {t(
              'Rubric: named in the vendor’s sources 0 · copy by hand / CSV 40 (if you said that’s fine). If we can’t verify a connection, the score stays “Not verified” instead of guessing; a missing mention isn’t proof it doesn’t work.',
              'Rúbrica: mencionado en fuentes del proveedor 0 · copiar a mano / CSV 40 (si dijiste que te sirve). Si no podemos verificar una conexión, queda “Sin verificar” en lugar de adivinar.',
            )}
          </p>
        </div>

        <div className={card}>
          <h3 className={h3}>
            {t('Is it worth trying?', '¿Vale la pena probarla?')} <EvidenceChip evidence="yours" />
          </h3>
          <p className="mt-2 text-sm text-[#333]">
            {t(
              'Monthly net benefit = hours saved per month × value of an hour − monthly cost. Payback = one-time setup cost ÷ monthly net benefit.',
              'Beneficio neto mensual = horas ahorradas al mes × valor de una hora − costo mensual. Recuperación = costo único ÷ beneficio neto mensual.',
            )}
          </p>
          <div className="mt-3">
            <WorthIt record={record} />
          </div>
        </div>
      </div>

      <div className={`${card} mt-4`}>
        <h3 className={h3}>
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
          {t('Not yet independently tested', 'Aún sin pruebas independientes')}
        </h3>
        <ul className="mt-3 grid gap-3 md:grid-cols-3">
          {untestedMetrics.map((m) => (
            <li key={m.key} className="rounded-xl bg-[#f6f6f3] p-3 text-sm">
              <span className="font-semibold">{say(m.label)}</span>
              <span className="mt-1 block text-xs text-[#555]">{say(m.why)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[#555]">
          {t('Method version', 'Versión del método')}: {METRICS_VERSION}
        </p>
      </div>
    </section>
  );
}
