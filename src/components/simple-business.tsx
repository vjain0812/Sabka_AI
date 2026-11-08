'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
} from 'lucide-react';
import {
  businessBriefSchema,
  categories,
  channelOptions,
  systemOptions,
  type BusinessBrief,
} from '@/lib/domain/brief';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { useLanguage } from '@/lib/client/language';
import { matchingConstraints } from '@/lib/domain/match-request';
import { detectIntents } from '@/lib/domain/intents';
import { applyScenario, scenarioBySlug, scenarioNames, scenarios } from '@/lib/domain/scenarios';
import { Field } from './fields';
import { ConnectOptIn } from './connect/connect-optin';
import { draftToInput, emptyConnectDraft, type ConnectDraft } from './connect/connect-fields';
import { ConnectError, connectApi, saveIdentity, useConnectIdentity } from '@/lib/client/connect';
import { connectProfileInputSchema } from '@/lib/domain/connect';
import { ScenarioIcon } from './site/scenario-icon';
import { AccessNeedsSection } from './accessibility/access-needs-section';
import { VoiceInputButton } from './accessibility/speech-buttons';

type FieldKey =
  | 'category'
  | 'otherCategory'
  | 'problem'
  | 'channels'
  | 'systems'
  | 'budget'
  | 'setup'
  | 'consent';
type Problem = { message: string; field?: FieldKey };
const fieldForPath: Record<string, FieldKey> = {
  'profile.category': 'category',
  'profile.otherCategory': 'otherCategory',
  'need.problem': 'problem',
  'need.channels': 'channels',
  'need.currentSystems': 'systems',
  'need.monthlyBudgetUsd': 'budget',
  'need.setupMinutes': 'setup',
};
/** Scroll a flagged field into view and focus its first control. */
function jumpToField(key: FieldKey) {
  const el = document.querySelector<HTMLElement>(`[data-field="${key}"]`);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  el.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
}

const categorySpanish = [
  'Panadería casera',
  'Cafetería o restaurante',
  'Climatización o servicios del hogar',
  'Jardinería',
  'Salón o bienestar',
  'Comercio',
  'Lavandería',
  'Agricultura',
  'Sastrería',
  'Instructor o creador',
  'Servicios profesionales',
  'Otro',
];
const systemSpanish = [
  'Cuaderno',
  'Hoja de cálculo',
  'Calendario',
  'Punto de venta',
  'CRM',
  'Correo electrónico',
  'Ninguna todavía',
];
const channelSpanish = [
  'WhatsApp',
  'Correo electrónico',
  'Teléfono',
  'En persona',
  'Redes sociales',
  'Sitio web',
];
/** When the owner skips the optional task cards, infer the closest supported task. */
function inferJob(problem: string): BusinessBrief['need']['job'] {
  const ids = detectIntents(problem).map((i) => i.id);
  if (
    ids.some((id) =>
      ['booking', 'no_shows', 'missed_calls', 'orders', 'jobs_dispatch'].includes(id),
    )
  )
    return 'appointment_organization';
  if (ids.some((id) => ['customer_questions', 'messaging', 'follow_up', 'reviews'].includes(id)))
    return 'customer_reply_drafting';
  if (ids.some((id) => ['marketing', 'design_media'].includes(id))) return 'marketing_content';
  return 'other';
}

