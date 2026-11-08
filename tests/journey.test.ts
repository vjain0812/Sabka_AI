import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { emptyBrief, type BusinessBrief } from '@/lib/domain/brief';
import {
  briefFromGoal,
  excludedSlugs,
  goalBriefSchema,
  goalFromBrief,
  journeyActionSchema,
  journeyStats,
  sameGoal,
  type Journey,
} from '@/lib/domain/journey';
import { PreviewJourneyStore } from '@/lib/server/journey-store';
import { researchedCatalog } from '@/lib/server/researched-catalog';
import { NOT_FOR_YOU, localize, recommend, type RecommendRequest } from '@/lib/server/recommender';

function brief(): BusinessBrief {
  const b = emptyBrief();
  b.profile = { ...b.profile, name: 'Granny', category: 'Home bakery', access: ['low_vision'] };
  b.need = {
    ...b.need,
    job: 'appointment_organization',
    problem: 'Customers forget cake order details and I miss orders',
    monthlyBudgetUsd: 20,
    setupMinutes: 60,
    channels: ['WhatsApp'],
    currentSystems: ['Notebook'],
  };
  return b;
}
const tool = (slug: string, extra: Partial<Journey['tools'][number]> = {}) => ({
  slug,
  goalId: 'g1',
  savedAt: '2026-11-08T00:00:00Z',
  status: null,
  statusAt: null,
  feedback: null,
  ...extra,
});
const feedback = (
  helpful: 'yes' | 'somewhat' | 'no',
  before: number | null,
  after: number | null,
) => ({
  helpful,
  reason: null,
  note: '',
  minutesBefore: before,
  minutesAfter: after,
  createdAt: '2026-11-08T00:00:00Z',
});

describe('journey domain', () => {
  it('stores matching inputs but never accessibility answers', () => {
    const goal = goalFromBrief(brief());
    expect(JSON.stringify(goal)).not.toContain('low_vision');
    expect(
      goalBriefSchema.safeParse({ ...goal, profile: { ...goal.profile, access: ['blind'] } })
        .success,
    ).toBe(false);
  });

  it('restores a goal while keeping this device’s accessibility answers', () => {
    const current = emptyBrief();
    current.profile.access = ['deaf_hoh'];
    const restored = briefFromGoal(goalFromBrief(brief()), current);
    expect(restored.need.problem).toContain('cake');
    expect(restored.profile.access).toEqual(['deaf_hoh']);
  });

  it('matches goals by problem text, ignoring case and spacing', () => {
    const a = goalFromBrief(brief());
    const b = { ...a, need: { ...a.need, problem: `  ${a.need.problem.toUpperCase()} ` } };
    expect(sameGoal(a, b)).toBe(true);
  });

  it('only reports numbers the owner gave us', () => {
    const j: Journey = {
      id: 'j',
      createdAt: '',
      goals: [{ id: 'g1', brief: goalFromBrief(brief()), createdAt: '' }],
      tools: [
        tool('bakesy', { status: 'using', feedback: feedback('yes', 120, 30) }),
        tool('square-pos', { status: 'trying' }),
        tool('jotform-ai-agents', { status: 'stopped', feedback: feedback('no', null, null) }),
        tool('tally', { feedback: feedback('no', null, null) }),
      ],
    };
    expect(journeyStats(j)).toEqual({
      saved: 4,
      trying: 1,
      using: 1,
      solved: 1,
      goals: 1,
      minutesSavedPerWeek: 90,
    });
    expect(journeyStats({ ...j, tools: [tool('bakesy')] }).minutesSavedPerWeek).toBeNull();
    expect(excludedSlugs(j).sort()).toEqual(['jotform-ai-agents', 'tally']);
  });

  it('validates actions strictly', () => {
    expect(
      journeyActionSchema.safeParse({ type: 'status', slug: 'bakesy', status: 'loved' }).success,
    ).toBe(false);
    expect(
      journeyActionSchema.safeParse({ type: 'save', slug: '../x', goalId: null }).success,
    ).toBe(false);
    expect(
      journeyActionSchema.safeParse({
        type: 'feedback',
        slug: 'bakesy',
        feedback: { helpful: 'yes', minutesBefore: 99999 },
      }).success,
    ).toBe(false);
  });
});

