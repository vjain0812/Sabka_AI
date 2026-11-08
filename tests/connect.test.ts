import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  connectMessageSchema,
  connectProfileInputSchema,
  connectProfilePatchSchema,
  containsContactDetails,
} from '@/lib/domain/connect';
import { connectDemoProfiles } from '@/lib/domain/connect-demo';
import { hashKey, newKey, PreviewStore, validKey } from '@/lib/server/connect-store';

const base = {
  displayName: 'Maria’s Bakery',
  category: 'Home bakery',
  region: 'Austin, TX',
  about: 'We bake and we like to share.',
  topics: ['what_worked'],
  wins: [],
  visible: true,
  consent: true,
};

describe('Connect validation', () => {
  it('blocks contact details in public text but allows ordinary writing', () => {
    for (const bad of [
      'mail me jo@example.com',
      'call +1 (555) 123-4567',
      'see www.mybakery.com',
      'https://x.io',
      'dm @maria_baker',
      'visit mybakery.com',
    ])
      expect(containsContactDetails(bad), bad).toBe(true);
    for (const ok of ['We bake 200 loaves a week', 'Started in 2019, 3 staff', 'Austin, TX'])
      expect(containsContactDetails(ok), ok).toBe(false);
  });
  it('requires explicit consent and rejects contact details in every public field', () => {
    expect(connectProfileInputSchema.safeParse(base).success).toBe(true);
    expect(connectProfileInputSchema.safeParse({ ...base, consent: false }).success).toBe(false);
    const { consent: _c, ...noConsent } = base;
    void _c;
    expect(connectProfileInputSchema.safeParse(noConsent).success).toBe(false);
    for (const field of ['displayName', 'region', 'about'])
      expect(
        connectProfileInputSchema.safeParse({ ...base, [field]: 'me@x.com' }).success,
        field,
      ).toBe(false);
    expect(
      connectProfileInputSchema.safeParse({
        ...base,
        wins: [{ toolSlug: 'bakesy', outcome: 'worked', note: 'call 555 123 4567' }],
      }).success,
    ).toBe(false);
  });
  it('bounds sizes and rejects unknown fields and topics', () => {
    expect(connectProfileInputSchema.safeParse({ ...base, about: 'x'.repeat(281) }).success).toBe(
      false,
    );
    expect(connectProfileInputSchema.safeParse({ ...base, topics: ['made_up'] }).success).toBe(
      false,
    );
    expect(connectProfileInputSchema.safeParse({ ...base, email: 'a@b.co' }).success).toBe(false);
    expect(connectProfileInputSchema.safeParse({ ...base, category: 'Spaceships' }).success).toBe(
      false,
    );
    expect(
      connectProfileInputSchema.safeParse({
        ...base,
        wins: Array(4).fill({ toolSlug: 'x', outcome: 'worked', note: 'ok' }),
      }).success,
    ).toBe(false);
  });
  it('patches are partial but still strict', () => {
    expect(connectProfilePatchSchema.safeParse({ visible: false }).success).toBe(true);
    expect(connectProfilePatchSchema.safeParse({ about: 'jo@x.com' }).success).toBe(false);
    expect(connectProfilePatchSchema.safeParse({ consent: true }).success).toBe(false);
  });
  it('messages are short plain text addressed to one profile', () => {
    const toId = crypto.randomUUID();
    expect(connectMessageSchema.safeParse({ toId, body: 'Hi there!' }).success).toBe(true);
    expect(connectMessageSchema.safeParse({ toId, body: 'x' }).success).toBe(false);
    expect(connectMessageSchema.safeParse({ toId, body: 'x'.repeat(601) }).success).toBe(false);
    expect(connectMessageSchema.safeParse({ toId: 'nope', body: 'Hi there' }).success).toBe(false);
  });
  it('fictional demo profiles are labelled and make no tool claims', () => {
    for (const p of connectDemoProfiles) {
      expect(p.demo).toBe(true);
      expect(p.id.startsWith('demo-')).toBe(true);
      expect(p.wins).toEqual([]);
    }
  });
});

