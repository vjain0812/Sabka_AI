import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock3,
  ExternalLink,
  Gift,
  ShieldCheck,
  Tag,
  Users,
} from 'lucide-react';
import { loadCatalog } from '@/lib/server/catalog-repository';
import { freshness } from '@/lib/domain/catalog-record';
import { compactCount, toolInsights, type ToolInsights } from '@/lib/domain/tool-insights';
import { similarTools } from '@/lib/domain/similar-tools';
import { businessTypeEs, priceLabelEs, workflowEs } from '@/lib/domain/i18n-es';
import {
  businessTypes,
  businessTags,
  libraryWorkflows,
  workflowTags,
} from '@/lib/domain/library-taxonomy';
import { spanishToolSummary } from '@/lib/domain/tool-translations';
import { ToolMark } from '@/components/site/tool-mark';
import { ToolAssistant } from '@/components/tool-assistant';
import { T } from '@/components/site/t';
import { DetailedMetrics } from '@/components/metrics/detailed-metrics';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await loadCatalog();
  return { title: c.records.find((r) => r.tool.slug === slug)?.tool.name ?? 'Tool not found' };
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Tag;
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="rise rounded-[22px] border border-[#e2e2df] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,.05)]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#c41230]">
        <Icon className="h-4 w-4" aria-hidden="true" /> {label}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#111]">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-[#666]">{note}</p>}
    </div>
  );
}
const priceValue = (i: ToolInsights) =>
  i.cheapest === null ? (
    <T en="Ask the vendor" es="Consulta al proveedor" />
  ) : (
    <T en={i.priceLabel} es={priceLabelEs(i.priceLabel)} />
  );
const setupValue = (i: ToolInsights) =>
  i.setupQuote ? `“${i.setupQuote}”` : <T en={i.estimate.label} es={i.estimate.labelEs} />;
const peopleValue = (i: ToolInsights) =>
  i.customerCount ? compactCount(i.customerCount) : <T en="Not published" es="No publicado" />;

