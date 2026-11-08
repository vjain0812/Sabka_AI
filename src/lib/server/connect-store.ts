import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CONNECT_CONSENT_VERSION,
  type ConnectProfileInput,
  type ConnectProfilePatch,
  type InboxMessage,
  type OwnProfile,
  type PublicProfile,
} from '@/lib/domain/connect';
import { configurationStatus } from './config';
import { databaseClient } from './supabase';
import { AppError } from './http';

export type SendResult = 'ok' | 'forbidden' | 'not_found' | 'self' | 'rate_limited';
export type StoreMode = 'database' | 'preview';
export interface ConnectStore {
  mode: StoreMode;
  list(): Promise<PublicProfile[]>;
  create(input: ConnectProfileInput, tokenHash: string): Promise<string>;
  getOwn(id: string, tokenHash: string): Promise<OwnProfile | null>;
  update(id: string, tokenHash: string, patch: ConnectProfilePatch): Promise<boolean>;
  remove(id: string, tokenHash: string): Promise<boolean>;
  send(fromId: string, tokenHash: string, toId: string, body: string): Promise<SendResult>;
  inbox(id: string, tokenHash: string): Promise<InboxMessage[] | null>;
  markRead(id: string, tokenHash: string, otherId: string): Promise<boolean>;
  report(profileId: string, reason: string): Promise<boolean>;
}

/** The private key lives only on the owner's device; we keep its hash. */
export { hashKey, newKey, validKey } from './private-key';

/* ---------------- Supabase (production) ---------------- */
class DatabaseStore implements ConnectStore {
  mode = 'database' as const;
  private db = databaseClient();
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.db.rpc(fn, args);
    if (error) {
      if (/Consent required|Invalid key/.test(error.message))
        throw new AppError(400, 'INVALID_INPUT', 'Check the submitted fields and try again.');
      throw new AppError(503, 'CONNECT_UNAVAILABLE', 'Connect is temporarily unavailable.');
    }
    return data as T;
  }
  list = () => this.rpc<PublicProfile[]>('connect_list', {});
  create = (input: ConnectProfileInput, tokenHash: string) =>
    this.rpc<string>('connect_create_profile', {
      p: { ...input, consentVersion: CONNECT_CONSENT_VERSION },
      p_token_hash: tokenHash,
    });
  getOwn = (id: string, tokenHash: string) =>
    this.rpc<OwnProfile | null>('connect_get_own', { p_id: id, p_token_hash: tokenHash });
  update = (id: string, tokenHash: string, patch: ConnectProfilePatch) =>
    this.rpc<boolean>('connect_update_profile', { p_id: id, p_token_hash: tokenHash, p: patch });
  remove = (id: string, tokenHash: string) =>
    this.rpc<boolean>('connect_delete_profile', { p_id: id, p_token_hash: tokenHash });
  send = (fromId: string, tokenHash: string, toId: string, body: string) =>
    this.rpc<SendResult>('connect_send', {
      p_from: fromId,
      p_token_hash: tokenHash,
      p_to: toId,
      p_body: body,
    });
  inbox = (id: string, tokenHash: string) =>
    this.rpc<InboxMessage[] | null>('connect_inbox', { p_id: id, p_token_hash: tokenHash });
  markRead = (id: string, tokenHash: string, otherId: string) =>
    this.rpc<boolean>('connect_mark_read', { p_id: id, p_token_hash: tokenHash, p_other: otherId });
  report = (profileId: string, reason: string) =>
    this.rpc<boolean>('connect_report', { p_profile: profileId, p_reason: reason });
}

/* ---------------- Local preview file (development only) ---------------- */
type Row = {
  id: string;
  tokenHash: string;
  displayName: string;
  category: string;
  region: string;
  about: string;
  topics: PublicProfile['topics'];
  wins: PublicProfile['wins'];
  visible: boolean;
  consentVersion: string;
  consentedAt: string;
  createdAt: string;
};
type Msg = {
  id: string;
  fromId: string;
  toId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};
type Data = {
  profiles: Row[];
  messages: Msg[];
  reports: { id: string; profileId: string; reason: string; createdAt: string }[];
};

const publicOf = (r: Row): PublicProfile => ({
  id: r.id,
  displayName: r.displayName,
  category: r.category,
  region: r.region,
  about: r.about,
  topics: r.topics,
  wins: r.wins,
  createdAt: r.createdAt,
});
const day = 24 * 3600 * 1000;

