'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Flag,
  Inbox,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { useWorkspace } from '@/lib/client/workspace';
import {
  ConnectError,
  connectApi,
  saveIdentity,
  useConnectIdentity,
  type Identity,
} from '@/lib/client/connect';
import { categories } from '@/lib/domain/brief';
import { connectTopics, outcomeLabel, topicLabel, type PublicProfile } from '@/lib/domain/connect';
import { connectDemoProfiles } from '@/lib/domain/connect-demo';
import { categoryNameEs } from '@/lib/domain/i18n-es';
import { ToolMark } from '@/components/site/tool-mark';
import { inputClass, type ToolLite } from './connect-fields';

const palettes = ['#ffd200', '#e21833', '#111111', '#ffe45c', '#c41230'];
function Avatar({ name }: { name: string }) {
  const hash = [...name].reduce((s, c) => s + c.charCodeAt(0), 0);
  const bg = palettes[hash % palettes.length];
  const dark = bg === '#111111' || bg === '#e21833' || bg === '#c41230';
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold shadow-[0_6px_16px_rgba(0,0,0,.12)]"
      style={{ background: bg, color: dark ? '#fff' : '#111' }}
    >
      {name
        .replace(/[^\p{L}\p{N}]/gu, '')
        .slice(0, 2)
        .toUpperCase() || '·'}
    </span>
  );
}

const outcomeStyle = {
  worked: 'bg-[#e6f4ea] text-[#1a5c2c]',
  mixed: 'bg-[#fff4bf] text-[#3d3200]',
  not_for_us: 'bg-[#f1f1f1] text-[#444]',
} as const;
const reportReasons = [
  ['Looks like spam', 'Parece spam'],
  ['Shares contact details publicly', 'Comparte datos de contacto en público'],
  ['Not a real business', 'No parece un negocio real'],
  ['Unkind or unsafe', 'Poco amable o inseguro'],
] as const;