describe('preview journey store', () => {
  let dir = '';
  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  const key = (c: string) => ({ tokenHash: c.repeat(64), userId: null, accessToken: null });
  const account = (userId: string) => ({ tokenHash: null, userId, accessToken: null });
  const noFeedback = {
    helpful: 'yes' as const,
    reason: null,
    note: '',
    minutesBefore: null,
    minutesAfter: null,
  };
  async function fresh() {
    dir ||= await mkdtemp(path.join(os.tmpdir(), 'journey-'));
    const file = path.join(dir, `journey-${Math.random().toString(36).slice(2)}.json`);
    return { file, store: new PreviewJourneyStore(file) };
  }

  it('persists the full save → adopt → feedback flow to disk', async () => {
    const { file, store } = await fresh();
    const a = key('a');
    const { id, goalId } = await store.create('a'.repeat(64), goalFromBrief(brief()), a);
    expect(await store.saveTool(id, key('b'), 'bakesy', goalId)).toBe('forbidden');
    expect(await store.saveTool(id, a, 'bakesy', goalId)).toBe('ok');
    expect(await store.addFeedback(id, a, 'bakesy', noFeedback)).toBe('not_adopted');
    expect(await store.setStatus(id, a, 'bakesy', 'using')).toBe('ok');
    expect(
      await store.addFeedback(id, a, 'bakesy', {
        ...noFeedback,
        minutesBefore: 60,
        minutesAfter: 15,
      }),
    ).toBe('ok');
    // A fresh store reads the same file: the journey survives a restart ("tomorrow").
    const reopened = await new PreviewJourneyStore(file).get(id, a);
    expect(reopened?.tools[0]).toMatchObject({ slug: 'bakesy', status: 'using', goalId });
    expect(reopened?.tools[0].feedback?.minutesBefore).toBe(60);
    expect(await new PreviewJourneyStore(file).get(id, key('c'))).toBeNull();
    expect(await store.remove(id, a)).toBe(true);
    expect(await store.get(id, a)).toBeNull();
  });

  it('keeps several businesses per account, private to that account', async () => {
    const { store } = await fresh();
    const owner = account('11111111-1111-4111-8111-111111111111');
    const stranger = account('22222222-2222-4222-8222-222222222222');
    const bakery = goalFromBrief(brief());
    const salon = {
      ...bakery,
      profile: { ...bakery.profile, name: 'Maria’s Salon', category: 'Salon or wellness' as const },
    };
    const b1 = await store.create('d'.repeat(64), bakery, owner);
    const b2 = await store.create('e'.repeat(64), salon, owner);
    expect(await store.saveTool(b2.id, owner, 'fresha', b2.goalId)).toBe('ok');
    const list = await store.listForAccount(owner);
    expect(list.map((b) => b.id)).toEqual([b2.id, b1.id]);
    expect(list[0]).toMatchObject({ toolCount: 1, profile: { name: 'Maria’s Salon' } });
    expect(await store.listForAccount(stranger)).toEqual([]);
    expect(await store.get(b1.id, stranger)).toBeNull();
    expect(await store.saveTool(b1.id, stranger, 'bakesy', null)).toBe('forbidden');
  });

  it('claims a device journey into an account exactly once', async () => {
    const { store } = await fresh();
    const device = key('f');
    const owner = account('33333333-3333-4333-8333-333333333333');
    const { id } = await store.create('f'.repeat(64), goalFromBrief(brief()), device);
    expect(await store.claim(id, 'x'.repeat(64), owner)).toBe(false);
    expect(await store.claim(id, 'f'.repeat(64), owner)).toBe(true);
    expect((await store.listForAccount(owner)).map((b) => b.id)).toEqual([id]);
    // Already claimed: another account can't take it, even with the key.
    expect(
      await store.claim(id, 'f'.repeat(64), account('44444444-4444-4444-8444-444444444444')),
    ).toBe(false);
  });
});

describe('recommendations respect the journey', () => {
  const base: RecommendRequest = {
    problem: 'Customers forget cake order details and I miss orders',
    category: 'Home bakery',
    budgetUsd: 100,
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
  it('sets aside tools the owner said didn’t work, with a plain reason', async () => {
    const now = Date.parse('2026-11-08T12:00:00Z');
    const first = await recommend(researchedCatalog(), base, now);
    const ruledOut = first.picks[0].record.tool.slug;
    const next = await recommend(researchedCatalog(), { ...base, exclude: [ruledOut] }, now);
    expect(next.picks.map((p) => p.record.tool.slug)).not.toContain(ruledOut);
    expect(next.setAside[0]).toMatchObject({ slug: ruledOut, reason: NOT_FOR_YOU });
    expect(localize(next, 'es').setAside[0].reason).toBe('Dijiste que no te funcionó');
  });
});
