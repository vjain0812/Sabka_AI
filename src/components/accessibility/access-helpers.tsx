'use client';
import Link from 'next/link';
import { Accessibility, ChevronRight, ExternalLink } from 'lucide-react';
import {
  helpersByNeed,
  needCopy,
  type AccessNeed,
  type HelperCost,
} from '@/lib/domain/accessibility';
import { useLanguage } from '@/lib/client/language';

/**
 * "Tools that help you": personal assistive options grouped by the owner's needs.
 * SABKA advises; the makers listed provide these products.
 */
export function AccessHelpers({
  needs,
  catalog,
}: {
  needs: AccessNeed[];
  catalog: Map<string, { name: string; vendor: string; summary: string }>;
}) {
  const { t, locale } = useLanguage();
  const groups = helpersByNeed(needs);
  if (!groups.length) return null;
  const cost: Record<HelperCost, string> = {
    free_builtin: t('Free · built in', 'Gratis · ya incluido'),
    free_app: t('Free app', 'App gratuita'),
    paid: t('Paid', 'De pago'),
  };
  return (
    <section
      aria-labelledby="helpers-heading"
      className="mt-8 rounded-[24px] border border-[#e2e2df] bg-white p-5 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ffd200] text-black">
          <Accessibility className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 id="helpers-heading" className="text-xl font-semibold tracking-[-0.02em]">
            {t('Tools that help you', 'Herramientas que te ayudan')}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#555]">
            {t(
              'Based on what you told us. Many are free and already on your phone or computer. We recommend; the makers provide them. Ask someone you trust to help you set them up if you like.',
              'Según lo que nos contaste. Muchas son gratis y ya están en tu teléfono o computadora. Nosotros recomendamos; sus fabricantes las ofrecen. Si quieres, pide ayuda a alguien de confianza para configurarlas.',
            )}
          </p>
        </div>
      </div>
      <div className="mt-6 space-y-7">
        {groups.map((group) => (
          <div key={group.need}>
            <h3 className="text-sm font-bold uppercase tracking-[.1em] text-[#c41230]">
              {locale === 'es' ? needCopy[group.need].es : needCopy[group.need].en}
            </h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.helpers.map((h) => (
                <li key={h.id} className="flex flex-col rounded-[18px] bg-[#f6f6f3] p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <strong className="font-semibold">{h.name}</strong>
                    <span className="text-xs text-[#555]">
                      {h.maker} · {h.platforms}
                    </span>
                  </div>
                  <p className="mt-1.5 flex-1 text-sm leading-6 text-[#333]">
                    {locale === 'es' ? h.es : h.en}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        h.cost === 'paid' ? 'bg-[#eee] text-[#333]' : 'bg-[#111] text-[#ffd200]'
                      }`}
                    >
                      {cost[h.cost]}
                    </span>
                    <a
                      href={h.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#111] underline-offset-2 hover:underline"
                    >
                      {t('Official guide', 'Guía oficial')}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">
                        {t(
                          `for ${h.name} (opens in a new tab)`,
                          `de ${h.name} (se abre en otra pestaña)`,
                        )}
                      </span>
                    </a>
                  </div>
                </li>
              ))}
              {group.catalog
                .filter((slug) => catalog.has(slug))
                .map((slug) => {
                  const tool = catalog.get(slug)!;
                  return (
                    <li
                      key={slug}
                      className="flex flex-col rounded-[18px] border border-[#e2e2df] p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <strong className="font-semibold">{tool.name}</strong>
                        <span className="text-xs text-[#555]">{tool.vendor}</span>
                      </div>
                      <p className="mt-1.5 flex-1 text-sm leading-6 text-[#333]">{tool.summary}</p>
                      <Link
                        href={`/tools/${slug}`}
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#c41230]"
                      >
                        {t(
                          'In our catalog: sources & price',
                          'En nuestro catálogo: fuentes y precio',
                        )}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6 text-xs text-[#555]">
        {t(
          'Links checked 2026-11-08. Features can differ by device model and software version.',
          'Enlaces revisados el 2026-11-08. Las funciones pueden variar según el modelo y la versión del software.',
        )}
      </p>
    </section>
  );
}
