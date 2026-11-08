import 'server-only';
import type { Candidate, DiscoveryRun } from '@/lib/domain/catalog-record';
import { buildQueries, configuredSearch, type SearchProvider } from './search';
import { extractCandidate } from './extraction';
import { loadCatalog, SupabaseCatalogRepository } from './catalog-repository';
import type { AdminActor } from './auth';
import { AppError } from './http';

export interface DiscoveryStore {
  claim(id: string): Promise<boolean>;
  finish(
    id: string,
    status: 'completed' | 'partial' | 'failed',
    candidates: Candidate[],
    calls: number,
    message: string,
  ): Promise<void>;
}
export async function executeDiscovery(
  run: DiscoveryRun,
  store: DiscoveryStore,
  provider: SearchProvider,
  existingKeys: Set<string>,
  extract = extractCandidate,
) {
  if (!(await store.claim(run.id))) return;
  let calls = 0;
  let errors = 0;
  let modelCalls = 0;
  const candidates: Candidate[] = [];
  const seenUrls = new Set<string>();
  try {
    for (const query of run.queries.slice(0, 3)) {
      let hits: Awaited<ReturnType<SearchProvider['search']>> = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        calls++;
        try {
          hits = await provider.search(query);
          break;
        } catch (error) {
          if (
            attempt === 1 ||
            (error instanceof AppError && error.status !== 429 && error.status < 500)
          ) {
            errors++;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      for (const hit of hits) {
        if (candidates.length >= 4) break;
        if (seenUrls.has(hit.url)) continue;
        seenUrls.add(hit.url);
        const candidate = await extract(hit, run.input, run.id, modelCalls++ < 2);
        candidate.record.sources.forEach((s) => (s.provider = provider.name));
        // Metadata-only page titles are not distinct product identities. Retain
        // their citations for inspection alongside an identified vendor product.
        // Do not merge two independently extracted products from the same vendor.
        const related = candidates.find(
          (c) =>
            c.canonicalKey === candidate.canonicalKey ||
            (candidate.record.review.notes.startsWith('deterministic metadata') &&
              c.record.sources.some((s) => s.type === 'official') &&
              new URL(c.record.tool.website).hostname ===
                new URL(candidate.record.tool.website).hostname),
        );
        if (related) {
          related.record.sources.push(...candidate.record.sources);
          continue;
        }
        if (existingKeys.has(candidate.canonicalKey)) continue;
        existingKeys.add(candidate.canonicalKey);
        candidates.push(candidate);
      }
    }
    await store.finish(
      run.id,
      errors ? (candidates.length ? 'partial' : 'failed') : 'completed',
      candidates,
      calls,
      errors
        ? 'Some provider requests failed; retained candidates still require review.'
        : `Search complete. ${candidates.length} new candidates proposed; no tool was published.`,
    );
  } catch {
    await store.finish(
      run.id,
      candidates.length ? 'partial' : 'failed',
      candidates,
      calls,
      'Discovery was interrupted. Retained candidates remain unpublished. Check configuration before starting a new bounded run.',
    );
  }
}
export async function startDiscovery(actor: AdminActor, input: DiscoveryRun['input']) {
  const provider = configuredSearch();
  const repository = new SupabaseCatalogRepository(actor);
  const run = await repository.enqueue(input, buildQueries(input), provider.name);
  return {
    run,
    work: async () => {
      const catalog = await loadCatalog();
      await executeDiscovery(
        run,
        repository,
        provider,
        new Set(catalog.records.map((r) => r.tool.canonicalKey)),
      );
    },
  };
}
