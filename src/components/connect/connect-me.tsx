'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Copy,
  EyeOff,
  Inbox,
  RefreshCw,
  Send,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import {
  ConnectError,
  connectApi,
  identityLink,
  readIdentityFromHash,
  saveIdentity,
  useConnectIdentity,
} from '@/lib/client/connect';
import type { InboxMessage, OwnProfile } from '@/lib/domain/connect';
import {
  ConnectFields,
  draftToInput,
  inputClass,
  type ConnectDraft,
  type ToolLite,
} from './connect-fields';
import { ConsentList } from './connect-join';

type Thread = { otherId: string; otherName: string; messages: InboxMessage[]; unread: number };

function groupThreads(messages: InboxMessage[]): Thread[] {
  const map = new Map<string, Thread>();
  for (const m of messages) {
    const th = map.get(m.otherId) ?? {
      otherId: m.otherId,
      otherName: m.otherName,
      messages: [],
      unread: 0,
    };
    th.messages.push(m);
    if (!m.mine && !m.readAt) th.unread++;
    map.set(m.otherId, th);
  }
  for (const th of map.values()) th.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...map.values()].sort((a, b) =>
    b.messages[b.messages.length - 1].createdAt.localeCompare(
      a.messages[a.messages.length - 1].createdAt,
    ),
  );
}
const toDraft = (p: OwnProfile): ConnectDraft => ({
  displayName: p.displayName,
  category: p.category,
  region: p.region,
  about: p.about,
  topics: p.topics,
  wins: p.wins,
});

