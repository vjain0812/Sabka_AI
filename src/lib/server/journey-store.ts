import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  JOURNEY_CONSENT_VERSION,
  MAX_BUSINESSES,
  MAX_GOALS,
  MAX_TOOLS,
  type AccountBusiness,
  type AdoptionStatus,
  type FeedbackInput,
  type GoalBrief,
  type Journey,
} from '@/lib/domain/journey';
import { configurationStatus } from './config';
import { databaseClient } from './supabase';
import { AppError } from './http';

/**
 * Who is asking: the holder of a journey's private key (hash), a signed-in owner, or both.
 * Signed-in calls run with the owner's access token so the database sees auth.uid().
 */
export type Who = { tokenHash: string | null; userId: string | null; accessToken: string | null };
export type SaveResult = 'ok' | 'forbidden' | 'bad_goal' | 'limit';
export type StatusResult = 'ok' | 'forbidden' | 'not_saved';
export type FeedbackResult = 'ok' | 'forbidden' | 'not_adopted' | 'rate_limited';
export interface JourneyStore {
  mode: 'database' | 'preview';
  /** tokenHash is the new journey's key; a signed-in owner also owns it through the account. */
  create(tokenHash: string, goal: GoalBrief, who: Who): Promise<{ id: string; goalId: string }>;
  get(id: string, who: Who): Promise<Journey | null>;
  /** New goal id; null when not allowed. Throws at the goal limit. */
  addGoal(id: string, who: Who, goal: GoalBrief): Promise<string | null>;
  saveTool(id: string, who: Who, slug: string, goalId: string | null): Promise<SaveResult>;
  removeTool(id: string, who: Who, slug: string): Promise<boolean>;
  setStatus(id: string, who: Who, slug: string, s: AdoptionStatus): Promise<StatusResult>;
  addFeedback(id: string, who: Who, slug: string, f: FeedbackInput): Promise<FeedbackResult>;
  remove(id: string, who: Who): Promise<boolean>;
  /** The signed-in owner's businesses. */
  listForAccount(who: Who): Promise<AccountBusiness[]>;
  /** Attach a device-key journey to the signed-in account. */
  claim(id: string, tokenHash: string, who: Who): Promise<boolean>;
}
const goalLimit = () =>
  new AppError(400, 'GOAL_LIMIT', `A journey can hold up to ${MAX_GOALS} goals.`);
const businessLimit = () =>
  new AppError(400, 'BUSINESS_LIMIT', `An account can hold up to ${MAX_BUSINESSES} businesses.`);

/* ---------------- Supabase (production) ---------------- */
class DatabaseStore implements JourneyStore {
  mode = 'database' as const;
  private async rpc<T>(who: Who, fn: string, args: Record<string, unknown>): Promise<T> {
    const db = databaseClient(who.accessToken ?? undefined);
    const { data, error } = await db.rpc(fn, args);
    if (error) {
      if (/Goal limit/.test(error.message)) throw goalLimit();
      if (/Business limit/.test(error.message)) throw businessLimit();
      if (/Consent required|Invalid key|violates check constraint/.test(error.message))
        throw new AppError(400, 'INVALID_INPUT', 'Check the submitted fields and try again.');
      throw new AppError(503, 'JOURNEY_UNAVAILABLE', 'My AI Journey is temporarily unavailable.');
    }
    return data as T;
  }
  create = (tokenHash: string, goal: GoalBrief, who: Who) =>
    this.rpc<{ id: string; goalId: string }>(who, 'journey_create', {
      p_token_hash: tokenHash,
      p_goal: goal,
      p_consent_version: JOURNEY_CONSENT_VERSION,
    });
  get = (id: string, who: Who) =>
    this.rpc<Journey | null>(who, 'journey_get', { p_id: id, p_token_hash: who.tokenHash });
  addGoal = (id: string, who: Who, goal: GoalBrief) =>
    this.rpc<string | null>(who, 'journey_add_goal', {
      p_id: id,
      p_token_hash: who.tokenHash,
      p_goal: goal,
    });
  saveTool = (id: string, who: Who, slug: string, goalId: string | null) =>
    this.rpc<SaveResult>(who, 'journey_save_tool', {
      p_id: id,
      p_token_hash: who.tokenHash,
      p_slug: slug,
      p_goal: goalId,
    });
  removeTool = (id: string, who: Who, slug: string) =>
    this.rpc<boolean>(who, 'journey_remove_tool', {
      p_id: id,
      p_token_hash: who.tokenHash,
      p_slug: slug,
    });
  setStatus = (id: string, who: Who, slug: string, status: AdoptionStatus) =>
    this.rpc<StatusResult>(who, 'journey_set_status', {
      p_id: id,
      p_token_hash: who.tokenHash,
      p_slug: slug,
      p_status: status,
    });
  addFeedback = (id: string, who: Who, slug: string, f: FeedbackInput) =>
    this.rpc<FeedbackResult>(who, 'journey_add_feedback', {
      p_id: id,
      p_token_hash: who.tokenHash,
      p_slug: slug,
      p: f,
    });
  remove = (id: string, who: Who) =>
    this.rpc<boolean>(who, 'journey_delete', { p_id: id, p_token_hash: who.tokenHash });
  listForAccount = (who: Who) =>
    who.accessToken
      ? this.rpc<AccountBusiness[]>(who, 'account_journeys', {})
      : Promise.resolve([]);
  claim = (id: string, tokenHash: string, who: Who) =>
    this.rpc<boolean>(who, 'journey_claim', { p_id: id, p_token_hash: tokenHash });
}

