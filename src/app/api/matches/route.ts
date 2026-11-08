import { matchRequestSchema } from '@/lib/domain/match-request';
import { loadCatalog } from '@/lib/server/catalog-repository';
import { matchCatalog } from '@/lib/server/matching';
import { errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const input = matchRequestSchema.parse(await readJson(request, 8192));
    const catalog = await loadCatalog();
    return json({
      ...matchCatalog(catalog.records, input),
      catalogVersion: catalog.version,
      catalogOrigin: catalog.origin,
      catalogMessage: catalog.message,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
