import { connectReportSchema } from '@/lib/domain/connect';
import { connectStore } from '@/lib/server/connect-store';
import { readableValidation } from '@/lib/server/connect-api';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Anyone can flag a profile; reports are stored for a human to review. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    limit(`connect-report:${clientKey(request)}`, 10, 3600_000);
    let input;
    try {
      input = connectReportSchema.parse(await readJson(request, 2048));
    } catch (error) {
      readableValidation(error);
    }
    await (await connectStore()).report(input.profileId, input.reason);
    return json({ ok: true }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
