import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const hash = (c: string) => c.repeat(64).slice(0, 64);
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    grant usage on schema public to anon, authenticated, service_role;`);
  await db.exec(await readFile('supabase/migrations/202611080001_connect.sql', 'utf8'));
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
const profile = (name: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    displayName: name,
    category: 'Home bakery',
    region: 'Anytown',
    about: 'We like to share.',
    topics: ['what_worked', 'saving_time'],
    wins: [],
    visible: true,
    consent: true,
    consentVersion: 'connect-1',
    ...extra,
  });
async function create(name: string, token: string, extra: Record<string, unknown> = {}) {
  const [row] = await asAnon<{ id: string }>(
    'select public.connect_create_profile($1::jsonb, $2) as id',
    [profile(name, extra), hash(token)],
  );
  return row.id;
}

describe('Connect migration (real PostgreSQL via PGlite)', () => {
  it('denies direct table access to anonymous callers', async () => {
    await expect(asAnon('select * from public.connect_profiles')).rejects.toThrow(
      /permission denied/,
    );
    await expect(asAnon('select * from public.connect_messages')).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      asAnon(`insert into public.connect_profiles(token_hash,display_name,category,consent_version,consented_at)
              values ('${hash('a')}','Hack','Retail','x',now())`),
    ).rejects.toThrow(/permission denied/);
  });

  it('requires consent and a well-formed key to create a profile', async () => {
    await expect(
      asAnon('select public.connect_create_profile($1::jsonb, $2)', [
        profile('No consent', { consent: false }),
        hash('a'),
      ]),
    ).rejects.toThrow(/Consent required/);
    await expect(
      asAnon('select public.connect_create_profile($1::jsonb, $2)', [profile('Short key'), 'abc']),
    ).rejects.toThrow(/Invalid key/);
  });

  it('lists only visible profiles and never exposes keys or consent internals', async () => {
    const visible = await create('Visible Bakery', 'a');
    const hidden = await create('Hidden Studio', 'b', { visible: false });
    const [{ list }] = await asAnon<{ list: Record<string, unknown>[] }>(
      'select public.connect_list() as list',
    );
    const ids = list.map((p) => p.id);
    expect(ids).toContain(visible);
    expect(ids).not.toContain(hidden);
    const keys = Object.keys(list[0]);
    expect(keys).not.toContain('token_hash');
    expect(keys).not.toContain('consentedAt');
    expect(JSON.stringify(list)).not.toContain(hash('a'));
  });

  it('only the key holder can read, edit, pause or delete a profile', async () => {
    const id = await create('Mine', 'c');
    expect(
      (await asAnon('select public.connect_get_own($1, $2) as p', [id, hash('d')]))[0],
    ).toEqual({ p: null });
    const [{ p }] = await asAnon<{ p: { displayName: string; consentVersion: string } }>(
      'select public.connect_get_own($1, $2) as p',
      [id, hash('c')],
    );
    expect(p.displayName).toBe('Mine');
    expect(p.consentVersion).toBe('connect-1');
    const bad = await asAnon('select public.connect_update_profile($1, $2, $3::jsonb) as ok', [
      id,
      hash('d'),
      '{"displayName":"Hijacked"}',
    ]);
    expect(bad).toEqual([{ ok: false }]);
    const good = await asAnon('select public.connect_update_profile($1, $2, $3::jsonb) as ok', [
      id,
      hash('c'),
      '{"about":"Updated","visible":false,"topics":["team"]}',
    ]);
    expect(good).toEqual([{ ok: true }]);
    const [{ list }] = await asAnon<{ list: { id: string }[] }>(
      'select public.connect_list() as list',
    );
    expect(list.map((x) => x.id)).not.toContain(id); // paused
    expect(
      await asAnon('select public.connect_delete_profile($1, $2) as ok', [id, hash('d')]),
    ).toEqual([{ ok: false }]);
    expect(
      await asAnon('select public.connect_delete_profile($1, $2) as ok', [id, hash('c')]),
    ).toEqual([{ ok: true }]);
  });

  it('delivers messages between consenting profiles and enforces limits', async () => {
    const a = await create('Sender', 'e');
    const b = await create('Receiver', 'f');
    const send = async (from: string, key: string, to: string, body: string) =>
      (
        await asAnon<{ s: string }>('select public.connect_send($1,$2,$3,$4) as s', [
          from,
          hash(key),
          to,
          body,
        ])
      )[0].s;
    expect(await send(a, 'z', b, 'Hello there')).toBe('forbidden'); // wrong key
    expect(await send(a, 'e', a, 'Hello me')).toBe('self');
    expect(await send(a, 'e', crypto.randomUUID(), 'Hello nobody')).toBe('not_found');
    expect(await send(a, 'e', b, 'Hi! What worked for you?')).toBe('ok');
    const [{ inbox }] = await asAnon<{
      inbox: { body: string; otherName: string; mine: boolean }[];
    }>('select public.connect_inbox($1,$2) as inbox', [b, hash('f')]);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      body: 'Hi! What worked for you?',
      otherName: 'Sender',
      mine: false,
    });
    // The sender sees it as theirs; a stranger sees nothing.
    const [{ inbox: sent }] = await asAnon<{ inbox: { mine: boolean }[] }>(
      'select public.connect_inbox($1,$2) as inbox',
      [a, hash('e')],
    );
    expect(sent[0].mine).toBe(true);
    expect(
      (await asAnon('select public.connect_inbox($1,$2) as inbox', [b, hash('e')]))[0],
    ).toEqual({ inbox: null });
    // Per-recipient limit of 5 a day.
    for (let i = 0; i < 4; i++) expect(await send(a, 'e', b, `Message ${i + 2}`)).toBe('ok');
    expect(await send(a, 'e', b, 'One too many')).toBe('rate_limited');
    // Reading marks messages read for the recipient only.
    expect(
      await asAnon('select public.connect_mark_read($1,$2,$3) as ok', [b, hash('f'), a]),
    ).toEqual([{ ok: true }]);
    const [{ inbox: after }] = await asAnon<{ inbox: { readAt: string | null; mine: boolean }[] }>(
      'select public.connect_inbox($1,$2) as inbox',
      [b, hash('f')],
    );
    expect(after.every((m) => m.readAt !== null)).toBe(true);
  });

  it('does not deliver to paused profiles and erases messages when a profile is deleted', async () => {
    const a = await create('Talker', 'g');
    const b = await create('Quiet', 'h', { visible: false });
    expect(
      (
        await asAnon<{ s: string }>('select public.connect_send($1,$2,$3,$4) as s', [
          a,
          hash('g'),
          b,
          'Hello?',
        ])
      )[0].s,
    ).toBe('not_found');
    const c = await create('Leaver', 'i');
    await asAnon('select public.connect_send($1,$2,$3,$4)', [a, hash('g'), c, 'Before you go']);
    await asAnon('select public.connect_delete_profile($1,$2)', [c, hash('i')]);
    const count = await db.query(
      'select count(*)::int as n from public.connect_messages where to_id = $1',
      [c],
    );
    expect(count.rows[0]).toEqual({ n: 0 });
  });

  it('accepts reports for existing profiles only', async () => {
    const id = await create('Reported', 'j');
    expect(
      await asAnon('select public.connect_report($1, $2) as ok', [id, 'Looks like spam']),
    ).toEqual([{ ok: true }]);
    expect(
      await asAnon('select public.connect_report($1, $2) as ok', [
        crypto.randomUUID(),
        'Nothing here',
      ]),
    ).toEqual([{ ok: false }]);
  });
});
