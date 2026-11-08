import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const hash = (c: string) => c.repeat(64).slice(0, 64);
const goal = (problem: string) =>
  JSON.stringify({ profile: { name: 'Granny', category: 'Home bakery' }, need: { problem } });
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;`);
  await db.exec(await readFile('supabase/migrations/202611090001_journey.sql', 'utf8'));
}, 60000);
afterAll(async () => {
  await db?.close();
});
async function asAnon<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  await db.exec('set role anon;');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
}
async function one<T>(sql: string, params: unknown[] = []) {
  const [row] = await asAnon<{ v: T }>(sql, params);
  return row.v;
}
async function create(token: string, problem = 'Customers forget cake order details') {
  return one<{ id: string; goalId: string }>(
    `select public.journey_create($1, $2::jsonb, 'journey-1') as v`,
    [hash(token), goal(problem)],
  );
}
type JourneyRow = {
  goals: { id: string }[];
  tools: {
    slug: string;
    goalId: string | null;
    status: string | null;
    feedback: { helpful: string; reason: string | null; minutesBefore: number | null } | null;
  }[];
};
const get = (id: string, token: string) =>
  one<JourneyRow | null>('select public.journey_get($1, $2) as v', [id, hash(token)]);

describe('My AI Journey migration (real PostgreSQL via PGlite)', () => {
  it('denies direct table and helper access to anonymous callers', async () => {
    for (const table of [
      'journeys',
      'journey_goals',
      'saved_tools',
      'tool_adoptions',
      'tool_feedback',
    ])
      await expect(asAnon(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
    await expect(asAnon(`select public.journey_owns(gen_random_uuid(), 'x')`)).rejects.toThrow(
      /permission denied/,
    );
  });

  it('requires a well-formed key to start a journey', async () => {
    await expect(
      asAnon(`select public.journey_create('short', $1::jsonb, 'journey-1')`, [goal('x')]),
    ).rejects.toThrow(/Invalid key/);
  });

  it('only opens a journey with its own key', async () => {
    const { id } = await create('a');
    expect(await get(id, 'a')).not.toBeNull();
    expect(await get(id, 'b')).toBeNull();
    expect(
      await one('select public.journey_save_tool($1, $2, $3, null) as v', [
        id,
        hash('b'),
        'bakesy',
      ]),
    ).toBe('forbidden');
  });

  it('saves, adopts and records feedback against the original goal', async () => {
    const { id, goalId } = await create('c');
    const args = [id, hash('c')];
    expect(
      await one('select public.journey_save_tool($1, $2, $3, $4) as v', [
        ...args,
        'bakesy',
        goalId,
      ]),
    ).toBe('ok');
    expect(
      await one(`select public.journey_add_feedback($1, $2, $3, '{"helpful":"yes"}') as v`, [
        ...args,
        'bakesy',
      ]),
    ).toBe('not_adopted');
    expect(
      await one(`select public.journey_set_status($1, $2, $3, 'trying') as v`, [...args, 'bakesy']),
    ).toBe('ok');
    expect(
      await one(`select public.journey_set_status($1, $2, $3, 'using') as v`, [...args, 'bakesy']),
    ).toBe('ok');
    expect(
      await one(
        `select public.journey_add_feedback($1, $2, $3, '{"helpful":"no","reason":"too_hard"}') as v`,
        [...args, 'bakesy'],
      ),
    ).toBe('ok');
    expect(
      await one(
        `select public.journey_add_feedback($1, $2, $3, '{"helpful":"yes","minutesBefore":120,"minutesAfter":30}') as v`,
        [...args, 'bakesy'],
      ),
    ).toBe('ok');
    const j = (await get(id, 'c'))!;
    expect(j.tools).toHaveLength(1);
    expect(j.tools[0]).toMatchObject({ slug: 'bakesy', goalId, status: 'using' });
    // Latest feedback only.
    expect(j.tools[0].feedback).toMatchObject({ helpful: 'yes', reason: null, minutesBefore: 120 });
  });

  it('rejects unknown statuses, bad slugs and other journeys’ goals', async () => {
    const { id } = await create('d');
    const other = await create('e');
    const args = [id, hash('d')];
    expect(
      await one('select public.journey_save_tool($1, $2, $3, $4) as v', [
        ...args,
        'bakesy',
        other.goalId,
      ]),
    ).toBe('bad_goal');
    await expect(
      asAnon('select public.journey_save_tool($1, $2, $3, null)', [...args, 'Not A Slug']),
    ).rejects.toThrow(/check constraint/);
    await asAnon('select public.journey_save_tool($1, $2, $3, null)', [...args, 'bakesy']);
    await expect(
      asAnon(`select public.journey_set_status($1, $2, $3, 'loved')`, [...args, 'bakesy']),
    ).rejects.toThrow(/check constraint/);
  });

  it('limits saved tools and goals', async () => {
    const { id } = await create('f');
    const args = [id, hash('f')];
    for (let i = 0; i < 30; i++)
      expect(
        await one('select public.journey_save_tool($1, $2, $3, null) as v', [...args, `tool-${i}`]),
      ).toBe('ok');
    expect(
      await one('select public.journey_save_tool($1, $2, $3, null) as v', [...args, 'tool-31']),
    ).toBe('limit');
    // Re-saving an existing tool is still allowed at the limit.
    expect(
      await one('select public.journey_save_tool($1, $2, $3, null) as v', [...args, 'tool-0']),
    ).toBe('ok');
    for (let i = 0; i < 9; i++)
      await asAnon('select public.journey_add_goal($1, $2, $3::jsonb)', [...args, goal(`g${i}`)]);
    await expect(
      asAnon('select public.journey_add_goal($1, $2, $3::jsonb)', [...args, goal('one more')]),
    ).rejects.toThrow(/Goal limit/);
  });

  it('removing a tool removes its adoption and feedback; deleting cascades everything', async () => {
    const { id } = await create('g');
    const args = [id, hash('g')];
    await asAnon('select public.journey_save_tool($1, $2, $3, null)', [...args, 'bakesy']);
    await asAnon(`select public.journey_set_status($1, $2, $3, 'trying')`, [...args, 'bakesy']);
    await asAnon(`select public.journey_add_feedback($1, $2, $3, '{"helpful":"somewhat"}')`, [
      ...args,
      'bakesy',
    ]);
    expect(
      await one('select public.journey_remove_tool($1, $2, $3) as v', [...args, 'bakesy']),
    ).toBe(true);
    const counts = await db.query<{ a: number; f: number }>(
      `select (select count(*)::int from public.tool_adoptions where journey_id = $1) as a,
              (select count(*)::int from public.tool_feedback f join public.tool_adoptions t
                 on t.id = f.adoption_id where t.journey_id = $1) as f`,
      [id],
    );
    expect(counts.rows[0]).toEqual({ a: 0, f: 0 });
    expect(await one('select public.journey_delete($1, $2) as v', [id, hash('x')])).toBe(false);
    expect(await one('select public.journey_delete($1, $2) as v', args)).toBe(true);
    const left = await db.query<{ n: number }>(
      'select count(*)::int as n from public.journey_goals where journey_id = $1',
      [id],
    );
    expect(left.rows[0].n).toBe(0);
  });
});
