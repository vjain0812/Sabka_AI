'use client';
import { useSyncExternalStore } from 'react';
import type {
  ConnectProfileInput,
  ConnectProfilePatch,
  InboxMessage,
  OwnProfile,
  PublicProfile,
} from '@/lib/domain/connect';

/**
 * Connect identity: the profile id plus a private key that proves ownership. It lives only in this
 * browser (localStorage) so an owner can return; our server stores just a hash of the key.
 */
export type Identity = { id: string; key: string } | null;
const STORAGE = 'sabka-ai:v1:connect';
let identity: Identity = null;
let hydrated = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
      if (raw && typeof raw.id === 'string' && typeof raw.key === 'string') identity = raw;
    } catch {
      /* Identity stays in memory for this page view. */
    }
    emit();
  }
  return () => {
    listeners.delete(listener);
  };
}
export function saveIdentity(next: Identity) {
  identity = next;
  try {
    if (next) localStorage.setItem(STORAGE, JSON.stringify(next));
    else localStorage.removeItem(STORAGE);
  } catch {
    /* Works for this page view only. */
  }
  emit();
}
export function useConnectIdentity() {
  return useSyncExternalStore(
    subscribe,
    () => identity,
    () => null,
  );
}
/** `#key=<id>.<key>` links restore an identity on another device. */
export function identityLink(id: Identity) {
  return id ? `${location.origin}/connect/me#key=${id.id}.${id.key}` : '';
}
export function readIdentityFromHash(): Identity {
  const m = location.hash.match(/^#key=([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/);
  return m ? { id: m[1], key: m[2] } : null;
}

export class ConnectError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function call<T>(path: string, init: RequestInit = {}, who?: Identity): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
  };
  if (who) {
    headers['x-connect-id'] = who.id;
    headers['x-connect-key'] = who.key;
  }
  const res = await fetch(`/api/connect${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok)
    throw new ConnectError(data.error ?? 'Something went wrong. Please try again.', res.status);
  return data;
}
const json = (body: unknown) => ({ body: JSON.stringify(body) });

export const connectApi = {
  list: () => call<{ mode: 'database' | 'preview'; profiles: PublicProfile[] }>('/profiles'),
  create: (input: ConnectProfileInput) =>
    call<{ id: string; key: string; mode: string }>('/profiles', {
      method: 'POST',
      ...json(input),
    }),
  me: (who: NonNullable<Identity>) => call<{ profile: OwnProfile }>(`/profiles/${who.id}`, {}, who),
  update: (who: NonNullable<Identity>, patch: ConnectProfilePatch) =>
    call<{ ok: true }>(`/profiles/${who.id}`, { method: 'PATCH', ...json(patch) }, who),
  remove: (who: NonNullable<Identity>) =>
    call<{ ok: true }>(`/profiles/${who.id}`, { method: 'DELETE', ...json({}) }, who),
  inbox: (who: NonNullable<Identity>) => call<{ messages: InboxMessage[] }>('/messages', {}, who),
  send: (who: NonNullable<Identity>, toId: string, body: string) =>
    call<{ ok: true }>('/messages', { method: 'POST', ...json({ toId, body }) }, who),
  markRead: (who: NonNullable<Identity>, otherId: string) =>
    call<{ ok: true }>('/messages', { method: 'PUT', ...json({ otherId }) }, who),
  report: (profileId: string, reason: string) =>
    call<{ ok: true }>('/reports', { method: 'POST', ...json({ profileId, reason }) }),
};
