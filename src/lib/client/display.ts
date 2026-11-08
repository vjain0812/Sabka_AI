'use client';
import { useSyncExternalStore } from 'react';
import { DISPLAY_KEY as KEY } from '@/lib/display-boot';

/**
 * Display preferences for this device (localStorage), applied as data attributes on <html>.
 * A tiny inline script in the root layout applies them before first paint (see display-boot.ts).
 */
export type Display = {
  largeText: boolean;
  highContrast: boolean;
  calmMotion: boolean;
  readAloud: boolean;
};
const defaults: Display = {
  largeText: false,
  highContrast: false,
  calmMotion: false,
  readAloud: false,
};
let current: Display = defaults;
let hydrated = false;
const listeners = new Set<() => void>();

function apply(d: Display) {
  const root = document.documentElement;
  root.dataset.text = d.largeText ? 'large' : 'normal';
  root.dataset.contrast = d.highContrast ? 'high' : 'normal';
  root.dataset.motion = d.calmMotion ? 'reduce' : 'normal';
}
function hydrate() {
  hydrated = true;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as Partial<Display>;
    current = {
      largeText: raw.largeText === true,
      highContrast: raw.highContrast === true,
      calmMotion: raw.calmMotion === true,
      readAloud: raw.readAloud === true,
    };
  } catch {
    current = defaults;
  }
  apply(current);
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrate();
    listeners.forEach((fn) => fn());
  }
  return () => {
    listeners.delete(listener);
  };
}
export function setDisplay(patch: Partial<Display>) {
  current = { ...current, ...patch };
  apply(current);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* Still applies for this page view. */
  }
  listeners.forEach((fn) => fn());
}
export function useDisplay() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => defaults,
  );
}
