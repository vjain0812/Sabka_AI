import { z } from 'zod';
import type { BusinessBrief } from './brief';

/** No business name, problem narrative, goals or customer data crosses this boundary. */
export const matchRequestSchema = z
  .object({
    job: z.enum([
      'customer_reply_drafting',
      'marketing_content',
      'appointment_organization',
      'other',
    ]),
    budgetUsd: z.number().min(0).max(100000),
    setupMinutes: z.number().int().min(0).max(10080),
    manualHandoffAllowed: z.boolean(),
    requiredIntegrations: z.array(z.string().trim().min(1).max(120)).max(10),
    humanApprovalRequired: z.literal(true),
    privacy: z.enum(['standard', 'sensitive', 'unknown']),
    accessibilityRequired: z.boolean(),
    consent: z.literal(true),
  })
  .strict();
export type MatchRequest = z.infer<typeof matchRequestSchema>;
export function matchingConstraints(brief: BusinessBrief): MatchRequest {
  return matchRequestSchema.parse({
    job: brief.need.job,
    budgetUsd: brief.need.monthlyBudgetUsd,
    setupMinutes: brief.need.setupMinutes,
    manualHandoffAllowed: brief.need.manualHandoffAllowed,
    requiredIntegrations: brief.need.requiredIntegrations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    humanApprovalRequired: true,
    privacy: brief.dataSources.some((s) => s.sensitivity === 'sensitive') ? 'sensitive' : 'unknown',
    accessibilityRequired: Boolean(brief.profile.accessibilityNeeds?.trim()),
    consent: true,
  });
}
