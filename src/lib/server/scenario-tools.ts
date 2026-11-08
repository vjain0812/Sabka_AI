import 'server-only';
import { pricingLabel } from '@/lib/domain/catalog-browse';
import type { CatalogRecord } from '@/lib/domain/catalog-record';
import type { Scenario } from '@/lib/domain/scenarios';
import { loadCatalog } from './catalog-repository';

/** Serializable, evidence-backed facts for one scenario tool. Copy comes from the catalog only. */
export type ScenarioToolView = {
  slug: string;
  name: string;
  role: string;
  published: boolean;
  vendor: string | null;
  summary: string | null;
  website: string | null;
  price: string | null;
  sourceCount: number;
  checkedAt: string | null;
  inMatching: boolean;
  officialSource: string | null;
};

function view(
  tool: Scenario['tools'][number],
  record: CatalogRecord | undefined,
): ScenarioToolView {
  if (!record)
    return {
      ...tool,
      published: false,
      vendor: null,
      summary: null,
      website: null,
      price: null,
      sourceCount: 0,
      checkedAt: null,
      inMatching: false,
      officialSource: null,
    };
  return {
    ...tool,
    name: record.tool.name,
    published: true,
    vendor: record.tool.vendor,
    summary: record.tool.summary,
    website: record.tool.website,
    price: pricingLabel(record),
    sourceCount: record.sources.length,
    checkedAt: record.review.checkedAt?.slice(0, 10) ?? null,
    inMatching: record.tool.jobs.length > 0,
    officialSource: record.sources.find((s) => s.type === 'official')?.url ?? null,
  };
}

export async function scenarioToolViews(scenarios: Scenario[]) {
  const catalog = await loadCatalog();
  const bySlug = new Map(catalog.records.map((r) => [r.tool.slug, r]));
  return {
    origin: catalog.origin,
    views: Object.fromEntries(
      scenarios.map((s) => [s.slug, s.tools.map((t) => view(t, bySlug.get(t.slug)))]),
    ) as Record<string, ScenarioToolView[]>,
  };
}
