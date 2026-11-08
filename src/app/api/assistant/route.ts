import { loadCatalog } from '@/lib/server/catalog-repository';
import { answer, assistantRequestSchema } from '@/lib/server/assistant';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Questions are answered and discarded; nothing is stored or logged. */
const hits = new Map<string, number[]>();
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const who = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
    const now = Date.now();
    const recent = (hits.get(who) ?? []).filter((t) => now - t < 60_000);
    if (recent.length >= 30)
      throw new AppError(429, 'RATE_LIMITED', 'Too many questions. Wait a moment.');
    hits.set(who, [...recent, now]);
    if (hits.size > 5000) hits.clear();
    const input = assistantRequestSchema.parse(await readJson(request, 4096));
    const record = (await loadCatalog()).records.find((r) => r.tool.slug === input.slug);
    if (!record) throw new AppError(404, 'TOOL_NOT_FOUND', 'That tool is not in the catalog.');
    return json(await answer(record, input.question, input.locale));
  } catch (error) {
    return errorResponse(error);
  }
}
