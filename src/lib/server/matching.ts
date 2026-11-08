import 'server-only';
import { currentPlanPrice, freshness, type CatalogRecord } from '@/lib/domain/catalog-record';
import type { MatchRequest } from '@/lib/domain/match-request';

export const MATCHER_VERSION = 'constraints-1.0.0';
export type ReasonCode =
  | 'unsupported_job'
  | 'job'
  | 'capability'
  | 'price'
  | 'budget'
  | 'approval'
  | 'privacy'
  | 'integration'
  | 'accessibility'
  | 'setup'
  | 'conflict';
export type Evaluation = {
  record: CatalogRecord;
  planId: string | null;
  status: 'eligible' | 'needs_verification' | 'blocked';
  reasons: ReasonCode[];
  score: number | null;
  evidenceChecks: string[];
  coverage: 'limited' | 'moderate' | 'high';
  grades: number[] | null;
};
export function evaluateTool(
  record: CatalogRecord,
  input: MatchRequest,
  now = Date.now(),
): Evaluation | null {
  if (record.tool.status !== 'published' || record.tool.fictional) return null;
  const source = (id: string) => record.sources.find((s) => s.id === id);
  const current = record.claims.filter((c) => {
    const s = source(c.sourceId);
    return (
      s &&
      s.reviewStatus === 'verified' &&
      s.allowedDisplay &&
      ['documented', 'team_tested'].includes(c.status) &&
      ['verified', 'published'].includes(c.reviewStatus) &&
      freshness(c.observedAt, c.expiresAt, now) === 'current' &&
      freshness(s.checkedAt, s.expiresAt, now) === 'current'
    );
  });
  const plans = record.plans.length ? record.plans : [null];
  const evaluations = plans.map((plan) => {
    const reasons: ReasonCode[] = [];
    let blocked = false;
    const applicable = current.filter((c) => c.planId === plan?.id);
    const fact = (key: string) =>
      applicable.find(
        (c) =>
          c.key === key &&
          (['official', 'policy'].includes(source(c.sourceId)?.type ?? '') ||
            (source(c.sourceId)?.type === 'internal_test' && c.status === 'team_tested')),
      );
    const requireFact = (key: string, reason: ReasonCode) => {
      const claim = fact(key);
      if (!claim || claim.value !== true) {
        reasons.push(reason);
        if (claim?.value === false) blocked = true;
      }
    };
    if (input.job === 'other') {
      reasons.push('unsupported_job');
      blocked = true;
    } else if (!record.tool.jobs.includes(input.job)) {
      reasons.push('job');
      blocked = true;
    }
    if (
      !applicable.some(
        (c) =>
          c.key === 'capability' &&
          c.status === 'documented' &&
          source(c.sourceId)?.type === 'official',
      )
    )
      reasons.push('capability');
    const base = plan ? currentPlanPrice(record, plan, now) : null;
    const total = fact('total_monthly_cost');
    const cost = total && typeof total.value === 'number' && total.value >= 0 ? total.value : null;
    if ((cost !== null && cost > input.budgetUsd) || (base !== null && base > input.budgetUsd)) {
      reasons.push('budget');
      blocked = true;
    }
    if (cost === null) reasons.push('price');
    if (cost !== null && base !== null && cost < base) reasons.push('conflict');
    requireFact('human_approval_enforced', 'approval');
    requireFact(
      input.privacy === 'sensitive' ? 'sensitive_data_suitability' : 'privacy_suitability',
      'privacy',
    );
    if (input.privacy === 'unknown') reasons.push('privacy');
    for (const integration of input.requiredIntegrations)
      requireFact(`integration:${integration.toLowerCase()}`, 'integration');
    if (!input.requiredIntegrations.length)
      requireFact(
        input.manualHandoffAllowed ? 'manual_handoff_tested' : 'existing_system_compatibility',
        'integration',
      );
    if (input.accessibilityRequired)
      requireFact('accessibility_requirements_verified', 'accessibility');
    const minutes = fact('setup_minutes')?.value;
    if (typeof minutes === 'number' && minutes > input.setupMinutes) {
      reasons.push('setup');
      blocked = true;
    }
    if (record.claims.some((c) => c.status === 'conflicting' && !c.conflictResolution)) {
      reasons.push('conflict');
    }
    const critical = applicable.filter((c) => c.key !== 'capability' && c.key !== 'pricing_scope');
    if (
      critical.some((c) => critical.some((other) => other.key === c.key && other.value !== c.value))
    )
      reasons.push('conflict');
    const status = blocked ? 'blocked' : reasons.length ? 'needs_verification' : 'eligible';
    const checks: string[] = [];
    if (applicable.some((c) => source(c.sourceId)?.type === 'official')) checks.push('official');
    if (applicable.some((c) => source(c.sourceId)?.type === 'policy')) checks.push('policy');
    if (
      applicable.some(
        (c) => c.status === 'team_tested' && source(c.sourceId)?.type === 'internal_test',
      )
    )
      checks.push('tested');
    if (
      applicable.some((c) =>
        ['independent', 'licensed_review', 'community'].includes(source(c.sourceId)?.type ?? ''),
      )
    )
      checks.push('independent');
    const origins = new Set(
      applicable.map((c) => new URL(source(c.sourceId)!.url).hostname.replace(/^www\./, '')),
    );
    if (origins.size > 1 && checks.includes('independent')) checks.push('corroborated');
    const coverage =
      checks.length >= 4 &&
      checks.includes('official') &&
      checks.includes('tested') &&
      !reasons.includes('conflict')
        ? 'high'
        : checks.length >= 2
        ? 'moderate'
        : 'limited';
    // Anchored grades are source-backed. Unknown soft dimensions receive zero.
    const ease =
      typeof minutes === 'number'
        ? minutes === 0
          ? 4
          : minutes <= 30
          ? 3
          : minutes <= 60
          ? 2
          : 1
        : 0;
    const accessibility = fact('accessibility_requirements_verified')?.value === true;
    const grades =
      status === 'eligible'
        ? [
            4,
            accessibility ? ease : Math.min(ease, 2),
            input.requiredIntegrations.length ? 4 : 2,
            cost === 0 ? 4 : cost !== null && cost <= input.budgetUsd / 2 ? 3 : 2,
            fact('reversible')?.value === true ? 4 : 2,
          ]
        : null;
    const score = grades
      ? Number(grades.reduce((sum, g, i) => sum + ([30, 25, 20, 15, 10][i] * g) / 4, 0).toFixed(2))
      : null;
    return {
      record,
      planId: plan?.id ?? null,
      status,
      reasons: [...new Set(reasons)],
      score,
      evidenceChecks: checks,
      coverage,
      grades,
    } as Evaluation;
  });
  const order = { eligible: 0, needs_verification: 1, blocked: 2 };
  return evaluations.sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      (b.score ?? -1) - (a.score ?? -1) ||
      a.reasons.length - b.reasons.length ||
      String(a.planId).localeCompare(String(b.planId)),
  )[0];
}
export function matchCatalog(records: CatalogRecord[], input: MatchRequest, now = Date.now()) {
  const all = records
    .map((r) => evaluateTool(r, input, now))
    .filter((r): r is Evaluation => r !== null);
  const alpha = (a: Evaluation, b: Evaluation) =>
    a.record.tool.name.localeCompare(b.record.tool.name) ||
    a.record.tool.id.localeCompare(b.record.tool.id);
  const eligible = all
    .filter((r) => r.status === 'eligible')
    .sort(
      (a, b) =>
        (b.score ?? 0) - (a.score ?? 0) || a.reasons.length - b.reasons.length || alpha(a, b),
    )
    .slice(0, 3);
  const needsVerification = all
    .filter((r) => r.status === 'needs_verification')
    .sort((a, b) => {
      const pa = a.record.plans[0],
        pb = b.record.plans[0];
      return (
        Number(!pa || currentPlanPrice(a.record, pa, now) === null) -
          Number(!pb || currentPlanPrice(b.record, pb, now) === null) || alpha(a, b)
      );
    })
    .slice(0, 3);
  return {
    matcherVersion: MATCHER_VERSION,
    eligible,
    needsVerification,
    blocked: all.filter((r) => r.status === 'blocked').sort(alpha),
    existingToolsFirst: true,
  };
}
