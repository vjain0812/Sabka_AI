'use client';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLanguage } from '@/lib/client/language';
import { useConnectIdentity } from '@/lib/client/connect';
import { ConnectFields, type ConnectDraft } from './connect-fields';
import { CONSENT_TEXT, ConsentList } from './connect-join';

/**
 * Onboarding step: an optional, explicit opt-in to Connect. Nothing is shared unless the box is
 * ticked, and the profile is only created when the brief is submitted.
 */
export function ConnectOptIn({
  enabled,
  onEnabled,
  draft,
  onDraft,
  step,
}: {
  enabled: boolean;
  onEnabled: (on: boolean) => void;
  draft: ConnectDraft;
  onDraft: (next: ConnectDraft) => void;
  step: string;
}) {
  const { t, locale } = useLanguage();
  const identity = useConnectIdentity();
  return (
    <section className="simple-section" aria-labelledby="connect-optin-title">
      <div className="simple-section-heading">
        <span>{step}</span>
        <div>
          <h2 id="connect-optin-title">
            {t('Meet other owners (optional)', 'Conoce a otros dueños (opcional)')}
          </h2>
          <p>
            {t(
              'Swap what worked with other small businesses. It’s your choice.',
              'Intercambia lo que funcionó con otros pequeños negocios. Es tu decisión.',
            )}
          </p>
        </div>
      </div>
      <div className="brand-ui grid gap-4">
        {identity ? (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#cfe6d5] bg-[#f3faf5] px-4 py-3 text-sm font-semibold text-[#1a5c2c]">
            <Check className="h-4 w-4" aria-hidden="true" />
            {t('You’re already in Connect.', 'Ya estás en Connect.')}
            <Link href="/connect/me" className="underline">
              {t('Manage your profile', 'Administrar tu perfil')}
            </Link>
          </p>
        ) : (
          <>
            <ConsentList />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e2e2df] bg-[#fafaf8] p-4 text-sm leading-6 text-[#222]">
              <input
                type="checkbox"
                name="connect-consent"
                checked={enabled}
                onChange={(e) => onEnabled(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#e21833]"
              />
              <span>{CONSENT_TEXT[locale]}</span>
            </label>
            {enabled && (
              <div className="rise rounded-2xl border border-[#e2e2df] bg-white p-4">
                <p className="mb-4 text-sm font-semibold text-[#222]">
                  {t('What others will see', 'Lo que verán los demás')}
                </p>
                <ConnectFields
                  value={draft}
                  onChange={onDraft}
                  showWins={false}
                  showCategory={false}
                />
                <p className="mt-4 text-xs leading-5 text-[#666]">
                  {t(
                    'Your business type comes from your answers above. You can add notes about tools that worked later, in Connect.',
                    'Tu tipo de negocio sale de tus respuestas de arriba. Más adelante puedes agregar notas sobre herramientas que te funcionaron, en Connect.',
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
