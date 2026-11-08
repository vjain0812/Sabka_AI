'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { signIn, signOut, signUp, useJourney } from '@/lib/client/journey';
import { useLanguage } from '@/lib/client/language';

/** Sign in / create account for business owners. */
export function AccountPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const journey = useJourney();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'sign_up') {
        const status = await signUp(email, password);
        if (status === 'confirm_email') {
          setNotice(
            t(
              'Check your email to confirm your account, then sign in here.',
              'Revisa tu correo para confirmar tu cuenta y luego inicia sesión aquí.',
            ),
          );
          setMode('sign_in');
          return;
        }
      } else await signIn(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const heading = (
    <header className="simple-page-heading">
      <p className="easy-eyebrow">{t('YOUR ACCOUNT', 'TU CUENTA')}</p>
      <h1>
        {journey.account
          ? t('You’re signed in.', 'Ya iniciaste sesión.')
          : mode === 'sign_in'
          ? t('Welcome back.', 'Bienvenido de nuevo.')
          : t('Create your free account.', 'Crea tu cuenta gratis.')}
      </h1>
      <p>
        {t(
          'Keep each of your businesses, the tools you saved and how they’re going, on any device.',
          'Guarda cada uno de tus negocios, las herramientas que elegiste y cómo te va, en cualquier dispositivo.',
        )}
      </p>
    </header>
  );

  if (!journey.checked)
    return <p role="status">{t('Checking your session…', 'Revisando tu sesión…')}</p>;
  if (!journey.accountsAvailable)
    return (
      <div className="simple-results">
        {heading}
        <p className="brand-ui rounded-[22px] border border-[#e2e2df] bg-white p-6">
          {t(
            'Accounts aren’t set up on this server yet. You can still use SABKA without one.',
            'Las cuentas aún no están configuradas en este servidor. Puedes usar SABKA sin cuenta.',
          )}
        </p>
      </div>
    );
  if (journey.account)
    return (
      <div className="simple-results">
        {heading}
        <section className="brand-ui rounded-[22px] border border-[#e2e2df] bg-white p-6">
          <p>
            {t('Signed in as', 'Sesión iniciada como')} <strong>{journey.account.email}</strong> ·{' '}
            {journey.account.businesses.length} {t('business(es)', 'negocio(s)')}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black"
            >
              {t('Open My AI Journey', 'Abrir Mi recorrido IA')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => void signOut().then(() => router.push('/'))}
              className="rounded-full border border-[#d8d8d8] px-5 py-3 text-sm font-semibold"
            >
              {t('Sign out', 'Cerrar sesión')}
            </button>
          </div>
        </section>
      </div>
    );

  return (
    <div className="simple-results">
      {heading}
      <section className="brand-ui mx-auto w-full max-w-[460px] rounded-[24px] border border-[#e2e2df] bg-white p-6">
        <div
          role="tablist"
          aria-label={t('Account', 'Cuenta')}
          className="grid grid-cols-2 gap-1 rounded-full bg-[#f1f1ef] p-1"
        >
          {(
            [
              ['sign_in', t('Sign in', 'Iniciar sesión')],
              ['sign_up', t('Create account', 'Crear cuenta')],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-full px-3 py-2 text-sm font-bold ${
                mode === m ? 'bg-[#111] text-[#ffd200]' : 'text-[#333]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold">
            {t('Email', 'Correo electrónico')}
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-[#d8d8d8] px-3 py-2.5 text-base font-normal"
            />
          </label>
          <label className="block text-sm font-semibold">
            {t('Password', 'Contraseña')}
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === 'sign_up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-[#d8d8d8] px-3 py-2.5 text-base font-normal"
            />
            {mode === 'sign_up' && (
              <span className="mt-1 block text-xs font-normal text-[#555]">
                {t('At least 8 characters.', 'Al menos 8 caracteres.')}
              </span>
            )}
          </label>
          {mode === 'sign_up' && (
            <p className="flex items-start gap-2 rounded-xl bg-[#f6f6f3] p-3 text-xs leading-5 text-[#333]">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t(
                'We keep your email, your businesses’ details (type, the problems you describe, limits, optional name), the tools you save and your feedback. Your accessibility answers stay on your device. You can delete any business at any time.',
                'Guardamos tu correo, los datos de tus negocios (tipo, problemas que describes, límites, nombre opcional), las herramientas que guardes y tus opiniones. Tus respuestas de accesibilidad se quedan en tu dispositivo. Puedes borrar cualquier negocio cuando quieras.',
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-semibold text-[#9a3632]">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-[#eef7ee] p-3 text-sm text-[#14401b]">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#ffd200] px-5 py-3 text-sm font-bold text-black disabled:opacity-60"
          >
            {busy
              ? t('Please wait…', 'Un momento…')
              : mode === 'sign_in'
              ? t('Sign in', 'Iniciar sesión')
              : t('Create account', 'Crear cuenta')}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-[#555]">
          {t('Just looking?', '¿Solo estás mirando?')}{' '}
          <Link href="/business" className="font-semibold underline underline-offset-2">
            {t('Try SABKA without an account', 'Prueba SABKA sin cuenta')}
          </Link>
        </p>
      </section>
    </div>
  );
}
