import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { researchedCatalog } from '@/lib/server/researched-catalog';

const admin = '10000000-0000-4000-8000-000000000001';
const guest = '10000000-0000-4000-8000-000000000002';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    insert into auth.users values('${admin}'),('${guest}');`);
  await db.exec(await readFile('supabase/migrations/202611060001_business_foundation.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/202611060002_verified_catalog.sql', 'utf8'));
  await db.exec(`insert into public.catalog_admins(user_id) values('${admin}');`);
}, 60000);
afterAll(async () => {
  await db?.close();
});
async function asRole(role: string, id: string, sql: string, params: unknown[] = []) {
  await db.exec(`set role ${role};`);
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}
describe('Real PostgreSQL migration, publication and RLS (embedded PGlite)', () => {
  it('applies both additive migrations', async () => {
    const result = await db.query(`select tablename from pg_tables where schemaname='public'`);
    expect(result.rows.length).toBeGreaterThanOrEqual(12);
  });
  it('denies anonymous and non-admin review calls', async () => {
    await expect(
      asRole(
        'anon',
        '',
        `select public.review_candidate($1,1,'publish','test review note',true,null)`,
        [admin],
      ),
    ).rejects.toThrow();
    await expect(
      asRole(
        'authenticated',
        guest,
        `select public.review_candidate($1,1,'publish','test review note',true,null)`,
        [admin],
      ),
    ).rejects.toThrow(/Admin required/);
  });
  it('does not expose candidates or allow direct authenticated catalog writes', async () => {
    expect(
      (await asRole('authenticated', guest, 'select * from public.discovery_candidates')).rows,
    ).toEqual([]);
    await expect(asRole('authenticated', admin, `delete from public.tools`)).rejects.toThrow(
      /permission denied/,
    );
  });
  it('requires verify before publish; publishes atomically with evidence and audit', async () => {
    const input = {
      idempotencyKey: crypto.randomUUID(),
      job: 'marketing_content',
      problem: 'Plan accurate business posts',
      requirement: 'human review',
      monthlyBudgetUsd: 40,
      permissionsConfirmed: true,
    };
    const run = (
      await asRole(
        'authenticated',
        admin,
        `select (public.enqueue_discovery($1::jsonb,$2::jsonb,'tavily')).*`,
        [JSON.stringify(input), JSON.stringify(['test query'])],
      )
    ).rows[0] as { id: string };
    expect(
      (
        await asRole('authenticated', admin, 'select public.claim_discovery($1) as claimed', [
          run.id,
        ])
      ).rows,
    ).toEqual([{ claimed: true }]);
    const record = researchedCatalog()[0];
    record.tool.status = 'pending_review';
    const id = crypto.randomUUID();
    await asRole(
      'authenticated',
      admin,
      `select public.finish_discovery($1,'completed',$2::jsonb,1,'Controlled integration fixture, not live discovery')`,
      [run.id, JSON.stringify([{ id, canonicalKey: record.tool.canonicalKey, record }])],
    );
    expect((await asRole('anon', '', 'select * from public.tools')).rows).toEqual([]);
    await expect(
      asRole(
        'authenticated',
        admin,
        `select public.review_candidate($1,1,'publish','Source reviewed for test',true,null)`,
        [id],
      ),
    ).rejects.toThrow(/unchanged verified/);
    await asRole(
      'authenticated',
      admin,
      `select public.review_candidate($1,1,'verify','Official source checked in test',true,$2::jsonb)`,
      [id, JSON.stringify(record)],
    );
    await expect(
      asRole(
        'authenticated',
        admin,
        `select public.review_candidate($1,1,'publish','Stale browser version test',true,null)`,
        [id],
      ),
    ).rejects.toThrow(/Candidate changed/);
    await asRole(
      'authenticated',
      admin,
      `select public.review_candidate($1,2,'publish','Publish source-checked test record',true,null)`,
      [id],
    );
    expect((await asRole('anon', '', 'select * from public.tools')).rows).toHaveLength(1);
    expect(
      (await asRole('anon', '', 'select * from public.tool_claims')).rows.length,
    ).toBeGreaterThan(0);
    expect(
      (await asRole('authenticated', admin, 'select * from public.catalog_audit_events')).rows,
    ).toHaveLength(2);
    await asRole(
      'authenticated',
      admin,
      `select public.review_candidate($1,3,'hold','Withdraw pending renewed source review',false,null)`,
      [id],
    );
    expect((await asRole('anon', '', 'select * from public.tools')).rows).toEqual([]);
    expect((await asRole('anon', '', 'select * from public.sources')).rows).toEqual([]);
  });
  it('rejects missing sources and conflicting evidence in the database', async () => {
    const record = researchedCatalog()[1];
    record.sources = [];
    await expect(
      db.query('select public.validate_catalog_evidence($1::jsonb)', [JSON.stringify(record)]),
    ).rejects.toThrow(/source/);
    const conflict = researchedCatalog()[1];
    conflict.claims[0].status = 'conflicting';
    await expect(
      db.query('select public.validate_catalog_evidence($1::jsonb)', [JSON.stringify(conflict)]),
    ).rejects.toThrow(/conflict/);
  });
  it('keeps Phase 1 business profiles private', async () => {
    await expect(asRole('anon', '', 'select * from public.business_profiles')).rejects.toThrow(
      /permission denied/,
    );
    expect(
      (await asRole('authenticated', guest, 'select * from public.business_profiles')).rows,
    ).toEqual([]);
  });
});
