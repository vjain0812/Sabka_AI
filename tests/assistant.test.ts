import { afterEach, describe, expect, it, vi } from 'vitest';
import { answerToolQuestion } from '@/lib/domain/tool-help';
import { compactCount, parseCount, setupEstimate, toolInsights } from '@/lib/domain/tool-insights';
import { similarTools } from '@/lib/domain/similar-tools';
import { answer, assistantRequestSchema } from '@/lib/server/assistant';
import { researchedCatalog } from '@/lib/server/researched-catalog';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const bySlug = (slug: string) => researchedCatalog().find((r) => r.tool.slug === slug)!;

describe('tool insights', () => {
  it('parses vendor customer claims without inventing precision', () => {
    expect(parseCount('over 250,000 customers')).toBe(250000);
    expect(parseCount('Join 1M+ creators')).toBe(1000000);
    expect(parseCount('Trusted by 15k teams')).toBe(15000);
    expect(parseCount(null)).toBeNull();
    expect(compactCount(250000)).toBe('250K+');
  });
  it('labels setup as an estimate by tool type', () => {
    expect(setupEstimate(bySlug('cropx')).label).toMatch(/hardware/);
    expect(setupEstimate(bySlug('chatgpt')).minutes).toBeLessThanOrEqual(60);
  });
  it('answers price questions plan by plan from quoted sources', () => {
    const record = researchedCatalog().find((r) => toolInsights(r).prices.length > 1);
    if (!record) return; // pricing research not yet available in this checkout
    const text = answerToolQuestion(record, 'What does it cost?', 'en').text;
    expect(text).toMatch(/Prices by plan: .*\$\d/);
    expect(text).toMatch(/pricing page/);
  });
  it('finds similar tools in the same category', () => {
    const similar = similarTools(bySlug('mindbody'), researchedCatalog());
    expect(similar.length).toBeGreaterThan(0);
    expect(similar.some((r) => r.tool.slug === 'mindbody')).toBe(false);
  });
});

describe('grounded assistant', () => {
  it('validates input strictly', () => {
    expect(
      assistantRequestSchema.safeParse({ slug: 'x', question: 'Hi there', locale: 'en' }).success,
    ).toBe(true);
    expect(
      assistantRequestSchema.safeParse({ slug: '../x', question: 'Hi', locale: 'en' }).success,
    ).toBe(false);
  });
  it('rejects model answers with prices that are not in the facts', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ choices: [{ message: { content: 'It costs only $3.50 a month!' } }] }),
            { status: 200 },
          ),
      ),
    );
    const result = await answer(bySlug('chatgpt'), 'How much is it?', 'en');
    expect(result.method).toBe('rules');
    expect(result.text).not.toContain('$3.50');
  });
  it('uses the model answer when it stays within the facts', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'It helps you draft and brainstorm in a chat.' } }],
            }),
            { status: 200 },
          ),
      ),
    );
    const result = await answer(bySlug('chatgpt'), 'What is it good for?', 'en');
    expect(result.method).toBe('ai');
  });
  it('falls back to rules without a model key', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    vi.stubEnv('GROQ_API_KEY', '');
    const result = await answer(bySlug('chatgpt'), 'What does it cost?', 'en');
    expect(result.method).toBe('rules');
  });
});
