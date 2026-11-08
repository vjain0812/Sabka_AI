'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Eye, EyeOff, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { useWorkspace } from '@/lib/client/workspace';
import { ConnectError, connectApi, saveIdentity, useConnectIdentity } from '@/lib/client/connect';
import { connectProfileInputSchema, topicLabel } from '@/lib/domain/connect';
import { categoryNameEs } from '@/lib/domain/i18n-es';
import {
  ConnectFields,
  draftToInput,
  emptyConnectDraft,
  type ConnectDraft,
  type ToolLite,
} from './connect-fields';

/** What the person is agreeing to, shown next to the checkbox and on the live preview. */
export function ConsentList() {
  const { t } = useLanguage();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-[#cfe6d5] bg-[#f3faf5] p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.12em] text-[#1a5c2c]">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />{' '}
          {t('Others can see', 'Los demás pueden ver')}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[#2f4a37]">
          <li>{t('The name you choose', 'El nombre que elijas')}</li>
          <li>
            {t(
              'Business type and city (if you add it)',
              'Tipo de negocio y ciudad (si la agregas)',
            )}
          </li>
          <li>{t('The notes and topics you write', 'Las notas y temas que escribas')}</li>
          <li>{t('Messages you choose to send them', 'Los mensajes que decidas enviarles')}</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-[#ead2cf] bg-[#fdf5f4] p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[.12em] text-[#8d3825]">
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />{' '}
          {t('Never shown', 'Nunca se muestra')}
        </p>
        <ul className="mt-2 space-y-1 text-sm text-[#5c2e25]">
          <li>
            {t(
              'Your email or phone (we don’t collect them)',
              'Tu correo o teléfono (no los pedimos)',
            )}
          </li>
          <li>{t('Your business brief and budget', 'Tu información de negocio y presupuesto')}</li>
          <li>{t('Your tool recommendations', 'Tus recomendaciones de herramientas')}</li>
        </ul>
      </div>
    </div>
  );
}

export const CONSENT_TEXT = {
  en: 'Yes, list my business in Connect so other businesses that have joined can see the details above and send me messages. I can pause or delete my profile at any time.',
  es: 'Sí, incluye mi negocio en Connect para que otros negocios que se hayan unido vean los datos de arriba y puedan escribirme. Puedo pausar o eliminar mi perfil cuando quiera.',
};

function Preview({ draft }: { draft: ConnectDraft }) {
  const { t, locale } = useLanguage();
  const name = draft.displayName.trim() || t('Your business', 'Tu negocio');
  const cat = draft.category
    ? locale === 'es'
      ? categoryNameEs[draft.category] ?? draft.category
      : draft.category
    : t('Type of business', 'Tipo de negocio');
  return (
    <aside
      aria-label={t('Preview', 'Vista previa')}
      className="rounded-[24px] border border-[#e2e2df] bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,.06)]"
    >
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#c41230]">
        {t('How others will see you', 'Cómo te verán los demás')}
      </p>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffd200] text-base font-bold"
        >
          {name
            .replace(/[^\p{L}\p{N}]/gu, '')
            .slice(0, 2)
            .toUpperCase() || '·'}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-[#666]">
            <span>{cat}</span>
            {draft.region && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" aria-hidden="true" /> {draft.region}
              </span>
            )}
          </p>
        </div>
      </div>
      {draft.about && <p className="mt-3 text-sm leading-6 text-[#444]">{draft.about}</p>}
      {draft.topics.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {draft.topics.map((id) => (
            <li
              key={id}
              className="rounded-md bg-[#f3f3f3] px-2 py-1 text-[11px] font-semibold text-[#555]"
            >
              {topicLabel(id, locale)}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export function ConnectJoin({ tools }: { tools: ToolLite[] }) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const identity = useConnectIdentity();
  const workspace = useWorkspace();
  // The brief's name and business type are offered as a starting point until the person edits.
  const [edited, setDraft] = useState<ConnectDraft | null>(null);
  const brief = workspace.session?.brief;
  const draft: ConnectDraft = edited ?? {
    ...emptyConnectDraft(),
    displayName: brief?.profile.name ?? '',
    category: brief?.profile.category ?? '',
  };
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!agreed) {
      setError(
        t(
          'Please tick the box to agree before joining.',
          'Marca la casilla para aceptar antes de unirte.',
        ),
      );
      return;
    }
    const parsed = connectProfileInputSchema.safeParse(draftToInput(draft));
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? t('Check your answers.', 'Revisa tus respuestas.'),
      );
      return;
    }
    setBusy(true);
    try {
      const created = await connectApi.create(parsed.data);
      saveIdentity({ id: created.id, key: created.key });
      router.push('/connect/me?welcome=1');
    } catch (err) {
      setError(
        err instanceof ConnectError
          ? err.message
          : t(
              'Couldn’t join right now. Please try again.',
              'No se pudo unir ahora. Inténtalo de nuevo.',
            ),
      );
      setBusy(false);
    }
  }

  return (
    <div className="brand-ui bg-[#f7f7f5] text-[#111]">
      <section className="hero-grid relative overflow-hidden bg-[#090909] text-white">
        <div className="pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full bg-[#e21833]/30 blur-[100px]" />
        <div className="relative mx-auto max-w-[1240px] px-5 pb-24 pt-10 lg:px-8">
          <Link
            href="/connect"
            className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />{' '}
            {t('Back to Connect', 'Volver a Connect')}
          </Link>
          <h1 className="rise max-w-[760px] text-[40px] font-semibold leading-[1] tracking-[-0.055em] sm:text-[56px]">
            {t('Join Connect', 'Únete a Connect')}
          </h1>
          <p className="rise mt-5 max-w-[620px] text-lg leading-8 text-white/60">
            {t(
              'Say yes to meeting other businesses. You decide what to share, and you can leave any time.',
              'Di que sí a conocer a otros negocios. Tú decides qué compartir y puedes salir cuando quieras.',
            )}
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-12 max-w-[1240px] px-5 pb-20 lg:px-8">
        {identity ? (
          <section className="rounded-[26px] border border-[#e2e2df] bg-white p-8">
            <Check className="h-6 w-6 text-[#1a5c2c]" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">
              {t('You’re already in Connect.', 'Ya estás en Connect.')}
            </h2>
            <p className="mt-2 text-[#555]">
              {t(
                'This device already has a Connect profile.',
                'Este dispositivo ya tiene un perfil de Connect.',
              )}
            </p>
            <Link
              href="/connect/me"
              className="mt-5 inline-flex rounded-full bg-[#ffd200] px-6 py-3 text-sm font-bold text-black"
            >
              {t('Open my profile', 'Abrir mi perfil')}
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="grid gap-6">
              <section className="rounded-[26px] border border-[#e2e2df] bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,.05)] sm:p-8">
                <h2 className="mb-5 text-xl font-semibold tracking-[-0.03em]">
                  {t('Your public profile', 'Tu perfil público')}
                </h2>
                <ConnectFields value={draft} onChange={setDraft} tools={tools} />
              </section>
              <section className="rounded-[26px] border border-[#e2e2df] bg-white p-6 shadow-[0_12px_35px_rgba(0,0,0,.05)] sm:p-8">
                <h2 className="mb-4 text-xl font-semibold tracking-[-0.03em]">
                  {t('Your choice', 'Tu decisión')}
                </h2>
                <ConsentList />
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e2e2df] bg-[#fafaf8] p-4 text-sm leading-6 text-[#222]">
                  <input
                    type="checkbox"
                    name="connect-consent"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#e21833]"
                  />
                  <span>{CONSENT_TEXT[locale]}</span>
                </label>
                <p className="mt-3 text-xs leading-5 text-[#666]">
                  {t(
                    'We save a private key on this device so you can come back. Your profile stays until you delete it.',
                    'Guardamos una clave privada en este dispositivo para que puedas volver. Tu perfil se queda hasta que lo elimines.',
                  )}
                </p>
                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-[#fdeae6] px-4 py-3 text-sm font-semibold text-[#8d3825]"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-5 rounded-full bg-[#ffd200] px-7 py-3.5 text-sm font-bold text-black transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {busy ? t('Joining…', 'Uniéndome…') : t('Join Connect', 'Unirme a Connect')}
                </button>
              </section>
            </div>
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Preview draft={draft} />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
