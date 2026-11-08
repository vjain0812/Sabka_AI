'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock3,
  Copy,
  FlaskConical,
  Rocket,
  Target,
  Plus,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  addBusiness,
  deleteJourney,
  forgetJourney,
  journeyLink,
  loadJourney,
  restoreFromLink,
  selectBusiness,
  useJourney,
} from '@/lib/client/journey';
import { useLanguage } from '@/lib/client/language';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { emptyBrief } from '@/lib/domain/brief';
import { categoryNameEs } from '@/lib/domain/i18n-es';
import { detectIntents } from '@/lib/domain/intents';
import { needLabelEs } from '@/lib/domain/i18n-es';
import { briefFromGoal, businessLabel, journeyStats, type JourneyGoal } from '@/lib/domain/journey';
import { JourneyToolCard } from './journey-tool-card';

function greeting(locale: 'en' | 'es') {
  const h = new Date().getHours();
  if (locale === 'es') return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function JourneyDashboard() {
  const { t, locale } = useLanguage();
  const journey = useJourney();
  const ws = useWorkspace();
  const router = useRouter();

  // Private links (#journey=id.key) open the same journey on this device.
  useEffect(() => {
    if (location.hash.startsWith('#journey=') && restoreFromLink(location.hash))
      history.replaceState(null, '', location.pathname);
  }, []);

  /** Put a saved goal back into this tab's brief, then search again or edit it. */
  function reopen(goal: JourneyGoal, search: boolean) {
    if (!ws.session) workspace.startGuest();
    workspace.update(briefFromGoal(goal.brief, workspace.getBrief() ?? emptyBrief()));
    if (search && workspace.confirm(true)) router.push('/recommendations');
    else router.push('/business');
  }

  if (journey.status === 'loading')
    return <p role="status">{t('Opening your journey…', 'Abriendo tu recorrido…')}</p>;
  if (journey.status === 'none') return <EmptyJourney />;
  if (journey.status === 'error' || !journey.view)
    return (
      <section
        role="alert"
        className="brand-ui rounded-[24px] border border-[#e2e2df] bg-white p-8"
      >
        <h1 className="text-2xl font-semibold">
          {t('We couldn’t open your journey.', 'No pudimos abrir tu recorrido.')}
        </h1>
        <p className="mt-2 text-[#555]">{journey.error}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => void loadJourney()}
            className="rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
          >
            {t('Try again', 'Intentar de nuevo')}
          </button>
          <button
            onClick={forgetJourney}
            className="rounded-full border border-[#d8d8d8] px-5 py-3 text-sm font-semibold"
          >
            {t('Forget it on this device', 'Olvidarlo en este dispositivo')}
          </button>
        </div>
      </section>
    );

  const { journey: j, records, mode } = journey.view;
  const stats = journeyStats(j);
  const latestGoal = j.goals[j.goals.length - 1];
  const name = [...j.goals].reverse().find((g) => g.brief.profile.name)?.brief.profile.name;
  const category = latestGoal?.brief.profile.category;
  const categoryLabel =
    category === 'Other'
      ? latestGoal.brief.profile.otherCategory
      : locale === 'es' && category
      ? categoryNameEs[category] ?? category
      : category;
  const recordOf = new Map(records.map((r) => [r.tool.slug, r]));
  const goalOf = new Map(j.goals.map((g) => [g.id, g]));
  const usedNames = j.tools
    .filter((x) => x.status === 'using' || x.status === 'trying')
    .map((x) => recordOf.get(x.slug)?.tool.name)
    .filter(Boolean);

  return (
    <div className="simple-results">
      <BusinessSwitcher />
      <header className="simple-page-heading">
        <p className="easy-eyebrow">{t('MY AI JOURNEY', 'MI RECORRIDO IA')}</p>
        <h1>
          {greeting(locale)}
          {name ? `, ${name}` : ''}!
        </h1>
        <p>
          {[categoryLabel, t('My AI Journey', 'Mi recorrido IA')].filter(Boolean).join(' · ')}
          {mode === 'preview' && (
            <span className="ml-2 rounded-full bg-[#fff4bf] px-2 py-0.5 text-xs font-bold text-[#3d3200]">
              {t('Preview mode', 'Modo de prueba')}
            </span>
          )}
        </p>
      </header>

      <div className="brand-ui space-y-8">
        <section aria-label={t('At a glance', 'De un vistazo')}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Bookmark />} value={stats.saved} label={t('Saved tools', 'Guardadas')} />
            <Stat icon={<FlaskConical />} value={stats.trying} label={t('Trying', 'Probando')} />
            <Stat icon={<Rocket />} value={stats.using} label={t('In use', 'En uso')} />
            <Stat
              icon={<CheckCircle2 />}
              value={`${stats.solved}/${stats.goals}`}
              label={t('Problems helped', 'Problemas resueltos')}
            />
          </ul>
          {stats.minutesSavedPerWeek !== null && (
            <p className="mt-3 flex items-center gap-2 text-sm text-[#333]">
              <Clock3 className="h-4 w-4" aria-hidden="true" />
              {t(
                `About ${stats.minutesSavedPerWeek} minutes a week saved, based on what you told us (self-reported).`,
                `Unos ${stats.minutesSavedPerWeek} minutos por semana ahorrados, según lo que nos dijiste.`,
              )}
            </p>
          )}
        </section>

        <section aria-labelledby="goals-heading">
          <h2 id="goals-heading" className="text-xl font-semibold tracking-[-0.02em]">
            {j.goals.length > 1
              ? t('Your business goals', 'Tus objetivos')
              : t('Your business goal', 'Tu objetivo')}
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {[...j.goals].reverse().map((goal) => {
              const needs = detectIntents(goal.brief.need.problem, 3);
              const tools = j.tools.filter((x) => x.goalId === goal.id);
              const helped = tools.some((x) => x.feedback?.helpful === 'yes');
              return (
                <li key={goal.id} className="rounded-[22px] border border-[#e2e2df] bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#ffd200] text-black">
                      <Target className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-6">“{goal.brief.need.problem}”</p>
                      {goal.brief.need.successMeasure && (
                        <p className="mt-1 text-sm text-[#555]">
                          {t('A good result:', 'Un buen resultado:')}{' '}
                          {goal.brief.need.successMeasure}
                        </p>
                      )}
                      {needs.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          {needs.map((n) => (
                            <span
                              key={n.id}
                              className="rounded-full bg-[#f1f1ef] px-2.5 py-1 text-[11px] font-semibold text-[#333]"
                            >
                              {locale === 'es' ? needLabelEs[n.label] ?? n.label : n.label}
                            </span>
                          ))}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-[#555]">
                        {tools.length} {t('saved tool(s)', 'herramienta(s) guardada(s)')}
                        {helped ? ` · ${t('a tool helped', 'una herramienta ayudó')} ✓` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => reopen(goal, true)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-4 py-2 text-xs font-bold text-[#ffd200]"
                    >
                      {t('Find more tools for this', 'Buscar más herramientas')}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reopen(goal, false)}
                      className="rounded-full border border-[#d8d8d8] px-4 py-2 text-xs font-semibold"
                    >
                      {t('Change it', 'Cambiarlo')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="toolkit-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="toolkit-heading" className="text-xl font-semibold tracking-[-0.02em]">
                {t('My AI toolkit', 'Mis herramientas de IA')}
              </h2>
              <p className="text-sm text-[#555]">
                {t(
                  'Move each tool along as you go: considering, trying, using, or stopped.',
                  'Avanza cada herramienta a tu ritmo: pensándolo, probando, en uso o la dejaste.',
                )}
              </p>
            </div>
            <Link
              href="/business"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#c41230]"
            >
              {t('Find new tools', 'Buscar nuevas herramientas')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          {j.tools.length ? (
            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {j.tools.map((tool) => (
                <JourneyToolCard
                  key={tool.slug}
                  tool={tool}
                  record={recordOf.get(tool.slug)}
                  goal={tool.goalId ? goalOf.get(tool.goalId) : undefined}
                  onAlternatives={(goal) => reopen(goal, true)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[22px] border border-dashed border-[#cfcfca] p-6 text-sm text-[#555]">
              {t(
                'No saved tools right now. Find options and tap “Save this tool”.',
                'No hay herramientas guardadas. Busca opciones y toca “Guardar esta herramienta”.',
              )}
            </p>
          )}
        </section>

        <Link
          href="/connect"
          className="group flex items-center gap-4 rounded-[22px] bg-[#090909] p-5 text-white transition-transform hover:-translate-y-0.5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#ffd200] text-black">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-[.14em] text-[#ffd200]">
              {t('Connect with other businesses', 'Conecta con otros negocios')}
            </span>
            <span className="mt-0.5 block font-semibold">
              {usedNames.length
                ? t(
                    `Swap tips with owners who use ${usedNames.slice(0, 2).join(' or ')}`,
                    `Comparte consejos con dueños que usan ${usedNames.slice(0, 2).join(' o ')}`,
                  )
                : t('Ask owners what worked for them', 'Pregunta a otros dueños qué les funcionó')}
            </span>
          </span>
          <ArrowRight
            className="h-5 w-5 text-[#ffd200] transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <DevicePanel />
      </div>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <li className="rounded-[20px] border border-[#e2e2df] bg-white p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f1f1ef] text-[#111] [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p>
      <p className="text-sm text-[#555]">{label}</p>
    </li>
  );
}

function DevicePanel() {
  const { t } = useLanguage();
  const journey = useJourney();
  const confirm = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(journeyLink(journey.identity));
      setCopied(true);
    } catch {
      setError(t('Couldn’t copy. Try again.', 'No se pudo copiar. Inténtalo de nuevo.'));
    }
  }
  const signedIn = Boolean(journey.account);
  return (
    <section
      aria-labelledby="device-heading"
      className="rounded-[22px] border border-[#e2e2df] bg-white p-5 text-sm"
    >
      <h2 id="device-heading" className="font-semibold">
        {t('Your data and devices', 'Tus datos y dispositivos')}
      </h2>
      {signedIn ? (
        <p className="mt-1 text-[#555]">
          {t(
            `Saved to your account (${journey.account?.email}). Sign in on any phone or computer to see it. Deleting this business removes its goals, saved tools and feedback; your other businesses stay.`,
            `Guardado en tu cuenta (${journey.account?.email}). Inicia sesión en cualquier teléfono o computadora para verlo. Borrar este negocio elimina sus objetivos, herramientas y opiniones; tus otros negocios se quedan.`,
          )}
        </p>
      ) : (
        <p className="mt-1 text-[#555]">
          {t(
            'No account needed. A private key in this browser opens your journey. To open it on another phone or computer, copy your private link and keep it safe, like a password. Anyone with the link can see and change this journey, so only share it with people you trust, such as family or staff.',
            'No necesitas cuenta. Una clave privada en este navegador abre tu recorrido. Para abrirlo en otro teléfono o computadora, copia tu enlace privado y guárdalo como una contraseña. Cualquiera con el enlace puede ver y cambiar este recorrido, así que compártelo solo con personas de confianza, como familia o empleados.',
          )}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!signedIn && (
          <>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#111] px-4 py-2 text-xs font-bold"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied
                ? t('Copied', 'Copiado')
                : t('Copy my private link', 'Copiar mi enlace privado')}
            </button>
            <button
              type="button"
              onClick={forgetJourney}
              className="rounded-full border border-[#d8d8d8] px-4 py-2 text-xs font-semibold"
            >
              {t('Forget on this device', 'Olvidar en este dispositivo')}
            </button>
            {journey.accountsAvailable && (
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-4 py-2 text-xs font-bold text-[#ffd200]"
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                {t('Save to an account', 'Guardar en una cuenta')}
              </Link>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => confirm.current?.showModal()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[#e3b4ad] px-4 py-2 text-xs font-semibold text-[#9a3632]"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          {signedIn
            ? t('Delete this business', 'Borrar este negocio')
            : t('Delete my journey', 'Borrar mi recorrido')}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-semibold text-[#9a3632]">
          {error}
        </p>
      )}
      <dialog
        ref={confirm}
        aria-labelledby="delete-journey-title"
        className="m-auto w-[min(440px,calc(100vw-32px))] rounded-[24px] p-0 backdrop:bg-black/50"
      >
        <div className="brand-ui p-6">
          <h2 id="delete-journey-title" className="text-lg font-semibold">
            {signedIn
              ? t('Delete this business?', '¿Borrar este negocio?')
              : t('Delete your whole journey?', '¿Borrar todo tu recorrido?')}
          </h2>
          <p className="mt-2 text-sm text-[#444]">
            {t(
              'Your goals, saved tools and feedback will be permanently deleted for every device. This can’t be undone.',
              'Tus objetivos, herramientas guardadas y opiniones se borrarán para siempre en todos los dispositivos. No se puede deshacer.',
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void deleteJourney()
                  .then(() => confirm.current?.close())
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
              }
              className="rounded-full bg-[#9a3632] px-5 py-3 text-sm font-bold text-white"
            >
              {t('Delete everything', 'Borrar todo')}
            </button>
            <button
              type="button"
              onClick={() => confirm.current?.close()}
              className="rounded-full border border-[#d8d8d8] px-5 py-3 text-sm font-semibold"
            >
              {t('Keep it', 'Conservarlo')}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

function EmptyJourney() {
  const { t } = useLanguage();
  const journey = useJourney();
  const [link, setLink] = useState('');
  const [bad, setBad] = useState(false);
  return (
    <div className="simple-results">
      <BusinessSwitcher />
      <header className="simple-page-heading">
        <p className="easy-eyebrow">{t('MY AI JOURNEY', 'MI RECORRIDO IA')}</p>
        <h1>{t('Your AI journey starts here.', 'Tu recorrido con IA empieza aquí.')}</h1>
        <p>
          {t(
            'Save a recommended tool and this page remembers your goal, the tools you liked, and how each one is going.',
            'Guarda una herramienta recomendada y esta página recordará tu objetivo, las herramientas que te gustaron y cómo te va con cada una.',
          )}
        </p>
      </header>
      <div className="brand-ui grid gap-4 md:grid-cols-2">
        <section className="rounded-[22px] border border-[#e2e2df] bg-white p-6">
          <h2 className="text-lg font-semibold">
            {t('Start with your business', 'Empieza con tu negocio')}
          </h2>
          <p className="mt-1 text-sm text-[#555]">
            {t(
              'Tell us what takes your time, then tap “Save this tool” on any option.',
              'Cuéntanos qué te quita tiempo y luego toca “Guardar esta herramienta” en cualquier opción.',
            )}
          </p>
          <Link
            href="/business"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
          >
            {t('Find tools for my business', 'Buscar herramientas para mi negocio')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
        {journey.account ? (
          <section className="rounded-[22px] border border-[#e2e2df] bg-white p-6">
            <h2 className="text-lg font-semibold">
              {t('Saved to your account', 'Se guarda en tu cuenta')}
            </h2>
            <p className="mt-1 text-sm text-[#555]">
              {t(
                `Signed in as ${journey.account.email}. Each business you add gets its own goals and toolkit; switch between them from the menu at the top.`,
                `Sesión iniciada como ${journey.account.email}. Cada negocio que agregues tiene sus propios objetivos y herramientas; cambia entre ellos desde el menú de arriba.`,
              )}
            </p>
          </section>
        ) : (
          <section className="rounded-[22px] border border-[#e2e2df] bg-white p-6">
            <h2 className="text-lg font-semibold">
              {t('Started on another device?', '¿Empezaste en otro dispositivo?')}
            </h2>
            {journey.accountsAvailable && (
              <p className="mt-1 text-sm text-[#555]">
                <Link href="/account" className="font-semibold underline underline-offset-2">
                  {t('Sign in', 'Inicia sesión')}
                </Link>{' '}
                {t(
                  'to see all your businesses, or paste a private link:',
                  'para ver todos tus negocios, o pega un enlace privado:',
                )}
              </p>
            )}
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                setBad(!restoreFromLink(link));
              }}
            >
              <label htmlFor="journey-link" className="text-sm text-[#555]">
                {t('Paste your private link', 'Pega tu enlace privado')}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="journey-link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  autoComplete="off"
                  className="min-w-0 flex-1 rounded-full border border-[#d8d8d8] px-4 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full bg-[#111] px-4 py-2.5 text-sm font-bold text-[#ffd200]"
                >
                  {t('Open', 'Abrir')}
                </button>
              </div>
              {bad && (
                <p role="alert" className="mt-2 text-sm font-semibold text-[#9a3632]">
                  {t(
                    'That doesn’t look like a journey link.',
                    'Eso no parece un enlace de recorrido.',
                  )}
                </p>
              )}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

/** Signed-in owners: one tap to switch between their businesses (or add one). */
function BusinessSwitcher() {
  const { t } = useLanguage();
  const router = useRouter();
  const journey = useJourney();
  if (!journey.account) return null;
  const currentId = journey.identity?.id ?? null;
  return (
    <nav
      aria-label={t('Your businesses', 'Tus negocios')}
      className="brand-ui mb-4 flex flex-wrap items-center gap-2"
    >
      {journey.account.businesses.map((b) => {
        const active = b.id === currentId;
        return (
          <button
            key={b.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => !active && void selectBusiness(b.id)}
            className={`rounded-full border px-3.5 py-2 text-xs font-bold ${
              active
                ? 'border-[#111] bg-[#111] text-[#ffd200]'
                : 'border-[#d8d8d8] bg-white text-[#333] hover:border-[#111]'
            }`}
          >
            {businessLabel(b.profile, t('My business', 'Mi negocio'))}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          addBusiness();
          router.push('/business');
        }}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#999] px-3.5 py-2 text-xs font-semibold text-[#333] hover:border-[#111]"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        {t('Add a business', 'Agregar un negocio')}
      </button>
    </nav>
  );
}
