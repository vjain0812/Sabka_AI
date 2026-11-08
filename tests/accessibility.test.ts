import { afterEach, describe, expect, it, vi } from 'vitest';
import summaries from '@/lib/domain/tool-summaries-es.json';
import data from '@/lib/domain/tool-accessibility.json';
import {
  accessFit,
  accessHelpers,
  accessNeeds,
  catalogHelpers,
  helpersByNeed,
  needFeatures,
  toolFeatures,
} from '@/lib/domain/accessibility';
import { emptyBrief, draftSchema } from '@/lib/domain/brief';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import { rankTools, recommend, type RecommendRequest } from '@/lib/server/recommender';

const now = Date.parse('2026-11-08T12:00:00Z');
const base: RecommendRequest = {
  problem: '',
  category: '',
  budgetUsd: 500,
  setupMinutes: 600,
  channels: [],
  currentSystems: [],
  subscriptions: '',
  access: [],
  exclude: [],
  useAi: false,
  locale: 'en',
  consent: true,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('accessibility data', () => {
  it('only references catalog tools and https sources', () => {
    const slugs = new Set(Object.keys(summaries));
    for (const list of Object.values(data.features))
      for (const s of list) expect(slugs).toContain(s);
    for (const s of data.technicalSetup) expect(slugs).toContain(s);
    for (const [s, st] of Object.entries(data.statements)) {
      expect(slugs).toContain(s);
      expect(st.url).toMatch(/^https:\/\//);
      expect(st.quote.length).toBeGreaterThan(20);
    }
    for (const h of catalogHelpers) expect(slugs).toContain(h.slug);
    for (const h of accessHelpers) expect(h.url).toMatch(/^https:\/\//);
  });

  it('offers at least two helpers for every need on its own', () => {
    for (const need of accessNeeds) {
      const [group] = helpersByNeed([need]);
      expect(group.helpers.length + group.catalog.length, need).toBeGreaterThanOrEqual(2);
    }
  });

  it('never repeats a helper across groups', () => {
    const ids = helpersByNeed(accessNeeds).flatMap((g) => [
      ...g.helpers.map((h) => h.id),
      ...g.catalog,
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps every need to features some tool actually has', () => {
    for (const need of accessNeeds) {
      const tools = Object.keys(summaries).filter((slug) =>
        toolFeatures(slug).some((f) => needFeatures[need].includes(f)),
      );
      expect(tools.length, need).toBeGreaterThan(0);
    }
  });
});

describe('accessFit', () => {
  it('does nothing without needs', () => {
    expect(accessFit('smith-ai', [])).toEqual({ helps: [], cautions: [], boost: 0 });
  });

  it('explains how a tool helps', () => {
    const fit = accessFit('smith-ai', ['deaf_hoh', 'new_to_tech']);
    expect(fit.helps).toEqual(['answers_calls', 'human_help']);
    expect(fit.boost).toBeGreaterThan(0);
  });

  it('cautions new-to-tech owners about technical setup', () => {
    const fit = accessFit('zapier-ai', ['new_to_tech']);
    expect(fit.cautions).toContain('technical_setup');
    expect(fit.boost).toBeLessThan(0);
  });

  it('uses published statements for screen-reader users', () => {
    expect(accessFit('grammarly', ['blind']).helps).toContain('statement');
    expect(accessFit('grammarly', ['blind']).cautions).not.toContain('no_statement');
    expect(accessFit('jobber', ['blind']).cautions).toContain('no_statement');
  });
});

describe('brief', () => {
  it('defaults older saved briefs to no accessibility needs', () => {
    const old = emptyBrief() as unknown as { profile: Record<string, unknown> };
    delete old.profile.access;
    expect(draftSchema.parse(old).profile.access).toEqual([]);
  });
});

describe('recommender with accessibility needs', () => {
  const problem = 'I miss customer phone calls all day and cannot keep up';

  it('re-orders but never adds unrelated tools', () => {
    const plain = rankTools(researchedCatalog(), { ...base, problem }, now).scored;
    const access = rankTools(
      researchedCatalog(),
      { ...base, problem, access: ['deaf_hoh'] },
      now,
    ).scored;
    expect(new Set(access.map((s) => s.record.tool.slug))).toEqual(
      new Set(plain.map((s) => s.record.tool.slug)),
    );
    const helped = access.filter((s) => s.access.helps.includes('answers_calls'));
    expect(helped.length).toBeGreaterThan(0);
    for (const s of helped) {
      const before = plain.find((p) => p.record.tool.slug === s.record.tool.slug)!;
      expect(s.score).toBeGreaterThanOrEqual(before.score);
    }
  });

  it('returns personal helper tools from the catalog', async () => {
    const rec = await recommend(
      researchedCatalog(),
      { ...base, problem, access: ['reading'] },
      now,
    );
    expect(rec.helpers.map((h) => h.slug)).toContain('speechify');
  });

  it('never sends the owner’s needs to the AI model', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ picks: [], note: null }) } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    await recommend(
      researchedCatalog(),
      { ...base, problem, access: ['deaf_hoh', 'memory_focus'], useAi: true },
      now,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = String(((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body);
    for (const word of ['deaf', 'memory', 'hearing', 'disab'])
      expect(body.toLowerCase()).not.toContain(word);
    expect(body).toContain('suits_owner_needs');
  });
});
