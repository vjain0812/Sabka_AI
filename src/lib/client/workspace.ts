'use client';

import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { businessBriefSchema, emptyBrief, type BusinessBrief } from '@/lib/domain/brief';
import { decodeSession, type SavedSession } from '@/lib/domain/session';
import { demoProfiles, type DemoId } from '@/lib/fixtures/businesses';

type Preferences = { focus: boolean; largeText: boolean; spacing: boolean; reducedMotion: boolean };
type Workspace = {
  ready: boolean;
  mode: 'guest' | 'demo';
  session: SavedSession | null;
  preferences: Preferences;
  storageError: string | null;
};
const defaults: Preferences = {
  focus: false,
  largeText: false,
  spacing: false,
  reducedMotion: false,
};
const initial: Workspace = {
  ready: false,
  mode: 'guest',
  session: null,
  preferences: defaults,
  storageError: null,
};
let state = initial;
const listeners = new Set<() => void>();
const prefix = 'sabka-ai:v1:';
function emit() {
  listeners.forEach((listener) => listener());
}
function read(key: string) {
  return window.sessionStorage.getItem(prefix + key);
}
function write(key: string, value: string) {
  window.sessionStorage.setItem(prefix + key, value);
}
function hydrate() {
  try {
    const mode = read('mode') === 'demo' ? 'demo' : 'guest';
    const decoded = decodeSession(read(mode));
    if (decoded.error) window.sessionStorage.removeItem(prefix + mode);
    const pref = z
      .object({
        focus: z.boolean(),
        largeText: z.boolean(),
        spacing: z.boolean(),
        reducedMotion: z.boolean(),
      })
      .safeParse(JSON.parse(read('preferences') ?? '{}'));
    state = {
      ready: true,
      mode,
      session: decoded.session,
      preferences: pref.success ? pref.data : defaults,
      storageError: decoded.error,
    };
  } catch {
    state = {
      ...initial,
      ready: true,
      storageError:
        'Browser storage is unavailable. You can continue, but changes will last only until this page reloads.',
    };
  }
  emit();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!state.ready) hydrate();
  return () => {
    listeners.delete(listener);
  };
}
function commit(session: SavedSession | null, mode = state.mode) {
  state = { ...state, session, mode };
  try {
    write('mode', mode);
    if (session) write(mode, JSON.stringify(session));
    else window.sessionStorage.removeItem(prefix + mode);
    state = { ...state, storageError: null };
  } catch {
    state = {
      ...state,
      storageError:
        'Your browser could not save this change. Keep this page open; reloading may lose your progress.',
    };
  }
  emit();
}
export const workspace = {
  getBrief() {
    return state.session?.brief ?? null;
  },
  startGuest() {
    let previous: SavedSession | null = state.mode === 'guest' ? state.session : null;
    try {
      previous = decodeSession(read('guest')).session;
    } catch {
      /* In-memory fallback remains usable. */
    }
    commit(
      previous ?? {
        version: 1,
        brief: emptyBrief(),
        step: 0,
        confirmedAt: null,
        matchingConsent: false,
        updatedAt: Date.now(),
        demoId: null,
      },
      'guest',
    );
  },
  startDemo(id: DemoId) {
    commit(
      {
        version: 1,
        brief: structuredClone(demoProfiles[id]),
        step: 4,
        confirmedAt: null,
        matchingConsent: false,
        updatedAt: Date.now(),
        demoId: id,
      },
      'demo',
    );
  },
  update(brief: BusinessBrief) {
    if (!state.session) return;
    commit({
      ...state.session,
      brief,
      confirmedAt: null,
      matchingConsent: false,
      updatedAt: Date.now(),
    });
  },
  step(step: number) {
    if (state.session) commit({ ...state.session, step, updatedAt: Date.now() });
  },
  confirm(matchingConsent = false) {
    if (!state.session) return false;
    const parsed = businessBriefSchema.safeParse(state.session.brief);
    if (!parsed.success) return false;
    commit({
      ...state.session,
      brief: parsed.data,
      confirmedAt: new Date().toISOString(),
      matchingConsent,
      updatedAt: Date.now(),
    });
    return true;
  },
  reset() {
    commit(null);
  },
  preferences(preferences: Preferences) {
    state = { ...state, preferences };
    try {
      write('preferences', JSON.stringify(preferences));
    } catch {
      state = {
        ...state,
        storageError: 'Display preferences could not be saved. They still apply to this page.',
      };
    }
    emit();
  },
};
export function useWorkspace() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}