describe('private keys', () => {
  it('generates unguessable keys and stores only a hash', () => {
    const k = newKey();
    expect(validKey(k)).toBe(true);
    expect(newKey()).not.toBe(k);
    expect(hashKey(k)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashKey(k)).not.toContain(k);
    expect(validKey('short')).toBe(false);
    expect(validKey('../../etc/passwd'.padEnd(43, 'a'))).toBe(false);
  });
});

describe('preview store', () => {
  let dir = '';
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });
  async function store() {
    dir = await mkdtemp(path.join(tmpdir(), 'connect-'));
    return new PreviewStore(path.join(dir, 'c.json'));
  }
  const input = (name: string, extra = {}) =>
    connectProfileInputSchema.parse({ ...base, displayName: name, ...extra });

  it('lists only visible profiles and never leaks the key hash', async () => {
    const s = await store();
    await s.create(input('Visible'), hashKey('a'));
    await s.create(input('Hidden', { visible: false }), hashKey('b'));
    const list = await s.list();
    expect(list.map((p) => p.displayName)).toEqual(['Visible']);
    expect(JSON.stringify(list)).not.toContain(hashKey('a'));
    expect(Object.keys(list[0])).not.toContain('tokenHash');
  });
  it('persists to disk and survives a restart', async () => {
    const s = await store();
    const id = await s.create(input('Persisted'), hashKey('a'));
    const again = new PreviewStore(path.join(dir, 'c.json'));
    expect((await again.list()).map((p) => p.id)).toEqual([id]);
    expect(await readFile(path.join(dir, 'c.json'), 'utf8')).not.toContain('"key"');
  });
  it('only the key holder can read, change or delete a profile', async () => {
    const s = await store();
    const id = await s.create(input('Mine'), hashKey('a'));
    expect(await s.getOwn(id, hashKey('x'))).toBeNull();
    expect(await s.update(id, hashKey('x'), { displayName: 'Hijack' })).toBe(false);
    expect(await s.update(id, hashKey('a'), { visible: false })).toBe(true);
    expect(await s.list()).toEqual([]);
    expect(await s.remove(id, hashKey('x'))).toBe(false);
    expect(await s.remove(id, hashKey('a'))).toBe(true);
  });
  it('delivers messages, enforces limits and erases them with the profile', async () => {
    const s = await store();
    const a = await s.create(input('Alpha'), hashKey('a'));
    const b = await s.create(input('Beta'), hashKey('b'));
    expect(await s.send(a, hashKey('wrong'), b, 'Hello there')).toBe('forbidden');
    expect(await s.send(a, hashKey('a'), a, 'Hello me')).toBe('self');
    expect(await s.send(a, hashKey('a'), crypto.randomUUID(), 'Hello?')).toBe('not_found');
    for (let i = 0; i < 5; i++) expect(await s.send(a, hashKey('a'), b, `Message ${i}`)).toBe('ok');
    expect(await s.send(a, hashKey('a'), b, 'Too many')).toBe('rate_limited');
    const inbox = await s.inbox(b, hashKey('b'));
    expect(inbox).toHaveLength(5);
    expect(inbox![0]).toMatchObject({ otherName: 'Alpha', mine: false });
    expect(await s.inbox(b, hashKey('a'))).toBeNull();
    await s.markRead(b, hashKey('b'), a);
    expect((await s.inbox(b, hashKey('b')))!.every((m) => m.readAt)).toBe(true);
    await s.remove(a, hashKey('a'));
    expect(await s.inbox(b, hashKey('b'))).toEqual([]);
  });
  it('does not deliver to paused profiles', async () => {
    const s = await store();
    const a = await s.create(input('Alpha'), hashKey('a'));
    const b = await s.create(input('Beta', { visible: false }), hashKey('b'));
    expect(await s.send(a, hashKey('a'), b, 'Anyone there?')).toBe('not_found');
  });
  it('handles concurrent writes without losing any', async () => {
    const s = await store();
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => s.create(input(`Biz ${i}`), hashKey(String(i)))),
    );
    expect(await s.list()).toHaveLength(12);
    expect(await new PreviewStore(path.join(dir, 'c.json')).list()).toHaveLength(12);
  });
});
