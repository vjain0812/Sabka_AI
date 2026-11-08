'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useWorkspace, workspace } from '@/lib/client/workspace';
import { useLanguage } from '@/lib/client/language';
import { SiteFooter, SiteHeader } from './site/site-header';

/** Pages built entirely with the home page's Tailwind design; they render edge to edge. */
const fullBleed = (path: string) =>
  path === '/' ||
  path.startsWith('/discover') ||
  path.startsWith('/workflows') ||
  path.startsWith('/tools') ||
  path.startsWith('/connect');
/** Pages with English/Spanish copy. */
const bilingual = ['/welcome', '/business', '/recommendations', '/dashboard', '/account'];

type NavItem = { href: string; label: string; planned?: boolean };
const journey: NavItem[] = [
  { href: '/workflows', label: 'Pick a workflow' },
  { href: '/business', label: 'Your business' },
  { href: '/recommendations', label: 'Your options' },
  { href: '/dashboard', label: 'My AI Journey' },
  { href: '/connect', label: 'Connect' },
];
const workspaceLinks: NavItem[] = [
  { href: '/onboarding', label: 'Detailed brief' },
  { href: '/readiness', label: 'Readiness' },
  { href: '/discover', label: 'Browse stack' },
  { href: '/compare', label: 'Compare', planned: true },
  { href: '/dashboard', label: 'My AI Journey' },
  { href: '/hub', label: 'Business hub' },
];

function StepBar({ path }: { path: string }) {
  const { t } = useLanguage();
  const isJourney = ['/business', '/recommendations', '/welcome', '/dashboard'].includes(path);
  const items = isJourney ? journey : workspaceLinks;
  return (
    <div className="brand-ui border-b border-[#e2e2df] bg-white/80 backdrop-blur">
      <nav
        aria-label={isJourney ? t('Your journey', 'Tu recorrido') : 'Your workspace'}
        className="mx-auto flex max-w-[1240px] items-center gap-2 overflow-x-auto px-5 py-3 lg:px-8"
      >
        {items.map((item, index) => {
          const active = item.href === path;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? 'border-black bg-black text-white'
                  : 'border-[#e0e0dc] bg-white text-[#555] hover:border-[#e21833] hover:text-black'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? 'bg-[#ffd200] text-black' : 'bg-[#f1f1ef] text-[#666]'
                }`}
              >
                {index + 1}
              </span>
              {isJourney
                ? t(
                    item.label,
                    (
                      {
                        'Pick a workflow': 'Elige un flujo',
                        'Your business': 'Tu negocio',
                        'Your options': 'Tus opciones',
                        Connect: 'Conectar',
                        'My AI Journey': 'Mi recorrido IA',
                      } as Record<string, string>
                    )[item.label],
                  )
                : item.label}
              {item.planned && (
                <span className="rounded-full bg-[#fff4bf] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#5c4b00]">
                  {t('Planned', 'Próximamente')}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { locale, t } = useLanguage();
  const state = useWorkspace();
  const wide = fullBleed(path);
  const simple = bilingual.includes(path);
  const showSteps = !wide && !path.startsWith('/tools') && path !== '/account';
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return (
    <div className={`app ${simple ? 'simple-shell' : ''}`}>
      <a className="skip-link" href="#main-content">
        {t('Skip to content', 'Saltar al contenido')}
      </a>
      <SiteHeader showLanguage />
      {showSteps && <StepBar path={path} />}
      {state.mode === 'demo' && (
        <div className="demo-banner">
          <span>
            <strong>Fictional example.</strong> This is sample business information, not a real
            customer or result.
          </span>
          <button className="text-button" onClick={() => workspace.startGuest()}>
            Return to my brief
          </button>
        </div>
      )}
      {state.storageError && (
        <div role="alert" className="storage-banner">
          {state.storageError}
        </div>
      )}
      <main
        id="main-content"
        tabIndex={-1}
        className={wide ? 'brand-page' : 'workspace-main'}
        lang={locale}
      >
        {children}
      </main>
      <SiteFooter
        note={
          wide
            ? undefined
            : t(
                'No account needed. Your brief stays in this tab. Nothing is saved on our servers unless you save tools to My AI Journey or sign in.',
                'No necesitas cuenta. Tu información se queda en esta pestaña. No guardamos nada salvo que guardes herramientas en Mi recorrido IA o inicies sesión.',
              )
        }
      />
    </div>
  );
}
