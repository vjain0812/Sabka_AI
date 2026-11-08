import 'server-only';
import { createHash } from 'node:crypto';
import research from '../../../docs/research/phase2-tools.json';
import expansion from '../../../docs/research/library-expansion-2026-11-07.json';
import scenarioTools from '../../../docs/research/workflow-scenarios-2026-11-07.json';
import expansion2 from '../../../docs/research/library-expansion-2-2026-11-07.json';
import pricingResearch from '../../../docs/research/pricing-2026-11-08.json';
import {
  catalogRecordSchema,
  canonicalIdentity,
  type CatalogRecord,
} from '@/lib/domain/catalog-record';

function stableId(value: string) {
  const h = createHash('sha256').update(`sabka-research-v1:${value}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(
    20,
    32,
  )}`;
}
type Quote = { quote: string; url: string };
/** Facts verified by scripts/research-pricing.mts; every value carries a verbatim quote. */
type PricingFacts = {
  checkedAt: string;
  homepageUrl: string | null;
  pricingUrl: string | null;
  pricingTitle: string | null;
  plans: { name: string; monthlyUsd: number; billing: string; quote: string }[];
  freePlan: Quote | null;
  trial: (Quote & { days: number }) | null;
  customers: Quote | null;
  setup: Quote | null;
};
const pricing = pricingResearch as unknown as Record<string, PricingFacts>;
const AUTO_BASIS =
  'Public official page fetched automatically on the checked date. Only facts that appear verbatim on the page are recorded, with the quote stored for attribution; no bulk copying, endorsement or review license is claimed.';
/**
 * Pricing pages often list add-ons, hardware, per-unit fees or competitor prices next to plans.
 * Keep only rows that look like the product's own subscription plans; the raw research file is
 * left untouched for audit.
 */
const notAPlan =
  /add-?ons?|remove|powered by|international|push to talk|kiosk|\bkds\b|whatsapp in|signals|plagiarism|peace of mind|dedicated|qualify leads|assistant & messag|automated billing|customer success|expert|per (?:unit|contact|call|minute|message)|hardware|terminal|printer|reader|sms credits/i;
export function cleanPlans(
  slug: string,
  plans: PricingFacts['plans'],
  otherProductNames: string[],
): PricingFacts['plans'] {
  return plans.filter(
    (p) =>
      !notAPlan.test(p.name) &&
      !(p.monthlyUsd > 0 && p.monthlyUsd < 2) &&
      !otherProductNames.some((n) => n.length > 3 && p.name.toLowerCase().includes(n)),
  );
}
/** A setup quote must state a time ("in 5 minutes"), not a truncated or unrelated phrase. */
export const usableSetupQuote = (q: string) =>
  /\b(?:minutes?|mins?|hours?|days?|seconds?|clicks?)\s*$/i.test(q.trim()) &&
  !/payment|account|log in|presentation/i.test(q);
/** A customer quote must count customers, not questions answered or the vendor's own staff. */
export const usableCustomerQuote = (q: string) =>
  !/question|team members|employees|staff|downloads?/i.test(q);
const productNames = (own: string) =>
  [
    ...research,
    ...expansion,
    ...(scenarioTools as { name: string }[]),
    ...(expansion2 as { name: string }[]),
  ]
    .map((i) => i.name.toLowerCase().split(/\s+/)[0])
    .filter((n) => n !== own.toLowerCase().split(/\s+/)[0]);
/** Actual researched references, separate from fictional business fixtures. */
type ResearchItem = (typeof research)[number] & {
  aliases?: string[];
  libraryWorkflows?: string[];
  businessTypes?: string[];
};
/**
 * `expanded` = the 40-tool library expansion; `scenarios` = the 15 tools added for the
 * profession workflow scenarios; `expanded2` = the 180-tool source-checked expansion. Scopes
 * exist so imports never rewrite earlier records.
 */
export type ResearchScope = 'all' | 'expanded' | 'scenarios' | 'expanded2';
export function researchedCatalog(scope: ResearchScope | boolean = 'all'): CatalogRecord[] {
  const resolved: ResearchScope = scope === true ? 'expanded' : scope === false ? 'all' : scope;
  const items: ResearchItem[] =
    resolved === 'expanded'
      ? expansion
      : resolved === 'scenarios'
      ? (scenarioTools as ResearchItem[])
      : resolved === 'expanded2'
      ? (expansion2 as ResearchItem[])
      : [
          ...research,
          ...expansion,
          ...(scenarioTools as ResearchItem[]),
          ...(expansion2 as ResearchItem[]),
        ];
  return items.map((item) => {
    const toolId = stableId(item.slug);
    const planId = stableId(`${item.slug}:plan`);
    const checkedAt = item.sources[0].checkedAt;
    const expiresAt = new Date(Date.parse(checkedAt) + 30 * 86400000).toISOString();
    const sources = item.sources.map((s) => ({
      id: stableId(`${item.slug}:${s.url}`),
      url: s.url,
      title: s.title,
      provider: 'repository source research',
      type: s.type,
      permissionBasis: s.permissionBasis,
      allowedStorage: true,
      allowedDisplay: true,
      attribution: s.title,
      retentionDays: 30,
      checkedAt: s.checkedAt,
      expiresAt,
      reviewStatus: 'verified',
      retrieval: 'manual_source_check',
    }));
    const sourceFor = (url: string) => sources.find((s) => s.url === url)?.id ?? sources[0].id;
    const claimBase = {
      toolId,
      planId: null,
      region: 'Plan-specific availability requires confirmation',
      status: 'documented',
      reviewStatus: 'published',
      observedAt: checkedAt,
      expiresAt,
      reviewerId: null,
      conflictResolution: null,
    };
    const claims: unknown[] = item.capabilities.map((c, index) => ({
      ...claimBase,
      id: stableId(`${item.slug}:capability:${index}`),
      key: 'capability',
      value: c.text,
      sourceId: sourceFor(c.url),
    }));
    claims.push({
      ...claimBase,
      id: stableId(`${item.slug}:pricing-notes`),
      planId,
      key: 'pricing_scope',
      value: item.pricing.notes,
      sourceId: sourceFor(item.pricing.url),
    });
    if (item.pricing.monthlyUsd !== null)
      claims.push({
        ...claimBase,
        id: stableId(`${item.slug}:price`),
        planId,
        key: 'monthly_price',
        value: item.pricing.monthlyUsd,
        sourceId: sourceFor(item.pricing.url),
      });
    let plans: unknown[] = [
      {
        id: planId,
        toolId,
        tier: item.pricing.tier,
        region: 'US / USD where cited; confirm local availability',
        currency: 'USD',
        monthlyPrice: item.pricing.monthlyUsd,
        billingBasis: item.pricing.billingBasis,
        seatLimit: null,
        usageLimit: item.pricing.notes,
        sourceId: sourceFor(item.pricing.url),
        checkedAt,
        expiresAt,
      },
    ];
    const facts = pricing[item.slug];
    if (facts) {
      const factExpiry = new Date(Date.parse(facts.checkedAt) + 30 * 86400000).toISOString();
      const sourceAt = (url: string, rawTitle: string) => {
        const title = rawTitle
          .replace(/&amp;/g, '&')
          .replace(/&#39;|&apos;|&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&#8211;|&ndash;/g, '–')
          .replace(/&#8212;|&mdash;|&#x2014;/g, '—');
        const existing = sources.find((s) => s.url === url);
        if (existing) return existing.id;
        const id = stableId(`${item.slug}:${url}`);
        sources.push({
          id,
          url,
          title: title.slice(0, 240),
          provider: 'automated official-page check',
          type: 'official',
          permissionBasis: AUTO_BASIS,
          allowedStorage: true,
          allowedDisplay: true,
          attribution: title.slice(0, 240),
          retentionDays: 30,
          checkedAt: facts.checkedAt,
          expiresAt: factExpiry,
          reviewStatus: 'verified',
          retrieval: 'permitted_fetch',
        });
        return id;
      };
      const factClaim = (
        key: string,
        value: string | number,
        sourceId: string,
        plan = null as string | null,
      ) =>
        claims.push({
          ...claimBase,
          id: stableId(`${item.slug}:${key}:${plan ?? ''}`),
          planId: plan,
          key,
          value,
          sourceId,
          observedAt: facts.checkedAt,
          expiresAt: factExpiry,
        });
      const cleaned = cleanPlans(item.slug, facts.plans, productNames(item.name));
      const pricingSource =
        facts.pricingUrl && (cleaned.length || facts.freePlan || facts.trial)
          ? sourceAt(facts.pricingUrl, facts.pricingTitle ?? `${item.name} pricing`)
          : null;
      if (pricingSource && item.pricing.monthlyUsd === null) {
        const verified = [...cleaned];
        if (facts.freePlan && !verified.some((p) => p.monthlyUsd === 0))
          verified.unshift({
            name: 'Free',
            monthlyUsd: 0,
            billing: 'Free plan',
            quote: facts.freePlan.quote,
          });
        if (verified.length) {
          plans = verified.map((p, i) => ({
            id: i === 0 ? planId : stableId(`${item.slug}:plan:${p.name}`),
            toolId,
            tier: p.name,
            region: 'US / USD as listed on the vendor page',
            currency: 'USD',
            monthlyPrice: p.monthlyUsd,
            billingBasis: p.billing,
            seatLimit: null,
            usageLimit: null,
            sourceId: pricingSource,
            checkedAt: facts.checkedAt,
            expiresAt: factExpiry,
          }));
          if (!cleaned.length)
            plans.push({
              id: stableId(`${item.slug}:plan:paid`),
              toolId,
              tier: 'Paid plans',
              region: 'US / USD where cited; confirm local availability',
              currency: 'USD',
              monthlyPrice: null,
              billingBasis: null,
              seatLimit: null,
              usageLimit: item.pricing.notes,
              sourceId: pricingSource,
              checkedAt: facts.checkedAt,
              expiresAt: factExpiry,
            });
          verified.forEach((p, i) => {
            const id = i === 0 ? planId : stableId(`${item.slug}:plan:${p.name}`);
            factClaim('monthly_price', p.monthlyUsd, pricingSource, id);
            factClaim('price_quote', p.quote, pricingSource, id);
          });
          const scope = claims.find((c) => (c as { key: string }).key === 'pricing_scope') as {
            value: string;
            sourceId: string;
            observedAt: string;
            expiresAt: string;
          };
          Object.assign(scope, {
            value:
              'Plan prices as listed on the vendor pricing page on the checked date. Taxes, seats, usage and add-ons may change the total.',
            sourceId: pricingSource,
            observedAt: facts.checkedAt,
            expiresAt: factExpiry,
          });
        }
      }
      if (facts.trial) {
        const src = sourceAt(facts.trial.url, facts.pricingTitle ?? `${item.name} pricing`);
        factClaim('free_trial_days', facts.trial.days, src);
        factClaim('free_trial_quote', facts.trial.quote, src);
      }
      if (facts.customers && usableCustomerQuote(facts.customers.quote))
        factClaim(
          'vendor_customer_claim',
          facts.customers.quote,
          sourceAt(facts.customers.url, `${item.name} official site`),
        );
      if (facts.setup && usableSetupQuote(facts.setup.quote))
        factClaim(
          'vendor_setup_claim',
          facts.setup.quote,
          sourceAt(facts.setup.url, `${item.name} official site`),
        );
    }
    return catalogRecordSchema.parse({
      tool: {
        id: toolId,
        slug: item.slug,
        name: item.name,
        vendor: item.vendor,
        website: item.website,
        canonicalKey: canonicalIdentity(item.website, item.name),
        aliases: item.aliases ?? [],
        libraryWorkflows: item.libraryWorkflows ?? [],
        businessTypes: item.businessTypes ?? [],
        jobs: item.jobs,
        status: 'published',
        version: facts ? 2 : 1,
        fictional: false,
        summary: item.summary,
        categories: ['AI software'],
        setupDifficulty: 'unknown',
        technicalRequirements: [],
        limitations: item.limitations,
        unresolvedQuestions: item.unknowns,
      },
      plans,
      sources,
      claims,
      review: {
        checkedAt,
        reviewedBy: 'Repository source review (automated)',
        scope: 'source_check_only',
        notes:
          'Research snapshot checked against official documentation. No independent product test, customer review or business-specific suitability approval is claimed.',
      },
    });
  });
}
