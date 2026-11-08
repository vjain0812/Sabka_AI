import { journeyCreateSchema } from '@/lib/domain/journey';
import { journeyStore } from '@/lib/server/journey-store';
import { journeyOwner, journeyView, requester, validationError } from '@/lib/server/journey-api';
import { hashKey, newKey } from '@/lib/server/private-key';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Read my journey. Nothing is returned without the private key from this device. */
export async function GET(request: Request) {
  try {
    const { id, who } = await journeyOwner(request);
    limit(`journey-read:${clientKey(request)}`, 120, 60_000);
    return json(await journeyView(await journeyStore(), id, who));
  } catch (error) {
    return errorResponse(error);
  }
}

/** Start a journey (opt-in). The private key is returned once; only its hash is stored. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    limit(`journey-create:${clientKey(request)}`, 10, 3600_000);
    let input;
    try {
      input = journeyCreateSchema.parse(await readJson(request, 8192));
    } catch (error) {
      validationError(error);
    }
    const store = await journeyStore();
    const key = newKey();
    // Signed-in owners get the journey in their account; the key still works on this device.
    const created = await store.create(hashKey(key), input.goal, await requester(request));
    return json({ ...created, key, mode: store.mode }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/** Delete everything in my journey. */
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { id, who } = await journeyOwner(request);
    if (!(await (await journeyStore()).remove(id, who)))
      throw new AppError(403, 'NOT_ALLOWED', 'That journey can’t be changed from this device.');
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
