'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import { freshness } from '@/lib/domain/catalog-record';
import { filterCatalog, pricingLabel } from '@/lib/domain/catalog-browse';
import { jobs } from '@/lib/domain/brief';
import { businessTypes, libraryWorkflows, workflowTags } from '@/lib/domain/library-taxonomy';
import { scenarios } from '@/lib/domain/scenarios';
import { useWorkspace } from '@/lib/client/workspace';
import { useLanguage } from '@/lib/client/language';
import { businessTypeEs, jobEs, priceLabelEs, workflowEs } from '@/lib/domain/i18n-es';
import { scenarioNames } from '@/lib/domain/scenarios';
import { spanishToolSummary } from '@/lib/domain/tool-translations';
import { ScenarioIcon } from './site/scenario-icon';
import { ToolMark } from './site/tool-mark';

type CatalogProps = { records: CatalogRecord[]; origin: string; message: string; version: string };
const PAGE = 12;
/** Up to five page numbers around the current page, so the bar fits on a phone. */
function pageWindow(page: number, count: number) {
  const start = Math.max(0, Math.min(page - 2, count - 5));
  return Array.from({ length: Math.min(5, count) }, (_, i) => start + i);
}
const selectClass =
  'w-full appearance-none rounded-xl border border-[#d8d8d8] bg-white px-3.5 py-2.5 pr-8 text-sm text-[#222] outline-none transition-all focus:border-[#e21833] focus:ring-4 focus:ring-[#e21833]/10';

