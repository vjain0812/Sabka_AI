'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, MessageCircle, Trash2, Users } from 'lucide-react';
import { act } from '@/lib/client/journey';
import { useLanguage } from '@/lib/client/language';
import { tutorialFor, tutorialSearchUrl } from '@/lib/domain/learning-resources';
import { pricingLabel } from '@/lib/domain/catalog-browse';
import {
  adoptionStatuses,
  feedbackReasons,
  helpfulCopy,
  helpfulValues,
  nextStep,
  reasonCopy,
  statusCopy,
  type FeedbackReason,
  type Helpful,
  type JourneyGoal,
  type JourneyTool,
} from '@/lib/domain/journey';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import { LearningVideo } from '../learning-video';
import { ToolAssistant } from '../tool-assistant';
import { ToolMark } from '../site/tool-mark';

export function JourneyToolCard({
  tool,
  record,
  goal,
  onAlternatives,
}: {
  tool: JourneyTool;
  record: CatalogRecord | undefined;
  goal: JourneyGoal | undefined;
  onAlternatives: (goal: JourneyGoal) => void;
}) {
  const { t, locale } = useLanguage();
  const say = (c: { en: string; es: string }) => (locale === 'es' ? c.es : c.en);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = record?.tool.name ?? tool.slug;
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const status = tool.status;
  const tutorial = tutorialFor(tool.slug);
  const guide = record
    ? record.sources.find((s) => s.type === 'official')?.url ?? record.tool.website
    : undefined;
  return (
    <article className="flex flex-col rounded-[24px] border border-[#dddddd] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {record && <ToolMark name={name} website={record.tool.website} size="lg" />}
          <div className="min-w-0">
            <h3 className="truncate font-semibold tracking-[-0.02em]">{name}</h3>
            <p className="truncate text-xs text-[#555]">
              {record?.tool.vendor}
              {record ? ` · ${pricingLabel(record)}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => act({ type: 'remove', slug: tool.slug }))}
          className="rounded-full p-2 text-[#555] hover:bg-[#f3f3f3] hover:text-[#111]"
          aria-label={t(`Remove ${name} from my journey`, `Quitar ${name} de mi recorrido`)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {goal && (
        <p className="mt-3 text-xs text-[#555]">
          {t('For', 'Para')}: “{goal.brief.need.problem}”
        </p>
      )}
      {!record && (
        <p className="mt-3 text-sm text-[#555]">
          {t(
            'This tool is no longer in our catalog. You can keep or remove it.',
            'Esta herramienta ya no está en nuestro catálogo. Puedes conservarla o quitarla.',
          )}
        </p>
      )}

      <fieldset className="mt-4" disabled={busy}>
        <legend className="text-sm font-semibold">
          {t('Where are you with this tool?', '¿En qué punto estás con esta herramienta?')}
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {adoptionStatuses.map((s) => {
            const active = (status ?? 'considering') === s;
            return (
              <label
                key={s}
                className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-center text-xs font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#111] ${
                  active
                    ? 'border-[#111] bg-[#111] text-[#ffd200]'
                    : 'border-[#d8d8d8] bg-white text-[#333] hover:border-[#111]'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name={`status-${tool.slug}`}
                  checked={active}
                  onChange={() =>
                    void run(() => act({ type: 'status', slug: tool.slug, status: s }))
                  }
                />
                {say(statusCopy[s])}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 rounded-2xl bg-[#f6f6f3] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#c41230]">
          {t('Your next step', 'Tu siguiente paso')}
        </p>
        <p className="mt-1 text-sm leading-6 text-[#222]">{say(nextStep(status, name))}</p>
        {record && (
          <div className="legacy-ui tool-option-actions mt-3">
            <LearningVideo
              video={tutorial}
              label={
                tutorial
                  ? t('Watch a tutorial', 'Ver un tutorial')
                  : t('Setup guide', 'Guía de inicio')
              }
              guide={guide}
              searchUrl={tutorial ? undefined : tutorialSearchUrl(name)}
            />
            <ToolAssistant record={record} planId={record.plans[0]?.id ?? null} />
          </div>
        )}
        {record && (
          <a
            href={record.tool.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#111] underline-offset-2 hover:underline"
          >
            {t(`Open ${name}`, `Abrir ${name}`)}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">
              {t('(opens in a new tab)', '(se abre en otra pestaña)')}
            </span>
          </a>
        )}
      </div>

      {status && status !== 'considering' && (
        <Feedback
          tool={tool}
          name={name}
          goal={goal}
          busy={busy}
          onSubmit={(feedback) => run(() => act({ type: 'feedback', slug: tool.slug, feedback }))}
          onAlternatives={onAlternatives}
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-[#9a3632]">
          {error}
        </p>
      )}
    </article>
  );
}

function Feedback({
  tool,
  name,
  goal,
  busy,
  onSubmit,
  onAlternatives,
}: {
  tool: JourneyTool;
  name: string;
  goal: JourneyGoal | undefined;
  busy: boolean;
  onSubmit: (f: {
    helpful: Helpful;
    reason: FeedbackReason | null;
    note: string;
    minutesBefore: number | null;
    minutesAfter: number | null;
  }) => Promise<unknown>;
  onAlternatives: (goal: JourneyGoal) => void;
}) {
  const { t, locale } = useLanguage();
  const say = (c: { en: string; es: string }) => (locale === 'es' ? c.es : c.en);
  const last = tool.feedback;
  const [helpful, setHelpful] = useState<Helpful | null>(last?.helpful ?? null);
  const [reason, setReason] = useState<FeedbackReason | null>(last?.reason ?? null);
  const [before, setBefore] = useState(last?.minutesBefore?.toString() ?? '');
  const [after, setAfter] = useState(last?.minutesAfter?.toString() ?? '');
  const num = (v: string) =>
    v.trim() === '' ? null : Math.max(0, Math.min(10080, Math.round(Number(v))));
  const submit = (h: Helpful, r = reason) =>
    onSubmit({
      helpful: h,
      reason: h === 'no' ? r : null,
      note: '',
      minutesBefore: h === 'yes' ? num(before) : null,
      minutesAfter: h === 'yes' ? num(after) : null,
    });
  const saved =
    last && last.minutesBefore !== null && last.minutesAfter !== null
      ? Math.max(0, last.minutesBefore - last.minutesAfter)
      : null;
  return (
    <section className="mt-4 border-t border-[#ececec] pt-4" aria-label={t('Feedback', 'Opinión')}>
      <p className="text-sm font-semibold">{t(`Did ${name} help?`, `¿Te ayudó ${name}?`)}</p>
      <p className="text-xs text-[#555]">
        {t(
          'Your answer helps you track what works, and shapes your next recommendations.',
          'Tu respuesta te ayuda a ver qué funciona y mejora tus próximas recomendaciones.',
        )}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {helpfulValues.map((h) => (
          <button
            key={h}
            type="button"
            disabled={busy}
            aria-pressed={helpful === h}
            onClick={() => {
              setHelpful(h);
              void submit(h);
            }}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              helpful === h
                ? 'border-[#111] bg-[#fff4bf]'
                : 'border-[#d8d8d8] bg-white hover:border-[#111]'
            }`}
          >
            {say(helpfulCopy[h])}
          </button>
        ))}
      </div>

      {helpful === 'yes' && (
        <div className="mt-3 rounded-xl bg-[#eef7ee] p-3 text-sm text-[#14401b]">
          <p className="font-semibold">
            {t(
              'Optional: how much time does this task take?',
              'Opcional: ¿cuánto tiempo te toma esta tarea?',
            )}
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold">
              {t('Before (min/week)', 'Antes (min/semana)')}
              <input
                type="number"
                min={0}
                max={10080}
                inputMode="numeric"
                value={before}
                onChange={(e) => setBefore(e.target.value)}
                className="mt-1 block w-28 rounded-lg border border-[#b9d3bb] bg-white px-2 py-1.5 text-sm text-[#111]"
              />
            </label>
            <label className="text-xs font-semibold">
              {t('Now (min/week)', 'Ahora (min/semana)')}
              <input
                type="number"
                min={0}
                max={10080}
                inputMode="numeric"
                value={after}
                onChange={(e) => setAfter(e.target.value)}
                className="mt-1 block w-28 rounded-lg border border-[#b9d3bb] bg-white px-2 py-1.5 text-sm text-[#111]"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit('yes')}
              className="rounded-full bg-[#111] px-4 py-2 text-xs font-bold text-[#ffd200]"
            >
              {t('Save time', 'Guardar tiempo')}
            </button>
          </div>
          {saved !== null && (
            <p className="mt-2 text-xs">
              {t(
                `About ${saved} minutes a week saved (self-reported).`,
                `Unos ${saved} minutos por semana ahorrados (según tú).`,
              )}
            </p>
          )}
        </div>
      )}

      {helpful === 'somewhat' && (
        <div className="mt-3 rounded-xl bg-[#f6f6f3] p-3 text-sm">
          <p className="font-semibold">{t('Ways to get unstuck', 'Formas de avanzar')}</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t(
                'Use “Ask about this tool” above for plain answers from its sources.',
                'Usa “Pregunta sobre esta herramienta” arriba para respuestas sencillas según sus fuentes.',
              )}
            </li>
            <li className="flex items-start gap-2">
              <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <Link href="/connect" className="font-semibold underline underline-offset-2">
                {t(`Ask owners who use ${name}`, `Pregunta a dueños que usan ${name}`)}
              </Link>
            </li>
          </ul>
        </div>
      )}

      {helpful === 'no' && (
        <div className="mt-3 rounded-xl bg-[#fff8e1] p-3 text-sm text-[#4a3b00]">
          <fieldset disabled={busy}>
            <legend className="font-semibold">
              {t('What got in the way?', '¿Qué te lo impidió?')}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {feedbackReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={reason === r}
                  onClick={() => {
                    setReason(r);
                    void submit('no', r);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    reason === r
                      ? 'border-[#111] bg-[#111] text-[#ffd200]'
                      : 'border-[#d9c98a] bg-white'
                  }`}
                >
                  {say(reasonCopy[r])}
                </button>
              ))}
            </div>
          </fieldset>
          {last?.helpful === 'no' && (
            <p className="mt-2 text-xs">
              {t(
                'Saved. We’ll leave this tool out of your next recommendations.',
                'Guardado. Dejaremos esta herramienta fuera de tus próximas recomendaciones.',
              )}
            </p>
          )}
          {goal && (
            <button
              type="button"
              onClick={() => onAlternatives(goal)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#ffd200] px-4 py-2 text-xs font-bold text-black"
            >
              {t('Find alternatives', 'Buscar alternativas')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