export class PreviewStore implements ConnectStore {
  mode = 'preview' as const;
  private data: Data | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}
  private async load(): Promise<Data> {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await readFile(this.file, 'utf8')) as Data;
    } catch {
      this.data = { profiles: [], messages: [], reports: [] };
    }
    return this.data;
  }
  /** Serialize every operation so concurrent requests cannot interleave writes. */
  private run<T>(fn: (d: Data) => T | Promise<T>, write = false): Promise<T> {
    const next = this.queue.then(async () => {
      const d = await this.load();
      const result = await fn(d);
      if (write) {
        await mkdir(path.dirname(this.file), { recursive: true });
        const tmp = `${this.file}.${process.pid}.tmp`;
        await writeFile(tmp, JSON.stringify(d), 'utf8');
        await rename(tmp, this.file);
      }
      return result;
    });
    this.queue = next.catch(() => undefined);
    return next;
  }
  private owned = (d: Data, id: string, tokenHash: string) =>
    d.profiles.find((p) => p.id === id && p.tokenHash === tokenHash);

  list = () =>
    this.run((d) =>
      d.profiles
        .filter((p) => p.visible)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 200)
        .map(publicOf),
    );
  create = (input: ConnectProfileInput, tokenHash: string) =>
    this.run((d) => {
      const row: Row = {
        id: randomUUID(),
        tokenHash,
        displayName: input.displayName,
        category: input.category,
        region: input.region,
        about: input.about,
        topics: input.topics,
        wins: input.wins,
        visible: input.visible,
        consentVersion: CONNECT_CONSENT_VERSION,
        consentedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      d.profiles.push(row);
      return row.id;
    }, true);
  getOwn = (id: string, tokenHash: string) =>
    this.run((d) => {
      const r = this.owned(d, id, tokenHash);
      return r
        ? {
            ...publicOf(r),
            visible: r.visible,
            consentedAt: r.consentedAt,
            consentVersion: r.consentVersion,
          }
        : null;
    });
  update = (id: string, tokenHash: string, patch: ConnectProfilePatch) =>
    this.run((d) => {
      const r = this.owned(d, id, tokenHash);
      if (!r) return false;
      Object.assign(r, patch);
      return true;
    }, true);
  remove = (id: string, tokenHash: string) =>
    this.run((d) => {
      if (!this.owned(d, id, tokenHash)) return false;
      d.profiles = d.profiles.filter((p) => p.id !== id);
      d.messages = d.messages.filter((m) => m.fromId !== id && m.toId !== id);
      d.reports = d.reports.filter((r) => r.profileId !== id);
      return true;
    }, true);
  send = (fromId: string, tokenHash: string, toId: string, body: string) =>
    this.run<SendResult>((d) => {
      if (!this.owned(d, fromId, tokenHash)) return 'forbidden';
      if (fromId === toId) return 'self';
      if (!d.profiles.some((p) => p.id === toId && p.visible)) return 'not_found';
      const recent = d.messages.filter(
        (m) => m.fromId === fromId && Date.now() - Date.parse(m.createdAt) < day,
      );
      if (recent.length >= 20 || recent.filter((m) => m.toId === toId).length >= 5)
        return 'rate_limited';
      d.messages.push({
        id: randomUUID(),
        fromId,
        toId,
        body,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
      return 'ok';
    }, true);
  inbox = (id: string, tokenHash: string) =>
    this.run((d) => {
      if (!this.owned(d, id, tokenHash)) return null;
      return d.messages
        .filter((m) => m.fromId === id || m.toId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 300)
        .flatMap((m) => {
          const otherId = m.fromId === id ? m.toId : m.fromId;
          const other = d.profiles.find((p) => p.id === otherId);
          if (!other) return [];
          return [{ ...m, otherId, otherName: other.displayName, mine: m.fromId === id }];
        });
    });
  markRead = (id: string, tokenHash: string, otherId: string) =>
    this.run((d) => {
      if (!this.owned(d, id, tokenHash)) return false;
      for (const m of d.messages)
        if (m.toId === id && m.fromId === otherId && !m.readAt) m.readAt = new Date().toISOString();
      return true;
    }, true);
  report = (profileId: string, reason: string) =>
    this.run((d) => {
      if (!d.profiles.some((p) => p.id === profileId)) return false;
      const recent = d.reports.filter(
        (r) => r.profileId === profileId && Date.now() - Date.parse(r.createdAt) < day,
      );
      if (recent.length < 10)
        d.reports.push({
          id: randomUUID(),
          profileId,
          reason,
          createdAt: new Date().toISOString(),
        });
      return true;
    }, true);
}

/* ---------------- Selection ---------------- */
let cached: { store: ConnectStore; at: number } | null = null;
let preview: PreviewStore | null = null;
async function databaseReady() {
  if (!configurationStatus().database) return false;
  try {
    const { error } = await databaseClient().rpc('connect_ping');
    return !error;
  } catch {
    return false;
  }
}
/**
 * Supabase when the Connect migration is applied; otherwise a local preview file in development.
 * In production without the migration Connect is unavailable rather than silently ephemeral.
 */
export async function connectStore(): Promise<ConnectStore> {
  if (cached && Date.now() - cached.at < 60_000) return cached.store;
  let store: ConnectStore;
  if (await databaseReady()) store = new DatabaseStore();
  else if (process.env.NODE_ENV !== 'production') {
    preview ??= new PreviewStore(
      process.env.CONNECT_DEV_STORE ||
        // Outside the project folder on purpose: the dev server watches the project and would
        // reload every page each time a profile is written.
        path.join(os.homedir(), '.cache', 'sabka-ai', 'connect-preview.json'),
    );
    store = preview;
  } else
    throw new AppError(
      503,
      'CONNECT_NOT_READY',
      'Connect is being set up. Please check back soon.',
    );
  cached = { store, at: Date.now() };
  return store;
}
