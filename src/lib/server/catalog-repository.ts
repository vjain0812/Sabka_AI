import 'server-only';
import { z } from 'zod';
import {
  candidateSchema,
  catalogRecordSchema,
  publicRecord,
  runSchema,
  type Candidate,
  type CatalogRecord,
  type DiscoveryInput,
  type DiscoveryRun,
  type ReviewInput,
  evidenceIssues,
} from '@/lib/domain/catalog-record';
import { safeSourceUrl } from '@/lib/domain/source-url';
import { databaseClient } from './supabase';
import { configurationStatus } from './config';
import { AppError } from './http';
import type { AdminActor } from './auth';
import { researchedCatalog } from './researched-catalog';

export type CatalogResult = {
  records: CatalogRecord[];
  origin: 'database' | 'last-known' | 'research-snapshot';
  message: string;
  version: string;
};
let lastKnown: CatalogResult | null = null;
export async function loadCatalog(): Promise<CatalogResult> {
  if (configurationStatus().database) {
    try {
      const { data, error } = await databaseClient()
        .from('tools')
        .select('record')
        .eq('status', 'published')
        .order('name')
        .limit(1000);
      if (error) throw error;
      const records = (data ?? [])
        .map((row) => catalogRecordSchema.parse(row.record))
        .map((r) => publicRecord(r))
        .filter((r): r is CatalogRecord => r !== null);
      lastKnown = {
        records,
        origin: 'database',
        message:
          'Published catalog. Source-checking does not establish business-specific eligibility.',
        version: records.map((r) => `${r.tool.id}:${r.tool.version}`).join('|'),
      };
      return lastKnown;
    } catch {
      if (lastKnown)
        return {
          ...lastKnown,
          records: lastKnown.records
            .map((r) => publicRecord(r))
            .filter((r): r is CatalogRecord => r !== null),
          origin: 'last-known',
          message:
            'Database unavailable. Showing the last published snapshot read by this server; recent changes may not appear.',
        };
    }
  }
  return {
    records: researchedCatalog()
      .map((r) => publicRecord(r))
      .filter((r): r is CatalogRecord => r !== null),
    origin: 'research-snapshot',
    message: configurationStatus().database
      ? 'Database unavailable or migration not applied. Showing the dated repository research snapshot.'
      : 'Showing the dated repository research snapshot. No live search is running.',
    version: 'research-2026-11-07-v2',
  };
}
function dbError(error: { message: string; code?: string } | null) {
  if (!error) return;
  const known = error.message.match(
    /Daily discovery limit reached|A discovery run is already active|Candidate changed\. Refresh and review again\.|Admin required|Official capability evidence required|Stale or future evidence|Unreviewed claim source|Unresolved conflict|Price is not evidenced/,
  );
  throw new AppError(
    error.code === '42501' ? 403 : known ? 409 : 503,
    'DATABASE_OPERATION_FAILED',
    known?.[0] ?? 'Catalog storage is unavailable. Check migrations and try again.',
  );
}
export function decodeRun(row: Record<string, unknown>): DiscoveryRun {
  return runSchema.parse({
    id: row.id,
    actorId: row.actor_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    input: row.input,
    queries: row.queries,
    provider: row.provider,
    createdAt: new Date(String(row.created_at)).toISOString(),
    finishedAt: row.finished_at ? new Date(String(row.finished_at)).toISOString() : null,
    candidateCount: row.candidate_count,
    searchCalls: row.search_calls,
    message: row.message,
  });
}
export function decodeCandidate(row: Record<string, unknown>): Candidate {
  return candidateSchema.parse({
    id: row.id,
    runId: row.run_id,
    canonicalKey: row.canonical_key,
    status: row.status,
    version: row.version,
    record: row.record,
    discoveredAt: new Date(String(row.discovered_at)).toISOString(),
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(String(row.reviewed_at)).toISOString() : null,
    reviewNote: row.review_note,
  });
}
export class SupabaseCatalogRepository {
  private db;
  constructor(private actor: AdminActor) {
    this.db = databaseClient(actor.accessToken);
  }
  async listAdmin() {
    const [runs, candidates] = await Promise.all([
      this.db
        .from('discovery_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      this.db
        .from('discovery_candidates')
        .select('*')
        .order('discovered_at', { ascending: false })
        .limit(100),
    ]);
    dbError(runs.error);
    dbError(candidates.error);
    return {
      runs: (runs.data ?? []).map(decodeRun),
      candidates: (candidates.data ?? []).map(decodeCandidate),
    };
  }
  async enqueue(input: DiscoveryInput, queries: string[], provider: string) {
    const { data, error } = await this.db.rpc('enqueue_discovery', {
      p_input: input,
      p_queries: queries,
      p_provider: provider,
    });
    dbError(error);
    return decodeRun(data);
  }
  async claim(id: string) {
    const { data, error } = await this.db.rpc('claim_discovery', { p_id: id });
    dbError(error);
    return data === true;
  }
  async finish(
    id: string,
    status: 'completed' | 'partial' | 'failed',
    candidates: Candidate[],
    calls: number,
    message: string,
  ) {
    const { error } = await this.db.rpc('finish_discovery', {
      p_id: id,
      p_status: status,
      p_candidates: candidates,
      p_calls: calls,
      p_message: message,
    });
    dbError(error);
  }
  async review(id: string, input: ReviewInput) {
    z.string().uuid().parse(id);
    if (input.action === 'verify' && input.record) {
      input.record.tool.website = safeSourceUrl(input.record.tool.website);
      input.record.sources.forEach((s) => {
        s.url = safeSourceUrl(s.url);
      });
      const issues = evidenceIssues(input.record);
      if (issues.length) throw new AppError(422, 'EVIDENCE_INCOMPLETE', issues.join(' '));
    }
    const { data, error } = await this.db.rpc('review_candidate', {
      p_id: id,
      p_version: input.expectedVersion,
      p_action: input.action,
      p_note: input.note,
      p_inspected: input.inspectedSources,
      p_record: input.record ?? null,
    });
    dbError(error);
    return decodeCandidate(data);
  }
}
