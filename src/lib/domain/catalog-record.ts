import { z } from 'zod';
import { toolSchema, sourceSchema, toolPlanSchema, toolClaimSchema } from './catalog';
import { libraryWorkflowSchema, businessTypeSchema } from './library-taxonomy';

export const jobSchema = z.enum([
  'customer_reply_drafting',
  'marketing_content',
  'appointment_organization',
]);
const bounded = z.string().trim().max(1500);
export const httpsUrlSchema = z
  .string()
  .url()
  .max(2000)
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443');
  }, 'Use a public HTTPS URL without credentials or a custom port.');
export const catalogSourceSchema = sourceSchema
  .extend({
    url: httpsUrlSchema,
    title: z.string().min(1).max(250),
    checkedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    reviewStatus: z.enum(['pending_review', 'verified', 'rejected']),
    retrieval: z.enum([
      'manual_source_check',
      'provider_result',
      'permitted_fetch',
      'internal_test',
    ]),
  })
  .refine(
    (s) => Date.parse(s.expiresAt) > Date.parse(s.checkedAt),
    'Source expiry must follow checking.',
  );
export const catalogToolSchema = toolSchema.extend({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  website: httpsUrlSchema,
  summary: bounded.min(1),
  categories: z.array(z.string().max(80)).max(15),
  setupDifficulty: z.enum(['low', 'medium', 'high', 'unknown']),
  technicalRequirements: z.array(bounded).max(15),
  limitations: z.array(bounded).max(20),
  unresolvedQuestions: z.array(bounded).max(20),
  libraryWorkflows: z.array(libraryWorkflowSchema).max(12).default([]),
  businessTypes: z.array(businessTypeSchema).max(8).default([]),
});
export const catalogRecordSchema = z.object({
  tool: catalogToolSchema,
  plans: z.array(toolPlanSchema).max(20),
  sources: z.array(catalogSourceSchema).max(30),
  claims: z.array(toolClaimSchema).max(60),
  review: z.object({
    checkedAt: z.iso.datetime().nullable(),
    reviewedBy: z.string().max(150).nullable(),
    scope: z.literal('source_check_only'),
    notes: bounded,
  }),
});
export type CatalogRecord = z.infer<typeof catalogRecordSchema>;
export type CatalogSource = z.infer<typeof catalogSourceSchema>;
export const candidateSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  canonicalKey: z.string(),
  status: z.enum([
    'discovered_unreviewed',
    'pending_review',
    'verified',
    'held',
    'rejected',
    'published',
  ]),
  version: z.number().int().positive(),
  record: catalogRecordSchema,
  discoveredAt: z.iso.datetime(),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewNote: bounded,
});
export type Candidate = z.infer<typeof candidateSchema>;
export const discoveryInputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    job: jobSchema,
    problem: z.string().trim().min(10).max(300),
    monthlyBudgetUsd: z.number().min(0).max(100000).nullable(),
    requirement: z.string().trim().max(120),
    permissionsConfirmed: z.literal(true),
  })
  .strict();
