'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import {
  Accessibility,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { useLanguage } from '@/lib/client/language';
import { catalogRecordSchema } from '@/lib/domain/catalog-record';
import { spanishToolSummary } from '@/lib/domain/tool-translations';
import { tutorialFor, tutorialSearchUrl } from '@/lib/domain/learning-resources';
import { scenarioForCategory, scenarioNames } from '@/lib/domain/scenarios';
import { LearningVideo } from './learning-video';
import { ToolAssistant } from './tool-assistant';
import { ScenarioIcon } from './site/scenario-icon';
import { ToolMark } from './site/tool-mark';
import { AccessHelpers } from './accessibility/access-helpers';
import { SaveToolButton } from './journey/save-tool-button';
import { CardMetrics } from './metrics/card-metrics';
import { useJourney } from '@/lib/client/journey';
import { excludedSlugs } from '@/lib/domain/journey';
import type { BusinessBrief } from '@/lib/domain/brief';
import { ReadAloudButton } from './accessibility/speech-buttons';
import { useDisplay } from '@/lib/client/display';
import { useReadAloud } from '@/lib/client/speech';
import {
  accessibilityStatement,
  cautionCopy,
  featureCopy,
  type AccessCaution,
  type AccessFeature,
  type AccessNeed,
} from '@/lib/domain/accessibility';

const pickSchema = z.object({
  record: catalogRecordSchema,
  score: z.number(),
  fit: z.enum(['strong', 'good', 'possible']),
  reasons: z.array(z.string()),
  why: z.string(),
  aiRanked: z.boolean(),
  price: z.string(),
  alreadyUsed: z.boolean(),
  access: z
    .object({ helps: z.array(z.string()), cautions: z.array(z.string()) })
    .default({ helps: [], cautions: [] }),
});
const resultSchema = z.object({
  method: z.enum(['rules', 'rules+ai']),
  model: z.string().nullable(),
  needs: z.array(z.string()),
  picks: z.array(pickSchema).max(6),
  setAside: z.array(z.object({ name: z.string(), slug: z.string(), reason: z.string() })),
  considered: z.number(),
  note: z.string().nullable(),
  helpers: z
    .array(
      z.object({ slug: z.string(), name: z.string(), vendor: z.string(), summary: z.string() }),
    )
    .default([]),
});
type Result = z.infer<typeof resultSchema>;
type Pick = z.infer<typeof pickSchema>;

/** AI-ranking preference for this tab, readable during render via useSyncExternalStore. */
const AI_KEY = 'sabka-ai:v1:use-ai';
const aiListeners = new Set<() => void>();
let aiMemory = true;
function readAi() {
  try {
    return window.sessionStorage.getItem(AI_KEY) !== 'off';
  } catch {
    return aiMemory;
  }
}
function writeAi(on: boolean) {
  aiMemory = on;
  try {
    window.sessionStorage.setItem(AI_KEY, on ? 'on' : 'off');
  } catch {
    /* Falls back to memory for this page view. */
  }
  aiListeners.forEach((l) => l());
}
function subscribeAi(listener: () => void) {
  aiListeners.add(listener);
  return () => aiListeners.delete(listener);
}

