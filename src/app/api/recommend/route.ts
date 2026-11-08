import { loadCatalog } from '@/lib/server/catalog-repository';
import { localize, recommend, recommendRequestSchema } from '@/lib/server/recommender';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Nothing in the request is stored or logged. */
const hits = new Map<string, number[]>();
function rateLimit(request: Request) {
  const who = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  const now = Date.now();
  const recent = (hits.get(who) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 20)
    throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Wait a moment and try again.');
  recent.push(now);
  hits.set(who, recent);
  if (hits.size > 5000) hits.clear();
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    rateLimit(request);
    const input = recommendRequestSchema.parse(await readJson(request, 8192));
    const catalog = await loadCatalog();
    return json({
      ...localize(await recommend(catalog.records, input), input.locale),
      catalogOrigin: catalog.origin,
      catalogVersion: catalog.version,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
