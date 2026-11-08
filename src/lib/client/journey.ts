'use client';
import { useSyncExternalStore } from 'react';
import {
  briefFromGoal,
  goalFromBrief,
  sameGoal,
  type AccountBusiness,
  type GoalBrief,
  type JourneyAction,
  type JourneyView,
} from '@/lib/domain/journey';
import { emptyBrief, type BusinessBrief } from '@/lib/domain/brief';
import { workspace } from './workspace';

/**
 * My AI Journey on the client, signed in or not.
 *  - Signed out: one journey per device, opened with a private key kept in localStorage.
 *  - Signed in: the account holds several businesses (one journey each); the session cookie
 *    proves ownership and the selected business is remembered on this device.
 * A journey started before signing in is moved into the account on sign-in.
 */
export type JourneyIdentity = { id: string; key: string | null };
export type Account = { email: string; businesses: AccountBusiness[] };
type State = {
  identity: JourneyIdentity | null;
  status: 'none' | 'loading' | 'ready' | 'error';
  view: JourneyView | null;
  error: string | null;
  /** null when signed out. */
  account: Account | null;
  accountsAvailable: boolean;
  /** True once the session has been checked at least once. */
  checked: boolean;
};
const DEVICE = 'sabka-ai:v1:journey';
const CURRENT = 'sabka-ai:v1:current-business';
/** Stored as CURRENT while the owner is setting up a new business (survives page reloads). */
const NEW_BUSINESS = 'new';
/** 'loading' until storage and the session have been read, so nothing flashes an empty state. */
const initial: State = {
  identity: null,
  status: 'loading',
  view: null,
  error: null,
  account: null,
  accountsAvailable: false,
  checked: false,
};
let state: State = initial;
let hydrated = false;
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};
const store = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  put(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* Works for this page view only. */
    }
  },
};
function deviceIdentity(): { id: string; key: string } | null {
  try {
    const raw = JSON.parse(store.get(DEVICE) ?? 'null');
    return raw && typeof raw.id === 'string' && typeof raw.key === 'string' ? raw : null;
  } catch {
    return null;
  }
}

export class JourneyError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(url: string, init: RequestInit = {}, who?: JourneyIdentity | null) {
  const headers: Record<string, string> = init.body ? { 'Content-Type': 'application/json' } : {};
  if (who) headers['x-journey-id'] = who.id;
  if (who?.key) headers['x-journey-key'] = who.key;
  const res = await fetch(url, { ...init, headers, cache: 'no-store' });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok)
    throw new JourneyError(data.error ?? 'Something went wrong. Please try again.', res.status);
  return data;
}
const call = <T>(path: string, init: RequestInit = {}, who?: JourneyIdentity | null) =>
  request<T>(`/api/journey${path}`, init, who);
const post = <T>(body: unknown) =>
  request<T>('/api/account', { method: 'POST', body: JSON.stringify(body) });

/* ---------------- Session & businesses ---------------- */
type AccountResponse = {
  available: boolean;
  signedIn: boolean;
  email?: string;
  businesses?: AccountBusiness[];
};
/** Read the session, move any device journey into the account, and pick the current business. */
async function syncAccount() {
  let res: AccountResponse;
  try {
    res = await request<AccountResponse>('/api/account');
  } catch {
    res = { available: false, signedIn: false };
  }
  if (!res.signedIn) {
    const device = deviceIdentity();
    set({ accountsAvailable: res.available, account: null, identity: device, checked: true });
    if (device) await loadJourney();
    else set({ status: 'none', view: null });
    return;
  }
  let businesses = res.businesses ?? [];
  const device = deviceIdentity();
  if (device && !businesses.some((b) => b.id === device.id)) {
    const claimed = await post<{ ok: boolean }>({ action: 'claim', ...device }).catch(() => null);
    if (claimed?.ok) {
      businesses = (await request<AccountResponse>('/api/account')).businesses ?? businesses;
      store.put(CURRENT, device.id);
    }
  }
  // The account now owns it; the device key is no longer needed here.
  store.put(DEVICE, null);
  const saved = store.get(CURRENT);
  const current =
    saved === NEW_BUSINESS
      ? null
      : businesses.find((b) => b.id === saved) ?? businesses[0] ?? null;
  set({
    accountsAvailable: true,
    checked: true,
    account: { email: res.email ?? '', businesses },
    identity: current ? { id: current.id, key: null } : null,
  });
  if (current) await loadJourney();
  else set({ status: 'none', view: null });
}
function hydrate() {
  hydrated = true;
  void syncAccount();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) hydrate();
  return () => {
    listeners.delete(listener);
  };
}
/** The journey state once the session has been checked (starts the check if nothing has yet). */
export function journeyWhenChecked(): Promise<State> {
  if (!hydrated) hydrate();
  if (state.checked) return Promise.resolve(state);
  return new Promise((resolve) => {
    const listener = () => {
      if (!state.checked) return;
      listeners.delete(listener);
      resolve(state);
    };
    listeners.add(listener);
  });
}
export function useJourney() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}