export function CatalogBrowser({ catalog }: { catalog: CatalogProps }) {
  const { t, locale } = useLanguage();
  const wfLabel = (key: string, en: string) => (locale === 'es' ? workflowEs[key] ?? en : en);
  const [query, setQuery] = useState('');
  const [job, setJob] = useState('');
  const [price, setPrice] = useState('');
  const [evidence, setEvidence] = useState('');
  const [workflow, setWorkflow] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [pagination, setPagination] = useState({ key: '', index: 0 });
  const resultLine = useRef<HTMLParagraphElement>(null);
  const workspace = useWorkspace();
  const records = useMemo(
    () => filterCatalog(catalog.records, { query, job, price, evidence, workflow, businessType }),
    [catalog.records, query, job, price, evidence, workflow, businessType],
  );
  const filterKey = JSON.stringify([query, job, price, evidence, workflow, businessType]);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE));
  const page = pagination.key === filterKey ? Math.min(pagination.index, pageCount - 1) : 0;
  const visibleRecords = records.slice(page * PAGE, (page + 1) * PAGE);
  const activeFilters = [job, price, evidence, businessType].filter(Boolean).length;
  function turnPage(index: number) {
    setPagination({ key: filterKey, index });
    resultLine.current?.focus();
    resultLine.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function clear() {
    setQuery('');
    setJob('');
    setPrice('');
    setEvidence('');
    setWorkflow('');
    setBusinessType('');
    setPagination({ key: '', index: 0 });
  }
  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      {/* ---------- Hero + search ---------- */}
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[460px] w-[460px] rounded-full bg-[#e21833]/35 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 -top-10 h-[440px] w-[440px] rounded-full bg-[#ffd200]/10 blur-[110px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-32 pt-14 lg:px-8 lg:pt-20">
          <div className="rise mb-7 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white/75">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffd200] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[#ffd200]" />
            </span>
            {catalog.records.length}{' '}
            {t('source-checked tools', 'herramientas con fuentes verificadas')} ·{' '}
            {catalog.origin === 'database'
              ? t('Published catalog', 'Catálogo publicado')
              : catalog.origin === 'last-known'
              ? t('Last known catalog', 'Último catálogo conocido')
              : t('Research snapshot', 'Resumen de investigación')}
          </div>
          <h1 className="rise max-w-[860px] text-[44px] font-semibold leading-[.98] tracking-[-0.06em] sm:text-[64px]">
            {t('Browse the stack.', 'Explora las herramientas.')}{' '}
            <span className="bg-gradient-to-r from-[#ffd200] via-[#ffdf43] to-white bg-clip-text text-transparent">
              {t('Inspect the evidence.', 'Revisa la evidencia.')}
            </span>
          </h1>
          <p className="rise mt-6 max-w-[620px] text-lg leading-8 text-white/60">
            {t(
              'See what each tool does, where the facts come from and what still needs checking. Browsing isn’t a recommendation. You stay in control.',
              'Mira qué hace cada herramienta, de dónde salen los datos y qué falta por revisar. Explorar no es una recomendación. Tú tienes el control.',
            )}
          </p>
          <div className="rise relative mt-9 max-w-[720px]">
            <label htmlFor="catalog-query" className="sr-only">
              {t('Search tools', 'Buscar herramientas')}
            </label>
            <Search
              className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#888]"
              aria-hidden="true"
            />
            <input
              id="catalog-query"
              type="search"
              maxLength={120}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                'Search by name, vendor or task — e.g. “scheduling”',
                'Busca por nombre, proveedor o tarea — p. ej. “citas”',
              )}
              className="w-full rounded-full border border-white/30 bg-white py-4 pl-14 pr-5 text-[15px] text-[#111] shadow-[0_20px_60px_rgba(0,0,0,.35)] outline-none placeholder:text-[#8a8a8a] focus:ring-4 focus:ring-[#ffd200]/40"
            />
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-20 max-w-[1240px] px-5 pb-20 lg:px-8">
        {/* ---------- Workflow category chips ---------- */}
        <section
          aria-label={t('Filter catalog', 'Filtrar el catálogo')}
          className="rounded-[28px] border border-white/50 bg-white p-3 shadow-[0_35px_90px_rgba(0,0,0,.18)] sm:p-4"
        >
          <div className="rounded-[20px] bg-[#f4f4f2] p-4 sm:p-5">
            <fieldset>
              <legend className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#5f5f5f]">
                {t('Workflow category', 'Categoría de flujo')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {[['', t('All', 'Todas')], ...Object.entries(libraryWorkflows)].map(
                  ([key, label]) => {
                    const active = workflow === key;
                    return (
                      <button
                        type="button"
                        key={key || 'all'}
                        aria-pressed={active}
                        onClick={() => setWorkflow(key)}
                        className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                          active
                            ? 'border-[#e21833] bg-[#e21833] text-white shadow-[0_6px_18px_rgba(226,24,51,.25)]'
                            : 'border-[#d5d5d5] bg-white text-[#5b5b5b] hover:border-[#e21833]'
                        }`}
                      >
                        {key ? wfLabel(key, label) : label}
                      </button>
                    );
                  },
                )}
              </div>
            </fieldset>
            <details className="group mt-4">
              <summary className="flex w-fit list-none items-center gap-2 rounded-full px-1 py-1 text-sm font-semibold text-[#333] [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {t('More filters', 'Más filtros')}
                {activeFilters > 0 && (
                  <span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-bold text-[#ffd200]">
                    {activeFilters}
                  </span>
                )}
                <ChevronRight
                  className="h-4 w-4 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold text-[#555]">
                  {t('Business type', 'Tipo de negocio')}
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                  >
                    <option value="">{t('Any business type', 'Cualquier tipo de negocio')}</option>
                    {Object.entries(businessTypes).map(([key, label]) => (
                      <option key={key} value={key}>
                        {locale === 'es' ? businessTypeEs[key] ?? label : label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#555]">
                  {t('Current matching task', 'Tarea de recomendación')}
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                  >
                    <option value="">
                      {t('Include library-only tools', 'Incluir herramientas solo de catálogo')}
                    </option>
                    {Object.entries(jobs)
                      .filter(([k]) => k !== 'other')
                      .map(([k, v]) => (
                        <option key={k} value={k}>
                          {locale === 'es' ? jobEs[k] ?? v.title : v.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#555]">
                  {t('Pricing evidence', 'Evidencia de precios')}
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  >
                    <option value="">
                      {t('Include unknown prices', 'Incluir precios desconocidos')}
                    </option>
                    <option value="documented">
                      {t('Documented tier price', 'Precio de plan documentado')}
                    </option>
                    <option value="free">
                      {t('Documented free tier', 'Plan gratuito documentado')}
                    </option>
                  </select>
                </label>
                <label className="text-xs font-semibold text-[#555]">
                  {t('Evidence requirement', 'Requisito de evidencia')}
                  <select
                    className={`${selectClass} mt-1.5`}
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                  >
                    <option value="">{t('All source evidence', 'Toda la evidencia')}</option>
                    <option value="policy">
                      {t('Policy source available', 'Con fuente de políticas')}
                    </option>
                    <option value="tested">{t('Internal task test', 'Con prueba interna')}</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
          <div className="flex flex-col gap-3 px-3 pb-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p
              role="status"
              data-result-line
              ref={resultLine}
              tabIndex={-1}
              className="flex items-center gap-2 text-sm text-[#555] outline-none"
            >
              <span className="h-2 w-2 rounded-full bg-[#e21833]" aria-hidden="true" />
              <strong className="text-[#111]">{records.length}</strong>{' '}
              {records.length === 1 ? t('tool', 'herramienta') : t('tools', 'herramientas')} ·{' '}
              {t('alphabetical', 'orden alfabético')}
              {records.length > 0 &&
                ` · ${t('showing', 'mostrando')} ${page * PAGE + 1}–${Math.min(
                  (page + 1) * PAGE,
                  records.length,
                )}`}
            </p>
            <button
              type="button"
              onClick={clear}
              className="flex w-fit items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#c41230] hover:bg-[#e21833]/5"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{' '}
              {t('Reset filters', 'Borrar filtros')}
            </button>
          </div>
        </section>

        {workspace.session?.brief.need.job === 'other' && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-[#f1e3a4] bg-[#fffbe8] px-4 py-3 text-sm text-[#4b4535]">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]" aria-hidden="true" />
            {t(
              'Your selected job is outside personalized matching. You can explore this catalog, but these categories do not establish a match for your request.',
              'Tu tarea queda fuera de la recomendación personalizada. Puedes explorar el catálogo, pero estas categorías no garantizan que encaje con lo que necesitas.',
            )}
          </p>
        )}

        {/* ---------- Grid ---------- */}
        {records.length === 0 ? (
          <section className="mt-8 rounded-[26px] border border-[#dddddd] bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">
              {t(
                'No tools meet these browsing filters.',
                'Ninguna herramienta cumple estos filtros.',
              )}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[#666]">
              {t(
                'We won’t fill the gap with assumed evidence. Try fewer filters, or keep using your existing tools.',
                'No rellenaremos el vacío con evidencia supuesta. Prueba con menos filtros o sigue usando tus herramientas actuales.',
              )}
            </p>
            <button
              type="button"
              onClick={clear}
              className="mt-6 rounded-full bg-[#ffd200] px-6 py-3 text-sm font-bold text-black"
            >
              {t('Clear filters', 'Borrar filtros')}
            </button>
          </section>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRecords.map((record, index) => {
              const { tool, sources } = record;
              const expired = sources.some(
                (s) => freshness(s.checkedAt, s.expiresAt) !== 'current',
              );
              return (
                <article
                  key={tool.id}
                  data-catalog-card
                  className="rise group relative flex flex-col overflow-hidden rounded-[26px] border border-[#dddddd] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.06)] transition-all hover:-translate-y-2 hover:shadow-[0_25px_55px_rgba(226,24,51,.12)]"
                  style={{ animationDelay: `${(index % PAGE) * 40}ms` }}
                >
                  <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#ffd200]/0 blur-2xl transition-colors duration-500 group-hover:bg-[#ffd200]/25" />
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ToolMark name={tool.name} website={tool.website} />
                      <div className="min-w-0">
                        <h2 className="font-semibold tracking-[-0.025em]">{tool.name}</h2>
                        <p className="mt-0.5 truncate text-xs text-[#666]">{tool.vendor}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        expired ? 'bg-[#fdeae6] text-[#8d3825]' : 'bg-[#fff4bf] text-[#3d3200]'
                      }`}
                    >
                      {expired
                        ? t('Needs refresh', 'Por actualizar')
                        : t('Sources checked', 'Fuentes revisadas')}
                    </span>
                  </div>
                  <p
                    className="text-[14px] leading-6 text-[#555]"
                    lang={locale === 'es' && spanishToolSummary(tool.slug) ? 'es' : 'en'}
                  >
                    {(locale === 'es' && spanishToolSummary(tool.slug)) || tool.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {workflowTags(tool)
                      .slice(0, 3)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[10px] font-semibold text-[#6e6e6e]"
                        >
                          {wfLabel(tag, libraryWorkflows[tag])}
                        </span>
                      ))}
                  </div>
                  <div className="mt-auto pt-5">
                    <p className="w-fit rounded-full bg-gradient-to-r from-[#fff4bf] to-[#fffbe8] px-3 py-1.5 text-xs font-bold text-[#3d3200]">
                      {locale === 'es' ? priceLabelEs(pricingLabel(record)) : pricingLabel(record)}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[#666]">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                        {sources.length}{' '}
                        {sources.length === 1 ? t('source', 'fuente') : t('sources', 'fuentes')} ·{' '}
                        {record.review.checkedAt?.slice(0, 10) ?? t('Not reviewed', 'Sin revisar')}
                      </span>
                      <Link
                        href={`/tools/${tool.slug}`}
                        aria-label={
                          locale === 'es'
                            ? `Ver la evidencia de ${tool.name}`
                            : `Inspect ${tool.name} evidence`
                        }
                        className="flex items-center gap-1 font-bold text-[#c41230] transition-all after:absolute after:inset-0 after:z-10 after:content-[''] group-hover:gap-2"
                      >
                        {t('Evidence', 'Evidencia')}{' '}
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pageCount > 1 && (
          <nav
            aria-label={t('Catalog pages', 'Páginas del catálogo')}
            className="mt-10 flex items-center justify-center gap-2"
          >
            <button
              type="button"
              disabled={page === 0}
              onClick={() => turnPage(page - 1)}
              aria-label={t('Previous page', 'Página anterior')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d8d8] bg-white disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            {pageWindow(page, pageCount).map((i) => (
              <button
                type="button"
                key={i}
                onClick={() => turnPage(i)}
                aria-current={i === page ? 'page' : undefined}
                aria-label={t(`Page ${i + 1} of ${pageCount}`, `Página ${i + 1} de ${pageCount}`)}
                className={`h-11 min-w-11 rounded-full px-4 text-sm font-bold ${
                  i === page
                    ? 'bg-black text-[#ffd200]'
                    : 'border border-[#d8d8d8] bg-white text-[#444]'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              type="button"
              disabled={page === pageCount - 1}
              onClick={() => turnPage(page + 1)}
              aria-label={t('Next page', 'Página siguiente')}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d8d8d8] bg-white disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}

        {/* ---------- Workflow shortcut ---------- */}
        <section className="mt-14 overflow-hidden rounded-[26px] bg-black p-6 text-white sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#ffd200]">
                {t('Prefer a guided start?', '¿Prefieres un comienzo guiado?')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
                {t(
                  'See how tools fit together for a business like yours.',
                  'Mira cómo encajan las herramientas en un negocio como el tuyo.',
                )}
              </h2>
            </div>
            <Link
              href="/workflows"
              className="flex w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-[#ffd200]"
            >
              {t('All workflows', 'Todos los flujos')}{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {scenarios.map((s) => (
              <Link
                key={s.slug}
                href={`/workflows/${s.slug}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-[#ffd200] hover:text-white"
              >
                <ScenarioIcon name={s.icon} className="h-3.5 w-3.5" />
                {scenarioNames(s, locale).shortName}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col gap-3 text-xs text-[#666] sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl">
            {t(
              `${catalog.message} Evidence labels describe sources, not a probability of success. No fit scores, safety ratings or licensed customer ratings are included. Personalized matching currently covers reply drafting, marketing content and appointment organization.`,
              'Las etiquetas de evidencia describen fuentes, no una probabilidad de éxito. No se incluyen puntajes de ajuste, calificaciones de seguridad ni reseñas de clientes con licencia. Las recomendaciones personalizadas cubren por ahora la redacción de respuestas, el contenido de marketing y la organización de citas.',
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
