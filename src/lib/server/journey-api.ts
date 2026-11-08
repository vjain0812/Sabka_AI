import 'server-only';
import { z } from 'zod';
import type { JourneyView } from '@/lib/domain/journey';
import { AppError } from './http';
import { hashKey, validKey } from './private-key';
import { loadCatalog } from './catalog-repository';
import type { JourneyStore, Who } from './journey-store';
import { currentOwner } from './owner-auth';

const uuid = z.string().uuid();
/** Who is calling: a private device key (header), a signed-in owner (cookie), or both. */
export async function requester(request: Request): Promise<Who> {
  const key = request.headers.get('x-journey-key');
  const owner = await currentOwner();
  return {
    tokenHash: validKey(key) ? hashKey(key) : null,
    userId: owner?.userId ?? null,
    accessToken: owner?.accessToken ?? null,
  };
}
/** Owner proof for one journey: its id plus either its private key or the owning account. */
export async function journeyOwner(request: Request) {
  const id = request.headers.get('x-journey-id');
  const who = await requester(request);
  if (!uuid.safeParse(id).success || (!who.tokenHash && !who.userId))
    throw new AppError(401, 'NOT_SIGNED_IN', 'Sign in or open My AI Journey on this device first.');
  return { id: id as string, who };
}
export async function assertCatalogTool(slug: string) {
  const known = (await loadCatalog()).records.some(
    (r) => r.tool.slug === slug && r.tool.status === 'published',
  );
  if (!known) throw new AppError(400, 'UNKNOWN_TOOL', 'Choose a tool from the catalog.');
}
/** The journey plus catalog records for its saved tools, so the page needs one request. */
export async function journeyView(store: JourneyStore, id: string, who: Who): Promise<JourneyView> {
  const journey = await store.get(id, who);
  if (!journey)
    throw new AppError(403, 'NOT_ALLOWED', 'That journey can’t be opened from this device.');
  const slugs = new Set(journey.tools.map((t) => t.slug));
  const records = (await loadCatalog()).records.filter((r) => slugs.has(r.tool.slug));
  return { mode: store.mode, journey, records };
}
export function validationError(error: unknown): never {
  if (error instanceof z.ZodError)
    throw new AppError(400, 'INVALID_INPUT', 'Check the submitted fields and try again.');
  throw error;
}