export default async function ToolDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await loadCatalog();
  const record = catalog.records.find((r) => r.tool.slug === slug);
  if (!record) notFound();
  const { tool, sources } = record;
  const info = toolInsights(record);
  const similar = similarTools(record, catalog.records).map((r) => ({
    record: r,
    info: toolInsights(r),
  }));
  const rows = [{ record, info }, ...similar];
  const watch = tool.limitations.filter((l) => !/^Official-source review only/.test(l)).slice(0, 4);
  const summaryEs = spanishToolSummary(tool.slug) ?? tool.summary;
  const chips = [
    ...workflowTags(tool).map((k) => ({
      en: libraryWorkflows[k],
      es: workflowEs[k] ?? libraryWorkflows[k],
    })),
    ...businessTags(tool)
      .filter((b) => b !== 'all_small_businesses')
      .map((b) => ({ en: businessTypes[b], es: businessTypeEs[b] ?? businessTypes[b] })),
  ].slice(0, 5);
  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      {/* ---------- Hero ---------- */}
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-[#e21833]/30 blur-[100px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-28 pt-10 lg:px-8">
          <Link
            href="/discover"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />{' '}
            <T en="Back to the catalog" es="Volver al catálogo" />
          </Link>
          <div className="rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-5">
              <span className="rounded-[20px] bg-white p-1.5 shadow-[0_20px_50px_rgba(0,0,0,.35)]">
                <ToolMark name={tool.name} website={tool.website} size="lg" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white/55">{tool.vendor}</p>
                <h1 className="text-[40px] font-semibold leading-[1] tracking-[-0.055em] sm:text-[56px]">
                  {tool.name}
                </h1>
                <p className="mt-4 max-w-[640px] text-lg leading-8 text-white/65">
                  <T en={tool.summary} es={summaryEs} />
                </p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <li
                      key={chip.en}
                      className="rounded-full border border-white/15 bg-white/[.06] px-3 py-1 text-xs font-semibold text-white/80"
                    >
                      <T en={chip.en} es={chip.es} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={tool.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
              >
                <T en="Visit official site" es="Visitar el sitio oficial" />{' '}
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">
                  <T en="(opens in a new tab)" es="(se abre en otra pestaña)" />
                </span>
              </a>
              <div className="legacy-ui tool-hero-ask">
                <ToolAssistant record={record} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-[1240px] px-5 pb-20 lg:px-8">
        {/* ---------- Key facts ---------- */}
        <section aria-label="Key facts" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Tag}
            label={<T en="Price" es="Precio" />}
            value={priceValue(info)}
            note={
              info.prices.length ? (
                <T
                  en={`From the pricing page, checked ${
                    info.prices[0].source?.checkedAt.slice(0, 10) ?? info.checkedAt
                  }`}
                  es={`De la página de precios, revisada ${
                    info.prices[0].source?.checkedAt.slice(0, 10) ?? info.checkedAt
                  }`}
                />
              ) : (
                <T en="No public price list found" es="No se encontró lista de precios pública" />
              )
            }
          />
          <Stat
            icon={Gift}
            label={<T en="Free trial" es="Prueba gratis" />}
            value={
              info.trialDays ? (
                <T en={`${info.trialDays} days`} es={`${info.trialDays} días`} />
              ) : info.freePlan ? (
                <T en="Free plan" es="Plan gratuito" />
              ) : (
                <T en="Not listed" es="No publicada" />
              )
            }
            note={
              info.trialDays && info.freePlan ? (
                <T en="Plus a free plan" es="Y además un plan gratuito" />
              ) : undefined
            }
          />
          <Stat
            icon={Clock3}
            label={<T en="Setup" es="Preparación" />}
            value={setupValue(info)}
            note={
              info.setupQuote ? (
                <T en="In the vendor’s words" es="Con palabras del proveedor" />
              ) : (
                <T
                  en="SABKA estimate for this kind of tool"
                  es="Estimación de SABKA para este tipo de herramienta"
                />
              )
            }
          />
          <Stat
            icon={Users}
            label={<T en="Customers" es="Clientes" />}
            value={peopleValue(info)}
            note={
              info.customerQuote ? (
                <T
                  en={`Vendor says “${info.customerQuote}”`}
                  es={`El proveedor dice “${info.customerQuote}”`}
                />
              ) : (
                <T en="Vendor doesn’t publish a count" es="El proveedor no publica una cifra" />
              )
            }
          />
        </section>

        {/* ---------- Plans ---------- */}
        {info.prices.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-[-0.04em]">
                <T en="Plans" es="Planes" />
              </h2>
              {info.pricingUrl && (
                <a
                  href={info.pricingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-[#c41230] hover:underline"
                >
                  <T en="Vendor pricing page" es="Página de precios del proveedor" />{' '}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">
                    <T en="(opens in a new tab)" es="(se abre en otra pestaña)" />
                  </span>
                </a>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {info.prices.map((plan, i) => (
                <article
                  key={plan.tier}
                  className={`rise rounded-[22px] border bg-white p-5 transition-transform hover:-translate-y-1 ${
                    i === 0 ? 'border-[#111]' : 'border-[#e2e2df]'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <h3 className="text-sm font-bold text-[#555]">{plan.tier}</h3>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">
                    {plan.price === 0 ? <T en="Free" es="Gratis" /> : `$${plan.price}`}
                    {plan.price > 0 && (
                      <span className="text-sm font-semibold text-[#666]">
                        {' '}
                        <T en="/mo" es="/mes" />
                      </span>
                    )}
                  </p>
                  {plan.billing && plan.price > 0 && (
                    <p className="mt-1 text-xs text-[#666]">{plan.billing}</p>
                  )}
                  {plan.quote && (
                    <p className="mt-3 border-t border-[#ececea] pt-3 text-[11px] leading-5 text-[#666]">
                      “{plan.quote}”
                    </p>
                  )}
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-[#666]">
              <T
                en="Taxes, extra users and add-ons can change the total."
                es="Los impuestos, los usuarios adicionales y los extras pueden cambiar el total."
              />
            </p>
          </section>
        )}

        {/* ---------- Compare ---------- */}
        {similar.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-semibold tracking-[-0.04em]">
              <T en="Compare with similar tools" es="Compara con herramientas similares" />
            </h2>
            <div className="overflow-x-auto rounded-[22px] border border-[#e2e2df] bg-white">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">
                  <T
                    en={`${tool.name} compared with similar tools on price, free plan, trial, setup and customers`}
                    es={`${tool.name} comparada con herramientas similares en precio, plan gratuito, prueba, preparación y clientes`}
                  />
                </caption>
                <thead>
                  <tr className="border-b border-[#ececea] text-[11px] uppercase tracking-[.1em] text-[#666]">
                    {[
                      ['Tool', 'Herramienta'],
                      ['Price', 'Precio'],
                      ['Free plan', 'Plan gratuito'],
                      ['Trial', 'Prueba'],
                      ['Setup', 'Preparación'],
                      ['Customers', 'Clientes'],
                    ].map(([en, es]) => (
                      <th key={en} scope="col" className="px-4 py-3 font-bold">
                        <T en={en} es={es} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ record: r, info: x }, i) => (
                    <tr
                      key={r.tool.id}
                      className={`border-b border-[#f1f1ef] last:border-0 ${
                        i === 0 ? 'bg-[#fffbe8]' : 'hover:bg-[#fafaf8]'
                      }`}
                    >
                      <th scope="row" className="px-4 py-3 font-semibold">
                        <span className="flex items-center gap-3">
                          <ToolMark name={r.tool.name} website={r.tool.website} size="sm" />
                          {i === 0 ? (
                            <span>
                              {r.tool.name}{' '}
                              <span className="ml-1 rounded-full bg-[#111] px-2 py-0.5 text-[10px] text-[#ffd200]">
                                <T en="This tool" es="Esta herramienta" />
                              </span>
                            </span>
                          ) : (
                            <Link href={`/tools/${r.tool.slug}`} className="hover:text-[#c41230]">
                              {r.tool.name}
                            </Link>
                          )}
                        </span>
                      </th>
                      <td className="px-4 py-3">
                        {x.cheapest === null ? (
                          '—'
                        ) : (
                          <T en={x.priceLabel} es={priceLabelEs(x.priceLabel)} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {x.freePlan ? (
                          <Check className="h-4 w-4 text-[#1a7f37]" aria-label="Sí / Yes" />
                        ) : (
                          <span className="text-[#666]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {x.trialDays ? (
                          <T en={`${x.trialDays} days`} es={`${x.trialDays} días`} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#444]">
                        <T en={x.estimate.label} es={x.estimate.labelEs} />
                      </td>
                      <td className="px-4 py-3">
                        {x.customerCount ? compactCount(x.customerCount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#666]">
              <T
                en="Prices and customer counts come from each vendor’s own site. Setup times are SABKA estimates by tool type. “—” means not published."
                es="Los precios y las cifras de clientes salen del sitio de cada proveedor. Los tiempos de preparación son estimaciones de SABKA según el tipo de herramienta. “—” significa que no está publicado."
              />
            </p>
          </section>
        )}

        {/* ---------- Good to know ---------- */}
        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[22px] border border-[#e2e2df] bg-white p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">
              <T en="Good to know" es="Conviene saber" />
            </h2>
            <ul className="mt-4 space-y-2.5">
              {watch.length ? (
                watch.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-[#444]">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]"
                      aria-hidden="true"
                    />
                    {/* Vendor-specific cautions are written in English in the catalog. */}
                    <span lang="en">{item}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2.5 text-sm text-[#444]">
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]"
                    aria-hidden="true"
                  />
                  <T
                    en="Try it with sample data before adding customer details."
                    es="Pruébala con datos de ejemplo antes de agregar datos de clientes."
                  />
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-[22px] border border-[#e2e2df] bg-white p-6">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">
              <T en="Still to confirm for your business" es="Por confirmar para tu negocio" />
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {[
                ...(info.cheapest === null ? [['Total price', 'Precio total']] : []),
                ['Integrations you need', 'Integraciones que necesitas'],
                ['Privacy & data use', 'Privacidad y uso de datos'],
                ['Approval before anything is sent', 'Aprobación antes de enviar algo'],
                ['Accessibility', 'Accesibilidad'],
              ].map(([en, es]) => (
                <li
                  key={en}
                  className="rounded-full border border-[#e2e2df] bg-[#f7f7f5] px-3 py-1.5 text-xs font-semibold text-[#444]"
                >
                  <T en={en} es={es} />
                </li>
              ))}
            </ul>
            <Link
              href="/business"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#111] hover:text-[#c41230]"
            >
              <T en="Check fit for my business" es="Ver si encaja con mi negocio" />{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <DetailedMetrics record={record} />

        {/* ---------- Evidence ---------- */}
        <details className="group mt-6 rounded-[22px] border border-[#e2e2df] bg-white px-6 py-4">
          <summary className="flex list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <h2 className="text-lg font-semibold tracking-[-0.02em]">
              <T en="The evidence trail" es="El rastro de evidencia" />
            </h2>
            <span className="text-xs font-semibold text-[#666]">
              <T
                en={`${sources.length} ${sources.length === 1 ? 'source' : 'sources'} · checked ${
                  info.checkedAt
                }`}
                es={`${sources.length} ${sources.length === 1 ? 'fuente' : 'fuentes'} · revisadas ${
                  info.checkedAt
                }`}
              />
            </span>
          </summary>
          <ul className="mt-4 divide-y divide-[#f1f1ef]">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold hover:text-[#c41230]"
                >
                  {source.title} <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">
                    <T en="(opens in a new tab)" es="(se abre en otra pestaña)" />
                  </span>
                </a>
                <span className="text-xs text-[#666]">
                  {source.type === 'official' ? (
                    <T en="Official" es="Oficial" />
                  ) : (
                    source.type.replaceAll('_', ' ')
                  )}{' '}
                  · {source.checkedAt.slice(0, 10)}
                  {freshness(source.checkedAt, source.expiresAt) !== 'current' && (
                    <>
                      {' · '}
                      <T en="needs refresh" es="por actualizar" />
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
