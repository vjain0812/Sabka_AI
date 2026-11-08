import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const hash = (c: string) => c.repeat(64).slice(0, 64);
const goal = (name: string) =>
  JSON.stringify({ profile: { name, category: 'Home bakery' }, need: { problem: 'Orders' } });
const GRANNY = '11111111-1111-4111-8111-111111111111';
const STRANGER = '22222222-2222-4222-8222-222222222222';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-ins for Supabase: roles, auth.users and auth.uid() from the request JWT.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${GRANNY}'), ('${STRANGER}');`);
  await db.exec(await readFile('supabase/migrations/202611090001_journey.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202611090002_journey_accounts.sql', 'utf8'));
}, 60000);
afterAll(async () => {
  await db?.close();
});
/** Run as anon, optionally signed in as a user (like PostgREST with a user JWT). */
async function as<T>(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(
    `set request.jwt.claim.sub = '${user ?? ''}'; set role ${user ? 'authenticated' : 'anon'};`,
  );
  try {
    const [row] = (await db.query<{ v: T }>(sql, params)).rows;
    return row.v;
  } finally {
    await db.exec(`reset role; set request.jwt.claim.sub = '';`);
  }
}
const create = (user: string | null, token: string, name: string) =>
  as<{ id: string; goalId: string }>(
    user,
    `select public.journey_create($1, $2::jsonb, 'journey-1') as v`,
    [hash(token), goal(name)],
  );
const businesses = (user: string | null) =>
  as<{ id: string; profile: { name: string }; toolCount: number }[]>(
    user,
    'select public.account_journeys() as v',
  );

describe('journey accounts migration (real PostgreSQL via PGlite)', () => {
  it('lets one account hold several businesses, opened without the device key', async () => {
    const bakery = await create(GRANNY, 'a', 'Granny’s Bakery');
    const salon = await create(GRANNY, 'b', 'Maria’s Salon');
    expect(
      await as(GRANNY, 'select public.journey_save_tool($1, null, $2, null) as v', [
        salon.id,
        'fresha',
      ]),
    ).toBe('ok');
    const list = await businesses(GRANNY);
    expect(list.map((b) => b.profile.name).sort()).toEqual(['Granny’s Bakery', 'Maria’s Salon']);
    expect(list.find((b) => b.id === salon.id)?.toolCount).toBe(1);
    expect(
      await as(GRANNY, 'select public.journey_get($1, null) is not null as v', [bakery.id]),
    ).toBe(true);
  });

  it('keeps businesses private to their account', async () => {
    const [mine] = await businesses(GRANNY);
    expect(await businesses(STRANGER)).toEqual([]);
    expect(await businesses(null)).toEqual([]);
    expect(await as(STRANGER, 'select public.journey_get($1, null) as v', [mine.id])).toBeNull();
    expect(
      await as(STRANGER, 'select public.journey_save_tool($1, null, $2, null) as v', [
        mine.id,
        'bakesy',
      ]),
    ).toBe('forbidden');
    expect(await as(STRANGER, 'select public.journey_delete($1, null) as v', [mine.id])).toBe(
      false,
    );
  });

  it('still works with only the device key, and can be claimed into an account once', async () => {
    const device = await create(null, 'c', 'Device bakery');
    expect(
      await as(null, 'select public.journey_get($1, $2) is not null as v', [device.id, hash('c')]),
    ).toBe(true);
    expect(await as(null, 'select public.journey_claim($1, $2) as v', [device.id, hash('c')])).toBe(
      false,
    );
    expect(
      await as(STRANGER, 'select public.journey_claim($1, $2) as v', [device.id, hash('x')]),
    ).toBe(false);
    expect(
      await as(STRANGER, 'select public.journey_claim($1, $2) as v', [device.id, hash('c')]),
    ).toBe(true);
    expect(
      await as(GRANNY, 'select public.journey_claim($1, $2) as v', [device.id, hash('c')]),
    ).toBe(false);
    expect((await businesses(STRANGER)).map((b) => b.id)).toEqual([device.id]);
  });

  it('lets the owner delete one business without touching the others', async () => {
    const before = await businesses(GRANNY);
    expect(await as(GRANNY, 'select public.journey_delete($1, null) as v', [before[0].id])).toBe(
      true,
    );
    expect((await businesses(GRANNY)).length).toBe(before.length - 1);
  });

  it('caps an account at 20 businesses', async () => {
    const existing = (await businesses(GRANNY)).length;
    for (let i = existing; i < 20; i++) await create(GRANNY, String.fromCharCode(100 + i), `B${i}`);
    await expect(create(GRANNY, 'z', 'One too many')).rejects.toThrow(/Business limit/);
  });
});
