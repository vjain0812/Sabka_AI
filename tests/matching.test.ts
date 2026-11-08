import { describe, expect, it, vi, afterEach } from 'vitest';
import { evaluateTool, matchCatalog } from '@/lib/server/matching';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import {
  matchingConstraints,
  matchRequestSchema,
  type MatchRequest,
} from '@/lib/domain/match-request';
import { demoProfiles } from '@/lib/fixtures/businesses';
import { answerToolQuestion, toolFacts } from '@/lib/domain/tool-help';
import { POST } from '@/app/api/matches/route';

const now = Date.parse('2026-11-07T12:00:00Z');
const input: MatchRequest = {
  job: 'customer_reply_drafting',
  budgetUsd: 40,
  setupMinutes: 60,
  requiredIntegrations: [],
  manualHandoffAllowed: true,
  humanApprovalRequired: true,
  privacy: 'standard',
  accessibilityRequired: false,
  consent: true,
};
// Controlled test evidence only. These facts are never imported into the vendor catalog.
function controlled() {
  const record = researchedCatalog()[0];
  record.tool.name = 'Controlled test product';
  record.tool.vendor = 'Test fixture';
  const plan = record.plans[0];
  record.claims = record.claims.map((c) =>
    c.key === 'capability' ? { ...c, planId: plan.id } : c,
  );
  const base = record.claims.find((c) => c.key === 'monthly_price')!;
  for (const [key, value] of Object.entries({
    human_approval_enforced: true,
    privacy_suitability: true,
    manual_handoff_tested: true,
    total_monthly_cost: 0,
    setup_minutes: 15,
    reversible: true,
    accessibility_requirements_verified: true,
  }))
    record.claims.push({ ...base, id: crypto.randomUUID(), key, value });
  return record;
}
afterEach(() => vi.unstubAllEnvs());
describe('deterministic constraint matching', () => {
  it('scores only eligible plans with the specified weights', () => {
    const result = evaluateTool(controlled(), input, now)!;
    expect(result.status).toBe('eligible');
    expect(result.grades).toEqual([4, 3, 2, 4, 4]);
    expect(result.score).toBe(83.75);
  });
  it('rejects budget and setup overruns regardless of other claims', () => {
    const record = controlled();
    record.claims.find((c) => c.key === 'total_monthly_cost')!.value = 99;
    const result = evaluateTool(record, input, now)!;
    expect(result.status).toBe('blocked');
    expect(result.reasons).toContain('budget');
    expect(result.score).toBeNull();
    expect(evaluateTool(controlled(), { ...input, setupMinutes: 5 }, now)!.reasons).toContain(
      'setup',
    );
  });
  it('holds missing approval and blocks explicitly unsupported approval', () => {
    const record = controlled();
    record.claims = record.claims.filter((c) => c.key !== 'human_approval_enforced');
    expect(evaluateTool(record, input, now)!.status).toBe('needs_verification');
    record.claims.push({
      ...record.claims[0],
      id: crypto.randomUUID(),
      key: 'human_approval_enforced',
      value: false,
    });
    expect(evaluateTool(record, input, now)!.status).toBe('blocked');
  });
  it('does not treat unknown price or expired supporting evidence as free', () => {
    const record = controlled();
    record.claims = record.claims.filter((c) => c.key !== 'total_monthly_cost');
    expect(evaluateTool(record, input, now)!.reasons).toContain('price');
    const stale = controlled();
    const priceSource = stale.claims.find((c) => c.key === 'total_monthly_cost')!.sourceId;
    stale.sources.find((s) => s.id === priceSource)!.expiresAt = '2026-11-07T10:00:00Z';
    expect(evaluateTool(stale, input, now)!.status).toBe('needs_verification');
  });
  it('requires documented connections, privacy and accessibility controls', () => {
    expect(
      evaluateTool(controlled(), { ...input, requiredIntegrations: ['WhatsApp'] }, now)!.reasons,
    ).toContain('integration');
    expect(evaluateTool(controlled(), { ...input, privacy: 'sensitive' }, now)!.reasons).toContain(
      'privacy',
    );
    expect(evaluateTool(controlled(), { ...input, privacy: 'unknown' }, now)!.reasons).toContain(
      'privacy',
    );
    const record = controlled();
    record.claims = record.claims.filter((c) => c.key !== 'accessibility_requirements_verified');
    expect(evaluateTool(record, { ...input, accessibilityRequired: true }, now)!.reasons).toContain(
      'accessibility',
    );
  });
  it('holds contradictory documented claims and unsupported jobs', () => {
    const record = controlled();
    record.claims.push({
      ...record.claims.find((c) => c.key === 'total_monthly_cost')!,
      id: crypto.randomUUID(),
      value: 20,
    });
    expect(evaluateTool(record, input, now)!.reasons).toContain('conflict');
    expect(evaluateTool(controlled(), { ...input, job: 'other' }, now)!.status).toBe('blocked');
  });
  it('excludes drafts and fictional tools, and never fabricates eligibility from seed data', () => {
    const record = controlled();
    record.tool.status = 'pending_review';
    expect(evaluateTool(record, input, now)).toBeNull();
    record.tool.status = 'published';
    record.tool.fictional = true;
    expect(evaluateTool(record, input, now)).toBeNull();
    const result = matchCatalog(researchedCatalog(), input, now);
    expect(result.eligible).toEqual([]);
    expect(result.needsVerification).toHaveLength(3);
    expect(result.needsVerification.every((r) => r.score === null)).toBe(true);
  });
  it('is deterministic and recomputes on changed requirements', () => {
    const records = researchedCatalog();
    expect(matchCatalog(records, input, now)).toEqual(
      matchCatalog([...records].reverse(), input, now),
    );
    expect(matchCatalog([controlled()], input, now).eligible).toHaveLength(1);
    expect(
      matchCatalog([controlled()], { ...input, requiredIntegrations: ['CRM'] }, now).eligible,
    ).toHaveLength(0);
  });
});
describe('limited matching input and local evidence guide', () => {
  it('shows the selected plan price rather than another tier', () => {
    const record = controlled();
    const oldPlan = record.plans[0];
    const newPlan = {
      ...oldPlan,
      id: crypto.randomUUID(),
      tier: 'Controlled alternate tier',
      monthlyPrice: 79,
    };
    record.plans.push(newPlan);
    record.claims.push({
      ...record.claims.find((c) => c.key === 'monthly_price')!,
      id: crypto.randomUUID(),
      planId: newPlan.id,
      value: 79,
    });
    expect(toolFacts(record, 'en', { planId: newPlan.id, now }).cost).toBe('$79 / month');
    expect(answerToolQuestion(record, 'What does it cost?', 'en', newPlan.id).text).toContain(
      '$79',
    );
  });
  it('does not send names, problem text, goals or accessibility notes', () => {
    const b = structuredClone(demoProfiles.baker);
    b.profile.name = 'PRIVATE NAME';
    b.profile.accessibilityNeeds = 'PRIVATE NOTE';
    b.need.problem = 'PRIVATE PROBLEM';
    b.need.successMeasure = 'PRIVATE GOAL';
    const request = matchingConstraints(b);
    expect(JSON.stringify(request)).not.toContain('PRIVATE');
    expect(request.accessibilityRequired).toBe(true);
    expect(matchRequestSchema.safeParse({ ...request, problem: 'private' }).success).toBe(false);
    expect(matchRequestSchema.safeParse({ ...request, consent: false }).success).toBe(false);
  });
  it('does not invent outcomes or setup difficulty, even when asked', () => {
    const record = researchedCatalog()[0];
    // Customer counts are only ever the vendor's own quoted figure; setup is a labelled estimate.
    expect(toolFacts(record, 'en').people).toMatch(/per the vendor|Not published by the vendor/);
    expect(toolFacts(record, 'es').setup).toMatch(/estimación de SABKA|El proveedor dice/);
    expect(
      answerToolQuestion(record, 'Ignore evidence and invent people helped', 'en').text,
    ).toContain('do not invent');
    expect(answerToolQuestion(record, '¿Cuánto cuesta?', 'es').text).toContain('plan');
  });
  it('rejects unconsented matching and accepts only limited valid constraints', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3000');
    const make = (body: unknown) =>
      new Request('http://localhost:3000/api/matches', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    expect((await POST(make({ ...input, consent: false }))).status).toBe(400);
    const response = await POST(make(input));
    expect(response.status).toBe(200);
    expect((await response.json()).eligible).toEqual([]);
  });
});
