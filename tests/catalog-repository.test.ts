import { afterEach, expect, it, vi } from 'vitest';
import { loadCatalog } from '@/lib/server/catalog-repository';
import { researchedCatalog } from '@/lib/server/researched-catalog';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
it('browses the research snapshot with no credentials or network requests', async () => {
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('SUPABASE_ANON_KEY', '');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const catalog = await loadCatalog();
  expect(catalog.origin).toBe('research-snapshot');
  expect(catalog.records).toHaveLength(247);
  expect(catalog.message).toContain('No live search');
  expect(fetch).not.toHaveBeenCalled();
});
it('preserves the last published read on failure, but respects a successful empty catalog', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://database.invalid');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-only-public-key');
  const fetch = vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify([{ record: researchedCatalog()[0] }]), {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetch);
  expect((await loadCatalog()).origin).toBe('database');
  fetch.mockRejectedValue(new Error('offline'));
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2099-01-01T00:00:00Z'));
  const fallback = await loadCatalog();
  expect(fallback.origin).toBe('last-known');
  expect(fallback.records).toHaveLength(1);
  expect(fallback.records[0].plans[0].monthlyPrice).toBeNull();
  fetch.mockResolvedValue(new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
  const withdrawn = await loadCatalog();
  expect(withdrawn.origin).toBe('database');
  expect(withdrawn.records).toEqual([]);
});
