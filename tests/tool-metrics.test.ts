import { describe, expect, it } from 'vitest';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import {
  costMetric,
  integrationFriction,
  roiScenario,
  setupDifficulty,
  systemsToConnect,
  type IntegrationContext,
} from '@/lib/domain/tool-metrics';

const catalog = researchedCatalog();
const tool = (slug: string) => catalog.find((r) => r.tool.slug === slug)!;
const ctx = (over: Partial<IntegrationContext> = {}): IntegrationContext => ({
  currentSystems: [],
  subscriptions: '',
  requiredIntegrations: '',
  manualHandoffAllowed: false,
  ...over,
});

describe('worth it? scenario', () => {
  it('reproduces the worked payback example', () => {
    // 5 hours saved a month, $15/hour, $25/month, $30 one-time setup.
    const r = roiScenario({
      hoursPerWeek: 5 / (52 / 12),
      percentSaved: 100,
      hourlyValue: 15,
      monthlyCost: 25,
      setupCost: 30,
    });
    expect(r.netPerMonth).toBe(50);
    expect(r.paybackMonths).toBe(0.6);
    expect(r.paybackWeeks).toBe(2.6);
    expect(r.evidence).toBe('yours');
  });

  it('says plainly when a tool costs more than it saves, with no payback', () => {
    const r = roiScenario({
      hoursPerWeek: 1,
      percentSaved: 10,
      hourlyValue: 15,
      monthlyCost: 50,
      setupCost: 30,
    });
    expect(r.coversCost).toBe(false);
    expect(r.paybackMonths).toBeNull();
  });
});

describe('setup difficulty rubric', () => {
  it('rates do-it-yourself automation builders harder than ready-made apps', () => {
    expect(setupDifficulty(tool('n8n-ai')).level).toBe('advanced');
    expect(setupDifficulty(tool('grammarly')).level).toBe('easy');
    expect(setupDifficulty(tool('smith-ai')).score).toBeLessThan(
      setupDifficulty(tool('zapier-ai')).score,
    );
  });

  it('weights sum to 1 and every factor carries evidence', () => {
    const s = setupDifficulty(tool('bakesy'));
    expect(s.factors.reduce((sum, f) => sum + f.weight, 0)).toBeCloseTo(1);
    for (const f of s.factors) expect(f.evidence).toBeTruthy();
  });
});

describe('integration friction', () => {
  it('is zero friction from integrations when there is nothing to connect', () => {
    const r = integrationFriction(tool('grammarly'), ctx({ currentSystems: ['Notebook'] }));
    expect(r.components.I).toBe(0);
    expect(r.level).toBe('low');
  });

  it('uses vendor sources as evidence of a connection', () => {
    const r = integrationFriction(tool('octane-ai'), ctx({ subscriptions: 'Shopify' }));
    expect(r.systems[0]).toMatchObject({
      name: 'Shopify',
      method: 'native',
      evidence: 'vendor',
    });
  });

  it('refuses to guess an unverified required connection', () => {
    const r = integrationFriction(tool('grammarly'), ctx({ requiredIntegrations: 'Toast' }));
    expect(r.score).toBeNull();
    expect(r.level).toBe('unknown');
    expect(r.unverifiedRequired).toEqual(['Toast']);
  });

  it('counts copying by hand when the owner allows it', () => {
    const r = integrationFriction(
      tool('grammarly'),
      ctx({ requiredIntegrations: 'Toast', manualHandoffAllowed: true }),
    );
    expect(r.components.I).toBe(40);
    expect(r.score).not.toBeNull();
  });

  it('de-duplicates and ignores systems with nothing to connect', () => {
    expect(
      systemsToConnect(
        ctx({
          currentSystems: ['Notebook', 'None yet', 'POS'],
          subscriptions: 'Square, square',
          requiredIntegrations: 'Square',
        }),
      ).map((s) => s.name),
    ).toEqual(['Square', 'POS']);
  });
});

describe('cost', () => {
  it('only labels a price verified when a current sourced plan exists', () => {
    for (const r of catalog.slice(0, 40)) {
      const c = costMetric(r);
      expect(c.evidence).toBe(c.monthly !== null || c.free ? 'verified' : 'unverified');
    }
  });
});
