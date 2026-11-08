import { connectProfileInputSchema } from '@/lib/domain/connect';
import { connectStore, hashKey, newKey } from '@/lib/server/connect-store';
import { assertKnownTools, readableValidation } from '@/lib/server/connect-api';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Public directory: only owners who consented appear, with fields they typed. */
export async function GET() {
  try {
    const store = await connectStore();
    return json({ mode: store.mode, profiles: await store.list() });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Create a profile. The private key is returned once and only its hash is stored. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    limit(`connect-create:${clientKey(request)}`, 5, 3600_000);
    let input;
    try {
      input = connectProfileInputSchema.parse(await readJson(request, 8192));
    } catch (error) {
      readableValidation(error);
    }
    await assertKnownTools(input.wins);
    const store = await connectStore();
    const key = newKey();
    const id = await store.create(input, hashKey(key));
    return json({ id, key, mode: store.mode }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
