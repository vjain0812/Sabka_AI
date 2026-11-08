import 'server-only';
import { z } from 'zod';
import { AppError } from './http';
import { hashKey, validKey } from './connect-store';
import { loadCatalog } from './catalog-repository';
import type { ConnectWin } from '@/lib/domain/connect';

const uuid = z.string().uuid();

/** Owner proof: profile id and private key arrive in headers; only the key's hash is compared. */
export function owner(request: Request, id?: string) {
  const profileId = id ?? request.headers.get('x-connect-id');
  const key = request.headers.get('x-connect-key');
  if (!uuid.safeParse(profileId).success || !validKey(key))
    throw new AppError(401, 'NOT_SIGNED_IN', 'Open your Connect profile on this device first.');
  return { id: profileId as string, tokenHash: hashKey(key) };
}
export function readableValidation(error: unknown): never {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    throw new AppError(
      400,
      'INVALID_INPUT',
      first?.message || 'Check the submitted fields and try again.',
    );
  }
  throw error;
}
export async function assertKnownTools(wins: ConnectWin[]) {
  if (!wins.length) return;
  const slugs = new Set((await loadCatalog()).records.map((r) => r.tool.slug));
  if (wins.some((w) => !slugs.has(w.toolSlug)))
    throw new AppError(400, 'UNKNOWN_TOOL', 'Choose a tool from the catalog.');
}

/** Light tool list (name + site) for pickers and logos. */
export async function toolsLite() {
  return (await loadCatalog()).records
    .map((r) => ({ slug: r.tool.slug, name: r.tool.name, website: r.tool.website }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