export type DiscoveryInput = z.infer<typeof discoveryInputSchema>;
export const runSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  idempotencyKey: z.string().uuid(),
  status: z.enum(['queued', 'running', 'completed', 'partial', 'failed']),
  input: discoveryInputSchema,
  queries: z.array(z.string()),
  provider: z.string(),
  createdAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  candidateCount: z.number().int().nonnegative(),
  searchCalls: z.number().int().nonnegative(),
  message: z.string().max(1000),
});
export type DiscoveryRun = z.infer<typeof runSchema>;
export const reviewInputSchema = z
  .object({
    action: z.enum(['verify', 'hold', 'reject', 'publish']),
    expectedVersion: z.number().int().positive(),
    note: z.string().trim().min(10).max(1000),
    inspectedSources: z.boolean(),
    record: catalogRecordSchema.optional(),
  })
  .strict();
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export function canonicalIdentity(website: string, product: string) {
  const host = new URL(website).hostname.toLowerCase().replace(/^www\./, '');
  const key = product
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!key) throw new Error('A product identity is required.');
  return `${host}::${key}`;
}
export function freshness(checkedAt: string, expiresAt: string, now = Date.now()) {
  if (Date.parse(checkedAt) > now + 60000) return 'unknown' as const;
  return Date.parse(expiresAt) <= now ? ('expired' as const) : ('current' as const);
}
export function evidenceIssues(record: CatalogRecord, now = Date.now()): string[] {
  const errors: string[] = [];
  const sources = new Map(record.sources.map((s) => [s.id, s]));
  const plans = new Set(record.plans.map((p) => p.id));
  if (record.tool.fictional)
    errors.push('Fictional tools cannot be published in the real catalog.');
  if (record.tool.canonicalKey !== canonicalIdentity(record.tool.website, record.tool.name))
    errors.push('Canonical product identity does not match.');
  for (const c of record.claims) {
    const s = sources.get(c.sourceId);
    if (c.toolId !== record.tool.id || (c.planId && !plans.has(c.planId)))
      errors.push('Claim has an invalid tool or plan reference.');
    if (!s) errors.push('A claim is missing its source.');
    else if (
      !s.allowedDisplay ||
      !s.allowedStorage ||
      !s.permissionBasis.trim() ||
      s.reviewStatus !== 'verified'
    )
      errors.push('A claim source has not been reviewed for use and attribution.');
    if (c.status === 'conflicting' && !c.conflictResolution)
      errors.push('Resolve or explicitly remove conflicting claims before publishing.');
    if (
      c.status !== 'unknown' &&
      (freshness(c.observedAt, c.expiresAt, now) !== 'current' ||
        !s ||
        freshness(s.checkedAt, s.expiresAt, now) !== 'current')
    )
      errors.push('A documented claim or its source is expired or future-dated.');
  }
  if (
    !record.claims.some(
      (c) =>
        c.key === 'capability' &&
        c.status === 'documented' &&
        sources.get(c.sourceId)?.type === 'official',
    )
  )
    errors.push('At least one source-checked official capability is required.');
  for (const p of record.plans) {
    if (p.toolId !== record.tool.id) errors.push('Plan references a different tool.');
    if (
      p.monthlyPrice !== null &&
      (!p.sourceId ||
        !sources.has(p.sourceId) ||
        !p.checkedAt ||
        !p.expiresAt ||
        freshness(p.checkedAt, p.expiresAt, now) !== 'current' ||
        !record.claims.some(
          (c) =>
            c.planId === p.id &&
            c.key === 'monthly_price' &&
            c.value === p.monthlyPrice &&
            c.status === 'documented',
        ))
    )
      errors.push('A known price needs a current plan-specific documented claim.');
  }
  return [...new Set(errors)];
}
export function publicRecord(record: CatalogRecord, now = Date.now()): CatalogRecord | null {
  if (record.tool.status !== 'published' || record.tool.fictional) return null;
  // Expired evidence stays visible for attribution, but is never treated as current price.
  return {
    ...record,
    plans: record.plans.map((plan) => ({
      ...plan,
      monthlyPrice: currentPlanPrice(record, plan, now),
    })),
  };
}

/** A plan date alone cannot keep a price current after its evidence expires. */
export function currentPlanPrice(
  record: CatalogRecord,
  plan: CatalogRecord['plans'][number],
  now = Date.now(),
): number | null {
  const source = record.sources.find((s) => s.id === plan.sourceId);
  if (
    plan.monthlyPrice === null ||
    !plan.checkedAt ||
    !plan.expiresAt ||
    freshness(plan.checkedAt, plan.expiresAt, now) !== 'current' ||
    !source ||
    source.reviewStatus !== 'verified' ||
    !source.allowedDisplay ||
    freshness(source.checkedAt, source.expiresAt, now) !== 'current'
  )
    return null;
  return record.claims.some(
    (c) =>
      c.planId === plan.id &&
      c.key === 'monthly_price' &&
      c.value === plan.monthlyPrice &&
      c.sourceId === source.id &&
      c.status === 'documented' &&
      freshness(c.observedAt, c.expiresAt, now) === 'current',
  )
    ? plan.monthlyPrice
    : null;
}