export function SimpleRecommendations() {
  const state = useWorkspace();
  const { t, locale } = useLanguage();
  const useAi = useSyncExternalStore(subscribeAi, readAi, () => true);
  const [response, setResponse] = useState<{ key: string; data: Result | null } | null>(null);
  const [retry, setRetry] = useState(0);
  const brief = state.session?.brief;
  const journey = useJourney();
  // Wait for a saved journey to load so tools the owner ruled out are excluded from the start.
  const journeyPending = journey.status === 'loading';
  const exclude = excludedSlugs(journey.view?.journey);
  const allowed = Boolean(state.session?.confirmedAt && state.session.matchingConsent && brief);
  const body =
    allowed && brief && !journeyPending
      ? JSON.stringify({
          problem: brief.need.problem,
          category: brief.profile.category,
          budgetUsd: brief.need.monthlyBudgetUsd ?? 0,
          setupMinutes: brief.need.setupMinutes ?? 60,
          channels: brief.need.channels.slice(0, 10),
          currentSystems: brief.need.currentSystems.slice(0, 10),
          subscriptions: brief.need.subscriptions.slice(0, 300),
          access: brief.profile.access ?? [],
          exclude,
          useAi,
          locale,
          consent: true,
        })
      : null;
  useEffect(() => {
    if (!body) return;
    const controller = new AbortController();
    void fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable');
        return resultSchema.parse(await res.json());
      })
      .then((data) => setResponse({ key: body, data }))
      .catch(() => {
        if (!controller.signal.aborted) setResponse({ key: body, data: null });
      });
    return () => controller.abort();
  }, [body, retry]);

  function toggleAi() {
    writeAi(!useAi);
  }

  if (!state.ready || (allowed && journeyPending))
    return <p role="status">{t('Opening your options…', 'Abriendo tus opciones…')}</p>;
  if (!body || !brief)
    return (
      <section className="simple-empty">
        <h1>{t('Tell us about your business first.', 'Primero cuéntanos sobre tu negocio.')}</h1>
        <p>{t('It takes about a minute.', 'Toma alrededor de un minuto.')}</p>
        {state.session?.confirmedAt ? (
          <button className="button" onClick={() => workspace.confirm(true)}>
            {t('Find my options', 'Buscar mis opciones')} <ArrowRight size={16} />
          </button>
        ) : null}
        <Link className="button button-secondary" href="/business">
          {t('Go to my business', 'Ir a mi negocio')}
        </Link>
      </section>
    );

  const result = response?.key === body ? response : null;
  const scenario = scenarioForCategory(brief.profile.category);
  return (
    <div className="simple-results">
      <Link className="quiet-link" href="/business">
        <ArrowLeft size={15} />
        {t('Edit my answers', 'Editar mis respuestas')}
      </Link>
      <header className="simple-page-heading">
        <p className="easy-eyebrow">{t('YOUR OPTIONS', 'TUS OPCIONES')}</p>
        <h1>{t('Your top picks', 'Tus mejores opciones')}</h1>
        <p>
          {result?.data?.needs.length
            ? `${t('We heard', 'Entendimos')}: ${result.data.needs.join(' · ')}`
            : t(
                'Matched to your words, budget and business.',
                'Según tus palabras, presupuesto y negocio.',
              )}
        </p>
      </header>

      <div className="brand-ui">
        {!result ? (
          <Loading />
        ) : !result.data ? (
          <section role="alert" className="rounded-[24px] border border-[#e2e2df] bg-white p-8">
            <h2 className="text-xl font-semibold">
              {t('We couldn’t load your options.', 'No pudimos cargar tus opciones.')}
            </h2>
            <p className="mt-2 text-[#555]">
              {t('Your answers are safe.', 'Tus respuestas están a salvo.')}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={() => setRetry((n) => n + 1)}
                className="rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
              >
                {t('Try again', 'Intentar de nuevo')}
              </button>
              <Link
                href="/discover"
                className="rounded-full border border-[#d8d8d8] px-5 py-3 text-sm font-semibold"
              >
                {t('Browse all tools', 'Ver todas las herramientas')}
              </Link>
            </div>
          </section>
        ) : (
          <Results
            result={result.data}
            useAi={useAi}
            onToggleAi={toggleAi}
            needs={brief.profile.access ?? []}
            brief={brief}
            excludedCount={exclude.length}
          />
        )}

        {scenario && (
          <Link
            href={`/workflows/${scenario.slug}`}
            className="group mt-6 flex items-center gap-4 rounded-[22px] bg-[#090909] p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-black"
              style={{ background: scenario.accent }}
            >
              <ScenarioIcon name={scenario.icon} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[#ffd200]">
                {t('Workflow for businesses like yours', 'Flujo para negocios como el tuyo')}
              </span>
              <span className="mt-0.5 block font-semibold">
                {scenarioNames(scenario, locale).profession}
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-bold text-[#ffd200]">
              {t('Open the workflow', 'Abrir el flujo')}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        )}
        <Link
          href="/connect"
          className="group mt-4 flex items-center gap-4 rounded-[22px] border border-[#e2e2df] bg-white p-5 transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ffd200] text-black">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[#c41230]">
              {t('Optional · Connect', 'Opcional · Connect')}
            </span>
            <span className="mt-0.5 block font-semibold">
              {t(
                'Ask owners who’ve tried these tools',
                'Pregunta a dueños que ya probaron estas herramientas',
              )}
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm font-bold text-[#111]">
            {t('Open Connect', 'Abrir Connect')}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </Link>
      </div>
    </div>
  );
}

function Loading() {
  const { t } = useLanguage();
  const steps = [
    t('Reading your problem', 'Leyendo tu problema'),
    t('Checking every tool', 'Revisando cada herramienta'),
    t('Ranking your matches', 'Ordenando tus opciones'),
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 2)), 900);
    return () => clearInterval(id);
  }, []);
  return (
    <div role="status" className="rounded-[24px] border border-[#e2e2df] bg-white p-6">
      <ol className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`flex items-center gap-2.5 text-sm font-semibold ${
              i <= step ? 'text-[#111]' : 'text-[#666]'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                i < step
                  ? 'bg-[#111] text-[#ffd200]'
                  : i === step
                  ? 'pulse-ring bg-[#ffd200] text-black'
                  : 'bg-[#f1f1ef]'
              }`}
            >
              {i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-[20px] bg-[#f1f1ef]" />
        ))}
      </div>
    </div>
  );
}

