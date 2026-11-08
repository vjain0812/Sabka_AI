import { freshness, type CatalogRecord } from './catalog-record';
import { knownPrices, pricingLabel } from './catalog-browse';
import { businessTags, businessTypes, libraryWorkflows, workflowTags } from './library-taxonomy';

export function reviewedClaim(
  record: CatalogRecord,
  key: string,
  now = Date.now(),
  planId?: string | null,
) {
  return record.claims.find((c) => {
    const source = record.sources.find((s) => s.id === c.sourceId);
    return (
      c.key === key &&
      (planId === undefined || c.planId === planId || c.planId === null) &&
      ['documented', 'team_tested'].includes(c.status) &&
      ['verified', 'published'].includes(c.reviewStatus) &&
      source?.reviewStatus === 'verified' &&
      source.allowedDisplay &&
      freshness(c.observedAt, c.expiresAt, now) === 'current' &&
      freshness(source.checkedAt, source.expiresAt, now) === 'current'
    );
  });
}

/**
 * Display-ready facts for one tool. Vendor statements are quoted, never restated as ours.
 * The setup estimate is SABKA's own rule of thumb by tool type and is always labelled as such.
 */
export type SetupEstimate = { label: string; labelEs: string; minutes: number };
export function setupEstimate(record: CatalogRecord): SetupEstimate {
  const text = `${record.tool.summary} ${record.tool.name}`.toLowerCase();
  const tags = workflowTags(record.tool);
  if (/sensor|hardware|install/.test(text))
    return {
      label: 'A few days (hardware install)',
      labelEs: 'Unos días (instalación de equipos)',
      minutes: 2880,
    };
  if (
    /point of sale|\bpos\b|practice management|field.service|property management|payroll/.test(text)
  )
    return {
      label: 'A day or more (moving your data in)',
      labelEs: 'Un día o más (pasar tus datos)',
      minutes: 480,
    };
  if (
    tags.some((t) =>
      ['finance_bookkeeping', 'sales_crm', 'websites_commerce', 'projects_operations'].includes(t),
    )
  )
    return { label: 'Half a day', labelEs: 'Medio día', minutes: 240 };
  if (
    tags.some((t) =>
      ['scheduling', 'marketing', 'documents_data', 'automation', 'communications'].includes(t),
    )
  )
    return { label: 'About an hour', labelEs: 'Cerca de una hora', minutes: 60 };
  return { label: 'Under 30 minutes', labelEs: 'Menos de 30 minutos', minutes: 30 };
}

/** "over 250,000 customers" → 250000; "1M+ creators" → 1000000. */
export function parseCount(quote: string | null) {
  if (!quote) return null;
  const m = quote.match(/(\d[\d.,]*)\s*(k|m|million|thousand)?\+?/i);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = m[2]?.toLowerCase();
  return Math.round(
    n * (unit === 'k' || unit === 'thousand' ? 1e3 : unit === 'm' || unit === 'million' ? 1e6 : 1),
  );
}
export function compactCount(n: number) {
  return n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M+` : n >= 1e3 ? `${Math.round(n / 1e3)}K+` : `${n}+`;
}

export function toolInsights(record: CatalogRecord, now = Date.now()) {
  const claim = (key: string) => {
    const c = reviewedClaim(record, key, now);
    if (!c) return null;
    const source = record.sources.find((s) => s.id === c.sourceId) ?? null;
    return { value: c.value, source };
  };
  const prices = knownPrices(record, now).map(({ plan, price }) => ({
    tier: plan.tier,
    price,
    billing: plan.billingBasis,
    quote:
      (record.claims.find((c) => c.key === 'price_quote' && c.planId === plan.id)?.value as
        | string
        | undefined) ?? null,
    source: record.sources.find((s) => s.id === plan.sourceId) ?? null,
  }));
  const customers = claim('vendor_customer_claim');
  const setup = claim('vendor_setup_claim');
  const trial = claim('free_trial_days');
  const customerQuote = typeof customers?.value === 'string' ? customers.value : null;
  const official = record.sources.find((s) => s.type === 'official') ?? null;
  return {
    priceLabel: pricingLabel(record, now),
    prices,
    cheapest: prices[0]?.price ?? null,
    freePlan: prices.some((p) => p.price === 0),
    trialDays: typeof trial?.value === 'number' ? trial.value : null,
    customerQuote,
    customerCount: parseCount(customerQuote),
    customerSource: customers?.source ?? null,
    setupQuote: typeof setup?.value === 'string' ? setup.value : null,
    setupSource: setup?.source ?? null,
    estimate: setupEstimate(record),
    capability:
      (record.claims.find((c) => c.key === 'capability')?.value as string | undefined) ??
      record.tool.summary,
    workflows: workflowTags(record.tool).map((k) => libraryWorkflows[k]),
    builtFor: businessTags(record.tool).map((k) => businessTypes[k]),
    sources: record.sources,
    checkedAt: record.review.checkedAt?.slice(0, 10) ?? null,
    pricingUrl: prices[0]?.source?.url ?? null,
    officialUrl: official?.url ?? record.tool.website,
  };
}
export type ToolInsights = ReturnType<typeof toolInsights>;
