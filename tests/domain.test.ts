import { describe, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
import { businessBriefSchema, draftSchema, emptyBrief, issuesForStep } from '@/lib/domain/brief';
import { assessReadiness } from '@/lib/domain/readiness';
import { demoProfiles, fixtureMetadata } from '@/lib/fixtures/businesses';
import { decodeSession, SESSION_TTL } from '@/lib/domain/session';
import { sourceSchema, toolClaimSchema, toolPlanSchema } from '@/lib/domain/catalog';
import { catalog, discovery, matching } from '@/lib/server/contracts';
import { POST } from '@/app/api/recommendations/route';
import { GET as adminGet, POST as adminPost } from '@/app/api/admin/[...path]/route';

const baker = () => structuredClone(demoProfiles.baker);
describe('Business briefs', () => {
  it('starts with an incomplete draft, not an invented business', () => {
    expect(draftSchema.safeParse(emptyBrief()).success).toBe(true);
    expect(businessBriefSchema.safeParse(emptyBrief()).success).toBe(false);
  });
  it.each(Object.entries(demoProfiles))('validates fictional %s fixture', (_, brief) => {
    expect(businessBriefSchema.safeParse(brief).success).toBe(true);
    expect(fixtureMetadata.fictional).toBe(true);
    expect(fixtureMetadata.containsVendorClaims).toBe(false);
  });
  it('allows zero spend and zero setup time without treating a blank as zero', () => {
    const b = baker();
    b.need.monthlyBudgetUsd = 0;
    b.need.setupMinutes = 0;
    expect(businessBriefSchema.safeParse(b).success).toBe(true);
    b.need.monthlyBudgetUsd = null;
    expect(issuesForStep(b, 3)['need.monthlyBudgetUsd']).toBeDefined();
  });
  it.each([-1, 100001, 1.123, Infinity, NaN])('rejects invalid budget %s', (budget) => {
    const b = baker();
    b.need.monthlyBudgetUsd = budget;
    expect(businessBriefSchema.safeParse(b).success).toBe(false);
  });
  it.each([-1, 0.5, 10081])('rejects invalid setup time %s', (minutes) => {
    const b = baker();
    b.need.setupMinutes = minutes;
    expect(businessBriefSchema.safeParse(b).success).toBe(false);
  });
  it('requires Other business description and preserves unsupported jobs', () => {
    const b = baker();
    b.profile.category = 'Other';
    b.need.job = 'other';
    expect(issuesForStep(b, 0)['profile.otherCategory']).toBeDefined();
    b.profile.otherCategory = 'Bicycle repair';
    expect(businessBriefSchema.parse(b).need.job).toBe('other');
  });
  it('cannot disable mandatory human approval via a tampered payload', () => {
    const b = baker();
    expect(
      businessBriefSchema.safeParse({
        ...b,
        boundaries: { ...b.boundaries, humanApprovalRequired: false },
      }).success,
    ).toBe(false);
  });
  it('keeps partial source drafts while blocking empty names at confirmation', () => {
    const b = baker();
    b.dataSources[0].name = '';
    expect(draftSchema.safeParse(b).success).toBe(true);
    expect(issuesForStep(b, 2)['dataSources.0.name']).toBeDefined();
  });
  it('reports only the current step’s issues until final review', () => {
    expect(Object.keys(issuesForStep(emptyBrief(), 0))).toEqual(['profile.category']);
    expect(Object.keys(issuesForStep(emptyBrief(), 4))).toContain('need.monthlyBudgetUsd');
  });
});

describe('Readiness without invented tool matches', () => {
  it('uses reported information and provides a no-purchase baker step', () => {
    const r = assessReadiness(baker());
    expect(r.nextStep).toContain('notebook or spreadsheet');
    expect(r.items.find((i) => i.title === 'Permission to use data')?.state).toBe('unknown');
  });
  it('does not hardcode readiness by category', () => {
    const a = baker();
    const b = baker();
    b.profile.category = 'Landscaping';
    expect(assessReadiness(a)).toEqual(assessReadiness(b));
  });
  it('responds to different jobs and reported data', () => {
    const r = assessReadiness(demoProfiles.hvac);
    expect(r.nextStep).toContain('human-confirmation');
    expect(r.items.find((i) => i.title === 'Information you can reuse')?.state).toBe('ready');
  });
  it('never transforms unsupported work into a supported job', () => {
    const b = baker();
    b.need.job = 'other';
    const r = assessReadiness(b);
    expect(r.supported).toBe(false);
    expect(r.nextStep).toContain('current process');
  });
  it('treats missing permissions and sensitivity as unknown', () => {
    const b = baker();
    b.dataSources = [];
    const r = assessReadiness(b);
    expect(r.items.find((i) => i.title === 'Permission to use data')?.state).toBe('unknown');
    // No sources is not evidence that privacy has been assessed.
    expect(r.items.find((i) => i.title === 'Sensitive information')?.state).toBe('unknown');
  });
});

describe('Versioned local storage', () => {
  const now = 1794000000000;
  const saved = () => ({
    version: 1,
    brief: baker(),
    step: 4,
    confirmedAt: null,
    updatedAt: now,
    demoId: null,
  });
  it('round-trips a draft', () =>
    expect(decodeSession(JSON.stringify(saved()), now).session?.brief).toEqual(baker()));
  it('expires stale data', () =>
    expect(decodeSession(JSON.stringify(saved()), now + SESSION_TTL + 1).session).toBeNull());
  it.each(['broken JSON', '{}', '{"version":2}', 'x'.repeat(100001)])(
    'recovers from invalid or oversized stored data',
    (raw) => {
      expect(decodeSession(raw, now).session).toBeNull();
      expect(decodeSession(raw, now).error).toBeTruthy();
    },
  );
  it('rejects forged confirmation of an incomplete brief', () => {
    expect(
      decodeSession(
        JSON.stringify({
          ...saved(),
          brief: emptyBrief(),
          confirmedAt: new Date(now).toISOString(),
        }),
        now,
      ).session,
    ).toBeNull();
  });
});

describe('Evidence and unavailable server boundaries', () => {
  const id = 'e7dca7ad-1d08-4e4f-8bb6-610befaf5b91';
  it('preserves unknown prices instead of filling zero', () => {
    const p = toolPlanSchema.parse({
      id,
      toolId: id,
      tier: 'Unknown',
      region: 'US',
      currency: 'USD',
      monthlyPrice: null,
      billingBasis: null,
      seatLimit: null,
      usageLimit: null,
      sourceId: null,
      checkedAt: null,
      expiresAt: null,
    });
    expect(p.monthlyPrice).toBeNull();
  });
  it('rejects executable source URLs', () => {
    expect(
      sourceSchema.safeParse({
        id,
        url: 'javascript:alert(1)',
        provider: 'sample',
        type: 'official',
        permissionBasis: 'unknown',
        allowedStorage: false,
        allowedDisplay: false,
        attribution: '',
        retentionDays: null,
      }).success,
    ).toBe(false);
  });
  it('requires observation before claim expiry', () => {
    expect(
      toolClaimSchema.safeParse({
        id,
        toolId: id,
        planId: null,
        region: 'US',
        key: 'price',
        value: null,
        sourceId: id,
        status: 'unknown',
        reviewStatus: 'draft',
        observedAt: '2026-11-06T00:00:00Z',
        expiresAt: '2026-11-05T00:00:00Z',
        reviewerId: null,
        conflictResolution: null,
      }).success,
    ).toBe(false);
  });
  it('returns honest unimplemented services with no pretend candidates or scores', async () => {
    expect((await catalog.publishedTools()).status).toBe('implemented');
    expect((await discovery.discover('fake-admin', 'query')).status).toBe('unavailable');
    expect((await matching.match(baker())).status).toBe('planned');
  });
  it('denies public admin reads and mutations', async () => {
    const context = { params: Promise.resolve({ path: ['candidates'] }) };
    const response = await adminGet(
      new Request('http://localhost:3000/api/admin/candidates'),
      context,
    );
    expect(response.status).toBe(401);
    expect(
      (
        await adminPost(
          new Request('http://localhost:3000/api/admin/candidates', {
            method: 'POST',
            headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
            body: '{}',
          }),
          context,
        )
      ).status,
    ).toBe(401);
    expect(await response.json()).not.toHaveProperty('candidates');
  });
  it('validates recommendation requests and refuses to invent matches', async () => {
    const invalid = await POST(
      new Request('http://localhost/api/recommendations', { method: 'POST', body: '{}' }),
    );
    expect(invalid.status).toBe(400);
    const valid = await POST(
      new Request('http://localhost/api/recommendations', {
        method: 'POST',
        body: JSON.stringify(baker()),
      }),
    );
    expect(valid.status).toBe(503);
    expect(await valid.json()).not.toHaveProperty('recommendations');
  });
  it('bounds body size without relying on Content-Length', async () => {
    const response = await POST(
      new Request('http://localhost/api/recommendations', {
        method: 'POST',
        body: 'x'.repeat(32769),
      }),
    );
    expect(response.status).toBe(413);
  });
});
