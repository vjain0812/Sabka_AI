import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectIntents } from '@/lib/domain/intents';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import {
  isGrounded,
  localize,
  rankTools,
  recommend,
  recommendRequestSchema,
  redact,
  type RecommendRequest,
} from '@/lib/server/recommender';

const now = Date.parse('2026-11-08T12:00:00Z');
const base: RecommendRequest = {
  problem: '',
  category: '',
  budgetUsd: 50,
  setupMinutes: 60,
  channels: [],
  currentSystems: [],
  subscriptions: '',
  access: [],
  exclude: [],
  useAi: false,
  locale: 'en',
  consent: true,
};
const ask = (overrides: Partial<RecommendRequest>) => ({ ...base, ...overrides });
const top = async (overrides: Partial<RecommendRequest>, n = 3) =>
  (await recommend(researchedCatalog(), ask(overrides), now)).picks
    .slice(0, n)
    .map((p) => p.record.tool.slug);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('need detection', () => {
  it('hears plain-language problems', () => {
    const labels = detectIntents('Customers keep calling to ask if their order is ready').map(
      (i) => i.id,
    );
    expect(labels).toEqual(
      expect.arrayContaining(['missed_calls', 'orders', 'customer_questions']),
    );
    expect(detectIntents('hi')).toEqual([]);
  });
});

describe('rules ranking', () => {
  it('recommends tools made for the owner’s trade, including non-MVP jobs', async () => {
    expect(
      await top(
        {
          problem: 'Customers keep calling to ask if their laundry is ready',
          category: 'Laundromat',
          budgetUsd: 150,
          channels: ['Phone'],
        },
        2,
      ),
    ).toEqual(expect.arrayContaining(['cleancloud', 'cents']));
    expect(
      await top(
        {
          problem: 'I cannot tell when to irrigate and spot crop disease late',
          category: 'Farming',
          budgetUsd: 0,
        },
        4,
      ),
    ).toEqual(expect.arrayContaining(['plantix']));
    expect(
      await top(
        {
          problem: 'I miss customer calls while on a job and forget addresses',
          category: 'HVAC or home services',
        },
        2,
      ),
    ).toEqual(expect.arrayContaining(['jobber', 'housecall-pro']));
  });

  it('never shows the empty-catalog dead end for a real problem', async () => {
    const result = await recommend(
      researchedCatalog(),
      ask({
        problem: 'We are a tailoring shop and alterations pile up every week',
        category: 'Tailoring',
      }),
      now,
    );
    expect(result.picks.length).toBeGreaterThan(0);
    expect(result.method).toBe('rules');
  });

  it('sets aside tools whose documented price exceeds the budget', () => {
    const { scored, setAside } = rankTools(
      researchedCatalog(),
      ask({ problem: 'Write marketing blog posts and ads for my store', budgetUsd: 10 }),
      Date.parse('2026-11-07T12:00:00Z'),
    );
    expect(setAside.some((s) => s.slug === 'jasper')).toBe(true);
    expect(scored.some((s) => s.record.tool.slug === 'jasper')).toBe(false);
  });

  it('flags tools the owner already pays for', () => {
    const { scored } = rankTools(
      researchedCatalog(),
      ask({
        problem: 'Keeping up with bookkeeping and receipts is hard',
        subscriptions: 'QuickBooks, Gmail',
      }),
      now,
    );
    const owned = scored.find((s) => s.record.tool.slug === 'quickbooks-accounting-ai');
    expect(owned?.alreadyUsed).toBe(true);
    expect(owned?.reasons[0]).toMatch(/already use/);
  });

  it('is deterministic for the same request', async () => {
    const input = {
      problem: 'Clients forget appointments and I reschedule all day',
      category: 'Salon or wellness' as const,
    };
    expect(await top(input, 6)).toEqual(await top(input, 6));
  });
});

describe('privacy and AI safety', () => {
  it('validates input strictly and removes contact details', () => {
    expect(recommendRequestSchema.safeParse({ ...base, problem: 'short' }).success).toBe(false);
    expect(
      recommendRequestSchema.safeParse({ ...base, problem: 'long enough text', extra: 1 }).success,
    ).toBe(false);
    expect(redact('Email me at jo@example.com or call +1 (555) 123-4567, see https://x.io')).toBe(
      'Email me at [email] or call [phone], see [link]',
    );
  });

  it('only keeps AI picks from the candidate list and replaces ungrounded claims', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    picks: [
                      {
                        id: 't2',
                        fit: 'strong',
                        why: 'Sends WhatsApp booking reminders for $5 a month.',
                      },
                      { id: 't99', fit: 'strong', why: 'Invented tool.' },
                      {
                        id: 't1',
                        fit: 'good',
                        why: 'Tracks every laundry order so customers know when it is ready.',
                      },
                    ],
                    note: null,
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await recommend(
      researchedCatalog(),
      ask({
        problem: 'Customers keep calling to ask if their laundry is ready',
        category: 'Laundromat',
        useAi: true,
      }),
      now,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
    const sent = JSON.parse(
      String(
        (fetchMock.mock.calls[0] as unknown[])[1] &&
          ((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body,
      ),
    );
    expect(sent.model).toBe('anthropic/claude-haiku-5.5');
    expect(result.method).toBe('rules+ai');
    expect(result.picks).toHaveLength(2);
    // The unsupported price and channel claim is replaced by the rules explanation.
    expect(result.picks[0].why).not.toContain('$5');
    expect(result.picks[0].aiRanked).toBe(true);
  });

  it('falls back to rules when the model fails', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    const result = await recommend(
      researchedCatalog(),
      ask({
        problem: 'Clients forget appointments and I reschedule all day',
        category: 'Salon or wellness',
        useAi: true,
      }),
      now,
    );
    expect(result.method).toBe('rules');
    expect(result.picks.length).toBeGreaterThan(0);
  });

  it('checks feature words against the tool’s sourced text', () => {
    expect(isGrounded('Answers your phone calls.', 'AI phone agent that answers calls')).toBe(true);
    expect(isGrounded('Sends WhatsApp reminders.', 'AI phone agent that answers calls')).toBe(
      false,
    );
  });
});

describe('Spanish output', () => {
  it('translates needs, reasons, explanations and prices for Spanish requests', async () => {
    const input = ask({
      problem: 'Customers keep calling to ask if their laundry is ready',
      category: 'Laundromat',
      budgetUsd: 150,
      channels: ['Phone'],
      locale: 'es',
    });
    const result = localize(await recommend(researchedCatalog(), input, now), 'es');
    const text = JSON.stringify([
      result.needs,
      result.picks.map((p) => [p.why, p.reasons, p.price]),
    ]);
    expect(text).not.toMatch(/Handles |Made for|Covers |Price needs|Free plan|\bfits budget/);
    expect(result.needs.join(' ')).toMatch(/Pedidos|Llamadas|preguntas/);
    expect(result.picks.some((p) => p.reasons.some((r) => /Resuelve:|Hecha para/.test(r)))).toBe(
      true,
    );
  });
  it('leaves English output unchanged', async () => {
    const result = localize(
      await recommend(
        researchedCatalog(),
        ask({
          problem: 'Customers keep calling about laundry orders',
          category: 'Laundromat',
          budgetUsd: 150,
        }),
        now,
      ),
      'en',
    );
    expect(result.picks[0].reasons.join(' ')).toMatch(/Handles|Made for/);
  });
});