function ProfileCard({
  profile,
  tools,
  identity,
  isMe,
  index,
}: {
  profile: PublicProfile;
  tools: Map<string, ToolLite>;
  identity: Identity;
  isMe: boolean;
  index: number;
}) {
  const { t, locale } = useLanguage();
  const [composer, setComposer] = useState<'closed' | 'open' | 'sent'>('closed');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reporting, setReporting] = useState<'closed' | 'open' | 'done'>('closed');
  const [reason, setReason] = useState<string>(reportReasons[0][0]);
  const category =
    locale === 'es' ? categoryNameEs[profile.category] ?? profile.category : profile.category;
  const panel = `composer-${profile.id}`;

  async function send() {
    if (!identity || busy) return;
    setBusy(true);
    setError('');
    try {
      await connectApi.send(identity, profile.id, text);
      setComposer('sent');
      setText('');
    } catch (e) {
      setError(
        e instanceof ConnectError
          ? e.message
          : t('Couldn’t send. Please try again.', 'No se pudo enviar. Inténtalo de nuevo.'),
      );
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    try {
      await connectApi.report(profile.id, reason);
    } catch {
      /* A failed report shouldn't block the person; they can try again. */
    }
    setReporting('done');
  }

  return (
    <article
      className="rise flex flex-col rounded-[24px] border border-[#e2e2df] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.05)] transition-all hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(226,24,51,.1)]"
      style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        <Avatar name={profile.displayName} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold tracking-[-0.02em]">{profile.displayName}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-[#666]">
            <span>{category}</span>
            {profile.region && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" /> {profile.region}
              </span>
            )}
          </p>
        </div>
        {isMe && (
          <span className="shrink-0 rounded-full bg-[#111] px-2.5 py-1 text-[10px] font-bold text-[#ffd200]">
            {t('You', 'Tú')}
          </span>
        )}
        {profile.demo && (
          <span className="shrink-0 rounded-full bg-[#fff4bf] px-2.5 py-1 text-[10px] font-bold text-[#3d3200]">
            {t('Fictional example', 'Ejemplo ficticio')}
          </span>
        )}
      </div>

      {profile.about && <p className="mt-4 text-sm leading-6 text-[#444]">{profile.about}</p>}

      {profile.topics.length > 0 && (
        <ul
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label={t('Happy to talk about', 'Le gusta hablar de')}
        >
          {profile.topics.map((topic) => (
            <li
              key={topic}
              className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[11px] font-semibold text-[#555]"
            >
              {topicLabel(topic, locale)}
            </li>
          ))}
        </ul>
      )}

      {profile.wins.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#ececea] bg-[#fafaf8] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#c41230]">
            {t('What worked for them', 'Lo que les funcionó')} ·{' '}
            <span className="font-semibold normal-case tracking-normal text-[#666]">
              {t('self-reported, not verified', 'autodeclarado, sin verificar')}
            </span>
          </p>
          <ul className="grid gap-2.5">
            {profile.wins.map((win) => {
              const tool = tools.get(win.toolSlug);
              return (
                <li key={win.toolSlug + win.note} className="flex items-start gap-2.5">
                  <ToolMark name={tool?.name ?? win.toolSlug} website={tool?.website} size="sm" />
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      {tool ? (
                        <Link
                          href={`/tools/${tool.slug}`}
                          className="font-semibold hover:text-[#c41230]"
                        >
                          {tool.name}
                        </Link>
                      ) : (
                        <span className="font-semibold">{win.toolSlug}</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          outcomeStyle[win.outcome]
                        }`}
                      >
                        {outcomeLabel(win.outcome, locale)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-[#555]">{win.note}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-5">
        {profile.demo ? (
          <p className="text-xs leading-5 text-[#666]">
            {t(
              'This is a made-up example, so it can’t be messaged. Real businesses show up here after they join.',
              'Es un ejemplo inventado, así que no se le puede escribir. Los negocios reales aparecen aquí cuando se unen.',
            )}
          </p>
        ) : isMe ? (
          <Link
            href="/connect/me"
            className="flex items-center gap-1.5 text-sm font-bold text-[#111] hover:text-[#c41230]"
          >
            {t('Edit your profile', 'Editar tu perfil')}{' '}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : !identity ? (
          <Link
            href="/connect/join"
            className="flex w-fit items-center gap-2 rounded-full bg-[#ffd200] px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#ffdc33]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('Join to say hello', 'Únete para saludar')}
          </Link>
        ) : composer === 'sent' ? (
          <p
            role="status"
            className="rounded-2xl bg-[#e6f4ea] px-4 py-3 text-sm font-semibold text-[#1a5c2c]"
          >
            {t('Sent! Replies will appear in', '¡Enviado! Las respuestas aparecerán en')}{' '}
            <Link href="/connect/me" className="underline">
              {t('your inbox', 'tu bandeja')}
            </Link>
            .
          </p>
        ) : (
          <>
            <button
              type="button"
              aria-expanded={composer === 'open'}
              aria-controls={panel}
              onClick={() => setComposer(composer === 'open' ? 'closed' : 'open')}
              className="flex items-center gap-2 rounded-full bg-[#111] px-5 py-2.5 text-sm font-bold text-[#ffd200] transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> {t('Say hello', 'Saludar')}
            </button>
            {composer === 'open' && (
              <div id={panel} className="mt-3 grid gap-2">
                <label htmlFor={`${panel}-text`} className="text-xs font-semibold text-[#444]">
                  {t('Your message to', 'Tu mensaje para')} {profile.displayName}
                </label>
                <textarea
                  id={`${panel}-text`}
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={text}
                  maxLength={600}
                  placeholder={t(
                    'Hi! I saw you use… I’d love to hear what worked for you.',
                    '¡Hola! Vi que usas… Me encantaría saber qué te funcionó.',
                  )}
                  onChange={(e) => setText(e.target.value)}
                />
                <p className="text-[11px] leading-5 text-[#666]">
                  {t(
                    'Only this business will see your message. Share contact details only if you’re comfortable.',
                    'Solo este negocio verá tu mensaje. Comparte datos de contacto solo si te sientes cómodo.',
                  )}
                </p>
                {error && (
                  <p role="alert" className="text-xs font-semibold text-[#c41230]">
                    {error}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || text.trim().length < 2}
                    onClick={send}
                    className="rounded-full bg-[#ffd200] px-5 py-2 text-sm font-bold text-black disabled:opacity-50"
                  >
                    {busy ? t('Sending…', 'Enviando…') : t('Send', 'Enviar')}
                  </button>
                  <span className="text-[11px] text-[#666]">{text.length}/600</span>
                </div>
              </div>
            )}
          </>
        )}

        {!profile.demo && !isMe && (
          <div className="mt-3 border-t border-[#f1f1ef] pt-3">
            {reporting === 'closed' && (
              <button
                type="button"
                onClick={() => setReporting('open')}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#666] hover:text-[#c41230]"
              >
                <Flag className="h-3 w-3" aria-hidden="true" />{' '}
                {t('Report this profile', 'Reportar este perfil')}
              </button>
            )}
            {reporting === 'open' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`${panel}-reason`}>
                  {t('Reason', 'Motivo')}
                </label>
                <select
                  id={`${panel}-reason`}
                  className={`${inputClass} max-w-[220px] py-1.5 text-xs`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {reportReasons.map(([en, es]) => (
                    <option key={en} value={en}>
                      {t(en, es)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={report}
                  className="rounded-full bg-[#111] px-3 py-1.5 text-xs font-bold text-white"
                >
                  {t('Send report', 'Enviar reporte')}
                </button>
              </div>
            )}
            {reporting === 'done' && (
              <p role="status" className="text-[11px] font-semibold text-[#444]">
                {t('Thanks. We’ll take a look.', 'Gracias. Lo revisaremos.')}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function ConnectDirectory({ tools }: { tools: ToolLite[] }) {
  const { t, locale } = useLanguage();
  const identity = useConnectIdentity();
  const workspace = useWorkspace();
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; mode: 'database' | 'preview'; profiles: PublicProfile[] }
  >({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [topic, setTopic] = useState('');
  const [toolFilter, setToolFilter] = useState('');
  const toolMap = useMemo(() => new Map(tools.map((x) => [x.slug, x])), [tools]);
  const myCategory = workspace.session?.brief.profile.category ?? '';

  useEffect(() => {
    const controller = new AbortController();
    connectApi
      .list()
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', ...data });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({ status: 'error', message: e instanceof ConnectError ? e.message : '' });
      });
    return () => controller.abort();
    // `t` is intentionally not a dependency: it changes every render and would refetch forever.
  }, [retry]);
  // A saved identity that the server no longer recognises (deleted elsewhere) is cleared.
  useEffect(() => {
    if (!identity) return;
    connectApi.me(identity).catch((e) => {
      if (e instanceof ConnectError && (e.status === 403 || e.status === 401)) saveIdentity(null);
    });
  }, [identity]);

  const real = useMemo(() => (state.status === 'ready' ? state.profiles : []), [state]);
  const showDemos = state.status === 'ready' && real.length < 3;
  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = real.filter(
      (p) =>
        (!category || p.category === category) &&
        (!topic || p.topics.includes(topic as never)) &&
        (!toolFilter || p.wins.some((w) => w.toolSlug === toolFilter)) &&
        (!q || `${p.displayName} ${p.region} ${p.about} ${p.category}`.toLowerCase().includes(q)),
    );
    return list.sort(
      (a, b) =>
        Number(b.category === myCategory) - Number(a.category === myCategory) ||
        b.createdAt.localeCompare(a.createdAt),
    );
  }, [real, category, topic, toolFilter, q, myCategory]);
  const usedTools = useMemo(
    () =>
      [...new Set(real.flatMap((p) => p.wins.map((w) => w.toolSlug)))]
        .map((slug) => toolMap.get(slug))
        .filter((x): x is ToolLite => Boolean(x))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [real, toolMap],
  );
  const filtersOn = Boolean(query || category || topic || toolFilter);

  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[460px] w-[460px] rounded-full bg-[#e21833]/35 blur-[100px]" />
        <div className="pointer-events-none absolute -right-24 -top-10 h-[420px] w-[420px] rounded-full bg-[#ffd200]/10 blur-[110px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-28 pt-14 lg:px-8 lg:pt-20">
          <div className="rise mb-7 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3 py-1.5 text-xs font-semibold text-white/75">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ffd200] opacity-60" />
              <span className="relative h-2 w-2 rounded-full bg-[#ffd200]" />
            </span>
            Connect
          </div>
          <h1 className="rise max-w-[860px] text-[44px] font-semibold leading-[.98] tracking-[-0.06em] sm:text-[64px]">
            {t('Learn from owners', 'Aprende de dueños')}{' '}
            <span className="bg-gradient-to-r from-[#ffd200] via-[#ffdf43] to-white bg-clip-text text-transparent">
              {t('who’ve been there.', 'que ya pasaron por ahí.')}
            </span>
          </h1>
          <p className="rise mt-6 max-w-[640px] text-lg leading-8 text-white/60">
            {t(
              'Small businesses who said yes to meeting each other. Swap what worked, what didn’t and what you’d do again.',
              'Pequeños negocios que dijeron sí a conocerse. Intercambien lo que funcionó, lo que no y lo que volverían a hacer.',
            )}
          </p>
          <div className="rise mt-9 flex flex-wrap items-center gap-3">
            {identity ? (
              <>
                <Link
                  href="/connect/me"
                  className="flex items-center gap-2 rounded-full bg-[#ffd200] px-6 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5"
                >
                  <Inbox className="h-4 w-4" aria-hidden="true" />{' '}
                  {t('Your inbox & profile', 'Tu bandeja y perfil')}
                </Link>
              </>
            ) : (
              <Link
                href="/connect/join"
                className="group flex items-center gap-3 rounded-full bg-[#ffd200] py-3.5 pl-6 pr-4 text-sm font-bold text-black shadow-[0_10px_30px_rgba(255,210,0,.2)] transition-all hover:-translate-y-0.5 hover:bg-white"
              >
                {t('Join Connect', 'Unirme a Connect')}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[#ffd200] transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            )}
          </div>
          <ol className="rise mt-10 grid max-w-[900px] gap-3 sm:grid-cols-3">
            {[
              [
                'You choose',
                'Tú decides',
                'Nobody is listed until they say yes.',
                'Nadie aparece hasta que dice que sí.',
              ],
              [
                'You control what’s shown',
                'Tú controlas lo que se ve',
                'Only what you write. No email, no phone.',
                'Solo lo que escribes. Sin correo ni teléfono.',
              ],
              [
                'Leave any time',
                'Sal cuando quieras',
                'Pause or delete your profile and messages.',
                'Pausa o elimina tu perfil y tus mensajes.',
              ],
            ].map(([en, es, den, des], i) => (
              <li key={en} className="rounded-2xl border border-white/10 bg-white/[.04] p-4">
                <span className="text-xs font-bold text-[#ffd200]">0{i + 1}</span>
                <p className="mt-1 text-sm font-semibold">{t(en, es)}</p>
                <p className="mt-1 text-xs leading-5 text-white/55">{t(den, des)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-[1240px] px-5 pb-20 lg:px-8">
        <section
          aria-label={t('Find businesses', 'Buscar negocios')}
          className="rounded-[28px] border border-white/50 bg-white p-3 shadow-[0_35px_90px_rgba(0,0,0,.18)] sm:p-4"
        >
          <div className="grid gap-3 rounded-[20px] bg-[#f4f4f2] p-4 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] sm:p-5">
            <div className="relative self-end">
              <label htmlFor="connect-q" className="sr-only">
                {t('Search businesses', 'Buscar negocios')}
              </label>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#888]"
                aria-hidden="true"
              />
              <input
                id="connect-q"
                type="search"
                className={`${inputClass} pl-10`}
                value={query}
                maxLength={80}
                placeholder={t('Search by name, city or topic', 'Busca por nombre, ciudad o tema')}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <label className="text-xs font-semibold text-[#555]">
              {t('Type of business', 'Tipo de negocio')}
              <select
                className={`${inputClass} mt-1.5`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">{t('Any', 'Cualquiera')}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {locale === 'es' ? categoryNameEs[c] ?? c : c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#555]">
              {t('Talks about', 'Habla de')}
              <select
                className={`${inputClass} mt-1.5`}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="">{t('Anything', 'Cualquier tema')}</option>
                {connectTopics.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x[locale]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-[#555]">
              {t('Has tried', 'Ha probado')}
              <select
                className={`${inputClass} mt-1.5`}
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
              >
                <option value="">{t('Any tool', 'Cualquier herramienta')}</option>
                {usedTools.map((x) => (
                  <option key={x.slug} value={x.slug}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-1 pt-4 text-sm text-[#555]">
            <p role="status" className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#e21833]" aria-hidden="true" />
              {state.status === 'ready' ? (
                <>
                  <strong className="text-[#111]">{filtered.length}</strong>{' '}
                  {filtered.length === 1 ? t('business', 'negocio') : t('businesses', 'negocios')}
                  {myCategory && !filtersOn && ` · ${t('yours first', 'el tuyo primero')}`}
                </>
              ) : (
                t('Loading…', 'Cargando…')
              )}
            </p>
            {filtersOn && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setCategory('');
                  setTopic('');
                  setToolFilter('');
                }}
                className="rounded-full px-3 py-1.5 text-xs font-bold text-[#c41230] hover:bg-[#e21833]/5"
              >
                {t('Clear filters', 'Borrar filtros')}
              </button>
            )}
          </div>
        </section>

        {state.status === 'ready' && state.mode === 'preview' && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-[#f1e3a4] bg-[#fffbe8] px-4 py-3 text-sm text-[#4b4535]">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#c41230]" aria-hidden="true" />
            {t(
              'Preview mode: profiles are saved on this computer only, until the Connect database is switched on.',
              'Modo de vista previa: los perfiles se guardan solo en esta computadora, hasta que se active la base de datos de Connect.',
            )}
          </p>
        )}

        {state.status === 'loading' && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[24px] bg-white" />
            ))}
          </div>
        )}
        {state.status === 'error' && (
          <section
            role="alert"
            className="mt-8 rounded-[24px] border border-[#e2e2df] bg-white p-8"
          >
            <h2 className="text-xl font-semibold">
              {t('We couldn’t load Connect.', 'No pudimos cargar Connect.')}
            </h2>
            <p className="mt-2 text-[#555]">
              {state.message ||
                t('Please try again in a moment.', 'Inténtalo de nuevo en un momento.')}
            </p>
            <button
              type="button"
              onClick={() => {
                setState({ status: 'loading' });
                setRetry((n) => n + 1);
              }}
              className="mt-5 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
            >
              {t('Try again', 'Intentar de nuevo')}
            </button>
          </section>
        )}
        {state.status === 'ready' && (
          <>
            {filtered.length > 0 ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p, i) => (
                  <ProfileCard
                    key={p.id}
                    profile={p}
                    tools={toolMap}
                    identity={identity}
                    isMe={identity?.id === p.id}
                    index={i}
                  />
                ))}
              </div>
            ) : (
              <section className="mt-8 rounded-[26px] border border-[#dddddd] bg-white p-10 text-center">
                <UserRound className="mx-auto h-8 w-8 text-[#c41230]" aria-hidden="true" />
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
                  {filtersOn
                    ? t(
                        'No businesses match those filters.',
                        'Ningún negocio coincide con esos filtros.',
                      )
                    : t('Be the first to join.', 'Sé el primero en unirte.')}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[#666]">
                  {filtersOn
                    ? t('Try fewer filters.', 'Prueba con menos filtros.')
                    : t(
                        'Nobody is listed yet. Businesses only appear after they choose to join.',
                        'Todavía no hay nadie. Los negocios solo aparecen cuando deciden unirse.',
                      )}
                </p>
                {!filtersOn && !identity && (
                  <Link
                    href="/connect/join"
                    className="mt-6 inline-flex rounded-full bg-[#ffd200] px-6 py-3 text-sm font-bold text-black"
                  >
                    {t('Join Connect', 'Unirme a Connect')}
                  </Link>
                )}
              </section>
            )}

            {showDemos && !filtersOn && (
              <section className="mt-12" aria-labelledby="demo-heading">
                <div className="mb-4 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#c41230]" aria-hidden="true" />
                  <h2
                    id="demo-heading"
                    className="text-sm font-bold uppercase tracking-[.14em] text-[#555]"
                  >
                    {t('What a profile looks like (fictional)', 'Así se ve un perfil (ficticio)')}
                  </h2>
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {connectDemoProfiles.map((p, i) => (
                    <ProfileCard
                      key={p.id}
                      profile={p}
                      tools={toolMap}
                      identity={identity}
                      isMe={false}
                      index={i}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
