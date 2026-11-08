import { describe, expect, it } from 'vitest';
import { businessBriefSchema, categories, emptyBrief } from '@/lib/domain/brief';
import { evidenceIssues } from '@/lib/domain/catalog-record';
import { matchingConstraints } from '@/lib/domain/match-request';
import {
  applyScenario,
  scenarioBySlug,
  scenarioForCategory,
  scenarioToolSlugs,
  scenarios,
} from '@/lib/domain/scenarios';
import { matchCatalog } from '@/lib/server/matching';
import { researchedCatalog } from '@/lib/server/researched-catalog';

describe('profession workflow scenarios', () => {
  it('covers the six requested professions with three tools each', () => {
    expect(scenarios.map((s) => s.profession)).toEqual([
      'Zumba Instructor',
      'Plumber / Handyman / Painter',
      'Real Estate Rental & Leasing Agent',
      'Family-Owned Laundromat',
      'Granny Baker',
      'Farmer',
    ]);
    for (const s of scenarios) {
      expect(s.tools).toHaveLength(3);
      expect(new Set(s.tools.map((t) => t.slug)).size).toBe(3);
      expect(categories).toContain(s.category);
    }
  });

  it('only references tools that exist as source-checked catalog records', () => {
    const catalog = researchedCatalog();
    const slugs = new Set(catalog.map((r) => r.tool.slug));
    for (const slug of scenarioToolSlugs()) expect(slugs.has(slug)).toBe(true);
    for (const record of researchedCatalog('scenarios')) {
      expect(evidenceIssues(record)).toEqual([]);
      expect(
        record.sources.every((s) => s.type === 'official' && s.url.startsWith('https://')),
      ).toBe(true);
    }
  });

  it('keeps every step tool inside its scenario shortlist and always includes a human step', () => {
    for (const s of scenarios) {
      const allowed = new Set(s.tools.map((t) => t.slug));
      for (const step of s.steps) if (step.toolSlug) expect(allowed.has(step.toolSlug)).toBe(true);
      expect(s.steps.some((step) => step.human)).toBe(true);
      expect(s.staysHuman.length).toBeGreaterThan(0);
      expect(s.existingOption.length).toBeGreaterThan(20);
    }
  });

  it('adds scenario tools as library references without changing personalized matching', () => {
    const added = researchedCatalog('scenarios');
    expect(added).toHaveLength(15);
    for (const record of added) expect(record.tool.jobs).toEqual([]);
    const input = {
      job: 'appointment_organization' as const,
      budgetUsd: 50,
      setupMinutes: 60,
      manualHandoffAllowed: false,
      requiredIntegrations: [],
      humanApprovalRequired: true as const,
      privacy: 'unknown' as const,
      accessibilityRequired: false,
      consent: true as const,
    };
    const now = Date.parse('2026-11-08T00:00:00Z');
    const before = matchCatalog(
      researchedCatalog().filter((r) => !added.some((a) => a.tool.id === r.tool.id)),
      input,
      now,
    );
    const after = matchCatalog(researchedCatalog(), input, now);
    expect(after.eligible).toEqual(before.eligible);
    expect(after.needsVerification.map((r) => r.record.tool.slug)).toEqual(
      before.needsVerification.map((r) => r.record.tool.slug),
    );
  });

  it('prefills a brief the owner still has to complete and confirm', () => {
    const baker = scenarioBySlug('home-baker')!;
    const brief = applyScenario(emptyBrief(), baker);
    expect(brief.profile.category).toBe('Home bakery');
    expect(brief.need.job).toBe('appointment_organization');
    expect(brief.boundaries.humanApprovalRequired).toBe(true);
    // Budget and setup time are deliberately left for the owner.
    expect(brief.need.monthlyBudgetUsd).toBeNull();
    expect(businessBriefSchema.safeParse(brief).success).toBe(false);
    const completed = { ...brief, need: { ...brief.need, monthlyBudgetUsd: 25, setupMinutes: 30 } };
    expect(businessBriefSchema.safeParse(completed).success).toBe(true);
    // Only limited constraints cross to the matcher; no problem narrative is sent.
    expect(JSON.stringify(matchingConstraints(completed))).not.toContain('WhatsApp');
  });

  it('discloses unsupported jobs instead of converting them into a supported one', () => {
    const farmer = scenarioBySlug('farmer')!;
    expect(farmer.job).toBeNull();
    expect(applyScenario(emptyBrief(), farmer).need.job).toBe('other');
    expect(scenarioForCategory('Farming')?.slug).toBe('farmer');
    expect(scenarioForCategory('Retail')).toBeNull();
  });
});

describe('Spanish workflow copy', () => {
  it('mirrors the English structure so nothing is missing or misaligned', async () => {
    const { scenariosEs } = await import('@/lib/domain/scenarios-es');
    for (const s of scenarios) {
      const es = scenariosEs[s.slug];
      expect(es, s.slug).toBeDefined();
      expect(es.pains).toHaveLength(s.pains.length);
      expect(es.steps).toHaveLength(s.steps.length);
      expect(es.roles).toHaveLength(s.tools.length);
      expect(es.staysHuman).toHaveLength(s.staysHuman.length);
      expect(es.problem.length).toBeGreaterThan(20);
    }
  });
  it('prefills the brief in Spanish and still detects needs from it', async () => {
    const { detectIntents } = await import('@/lib/domain/intents');
    const brief = applyScenario(emptyBrief(), scenarioBySlug('laundromat')!, 'es');
    expect(brief.need.problem).toMatch(/recogida|pedido/);
    expect(detectIntents(brief.need.problem).map((i) => i.id)).toEqual(
      expect.arrayContaining(['orders', 'customer_questions']),
    );
  });
  it('understands everyday Spanish descriptions', async () => {
    const { detectIntents } = await import('@/lib/domain/intents');
    const ids = (text: string) => detectIntents(text).map((i) => i.id);
    expect(ids('Los alumnos olvidan las clases y cancelan a última hora')).toEqual(
      expect.arrayContaining(['no_shows']),
    );
    expect(ids('Pierdo llamadas mientras trabajo y olvido las direcciones')).toEqual(
      expect.arrayContaining(['missed_calls']),
    );
    expect(ids('No sé cuándo regar mi cultivo')).toEqual(expect.arrayContaining(['crops']));
  });
});
