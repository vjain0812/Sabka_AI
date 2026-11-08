'use client';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, LogOut, Plus, Store, UserRound } from 'lucide-react';
import { addBusiness, selectBusiness, signOut, useJourney } from '@/lib/client/journey';
import { useLanguage } from '@/lib/client/language';
import { businessLabel } from '@/lib/domain/journey';

/** Header control: "Sign in" when signed out; business switcher and sign-out when signed in. */
export function AccountMenu() {
  const { t } = useLanguage();
  const router = useRouter();
  const journey = useJourney();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!journey.checked || !journey.accountsAvailable) return null;
  if (!journey.account)
    return (
      <Link
        href="/account"
        className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/85 hover:text-white"
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('Sign in', 'Iniciar sesión')}</span>
        <span className="sr-only sm:hidden">{t('Sign in', 'Iniciar sesión')}</span>
      </Link>
    );

  const { businesses, email } = journey.account;
  const currentId = journey.identity?.id ?? null;
  const current = businesses.find((b) => b.id === currentId);
  const label = current
    ? businessLabel(current.profile, t('My business', 'Mi negocio'))
    : t('New business', 'Nuevo negocio');
  async function run(fn: () => Promise<unknown> | void, go?: string) {
    setBusy(true);
    try {
      await fn();
      setOpen(false);
      if (go) router.push(go);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex max-w-[180px] items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15"
      >
        <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden truncate sm:inline">{label}</span>
        <span className="sr-only sm:hidden">
          {t('Account and businesses', 'Cuenta y negocios')}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(300px,calc(100vw-32px))] rounded-2xl border border-[#e2e2df] bg-white p-3 text-[#111] shadow-[0_18px_48px_rgba(0,0,0,.25)]"
        >
          <p className="px-2 pb-2 text-xs text-[#555]">
            {t('Signed in as', 'Sesión iniciada como')}{' '}
            <strong className="text-[#111]">{email}</strong>
          </p>
          <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[.12em] text-[#c41230]">
            {t('Your businesses', 'Tus negocios')}
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {businesses.map((b) => {
              const active = b.id === currentId;
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => void run(() => selectBusiness(b.id), '/dashboard')}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left text-sm hover:bg-[#f6f6f3] ${
                      active ? 'font-bold' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        {businessLabel(b.profile, t('My business', 'Mi negocio'))}
                      </span>
                      <span className="block text-xs font-normal text-[#555]">
                        {b.profile?.category} · {b.toolCount} {t('saved', 'guardadas')}
                      </span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
            {!businesses.length && (
              <li className="px-2 py-2 text-sm text-[#555]">
                {t('No businesses yet.', 'Aún no hay negocios.')}
              </li>
            )}
          </ul>
          <div className="mt-2 space-y-1 border-t border-[#ececec] pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(addBusiness, '/business')}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-[#f6f6f3]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('Add another business', 'Agregar otro negocio')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(signOut, '/')}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold hover:bg-[#f6f6f3]"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t('Sign out', 'Cerrar sesión')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