/* ---------------- Local preview file (development only) ---------------- */
type Row = {
  id: string;
  tokenHash: string;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  goals: Journey['goals'];
  tools: (Journey['tools'][number] & { feedbackCount: number })[];
};
type Data = { journeys: Row[] };

export class PreviewJourneyStore implements JourneyStore {
  mode = 'preview' as const;
  private data: Data | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private file: string) {}
  private async load(): Promise<Data> {
    if (this.data) return this.data;
    try {
      this.data = JSON.parse(await readFile(this.file, 'utf8')) as Data;
    } catch {
      this.data = { journeys: [] };
    }
    return this.data;
  }
  /** Serialize every operation so concurrent requests cannot interleave writes. */
  private run<T>(fn: (d: Data) => T, write = false): Promise<T> {
    const next = this.queue.then(async () => {
      const d = await this.load();
      const result = fn(d);
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
  private owned = (d: Data, id: string, who: Who) => {
    const j = d.journeys.find((x) => x.id === id);
    if (!j) return undefined;
    const byKey = who.tokenHash !== null && j.tokenHash === who.tokenHash;
    const byAccount = who.userId !== null && j.userId === who.userId;
    return byKey || byAccount ? j : undefined;
  };
  private now = () => new Date().toISOString();
  private touch = (j: Row) => {
    j.updatedAt = this.now();
  };

  create = (tokenHash: string, goal: GoalBrief, who: Who) =>
    this.run((d) => {
      if (who.userId && d.journeys.filter((j) => j.userId === who.userId).length >= MAX_BUSINESSES)
        throw businessLimit();
      const id = randomUUID();
      const goalId = randomUUID();
      d.journeys.push({
        id,
        tokenHash,
        userId: who.userId,
        createdAt: this.now(),
        updatedAt: this.now(),
        goals: [{ id: goalId, brief: goal, createdAt: this.now() }],
        tools: [],
      });
      return { id, goalId };
    }, true);
  get = (id: string, who: Who) =>
    this.run((d): Journey | null => {
      const j = this.owned(d, id, who);
      if (!j) return null;
      return {
        id: j.id,
        createdAt: j.createdAt,
        goals: j.goals,
        tools: [...j.tools]
          .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
          .map(({ feedbackCount: _count, ...t }) => {
            void _count;
            return t;
          }),
      };
    });
  addGoal = (id: string, who: Who, goal: GoalBrief) =>
    this.run((d) => {
      const j = this.owned(d, id, who);
      if (!j) return null;
      if (j.goals.length >= MAX_GOALS) throw goalLimit();
      const goalId = randomUUID();
      j.goals.push({ id: goalId, brief: goal, createdAt: this.now() });
      this.touch(j);
      return goalId;
    }, true);
  saveTool = (id: string, who: Who, slug: string, goalId: string | null) =>
    this.run<SaveResult>((d) => {
      const j = this.owned(d, id, who);
      if (!j) return 'forbidden';
      if (goalId && !j.goals.some((g) => g.id === goalId)) return 'bad_goal';
      const existing = j.tools.find((t) => t.slug === slug);
      if (existing) {
        existing.goalId = goalId ?? existing.goalId;
      } else {
        if (j.tools.length >= MAX_TOOLS) return 'limit';
        j.tools.push({
          slug,
          goalId,
          savedAt: this.now(),
          status: null,
          statusAt: null,
          feedback: null,
          feedbackCount: 0,
        });
      }
      this.touch(j);
      return 'ok';
    }, true);
  removeTool = (id: string, who: Who, slug: string) =>
    this.run((d) => {
      const j = this.owned(d, id, who);
      if (!j) return false;
      const before = j.tools.length;
      j.tools = j.tools.filter((t) => t.slug !== slug);
      this.touch(j);
      return j.tools.length < before;
    }, true);
  setStatus = (id: string, who: Who, slug: string, status: AdoptionStatus) =>
    this.run<StatusResult>((d) => {
      const j = this.owned(d, id, who);
      if (!j) return 'forbidden';
      const t = j.tools.find((x) => x.slug === slug);
      if (!t) return 'not_saved';
      t.status = status;
      t.statusAt = this.now();
      this.touch(j);
      return 'ok';
    }, true);
  addFeedback = (id: string, who: Who, slug: string, f: FeedbackInput) =>
    this.run<FeedbackResult>((d) => {
      const j = this.owned(d, id, who);
      if (!j) return 'forbidden';
      const t = j.tools.find((x) => x.slug === slug);
      if (!t?.status) return 'not_adopted';
      if (t.feedbackCount >= 50) return 'rate_limited';
      t.feedback = { ...f, createdAt: this.now() };
      t.feedbackCount++;
      this.touch(j);
      return 'ok';
    }, true);
  remove = (id: string, who: Who) =>
    this.run((d) => {
      const j = this.owned(d, id, who);
      if (!j) return false;
      d.journeys = d.journeys.filter((x) => x !== j);
      return true;
    }, true);
  listForAccount = (who: Who) =>
    this.run((d): AccountBusiness[] =>
      who.userId
        ? d.journeys
            .filter((j) => j.userId === who.userId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((j) => ({
              id: j.id,
              createdAt: j.createdAt,
              updatedAt: j.updatedAt,
              profile: j.goals[j.goals.length - 1]?.brief.profile ?? null,
              toolCount: j.tools.length,
            }))
        : [],
    );
  claim = (id: string, tokenHash: string, who: Who) =>
    this.run((d) => {
      if (!who.userId) return false;
      if (d.journeys.filter((j) => j.userId === who.userId).length >= MAX_BUSINESSES) return false;
      const j = d.journeys.find((x) => x.id === id && x.tokenHash === tokenHash && !x.userId);
      if (!j) return false;
      j.userId = who.userId;
      this.touch(j);
      return true;
    }, true);
}

/* ---------------- Selection ---------------- */
let cached: { store: JourneyStore; at: number } | null = null;
let preview: PreviewJourneyStore | null = null;
async function databaseReady() {
  if (!configurationStatus().database) return false;
  try {
    // Accounts need the second migration too, so probe a function it adds.
    const { error } = await databaseClient().rpc('account_journeys');
    return !error;
  } catch {
    return false;
  }
}
/**
 * Supabase when the journey migrations are applied; otherwise a local preview file in development.
 * In production without the migrations the journey is unavailable rather than silently ephemeral.
 */
export async function journeyStore(): Promise<JourneyStore> {
  if (cached && Date.now() - cached.at < 60_000) return cached.store;
  let store: JourneyStore;
  if (await databaseReady()) store = new DatabaseStore();
  else if (process.env.NODE_ENV !== 'production') {
    preview ??= new PreviewJourneyStore(
      process.env.JOURNEY_DEV_STORE ||
        // Outside the project so the dev server doesn't reload on every write.
        path.join(os.homedir(), '.cache', 'sabka-ai', 'journey-preview.json'),
    );
    store = preview;
  } else
    throw new AppError(
      503,
      'JOURNEY_NOT_READY',
      'My AI Journey is being set up. Please check back soon.',
    );
  cached = { store, at: Date.now() };
  return store;
}