export function ConnectMe({ tools }: { tools: ToolLite[] }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const welcome = useSearchParams().get('welcome') === '1';
  const identity = useConnectIdentity();
  const [tab, setTab] = useState<'messages' | 'profile'>('messages');
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [draft, setDraft] = useState<ConnectDraft | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hashChecked, setHashChecked] = useState(false);
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'es' ? 'es' : 'en', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  // A private link (#key=…) restores this profile on a new device.
  useEffect(() => {
    const fromLink = readIdentityFromHash();
    if (fromLink) {
      saveIdentity(fromLink);
      history.replaceState(null, '', location.pathname + location.search);
    }
    // Deferred so the first render can finish before we decide the person is signed out.
    queueMicrotask(() => setHashChecked(true));
  }, []);

  const apply = useCallback((me: { profile: OwnProfile }, inbox: { messages: InboxMessage[] }) => {
    setProfile(me.profile);
    setDraft((d) => d ?? toDraft(me.profile));
    setMessages(inbox.messages);
    setStatus('ready');
  }, []);
  const failed = useCallback((e: unknown) => {
    if (e instanceof ConnectError && (e.status === 401 || e.status === 403))
      saveIdentity(null); // The key isn't recognised any more; the page shows the signed-out state.
    else setStatus('error');
  }, []);
  /** Manual refresh (buttons). The first load happens in the effect below. */
  const load = useCallback(async () => {
    if (!identity) return;
    try {
      apply(...(await Promise.all([connectApi.me(identity), connectApi.inbox(identity)])));
    } catch (e) {
      failed(e);
    }
  }, [identity, apply, failed]);
  useEffect(() => {
    if (!hashChecked || !identity) return;
    let cancelled = false;
    Promise.all([connectApi.me(identity), connectApi.inbox(identity)])
      .then(([me, inbox]) => {
        if (!cancelled) apply(me, inbox);
      })
      .catch((e) => {
        if (!cancelled) failed(e);
      });
    return () => {
      cancelled = true;
    };
  }, [identity, hashChecked, apply, failed]);

  const threads = useMemo(() => groupThreads(messages), [messages]);
  const active = threads.find((x) => x.otherId === open) ?? null;
  const unreadTotal = threads.reduce((s, x) => s + x.unread, 0);

  async function openThread(th: Thread) {
    setOpen(th.otherId);
    setError('');
    if (identity && th.unread) {
      await connectApi.markRead(identity, th.otherId).catch(() => undefined);
      setMessages((all) =>
        all.map((m) =>
          m.otherId === th.otherId && !m.mine && !m.readAt
            ? { ...m, readAt: new Date().toISOString() }
            : m,
        ),
      );
    }
  }
  async function sendReply() {
    if (!identity || !active || busy) return;
    setBusy(true);
    setError('');
    try {
      await connectApi.send(identity, active.otherId, reply);
      setReply('');
      await load();
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
  async function saveProfile() {
    if (!identity || !draft || busy) return;
    setBusy(true);
    setError('');
    setNote('');
    try {
      const { consent: _c, visible: _v, ...patch } = draftToInput(draft, profile?.category);
      void _c;
      void _v;
      await connectApi.update(identity, patch);
      setNote(t('Saved.', 'Guardado.'));
      await load();
    } catch (e) {
      setError(
        e instanceof ConnectError
          ? e.message
          : t('Couldn’t save. Please try again.', 'No se pudo guardar. Inténtalo de nuevo.'),
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggleVisible() {
    if (!identity || !profile || busy) return;
    setBusy(true);
    try {
      await connectApi.update(identity, { visible: !profile.visible });
      await load();
    } catch {
      setError(
        t('Couldn’t update. Please try again.', 'No se pudo actualizar. Inténtalo de nuevo.'),
      );
    } finally {
      setBusy(false);
    }
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(identityLink(identity));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        t(
          'Couldn’t copy. Select the link and copy it by hand.',
          'No se pudo copiar. Selecciona el enlace y cópialo a mano.',
        ),
      );
    }
  }
  async function deleteAll() {
    if (!identity || busy) return;
    setBusy(true);
    try {
      await connectApi.remove(identity);
      saveIdentity(null);
      router.push('/connect');
    } catch {
      setError(
        t(
          'Couldn’t delete right now. Please try again.',
          'No se pudo eliminar ahora. Inténtalo de nuevo.',
        ),
      );
      setBusy(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[380px] w-[380px] rounded-full bg-[#e21833]/30 blur-[100px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-20 pt-10 lg:px-8">
          <Link
            href="/connect"
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />{' '}
            {t('Back to Connect', 'Volver a Connect')}
          </Link>
          <h1 className="text-[38px] font-semibold leading-[1] tracking-[-0.055em] sm:text-[52px]">
            {profile ? profile.displayName : t('Your Connect', 'Tu Connect')}
          </h1>
        </div>
      </section>
      <div className="relative z-10 mx-auto -mt-10 max-w-[1240px] px-5 pb-20 lg:px-8">
        {children}
      </div>
    </div>
  );

  const signedOut = hashChecked && !identity;
  if (!signedOut && status === 'loading')
    return shell(
      <p role="status" className="rounded-[24px] bg-white p-8 text-[#555]">
        {t('Opening your profile…', 'Abriendo tu perfil…')}
      </p>,
    );
  if (signedOut || !identity)
    return shell(
      <section className="rounded-[26px] border border-[#e2e2df] bg-white p-8">
        <UserRound className="h-6 w-6 text-[#c41230]" aria-hidden="true" />
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
          {t(
            'You haven’t joined Connect on this device.',
            'No te has unido a Connect en este dispositivo.',
          )}
        </h2>
        <p className="mt-2 max-w-xl text-[#555]">
          {t(
            'Join to be listed and to message other businesses. If you joined on another device, open your private link here.',
            'Únete para aparecer y escribir a otros negocios. Si te uniste en otro dispositivo, abre aquí tu enlace privado.',
          )}
        </p>
        <Link
          href="/connect/join"
          className="mt-5 inline-flex rounded-full bg-[#ffd200] px-6 py-3 text-sm font-bold text-black"
        >
          {t('Join Connect', 'Unirme a Connect')}
        </Link>
      </section>,
    );
  if (status === 'error' || !profile || !draft)
    return shell(
      <section role="alert" className="rounded-[26px] border border-[#e2e2df] bg-white p-8">
        <h2 className="text-xl font-semibold">
          {t('We couldn’t open your profile.', 'No pudimos abrir tu perfil.')}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
        >
          {t('Try again', 'Intentar de nuevo')}
        </button>
      </section>,
    );

  return shell(
    <>
      {welcome && (
        <section
          role="status"
          className="mb-6 rounded-[24px] border border-[#cfe6d5] bg-[#f3faf5] p-6"
        >
          <p className="flex items-center gap-2 font-semibold text-[#1a5c2c]">
            <Check className="h-5 w-5" aria-hidden="true" />{' '}
            {t('You’re in. Welcome to Connect!', '¡Listo! Bienvenido a Connect.')}
          </p>
          <p className="mt-2 text-sm leading-6 text-[#2f4a37]">
            {t(
              'Keep your private link somewhere safe: it’s the only way to reopen this profile on another device.',
              'Guarda tu enlace privado en un lugar seguro: es la única forma de abrir este perfil en otro dispositivo.',
            )}
          </p>
        </section>
      )}
      {!profile.visible && (
        <p className="mb-6 flex items-start gap-2 rounded-2xl border border-[#f1e3a4] bg-[#fffbe8] px-4 py-3 text-sm text-[#4b4535]">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t(
            'Your profile is paused: nobody can find you or message you right now.',
            'Tu perfil está en pausa: nadie puede encontrarte ni escribirte por ahora.',
          )}
        </p>
      )}
      <div role="tablist" aria-label={t('Your Connect', 'Tu Connect')} className="mb-6 flex gap-2">
        {(
          [
            ['messages', t('Messages', 'Mensajes'), Inbox],
            ['profile', t('Profile & privacy', 'Perfil y privacidad'), UserRound],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-all ${
              tab === id
                ? 'border-black bg-black text-white'
                : 'border-[#d8d8d8] bg-white text-[#444] hover:border-[#e21833]'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
            {id === 'messages' && unreadTotal > 0 && (
              <span className="rounded-full bg-[#ffd200] px-2 py-0.5 text-[10px] font-bold text-black">
                {unreadTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'messages' && (
        <section
          role="tabpanel"
          id="panel-messages"
          aria-labelledby="tab-messages"
          className="grid gap-5 lg:grid-cols-[320px_1fr]"
        >
          <div className="rounded-[24px] border border-[#e2e2df] bg-white p-3">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <h2 className="text-sm font-bold uppercase tracking-[.12em] text-[#555]">
                {t('Conversations', 'Conversaciones')}
              </h2>
              <button
                type="button"
                onClick={() => void load()}
                aria-label={t('Refresh', 'Actualizar')}
                className="rounded-full p-2 text-[#555] hover:bg-[#f3f3f3]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            {threads.length === 0 ? (
              <p className="px-3 pb-4 text-sm leading-6 text-[#555]">
                {t(
                  'No messages yet. Say hello to someone in',
                  'Aún no hay mensajes. Saluda a alguien en',
                )}{' '}
                <Link href="/connect" className="font-semibold underline">
                  Connect
                </Link>
                .
              </p>
            ) : (
              <ul>
                {threads.map((th) => {
                  const last = th.messages[th.messages.length - 1];
                  return (
                    <li key={th.otherId}>
                      <button
                        type="button"
                        onClick={() => void openThread(th)}
                        aria-current={open === th.otherId}
                        className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${
                          open === th.otherId ? 'bg-[#fff4bf]' : 'hover:bg-[#f7f7f5]'
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{th.otherName}</span>
                          {th.unread > 0 && (
                            <span className="rounded-full bg-[#e21833] px-2 py-0.5 text-[10px] font-bold text-white">
                              {th.unread}
                              <span className="sr-only"> {t('unread', 'sin leer')}</span>
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[#666]">
                          {last.mine ? `${t('You', 'Tú')}: ` : ''}
                          {last.body}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="rounded-[24px] border border-[#e2e2df] bg-white p-5">
            {active ? (
              <>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">{active.otherName}</h2>
                <ol
                  className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1"
                  aria-label={t('Messages', 'Mensajes')}
                >
                  {active.messages.map((m) => (
                    <li key={m.id} className={`max-w-[85%] ${m.mine ? 'ml-auto' : ''}`}>
                      {/* User-written text is rendered as plain text; React escapes it. */}
                      <p
                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                          m.mine
                            ? 'rounded-br-md bg-[#111] text-white'
                            : 'rounded-bl-md bg-[#f1f1ef] text-[#222]'
                        }`}
                      >
                        {m.body}
                      </p>
                      <p className={`mt-1 text-[10px] text-[#666] ${m.mine ? 'text-right' : ''}`}>
                        {fmt.format(new Date(m.createdAt))}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 grid gap-2">
                  <label htmlFor="reply" className="sr-only">
                    {t('Your reply', 'Tu respuesta')}
                  </label>
                  <textarea
                    id="reply"
                    className={`${inputClass} min-h-[80px] resize-y`}
                    value={reply}
                    maxLength={600}
                    placeholder={t('Write a reply…', 'Escribe una respuesta…')}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  {error && (
                    <p role="alert" className="text-xs font-semibold text-[#c41230]">
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={busy || reply.trim().length < 2}
                    onClick={() => void sendReply()}
                    className="flex w-fit items-center gap-2 rounded-full bg-[#ffd200] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" aria-hidden="true" /> {t('Send', 'Enviar')}
                  </button>
                </div>
              </>
            ) : (
              <p className="py-10 text-center text-sm text-[#666]">
                {t('Choose a conversation to read it.', 'Elige una conversación para leerla.')}
              </p>
            )}
          </div>
        </section>
      )}

      {tab === 'profile' && (
        <section
          role="tabpanel"
          id="panel-profile"
          aria-labelledby="tab-profile"
          className="grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        >
          <div className="rounded-[26px] border border-[#e2e2df] bg-white p-6 sm:p-8">
            <h2 className="mb-5 text-xl font-semibold tracking-[-0.03em]">
              {t('Your public profile', 'Tu perfil público')}
            </h2>
            <ConnectFields value={draft} onChange={setDraft} tools={tools} />
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-[#fdeae6] px-4 py-3 text-sm font-semibold text-[#8d3825]"
              >
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveProfile()}
                className="rounded-full bg-[#ffd200] px-6 py-3 text-sm font-bold text-black disabled:opacity-60"
              >
                {t('Save changes', 'Guardar cambios')}
              </button>
              {note && (
                <span role="status" className="text-sm font-semibold text-[#1a5c2c]">
                  {note}
                </span>
              )}
            </div>
          </div>
          <div className="grid content-start gap-5">
            <div className="rounded-[24px] border border-[#e2e2df] bg-white p-6">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {t('Visibility', 'Visibilidad')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#555]">
                {profile.visible
                  ? t('You’re listed in Connect.', 'Apareces en Connect.')
                  : t(
                      'You’re paused. Nobody can find you.',
                      'Estás en pausa. Nadie puede encontrarte.',
                    )}
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleVisible()}
                className="mt-3 rounded-full border border-[#d8d8d8] bg-white px-5 py-2.5 text-sm font-bold hover:border-[#e21833] disabled:opacity-60"
              >
                {profile.visible
                  ? t('Pause my profile', 'Pausar mi perfil')
                  : t('Show me again', 'Mostrarme de nuevo')}
              </button>
            </div>
            <div className="rounded-[24px] border border-[#e2e2df] bg-white p-6">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {t('Private link', 'Enlace privado')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#555]">
                {t(
                  'Opens this profile on another device. Anyone with the link can manage it, so don’t share it.',
                  'Abre este perfil en otro dispositivo. Cualquiera con el enlace puede administrarlo, así que no lo compartas.',
                )}
              </p>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="mt-3 flex items-center gap-2 rounded-full border border-[#d8d8d8] bg-white px-5 py-2.5 text-sm font-bold hover:border-[#e21833]"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-[#1a5c2c]" aria-hidden="true" />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden="true" />
                )}
                {copied ? t('Copied', 'Copiado') : t('Copy private link', 'Copiar enlace privado')}
              </button>
            </div>
            <div className="rounded-[24px] border border-[#e2e2df] bg-white p-6">
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                {t('What you agreed to', 'A lo que aceptaste')}
              </h2>
              <p className="mt-2 text-xs text-[#666]">
                {t('Agreed on', 'Aceptado el')} {fmt.format(new Date(profile.consentedAt))}
              </p>
              <div className="mt-3">
                <ConsentList />
              </div>
            </div>
            <div className="rounded-[24px] border border-[#ead2cf] bg-[#fdf5f4] p-6">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#5c2e25]">
                {t('Leave Connect', 'Salir de Connect')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5c2e25]">
                {t(
                  'Deleting erases your profile and every message you sent or received. This can’t be undone.',
                  'Eliminar borra tu perfil y todos los mensajes enviados o recibidos. No se puede deshacer.',
                )}
              </p>
              {confirmDelete ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteAll()}
                    className="flex items-center gap-2 rounded-full bg-[#9a3632] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />{' '}
                    {t('Yes, delete everything', 'Sí, eliminar todo')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-full border border-[#d8d8d8] bg-white px-5 py-2.5 text-sm font-bold"
                  >
                    {t('Keep my profile', 'Conservar mi perfil')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 rounded-full border border-[#9a3632] bg-white px-5 py-2.5 text-sm font-bold text-[#9a3632]"
                >
                  {t('Delete my profile', 'Eliminar mi perfil')}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </>,
  );
}
