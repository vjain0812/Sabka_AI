'use client';
import { useLanguage } from '@/lib/client/language';

/** Inline translation for server-rendered pages: <T en="Hello" es="Hola" />. */
export function T({ en, es }: { en: string; es: string }) {
  const { t } = useLanguage();
  return <>{t(en, es)}</>;
}