/** Needs where reading results aloud is offered without turning on the display setting. */
const readAloudNeeds: AccessNeed[] = ['low_vision', 'blind', 'reading', 'new_to_tech'];

function Results({
  result,
  useAi,
  onToggleAi,
  needs,
  brief,
  excludedCount,
}: {
  result: Result;
  useAi: boolean;
  onToggleAi: () => void;
  needs: AccessNeed[];
  brief: BusinessBrief;
  excludedCount: number;
}) {
  const { t, locale } = useLanguage();
  const display = useDisplay();
  const reader = useReadAloud(locale);
  const showReader = display.readAloud || needs.some((n) => readAloudNeeds.includes(n));
  return (
    <>
      {result.note && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl border border-[#f1e3a4] bg-[#fffbe8] px-4 py-3 text-sm text-[#4b4535]">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]" aria-hidden="true" />
          {result.note}
        </p>
      )}
      {excludedCount > 0 && (
        <p className="mb-5 rounded-2xl border border-[#e2e2df] bg-white px-4 py-3 text-sm text-[#333]">
          {t(
            `We left out ${excludedCount} tool(s) you said didn’t work for you. See “Set aside” below.`,
            `Dejamos fuera ${excludedCount} herramienta(s) que dijiste que no te funcionaron. Mira “Descartadas” abajo.`,
          )}{' '}
          <Link href="/dashboard" className="font-semibold underline underline-offset-2">
            {t('My AI Journey', 'Mi recorrido IA')}
          </Link>
        </p>
      )}
      {result.picks.length ? (
        <div className="grid gap-5 pt-2 md:grid-cols-2 xl:grid-cols-3">
          {result.picks.map((pick, i) => (
            <PickCard
              key={pick.record.tool.id}
              pick={pick}
              index={i}
              reader={showReader ? reader : null}
              brief={brief}
            />
          ))}
        </div>
      ) : (
        <section className="rounded-[24px] border border-[#e2e2df] bg-white p-8">
          <h2 className="text-xl font-semibold">
            {t('Tell us a little more.', 'Cuéntanos un poco más.')}
          </h2>
          <p className="mt-2 max-w-xl text-[#555]">
            {t(
              'Describe what takes your time in your own words, like “customers call to ask if orders are ready”.',
              'Describe qué te quita tiempo con tus palabras, como “los clientes llaman para preguntar si su pedido está listo”.',
            )}
          </p>
          <Link
            href="/business"
            className="mt-5 inline-flex rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
          >
            {t('Edit my answers', 'Editar mis respuestas')}
          </Link>
        </section>
      )}

      {needs.length > 0 && (
        <AccessHelpers needs={needs} catalog={new Map(result.helpers.map((h) => [h.slug, h]))} />
      )}

      {result.setAside.length > 0 && (
        <details className="mt-4 rounded-[18px] border border-[#e2e2df] bg-white px-5 py-4 text-sm">
          <summary className="font-semibold">
            {t('Set aside', 'Descartadas')} ({result.setAside.length})
          </summary>
          <ul className="mt-3 space-y-1.5 text-[#555]">
            {result.setAside.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/tools/${item.slug}`}
                  className="font-semibold text-[#111] hover:text-[#c41230]"
                >
                  {item.name}
                </Link>{' '}
                — {item.reason}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="mt-6 flex flex-col gap-3 text-xs text-[#555] sm:flex-row sm:items-center sm:justify-between">
        <p>
          {result.method === 'rules+ai'
            ? `${t(
                'Ranked by SABKA rules, refined by AI',
                'Ordenado por reglas de SABKA, refinado con IA',
              )} (${result.model})`
            : t('Ranked by SABKA rules', 'Ordenado por reglas de SABKA')}{' '}
          · {result.considered} {t('tools checked', 'herramientas revisadas')}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={useAi}
            onClick={onToggleAi}
            className="flex items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-3 py-1.5 font-semibold text-[#333]"
          >
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                useAi ? 'bg-[#111]' : 'bg-[#ccc]'
              }`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#ffd200] transition-all ${
                  useAi ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </span>
            {t('AI ranking', 'Orden con IA')}
          </button>
          <Link
            href="/discover"
            className="flex items-center gap-1 font-semibold text-[#111] hover:text-[#c41230]"
          >
            {t('All tools', 'Todas')} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}

function PickCard({
  pick,
  index,
  reader,
  brief,
}: {
  pick: Pick;
  index: number;
  reader: ReturnType<typeof useReadAloud> | null;
  brief: BusinessBrief;
}) {
  const { t, locale } = useLanguage();
  const helps = pick.access.helps.filter((k): k is AccessFeature => k in featureCopy);
  const cautions = pick.access.cautions.filter((k): k is AccessCaution => k in cautionCopy);
  const say = (c: { en: string; es: string }) => (locale === 'es' ? c.es : c.en);
  const { tool } = pick.record;
  const tutorial = tutorialFor(tool.slug);
  const fit = {
    strong: [t('Strong match', 'Muy buena opción'), 'bg-[#111] text-[#ffd200]'],
    good: [t('Good match', 'Buena opción'), 'bg-[#fff4bf] text-[#3d3200]'],
    possible: [t('Worth a look', 'Vale la pena ver'), 'bg-[#f1f1f1] text-[#444]'],
  }[pick.fit];
  const spanish = locale === 'es' ? spanishToolSummary(tool.slug) : null;
  return (
    <article
      className={`rise relative flex flex-col rounded-[24px] border bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.06)] transition-all hover:-translate-y-1.5 hover:shadow-[0_25px_55px_rgba(226,24,51,.12)] ${
        index === 0 ? 'border-[#e21833] ring-4 ring-[#ffd200]/25' : 'border-[#dddddd]'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {index === 0 && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-[#ffd200] px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-black shadow-sm">
          <Trophy className="h-3 w-3" aria-hidden="true" /> {t('Best match', 'Mejor opción')}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ToolMark name={tool.name} website={tool.website} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-[-0.025em]">{tool.name}</h3>
            <p className="truncate text-xs text-[#666]">{tool.vendor}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${fit[1]}`}>
          {fit[0]}
        </span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f1ef]" aria-hidden="true">
        <div
          className="meter h-full rounded-full bg-gradient-to-r from-[#e21833] to-[#ffd200]"
          style={{ width: `${Math.max(12, pick.score)}%` }}
        />
      </div>
      <p className="mt-4 text-[15px] font-medium leading-6 text-[#222]">
        {pick.aiRanked && (
          <Sparkles
            className="mr-1 inline h-3.5 w-3.5 text-[#c41230]"
            aria-label={t('AI explanation', 'Explicación con IA')}
          />
        )}
        {pick.why}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#666]" lang={spanish ? 'es' : 'en'}>
        {spanish ?? tool.summary}
      </p>
      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label={t('Why it fits', 'Por qué encaja')}>
        {pick.reasons.slice(0, 4).map((reason) => (
          <li
            key={reason}
            className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[11px] font-semibold text-[#555]"
          >
            {reason}
          </li>
        ))}
      </ul>
      <CardMetrics record={pick.record} brief={brief} />
      {(helps.length > 0 || cautions.length > 0) && (
        <div className="mt-4 space-y-1.5 text-[13px] leading-5">
          {helps.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg bg-[#eef7ee] px-2.5 py-2 text-[#14401b]">
              <Accessibility className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>{t('Good for you:', 'Bueno para ti:')}</strong>{' '}
                {helps
                  .slice(0, 3)
                  .map((k) => say(featureCopy[k]).toLowerCase())
                  .join(' · ')}
                {helps.includes('statement') && accessibilityStatement(tool.slug) && (
                  <>
                    {' '}
                    <a
                      href={accessibilityStatement(tool.slug)!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline underline-offset-2"
                    >
                      {t('Read it', 'Leerla')}
                      <span className="sr-only">
                        {t(' (opens in a new tab)', ' (se abre en otra pestaña)')}
                      </span>
                    </a>
                  </>
                )}
              </span>
            </p>
          )}
          {cautions.map((k) => (
            <p
              key={k}
              className="flex items-start gap-1.5 rounded-lg bg-[#fff8e1] px-2.5 py-2 text-[#4a3b00]"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                <strong>{t('Check:', 'Revisa:')}</strong> {say(cautionCopy[k])}
              </span>
            </p>
          ))}
        </div>
      )}
      {reader && (
        <ReadAloudButton
          className="mt-4 self-start"
          id={tool.id}
          reader={reader}
          text={[
            `${tool.name}. ${pick.why}`,
            spanish ?? tool.summary,
            helps.length
              ? `${t('Good for you', 'Bueno para ti')}: ${helps
                  .map((k) => say(featureCopy[k]))
                  .join(', ')}.`
              : '',
            ...cautions.map((k) => say(cautionCopy[k])),
            `${t('Price', 'Precio')}: ${pick.price}.`,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      )}
      <div className="mt-auto pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <SaveToolButton slug={tool.slug} name={tool.name} brief={brief} />
        </div>
        <div className="legacy-ui tool-option-actions">
          <LearningVideo
            video={tutorial}
            label={
              tutorial
                ? t('Watch a tutorial', 'Ver un tutorial')
                : t('Setup guide', 'Guía de inicio')
            }
            guide={pick.record.sources.find((s) => s.type === 'official')?.url ?? tool.website}
            searchUrl={tutorial ? undefined : tutorialSearchUrl(tool.name)}
          />
          <ToolAssistant record={pick.record} planId={pick.record.plans[0]?.id ?? null} />
        </div>
        <Link
          href={`/tools/${tool.slug}`}
          className="mt-3 flex items-center gap-1 text-xs font-bold text-[#c41230] transition-all hover:gap-2"
        >
          {t('Sources & price', 'Fuentes y precio')} · {pick.price}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
