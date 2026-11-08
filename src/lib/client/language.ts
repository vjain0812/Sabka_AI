'use client';
import { useCallback, useSyncExternalStore } from 'react';

export type Language = 'en' | 'es';
let language: Language = 'en';
let hydrated = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    try {
      language = sessionStorage.getItem('sabka-ai:language') === 'es' ? 'es' : 'en';
    } catch {
      /* In-memory language still works. */
    }
    listeners.forEach((fn) => fn());
  }
  return () => {
    listeners.delete(listener);
  };
}
export function setLanguage(next: Language) {
  language = next;
  try {
    sessionStorage.setItem('sabka-ai:language', next);
  } catch {
    /* Keep selection in memory. */
  }
  listeners.forEach((fn) => fn());
}
export function useLanguage() {
  const locale = useSyncExternalStore(
    subscribe,
    () => language,
    () => 'en' as Language,
  );
  // Stable per language so it is safe to list in hook dependency arrays.
  const t = useCallback((en: string, es: string) => (locale === 'es' ? es : en), [locale]);
  return { locale, t };
}