export async function signUp(email: string, password: string) {
  const res = await post<{ status: 'signed_in' | 'confirm_email' }>({
    action: 'sign_up',
    email,
    password,
  });
  if (res.status === 'signed_in') await syncAccount();
  return res.status;
}
export async function signIn(email: string, password: string) {
  await post({ action: 'sign_in', email, password });
  await syncAccount();
  syncBriefFromJourney();
}
/** Sign out and clear this tab's brief, so the next person on the device starts fresh. */
export async function signOut() {
  await post({ action: 'sign_out' });
  store.put(CURRENT, null);
  workspace.reset();
  set({ ...initial, status: 'none', accountsAvailable: true, checked: true });
}
/** Switch to another business in the account and load its details into the form. */
export async function selectBusiness(id: string) {
  store.put(CURRENT, id);
  set({ identity: { id, key: null }, view: null, status: 'loading', error: null });
  await loadJourney();
  syncBriefFromJourney();
}
/** Start a new business: empty form, no journey until its first saved tool. */
export function addBusiness() {
  store.put(CURRENT, NEW_BUSINESS);
  const access = workspace.getBrief()?.profile.access ?? [];
  workspace.reset();
  workspace.startGuest();
  const fresh = emptyBrief();
  workspace.update({ ...fresh, profile: { ...fresh.profile, access } });
  set({ identity: null, view: null, status: 'none', error: null });
}
/** Put the current business's latest goal into this tab's brief (keeps accessibility answers). */
function syncBriefFromJourney() {
  const goals = state.view?.journey.goals;
  const latest = goals?.[goals.length - 1];
  if (!latest) return;
  if (!workspace.getBrief()) workspace.startGuest();
  workspace.update(briefFromGoal(latest.brief, workspace.getBrief() ?? emptyBrief()));
}
async function refreshBusinesses() {
  if (!state.account) return;
  const res = await request<AccountResponse>('/api/account').catch(() => null);
  if (res?.signedIn) set({ account: { email: res.email ?? '', businesses: res.businesses ?? [] } });
}

/* ---------------- Journey ---------------- */
export async function loadJourney() {
  const who = state.identity;
  if (!who) return;
  set({ status: state.view ? 'ready' : 'loading', error: null });
  try {
    set({ status: 'ready', view: await call<JourneyView>('', {}, who) });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
  }
}

/** Apply one change; the server answers with the whole updated journey. */
export async function act(action: JourneyAction) {
  const who = state.identity;
  if (!who) throw new JourneyError('Start your journey first.', 401);
  const res = await call<JourneyView & { goalId: string | null }>(
    '/actions',
    { method: 'POST', body: JSON.stringify(action) },
    who,
  );
  const { goalId, ...view } = res;
  set({ status: 'ready', view, error: null });
  if (action.type === 'save' || action.type === 'remove') void refreshBusinesses();
  return goalId;
}

/** Find (or add) the goal matching this brief's problem, starting a journey if needed. */
async function goalIdFor(goal: GoalBrief): Promise<string> {
  if (!state.identity) {
    // Signed in: the session cookie attaches the new journey to the account.
    const created = await call<{ id: string; key: string; goalId: string }>('', {
      method: 'POST',
      body: JSON.stringify({ consent: true, goal }),
    });
    if (state.account) {
      store.put(CURRENT, created.id);
      set({ identity: { id: created.id, key: null } });
    } else {
      store.put(DEVICE, JSON.stringify({ id: created.id, key: created.key }));
      set({ identity: { id: created.id, key: created.key } });
    }
    await loadJourney();
    void refreshBusinesses();
    return created.goalId;
  }
  if (!state.view) await loadJourney();
  const existing = state.view?.journey.goals.find((g) => sameGoal(g.brief, goal));
  if (existing) return existing.id;
  const id = await act({ type: 'add_goal', goal });
  if (!id) throw new JourneyError('Could not add this goal.', 500);
  return id;
}
/** Save a recommended tool against the problem the owner described. */
export async function saveTool(slug: string, brief: BusinessBrief) {
  const goalId = await goalIdFor(goalFromBrief(brief));
  await act({ type: 'save', slug, goalId });
}

/** Delete the current journey (signed in: just this business). */
export async function deleteJourney() {
  const id = state.identity?.id;
  await call('', { method: 'DELETE', body: '{}' }, state.identity);
  if (state.account && id) {
    const rest = state.account.businesses.filter((b) => b.id !== id);
    set({ account: { ...state.account, businesses: rest } });
    if (rest[0]) return selectBusiness(rest[0].id);
    store.put(CURRENT, null);
    set({ identity: null, view: null, status: 'none' });
    return;
  }
  forgetJourney();
}
/** Remove the device key only. The journey stays reachable via its private link. */
export function forgetJourney() {
  store.put(DEVICE, null);
  set({ identity: null, view: null, status: 'none', error: null });
}

/** `#journey=<id>.<key>` links open the same journey on another device. */
export function journeyLink(identity: JourneyIdentity | null) {
  return identity?.key ? `${location.origin}/dashboard#journey=${identity.id}.${identity.key}` : '';
}
export function restoreFromLink(text: string) {
  const m = text.match(/#journey=([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})/);
  if (!m) return false;
  store.put(DEVICE, JSON.stringify({ id: m[1], key: m[2] }));
  // Signed in: the next sync moves it into the account. Signed out: open it directly.
  set({ view: null, status: 'loading', error: null });
  void syncAccount();
  return true;
}
