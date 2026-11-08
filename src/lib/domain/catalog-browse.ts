import { currentPlanPrice, freshness, type CatalogRecord } from './catalog-record';
import { spanishToolSummary } from './tool-translations';
import { businessTags, businessTypes, libraryWorkflows, workflowTags } from './library-taxonomy';

export type CatalogFilters = {
  query: string;
  job: string;
  price: string;
  evidence: string;
  workflow?: string;
  businessType?: string;
};
export function filterCatalog(records: CatalogRecord[], filters: CatalogFilters) {
  const query = filters.query.trim().toLowerCase();
  return records
    .filter((record) => {
      const { tool, plans, sources } = record;
      if (tool.status !== 'published' || tool.fictional) return false;
      const workflows = workflowTags(tool),
        sectors = businessTags(tool);
      if (
        query &&
        !`${tool.name} ${tool.vendor} ${tool.summary} ${
          spanishToolSummary(tool.slug) ?? ''
        } ${tool.aliases.join(' ')} ${tool.categories.join(' ')} ${workflows
          .map((key) => libraryWorkflows[key])
          .join(' ')} ${sectors.map((key) => businessTypes[key]).join(' ')}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      if (filters.workflow && !workflows.some((tag) => tag === filters.workflow)) return false;
      if (
        filters.businessType &&
        !sectors.includes('all_small_businesses') &&
        !sectors.some((tag) => tag === filters.businessType)
      )
        return false;
      if (filters.job && !tool.jobs.includes(filters.job as CatalogRecord['tool']['jobs'][number]))
        return false;
      if (
        filters.price === 'documented' &&
        !plans.some((p) => currentPlanPrice(record, p) !== null)
      )
        return false;
      if (filters.price === 'free' && !plans.some((p) => currentPlanPrice(record, p) === 0))
        return false;
      if (
        filters.evidence === 'policy' &&
        !sources.some(
          (s) => s.type === 'policy' && freshness(s.checkedAt, s.expiresAt) === 'current',
        )
      )
        return false;
      if (
        filters.evidence === 'tested' &&
        !sources.some(
          (s) => s.type === 'internal_test' && freshness(s.checkedAt, s.expiresAt) === 'current',
        )
      )
        return false;
      return true;
    })
    .sort((a, b) => a.tool.name.localeCompare(b.tool.name));
}
/** Current, source-backed plan prices (cheapest first). Unknown prices are never assumed free. */
export function knownPrices(record: CatalogRecord, now = Date.now()) {
  return record.plans
    .map((plan) => ({ plan, price: currentPlanPrice(record, plan, now) }))
    .filter((p): p is { plan: (typeof record.plans)[number]; price: number } => p.price !== null)
    .sort((a, b) => a.price - b.price);
}
export function cheapestPrice(record: CatalogRecord, now = Date.now()) {
  return knownPrices(record, now)[0]?.price ?? null;
}
export function pricingLabel(record: CatalogRecord, now = Date.now()) {
  const prices = knownPrices(record, now);
  if (!prices.length) return 'Price needs verification';
  const paid = prices.find((p) => p.price > 0);
  if (prices[0].price === 0) return paid ? `Free plan · paid from $${paid.price}/mo` : 'Free plan';
  return `From $${prices[0].price}/mo`;
}