export function SimpleBusiness() {
  const state = useWorkspace();
  const { t, locale } = useLanguage();
  const router = useRouter();
  const fromScenario = scenarioBySlug(useSearchParams().get('from') ?? '');
  const [errors, setErrors] = useState<Problem[]>([]);
  // null = follow the saved choice until the person ticks or unticks the box.
  const [consentTicked, setConsentTicked] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  // Connect opt-in: nothing is created unless the person ticks the consent box.
  const connectIdentity = useConnectIdentity();
  const [connectOn, setConnectOn] = useState(false);
  const [connectEdit, setConnectEdit] = useState<ConnectDraft | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const problem = state.session?.brief.need.problem ?? '';
  const heard = useMemo(() => detectIntents(problem, 4), [problem]);
  // No sign-up step: open a guest brief straight away.
  useEffect(() => {
    if (state.ready && !state.session) workspace.startGuest();
  }, [state.ready, state.session]);
  if (!state.ready || !state.session)
    return <p role="status">{t('Opening your brief…', 'Abriendo tu información…')}</p>;
  const b = state.session.brief;
  function profile<K extends keyof BusinessBrief['profile']>(
    key: K,
    value: BusinessBrief['profile'][K],
  ) {
    workspace.update({ ...b, profile: { ...b.profile, [key]: value } });
  }
  function need<K extends keyof BusinessBrief['need']>(key: K, value: BusinessBrief['need'][K]) {
    workspace.update({ ...b, need: { ...b.need, [key]: value } });
  }
  function toggle(key: 'channels' | 'currentSystems', value: string) {
    const old = b.need[key];
    need(
      key,
      old.includes(value)
        ? old.filter((v) => v !== value)
        : [...old.filter((v) => key !== 'currentSystems' || v !== 'None yet'), value],
    );
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const completed: BusinessBrief = b.need.job
      ? b
      : { ...b, need: { ...b.need, job: inferJob(b.need.problem) } };
    const parsed = businessBriefSchema.safeParse(completed);
    const consent = new FormData(e.currentTarget).get('matching-consent') === 'on';
    const messages: Problem[] = [];
    if (!parsed.success) {
      const labels: Record<string, string> = {
        'profile.category': t('Choose your business type.', 'Elige tu tipo de negocio.'),
        'profile.otherCategory': t('Describe your business type.', 'Describe tu tipo de negocio.'),
        'need.problem': t(
          'Describe what takes your time (10+ characters).',
          'Describe qué te quita tiempo (10+ caracteres).',
        ),
        'need.channels': t(
          'Choose how customers reach you.',
          'Elige cómo te contactan tus clientes.',
        ),
        'need.currentSystems': t(
          'Choose the tools you use, or None yet.',
          'Elige tus herramientas o Ninguna todavía.',
        ),
        'need.monthlyBudgetUsd': t(
          'Enter a monthly budget ($0 is fine).',
          'Ingresa un presupuesto mensual ($0 es válido).',
        ),
        'need.setupMinutes': t(
          'Enter your setup time in whole minutes.',
          'Ingresa el tiempo de preparación en minutos.',
        ),
      };
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        messages.push({
          message:
            labels[path] ??
            t('Check the format of your answers.', 'Revisa el formato de tus respuestas.'),
          field: fieldForPath[path],
        });
      });
    }
    if (!consent)
      messages.push({
        message: t(
          'Tick the box to let us find options.',
          'Marca la casilla para buscar opciones.',
        ),
        field: 'consent',
      });
    if (parsed.success) {
      try {
        matchingConstraints(parsed.data);
      } catch {
        messages.push({
          message: t(
            'Use at most 10 required connections.',
            'Usa como máximo 10 conexiones necesarias.',
          ),
        });
      }
    }
    const joinConnect = connectOn && !connectIdentity;
    const connectInput = connectProfileInputSchema.safeParse(
      draftToInput(
        connectEdit ?? { ...emptyConnectDraft(), displayName: b.profile.name },
        b.profile.category || 'Other',
      ),
    );
    if (joinConnect && !connectInput.success)
      messages.push({
        message:
          connectInput.error.issues[0]?.message ??
          t('Check your Connect profile.', 'Revisa tu perfil de Connect.'),
      });
    setErrors(
      messages.filter((m, i) => messages.findIndex((o) => o.message === m.message) === i),
    );
    if (messages.length) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (completed !== b) workspace.update(completed);
    if (!workspace.confirm(true)) return;
    if (joinConnect && connectInput.success) {
      setBusy(true);
      try {
        const created = await connectApi.create(connectInput.data);
        saveIdentity({ id: created.id, key: created.key });
      } catch (err) {
        setBusy(false);
        setErrors([
          {
            message:
              err instanceof ConnectError
                ? err.message
                : t(
                    'We couldn’t add you to Connect right now.',
                    'No pudimos agregarte a Connect ahora.',
                  ),
          },
          {
            message: t(
              'Untick the Connect box to continue without it, or try again.',
              'Desmarca la casilla de Connect para continuar sin ella, o inténtalo de nuevo.',
            ),
          },
        ]);
        requestAnimationFrame(() => errorRef.current?.focus());
        return;
      }
    }
    router.push('/recommendations');
  }
  const consentOn = consentTicked ?? state.session.matchingConsent;
  /** Whether a flagged field still needs attention, so highlights clear as people fix them. */
  function stillMissing(key: FieldKey) {
    switch (key) {
      case 'category':
        return !b.profile.category;
      case 'otherCategory':
        return b.profile.category === 'Other' && !b.profile.otherCategory.trim();
      case 'problem':
        return b.need.problem.trim().length < 10;
      case 'channels':
        return b.need.channels.length === 0;
      case 'systems':
        return b.need.currentSystems.length === 0;
      case 'budget':
        return b.need.monthlyBudgetUsd === null;
      case 'setup':
        return b.need.setupMinutes === null || !Number.isInteger(b.need.setupMinutes);
      case 'consent':
        return !consentOn;
    }
  }
  const openProblems = errors.filter((e) => !e.field || stillMissing(e.field));
  const flagged = new Set(openProblems.flatMap((e) => (e.field ? [e.field] : [])));
  const flag = (key: FieldKey) => flagged.has(key);
  const tasks = [
    ['customer_reply_drafting', t('Customer replies', 'Respuestas a clientes'), MessageSquareText],
    ['marketing_content', t('Marketing & content', 'Marketing y contenido'), Sparkles],
    ['appointment_organization', t('Appointments & orders', 'Citas y pedidos'), CalendarDays],
  ] as const;
  return (
    <div className="simple-business">
      <Link className="quiet-link" href="/">
        <ArrowLeft size={15} />
        {t('Home', 'Inicio')}
      </Link>
      <div className="simple-page-heading">
        <p className="easy-eyebrow">{t('YOUR BUSINESS', 'TU NEGOCIO')}</p>
        <h1>{t('What’s taking your time?', '¿Qué te quita tiempo?')}</h1>
        <p>{t('One minute. No account. No jargon.', 'Un minuto. Sin cuenta. Sin tecnicismos.')}</p>
      </div>
      <div className="brand-ui mb-6 max-w-[980px]">
        {fromScenario ? (
          <div className="flex flex-col gap-3 rounded-[22px] border border-[#f1e3a4] bg-[#fffbe8] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-black"
                style={{ background: fromScenario.accent }}
              >
                <ScenarioIcon name={fromScenario.icon} />
              </span>
              <p className="text-sm font-semibold text-[#111]">
                {t('Prefilled from the', 'Completado con el flujo')}{' '}
                {scenarioNames(fromScenario, locale).profession} {t('workflow', '')}
                <span className="block text-xs font-normal text-[#4b4535]">
                  {t(
                    'Edit anything that’s different for you.',
                    'Cambia lo que sea distinto para ti.',
                  )}
                </span>
              </p>
            </div>
            <Link
              href={`/workflows/${fromScenario.slug}`}
              className="shrink-0 rounded-full border border-[#d8c983] bg-white px-4 py-2 text-xs font-bold text-[#111] hover:border-[#e21833]"
            >
              {t('Back to the workflow', 'Volver al flujo')}
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold uppercase tracking-[.14em] text-[#c41230]">
              {t('Quick start', 'Inicio rápido')}
            </span>
            {scenarios.map((scenario) => (
              <button
                type="button"
                key={scenario.slug}
                onClick={() => workspace.update(applyScenario(b, scenario, locale))}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                  b.profile.category === scenario.category && b.need.problem === scenario.problem
                    ? 'border-[#e21833] bg-[#e21833] text-white'
                    : 'border-[#d5d5d5] bg-white text-[#444] hover:border-[#e21833]'
                }`}
              >
                <ScenarioIcon name={scenario.icon} className="h-3.5 w-3.5" />
                {scenarioNames(scenario, locale).shortName}
              </button>
            ))}
          </div>
        )}
      </div>
      <form onSubmit={submit} noValidate className="simple-business-form">
        {openProblems.length > 0 && (
          <div className="error-summary" role="alert" tabIndex={-1} ref={errorRef}>
            <strong>{t('Almost there:', 'Casi listo:')}</strong>
            {flagged.size > 0 && (
              <span className="error-summary-hint">
                {' '}
                {t('Select an item to jump to it.', 'Toca un elemento para ir a él.')}
              </span>
            )}
            <ul>
              {openProblems.map(({ message, field }) => (
                <li key={message}>
                  {field ? (
                    <button
                      type="button"
                      className="error-link"
                      onClick={() => jumpToField(field)}
                    >
                      {message}
                    </button>
                  ) : (
                    message
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <section className="simple-section">
          <div className="simple-section-heading">
            <span>01</span>
            <div>
              <h2>{t('Your business', 'Tu negocio')}</h2>
            </div>
          </div>
          <div className="field-columns">
            <Field
              name="easy-category"
              anchor="category"
              flagged={flag('category')}
              label={t('What kind of business?', '¿Qué tipo de negocio tienes?')}
            >
              {(p) => (
                <select
                  {...p}
                  value={b.profile.category}
                  onChange={(e) =>
                    profile('category', e.target.value as BusinessBrief['profile']['category'])
                  }
                >
                  <option value="">{t('Choose one', 'Elige uno')}</option>
                  {categories.map((c, i) => (
                    <option key={c} value={c}>
                      {locale === 'es' ? categorySpanish[i] : c}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field
              name="easy-name"
              label={t('Business name (optional)', 'Nombre del negocio (opcional)')}
            >
              {(p) => (
                <input
                  {...p}
                  value={b.profile.name}
                  maxLength={120}
                  autoComplete="organization"
                  onChange={(e) => profile('name', e.target.value)}
                />
              )}
            </Field>
          </div>
          {b.profile.category === 'Other' && (
            <Field
              name="easy-other"
              anchor="otherCategory"
              flagged={flag('otherCategory')}
              label={t('Describe your business type', 'Describe tu tipo de negocio')}
            >
              {(p) => (
                <input
                  {...p}
                  value={b.profile.otherCategory}
                  maxLength={120}
                  onChange={(e) => profile('otherCategory', e.target.value)}
                />
              )}
            </Field>
          )}
        </section>
        <section className="simple-section">
          <div className="simple-section-heading">
            <span>02</span>
            <div>
              <h2>{t('The problem', 'El problema')}</h2>
            </div>
          </div>
          <Field
            name="easy-problem"
            anchor="problem"
            flagged={flag('problem')}
            label={t('What makes this task difficult?', '¿Qué dificulta esta tarea?')}
            hint={t(
              'Your own words work best. Skip customer names and private details.',
              'Tus propias palabras funcionan mejor. Sin nombres de clientes ni datos privados.',
            )}
          >
            {(p) => (
              <textarea
                {...p}
                value={b.need.problem}
                maxLength={600}
                rows={3}
                placeholder={t(
                  'e.g. Customers call all day asking if their order is ready.',
                  'Ej.: Los clientes llaman todo el día para preguntar si su pedido está listo.',
                )}
                onChange={(e) => need('problem', e.target.value)}
              />
            )}
          </Field>
          <VoiceInputButton
            onText={(spoken) =>
              need(
                'problem',
                `${b.need.problem}${b.need.problem.trim() ? ' ' : ''}${spoken}`.slice(0, 600),
              )
            }
          />
          <div
            className="brand-ui -mt-2 flex min-h-8 flex-wrap items-center gap-2"
            aria-live="polite"
          >
            {heard.length > 0 && (
              <>
                <span className="text-xs font-semibold text-[#666]">
                  {t('We hear:', 'Entendemos:')}
                </span>
                {heard.map((h) => (
                  <span
                    key={h.id}
                    className="rise rounded-full bg-[#111] px-3 py-1 text-xs font-semibold text-[#ffd200]"
                  >
                    {h.label}
                  </span>
                ))}
              </>
            )}
          </div>
          <fieldset>
            <legend>{t('Closest area (optional)', 'Área más cercana (opcional)')}</legend>
            <div className="simple-task-grid">
              {tasks.map(([key, label, Icon]) => (
                <label key={key} className={`simple-task ${b.need.job === key ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="easy-job"
                    value={key}
                    checked={b.need.job === key}
                    onChange={() => need('job', key)}
                  />
                  <Icon size={22} />
                  <strong>{label}</strong>
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            name="easy-goal"
            label={t('A good result would be… (optional)', 'Un buen resultado sería… (opcional)')}
          >
            {(p) => (
              <input
                {...p}
                value={b.need.successMeasure}
                maxLength={300}
                placeholder={t('e.g. Evenings free again.', 'Ej.: Tener mis tardes libres.')}
                onChange={(e) => need('successMeasure', e.target.value)}
              />
            )}
          </Field>
        </section>
        <section className="simple-section">
          <div className="simple-section-heading">
            <span>03</span>
            <div>
              <h2>{t('Your limits', 'Tus límites')}</h2>
            </div>
          </div>
          <div className="field-columns">
            <Field
              name="easy-budget"
              anchor="budget"
              flagged={flag('budget')}
              label={t('Additional monthly budget (USD)', 'Presupuesto mensual adicional (USD)')}
              hint={t('$0 is welcome.', '$0 es válido.')}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={0}
                  max={100000}
                  step="0.01"
                  inputMode="decimal"
                  value={b.need.monthlyBudgetUsd ?? ''}
                  onChange={(e) =>
                    need('monthlyBudgetUsd', e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              )}
            </Field>
            <Field
              name="easy-setup"
              anchor="setup"
              flagged={flag('setup')}
              label={t(
                'Time available for setup (minutes)',
                'Tiempo disponible para empezar (minutos)',
              )}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={0}
                  max={10080}
                  step={1}
                  value={b.need.setupMinutes ?? ''}
                  onChange={(e) =>
                    need('setupMinutes', e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              )}
            </Field>
          </div>
          <fieldset
            data-field="systems"
            className={flag('systems') ? 'field-flagged' : undefined}
          >
            <legend>{t('Tools you already use', 'Herramientas que ya usas')}</legend>
            <div className="easy-chips">
              {systemOptions.map((s, i) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={b.need.currentSystems.includes(s)}
                    onChange={() =>
                      s === 'None yet'
                        ? need('currentSystems', b.need.currentSystems.includes(s) ? [] : [s])
                        : toggle('currentSystems', s)
                    }
                  />
                  <span>{locale === 'es' ? systemSpanish[i] : s}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset
            data-field="channels"
            className={flag('channels') ? 'field-flagged' : undefined}
          >
            <legend>{t('How do customers reach you?', '¿Cómo te contactan tus clientes?')}</legend>
            <div className="easy-chips">
              {channelOptions.map((s, i) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={b.need.channels.includes(s)}
                    onChange={() => toggle('channels', s)}
                  />
                  <span>{locale === 'es' ? channelSpanish[i] : s}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <details className="simple-more">
            <summary>
              {t('More options', 'Más opciones')} <ChevronRight size={15} aria-hidden="true" />
            </summary>
            <Field
              name="easy-subscriptions"
              label={t('Software you pay for now (optional)', 'Programas que ya pagas (opcional)')}
              hint={t(
                'e.g. Square, QuickBooks. We’ll flag tools you already have.',
                'Ej.: Square, QuickBooks. Marcaremos las que ya tienes.',
              )}
            >
              {(p) => (
                <input
                  {...p}
                  value={b.need.subscriptions}
                  maxLength={300}
                  onChange={(e) => need('subscriptions', e.target.value)}
                />
              )}
            </Field>
            <Field
              name="easy-integrations"
              label={t(
                'Tools that must connect (optional, comma-separated)',
                'Herramientas que deben conectarse (opcional, separadas por comas)',
              )}
            >
              {(p) => (
                <input
                  {...p}
                  value={b.need.requiredIntegrations}
                  maxLength={1000}
                  onChange={(e) => need('requiredIntegrations', e.target.value)}
                />
              )}
            </Field>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={b.need.manualHandoffAllowed}
                onChange={(e) => need('manualHandoffAllowed', e.target.checked)}
              />
              <span>
                {t(
                  'I’m fine copying information by hand between tools.',
                  'Puedo copiar información a mano entre herramientas.',
                )}
              </span>
            </label>
          </details>
        </section>
        <AccessNeedsSection
          step="04"
          value={b.profile.access ?? []}
          onChange={(next) => profile('access', next)}
        />
        <ConnectOptIn
          step="05"
          enabled={connectOn}
          onEnabled={setConnectOn}
          draft={connectEdit ?? { ...emptyConnectDraft(), displayName: b.profile.name }}
          onDraft={setConnectEdit}
        />
        <section className="simple-submit">
          <LockKeyhole size={22} />
          <div>
            <h2>{t('Find my options', 'Buscar mis opciones')}</h2>
            <p>
              {t(
                'We send your description, business type and limits to our matcher, never your business name. If AI ranking is on, the description (with contact details removed) is also read by an AI model via OpenRouter. Anything you shared under “Make it easier for you” is used only by our rules, never by the AI model. Nothing is saved.',
                'Enviamos tu descripción, tipo de negocio y límites a nuestro buscador, nunca el nombre de tu negocio. Si el orden con IA está activo, la descripción (sin datos de contacto) también la lee un modelo de IA mediante OpenRouter. Lo que compartas en “Hazlo más fácil para ti” solo lo usan nuestras reglas, nunca el modelo de IA. No se guarda nada.',
              )}
            </p>
            <label
              className={`checkbox-line ${flag('consent') ? 'field-flagged' : ''}`}
              data-field="consent"
            >
              <input
                type="checkbox"
                name="matching-consent"
                checked={consentOn}
                aria-invalid={flag('consent') || undefined}
                onChange={(e) => setConsentTicked(e.target.checked)}
              />
              <span>
                {t(
                  'I reviewed my answers. Find my options.',
                  'Revisé mis respuestas. Busca mis opciones.',
                )}
              </span>
            </label>
            <button className="button" type="submit" disabled={busy}>
              {t('Show my tool options', 'Mostrar mis opciones')}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
