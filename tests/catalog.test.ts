import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canonicalIdentity,
  evidenceIssues,
  publicRecord,
  type DiscoveryRun,
} from '@/lib/domain/catalog-record';
import { filterCatalog, pricingLabel } from '@/lib/domain/catalog-browse';
import { safeSourceUrl } from '@/lib/domain/source-url';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import { buildQueries, configuredSearch, parseTavily } from '@/lib/server/search';
import { extractCandidate } from '@/lib/server/extraction';
import { executeDiscovery } from '@/lib/server/discovery-pipeline';
import { providerJson } from '@/lib/server/provider-http';
import { businessTypes, libraryWorkflows, workflowTags } from '@/lib/domain/library-taxonomy';

const input = {
  idempotencyKey: crypto.randomUUID(),
  job: 'customer_reply_drafting' as const,
  problem: 'Private context must not be sent to a provider',
  requirement: 'email draft',
  monthlyBudgetUsd: 40,
  permissionsConfirmed: true as const,
};
const run: DiscoveryRun = {
  id: crypto.randomUUID(),
  actorId: crypto.randomUUID(),
  idempotencyKey: input.idempotencyKey,
  input,
  status: 'queued',
  queries: buildQueries(input),
  provider: 'tavily',
  createdAt: new Date().toISOString(),
  finishedAt: null,
  candidateCount: 0,
  searchCalls: 0,
  message: '',
};
const hit = {
  url: 'https://vendor.com/product',
  title: 'Product',
  content: 'Draft replies for a human to review.',
  rawContent: null,
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe('source boundaries', () => {
  it.each([
    'http://vendor.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://2130706433',
    'https://10.1.2.3',
    'https://169.254.169.254/latest',
    'https://[::1]',
    'https://[::ffff:127.0.0.1]',
    'https://user:pass@vendor.com',
    'https://vendor.com:8080',
    'https://internal.local',
  ])('rejects unsafe source %s', (url) => expect(() => safeSourceUrl(url)).toThrow());
  it('removes trackers without rewriting a citation path', () =>
    expect(safeSourceUrl('https://vendor.com/docs?a=1&utm_source=test#intro')).toBe(
      'https://vendor.com/docs?a=1',
    ));
  it('validates provider data and drops restricted or private URLs', () => {
    const results = parseTavily({
      results: [
        { url: hit.url, title: hit.title, content: hit.content },
        { url: 'https://reddit.com/r/tool', title: 'Review' },
        { url: 'https://127.0.0.1', title: 'Private' },
      ],
    });
    expect(results).toHaveLength(1);
    expect(() => parseTavily({ results: 'invented' })).toThrow();
  });
  it('does not send private problem text or budget to search', () => {
    const queries = buildQueries(input);
    expect(queries).toHaveLength(3);
    expect(queries.join(' ')).not.toContain(input.problem);
    expect(queries.every((q) => q.includes(input.requirement))).toBe(true);
  });
  it('reports missing search configuration explicitly', () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    vi.stubEnv('BRAVE_SEARCH_API_KEY', '');
    expect(() => configuredSearch()).toThrow(/Configure TAVILY/);
  });
  it('bounds provider bodies and forbids redirects', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: 'oversized' })));
    vi.stubGlobal('fetch', fetch);
    await expect(providerJson('https://api.tavily.com/search', {}, 4)).rejects.toThrow(
      /size limit/,
    );
    expect(fetch.mock.calls[0][1].redirect).toBe('error');
  });
});
describe('evidence and published browsing', () => {
  it('removes a price when its supporting source expires before the plan', () => {
    const record = researchedCatalog()[0];
    record.sources.find((s) => s.id === record.plans[0].sourceId)!.expiresAt =
      '2026-11-06T19:41:00.000Z';
    expect(
      publicRecord(record, Date.parse('2026-11-06T20:00:00Z'))!.plans[0].monthlyPrice,
    ).toBeNull();
    expect(pricingLabel(record)).toBe('Price needs verification');
  });
  it('validates all 247 researched references with explicit unknowns', () => {
    const catalog = researchedCatalog();
    expect(catalog).toHaveLength(247);
    for (const record of catalog) expect(evidenceIssues(record)).toEqual([]);
    expect(catalog.some((r) => r.plans[0].monthlyPrice === null)).toBe(true);
  });
  it('keeps unique identities, source references and bounded broader library metadata', () => {
    const catalog = researchedCatalog();
    expect(new Set(catalog.map((r) => r.tool.id)).size).toBe(247);
    expect(new Set(catalog.map((r) => r.tool.slug)).size).toBe(247);
    expect(new Set(catalog.map((r) => r.tool.canonicalKey)).size).toBe(247);
    const expanded = researchedCatalog(true);
    expect(expanded).toHaveLength(40);
    for (const record of expanded) {
      expect(record.tool.jobs).toEqual([]);
      // Any price must be backed by a plan-specific documented claim.
      for (const plan of record.plans.filter((p) => p.monthlyPrice !== null))
        expect(record.claims.some((c) => c.key === 'monthly_price' && c.planId === plan.id)).toBe(
          true,
        );
      expect(record.claims.every((c) => record.sources.some((s) => s.id === c.sourceId))).toBe(
        true,
      );
      expect(workflowTags(record.tool).length).toBeGreaterThan(0);
    }
  });
  it('covers every browsing workflow and business type without adding matching jobs', () => {
    for (const workflow of Object.keys(libraryWorkflows)) {
      expect(
        filterCatalog(researchedCatalog(), {
          query: '',
          job: '',
          price: '',
          evidence: '',
          workflow,
        }).length,
      ).toBeGreaterThan(0);
    }
    for (const businessType of Object.keys(businessTypes)) {
      expect(
        filterCatalog(researchedCatalog(), {
          query: '',
          job: '',
          price: '',
          evidence: '',
          businessType,
        }).length,
      ).toBeGreaterThan(0);
    }
    const filters = {
      query: '',
      job: '',
      price: '',
      evidence: '',
      workflow: 'finance_bookkeeping',
      businessType: 'retail_ecommerce',
    };
    expect(filterCatalog(researchedCatalog(), filters).some((r) => r.tool.slug === 'dext')).toBe(
      true,
    );
    expect(
      filterCatalog(researchedCatalog(), { ...filters, workflow: 'design_media', query: 'Dext' }),
    ).toEqual([]);
    expect(
      filterCatalog(researchedCatalog(), { ...filters, workflow: '', query: 'NotebookLM' })[0].tool
        .slug,
    ).toBe('gemini-notebook');
    expect(
      filterCatalog(researchedCatalog(true), {
        ...filters,
        workflow: '',
        job: 'customer_reply_drafting',
      }),
    ).toEqual([]);
  });
  it('normalizes canonical host/product identity', () =>
    expect(canonicalIdentity('https://www.Vendor.com/anything', 'PRODUCT Name')).toBe(
      canonicalIdentity('https://vendor.com', 'product-name'),
    ));
  it('rejects missing, contradictory, future and expired evidence', () => {
    const missing = researchedCatalog()[0];
    missing.sources = [];
    expect(evidenceIssues(missing).join()).toMatch(/source/);
    const conflict = researchedCatalog()[0];
    conflict.claims[0].status = 'conflicting';
    expect(evidenceIssues(conflict).join()).toMatch(/conflicting/);
    const stale = researchedCatalog()[0];
    stale.sources[0].expiresAt = '2020-01-01T00:00:00.000Z';
    expect(evidenceIssues(stale).join()).toMatch(/expired/);
    const future = researchedCatalog()[0];
    future.claims[0].observedAt = '2099-01-01T00:00:00.000Z';
    expect(evidenceIssues(future).join()).toMatch(/future/);
  });
  it('does not turn unknown pricing into free or retain expired prices', () => {
    const unknown = researchedCatalog().find((r) => r.plans[0].monthlyPrice === null)!;
    expect(pricingLabel(unknown)).toBe('Price needs verification');
    expect(filterCatalog([unknown], { query: '', job: '', price: 'free', evidence: '' })).toEqual(
      [],
    );
    const record = researchedCatalog()[0];
    expect(publicRecord(record, Date.parse('2099-01-01'))!.plans[0].monthlyPrice).toBeNull();
  });
  it('never exposes a draft, fictional record, or claims independent testing without a source', () => {
    const draft = researchedCatalog()[0];
    draft.tool.status = 'pending_review';
    expect(publicRecord(draft)).toBeNull();
    expect(filterCatalog([draft], { query: '', job: '', price: '', evidence: '' })).toEqual([]);
    const fictional = researchedCatalog()[0];
    fictional.tool.fictional = true;
    expect(publicRecord(fictional)).toBeNull();
    expect(
      filterCatalog(researchedCatalog(), { query: '', job: '', price: '', evidence: 'tested' }),
    ).toEqual([]);
  });
  it('filters task and product without inventing a match score', () => {
    const records = filterCatalog(researchedCatalog(), {
      query: 'Grammarly',
      job: 'customer_reply_drafting',
      price: '',
      evidence: '',
    });
    expect(records).toHaveLength(1);
    expect(records[0]).not.toHaveProperty('score');
  });
});
describe('discovery execution', () => {
  it('keeps model-free candidates unverified with no invented price', async () => {
    const candidate = await extractCandidate(hit, input, run.id, false);
    expect(candidate.status).toBe('pending_review');
    expect(candidate.record.plans).toEqual([]);
    expect(candidate.record.claims[0].status).toBe('unknown');
  });
  it('rejects hallucinated supporting quotes and survives model failure', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    product: 'Fabricated',
                    vendor: 'Fabricated',
                    isOfficialProduct: true,
                    capability: 'Unsupported safety guarantee',
                    supportingQuote: 'not present in supplied evidence',
                  }),
                },
              },
            ],
          }),
        ),
      ),
    );
    const candidate = await extractCandidate(hit, input, run.id);
    expect(candidate.record.tool.name).toBe('Product');
    expect(candidate.record.review.notes).toContain('deterministic metadata');
  });
  it('accepts a grounded structured proposal but never auto-verifies it', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    product: 'Product',
                    vendor: 'Vendor',
                    isOfficialProduct: true,
                    capability: hit.content,
                    supportingQuote: hit.content,
                  }),
                },
              },
            ],
          }),
        ),
      ),
    );
    const candidate = await extractCandidate(hit, input, run.id);
    expect(candidate.record.review.notes).toContain('groq structured proposal');
    expect(candidate.record.sources[0].reviewStatus).toBe('pending_review');
  });
  it('deduplicates URLs and existing canonical products, and claims a run once', async () => {
    const existing = await extractCandidate(hit, input, run.id, false);
    const extract = vi.fn().mockResolvedValue(existing);
    const finish = vi.fn();
    const claim = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    const search = vi.fn().mockResolvedValue([hit, hit]);
    await executeDiscovery(
      run,
      { claim, finish },
      { name: 'tavily', search },
      new Set([existing.canonicalKey]),
      extract,
    );
    expect(extract).toHaveBeenCalledTimes(1);
    expect(finish.mock.calls[0][2]).toEqual([]);
    expect(search).toHaveBeenCalledTimes(3);
    await executeDiscovery(run, { claim, finish }, { name: 'tavily', search }, new Set(), extract);
    expect(finish).toHaveBeenCalledTimes(1);
  });
  it('bounds retry spending and records provider failures without fake results', async () => {
    const finish = vi.fn();
    const search = vi.fn().mockRejectedValue(new Error('offline'));
    await executeDiscovery(
      run,
      { claim: async () => true, finish },
      { name: 'tavily', search },
      new Set(),
    );
    expect(search).toHaveBeenCalledTimes(6);
    expect(finish.mock.calls[0].slice(1, 4)).toEqual(['failed', [], 6]);
  });
  it('groups metadata-only pages with an identified product without claiming a second product', async () => {
    const official = await extractCandidate(hit, input, run.id, false);
    official.record.sources[0].type = 'official';
    official.record.review.notes = 'groq structured proposal';
    const second = await extractCandidate(
      { ...hit, url: 'https://vendor.com/blog', title: 'A blog page' },
      input,
      run.id,
      false,
    );
    const extract = vi.fn().mockResolvedValueOnce(official).mockResolvedValueOnce(second);
    const finish = vi.fn();
    const search = vi.fn().mockResolvedValue([hit, { ...hit, url: 'https://vendor.com/blog' }]);
    await executeDiscovery(
      run,
      { claim: async () => true, finish },
      { name: 'tavily', search },
      new Set(),
      extract,
    );
    const candidates = finish.mock.calls[0][2];
    expect(candidates).toHaveLength(1);
    expect(candidates[0].record.sources).toHaveLength(2);
    expect(candidates[0].record.claims).toHaveLength(1);
  });
});
