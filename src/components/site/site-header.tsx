'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandLogo } from './brand-logo';
import { DisplayMenu } from '../accessibility/display-menu';
import { AccountMenu } from '../account/account-menu';
import { findToolsTarget, useHasBusiness } from '@/lib/client/has-business';
import { setLanguage, useLanguage } from '@/lib/client/language';

/** One navigation model for every page, matching the home page header. */
const links = [
  {
    href: '/#finder',
    label: 'Find tools',
    es: 'Buscar herramientas',
    match: (p: string) => p === '/business',
  },
  {
    href: '/workflows',
    label: 'Workflows',
    es: 'Flujos',
    match: (p: string) => p.startsWith('/workflows'),
  },
  {
    href: '/connect',
    label: 'Connect',
    es: 'Conectar',
    match: (p: string) => p.startsWith('/connect'),
  },
  {
    href: '/dashboard',
    label: 'My AI Journey',
    es: 'Mi recorrido IA',
    match: (p: string) => p.startsWith('/dashboard'),
  },
  {
    href: '/discover',
    label: 'Browse stack',
    es: 'Explorar herramientas',
    match: (p: string) => p.startsWith('/discover') || p.startsWith('/tools'),
  },
];

export function SiteHeader({ showLanguage = false }: { showLanguage?: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { locale, t } = useLanguage();
  const hasBusiness = useHasBusiness();
  // "Find tools": new visitors describe their business first; known businesses go to the problem box.
  const findHref = hasBusiness ? '/#finder' : '/business';
  const router = useRouter();
  /** Decide on click, after the session check, so a stale render never sends people the wrong way. */
  async function goFind(event: React.MouseEvent) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    setOpen(false);
    if ((await findToolsTarget()) === 'business') return router.push('/business');
    if (path === '/') document.getElementById('finder')?.scrollIntoView({ behavior: 'smooth' });
    else router.push('/#finder');
  }
  return (
    <header className="brand-ui sticky top-0 z-40 border-b border-white/10 bg-[#090909]/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-3 px-4 xl:px-6">
        <Link
          href="/"
          aria-label="SABKA AI home"
          className="shrink-0 transition-opacity hover:opacity-90"
        >
          <BrandLogo height={60} />
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 whitespace-nowrap text-sm font-medium text-white/65 xl:flex"
        >
          {links.map((link) => {
            const active = link.match(path);
            return (
              <Link
                key={link.href}
                href={link.href === '/#finder' ? findHref : link.href}
                onClick={link.href === '/#finder' ? goFind : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-full px-3 py-2 transition-colors hover:text-white ${
                  active ? 'bg-white/10 text-white' : ''
                }`}
              >
                {t(link.label, link.es)}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[17px] h-[2px] rounded-full bg-[#ffd200]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <DisplayMenu />
          <AccountMenu />
          {showLanguage && (
            <div
              role="group"
              aria-label="Language / Idioma"
              className="flex items-center rounded-full border border-white/15 p-0.5 text-xs font-bold"
            >
              {(['en', 'es'] as const).map((code) => (
                <button
                  key={code}
                  lang={code}
                  aria-pressed={locale === code}
                  onClick={() => setLanguage(code)}
                  className={`rounded-full px-2.5 py-1.5 ${
                    locale === code ? 'bg-[#ffd200] text-black' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {code.toUpperCase()}
                  <span className="sr-only">{code === 'en' ? ' English' : ' Español'}</span>
                </button>
              ))}
            </div>
          )}
          <div className="hidden items-center gap-2 whitespace-nowrap 2xl:flex">
            <Link
              href="/business"
              className="group flex items-center gap-2 rounded-full bg-[#ffd200] px-5 py-2.5 text-sm font-bold text-black shadow-[0_4px_18px_rgba(255,210,0,.18)] transition-transform hover:-translate-y-0.5"
            >
              {t('Get recommendations', 'Ver recomendaciones')}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2 xl:hidden"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="site-mobile-nav"
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <div
          id="site-mobile-nav"
          className="border-t border-white/10 bg-[#090909] px-5 py-5 xl:hidden"
        >
          <nav aria-label="Main" className="flex flex-col gap-1 text-sm font-semibold">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href === '/#finder' ? findHref : link.href}
                onClick={link.href === '/#finder' ? goFind : () => setOpen(false)}
                aria-current={link.match(path) ? 'page' : undefined}
                className={`rounded-xl px-3 py-3 ${
                  link.match(path) ? 'bg-white/10 text-[#ffd200]' : ''
                }`}
              >
                {t(link.label, link.es)}
              </Link>
            ))}
            <Link
              href="/business"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full bg-[#ffd200] px-5 py-3 font-bold text-black"
            >
              {t('Get recommendations', 'Ver recomendaciones')}{' '}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter({ note }: { note?: string }) {
  const { t } = useLanguage();
  return (
    <footer className="brand-ui bg-[#080808] px-5 py-8 text-white/55">
      <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-4 text-xs sm:flex-row">
        <BrandLogo height={46} />
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-5">
          <Link href="/welcome" className="hover:text-white">
            {t('New to AI? Start here.', '¿Nuevo en la IA? Empieza aquí.')}
          </Link>
          <Link href="/workflows" className="hover:text-white">
            {t('Workflows', 'Flujos')}
          </Link>
          <Link href="/connect" className="hover:text-white">
            {t('Connect', 'Conectar')}
          </Link>
          <Link href="/discover" className="hover:text-white">
            {t('Browse stack', 'Explorar herramientas')}
          </Link>
          <Link href="/hub" className="hover:text-white">
            {t('Build status', 'Estado del proyecto')}
          </Link>
        </nav>
        <p>
          {note ??
            t(
              'Human decisions. Helpful technology. © 2026 SABKA AI',
              'Decisiones humanas. Tecnología útil. © 2026 SABKA AI',
            )}
        </p>
      </div>
    </footer>
  );
}
