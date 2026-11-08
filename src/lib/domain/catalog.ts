import { z } from 'zod';
import { dataSourceSchema } from './brief';

export const implementationStatusSchema = z.enum([
  'implemented',
  'demo-fixture',
  'pending-verification',
  'planned',
  'unavailable',
]);
export const publicationStatusSchema = z.enum([
  'draft',
  'pending_review',
  'verified',
  'published',
  'held',
  'rejected',
  'expired',
]);
const id = z.string().uuid();
const date = z.iso.datetime();
const publicUrl = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'Evidence URLs must use HTTPS.');
export const sourceSchema = z.object({
  id,
  url: publicUrl,
  provider: z.string().min(1),
  type: z.enum([
    'official',
    'policy',
    'internal_test',
    'licensed_review',
    'independent',
    'community',
  ]),
  permissionBasis: z.string().min(1),
  allowedStorage: z.boolean(),
  allowedDisplay: z.boolean(),
  attribution: z.string(),
  retentionDays: z.number().int().nonnegative().nullable(),
});
export const toolSchema = z.object({
  id,
  vendor: z.string().min(1),
  name: z.string().min(1),
  canonicalKey: z.string().min(1),
  aliases: z.array(z.string()),
  jobs: z.array(
    z.enum(['customer_reply_drafting', 'marketing_content', 'appointment_organization']),
  ),
  status: publicationStatusSchema,
  version: z.number().int().positive(),
  fictional: z.boolean(),
});
export const toolPlanSchema = z.object({
  id,
  toolId: id,
  tier: z.string().min(1),
  region: z.string().min(1),
  currency: z.string().length(3),
  monthlyPrice: z.number().nonnegative().nullable(),
  billingBasis: z.string().nullable(),
  seatLimit: z.number().int().positive().nullable(),
  usageLimit: z.string().nullable(),
  sourceId: id.nullable(),
  checkedAt: date.nullable(),
  expiresAt: date.nullable(),
});
export const toolClaimSchema = z
  .object({
    id,
    toolId: id,
    planId: id.nullable(),
    region: z.string().min(1),
    key: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    sourceId: id,
    status: z.enum(['documented', 'team_tested', 'user_reported', 'unknown', 'conflicting']),
    reviewStatus: publicationStatusSchema,
    observedAt: date,
    expiresAt: date,
    reviewerId: id.nullable(),
    conflictResolution: z.string().nullable(),
  })
  .refine((c) => c.expiresAt > c.observedAt, 'Expiration must follow observation.');
export const discoveryCandidateSchema = z.object({
  id,
  runId: id,
  canonicalKey: z.string().min(1),
  name: z.string().min(1),
  sourceIds: z.array(id),
  status: z.enum(['discovered_unreviewed', 'pending_review', 'held', 'rejected', 'published']),
  discoveredAt: date,
  reviewerId: id.nullable(),
  proposedClaims: z.array(toolClaimSchema),
});
export type Tool = z.infer<typeof toolSchema>;
export type ToolPlan = z.infer<typeof toolPlanSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type ToolClaim = z.infer<typeof toolClaimSchema>;
export type DiscoveryCandidate = z.infer<typeof discoveryCandidateSchema>;
export type DataSource = z.infer<typeof dataSourceSchema>;
export type FitDimension =
  | 'jobCapability'
  | 'easeAccessibility'
  | 'compatibility'
  | 'incrementalCost'
  | 'humanControl';
export type FitGrade = {
  grade: 0 | 1 | 2 | 3 | 4;
  reason: string;
  unknown: boolean;
  claimIds: string[];
};
export type Recommendation = {
  toolId: string;
  planId: string;
  eligibility: 'eligible' | 'blocked' | 'needs_verification';
  reasons: string[];
  fit: { score: number; grades: Record<FitDimension, FitGrade> } | null;
  evidence: { checks: string[]; coverage: 'high' | 'moderate' | 'limited' };
  risks: string[];
};
export type AdoptionPlan = {
  id: string;
  choice: 'existing_tools' | 'one_tool';
  toolId: string | null;
  baseline: string;
  successMeasure: string;
  costAssumptions: string[];
  tasks: { day: number; action: string; humanCheckpoint: boolean; completed: boolean }[];
  sampleDataInstructions: string;
  exitSteps: string[];
};
