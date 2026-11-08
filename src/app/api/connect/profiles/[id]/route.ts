import { connectProfilePatchSchema } from '@/lib/domain/connect';
import { connectStore } from '@/lib/server/connect-store';
import { assertKnownTools, owner, readableValidation } from '@/lib/server/connect-api';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

type Ctx = { params: Promise<{ id: string }> };
const denied = () =>
  new AppError(403, 'NOT_ALLOWED', 'That profile can’t be changed from this device.');

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id: raw } = await params;
    const { id, tokenHash } = owner(request, raw);
    limit(`connect-own:${clientKey(request)}`, 60, 60_000);
    const profile = await (await connectStore()).getOwn(id, tokenHash);
    if (!profile) throw denied();
    return json({ profile });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    requireSameOrigin(request);
    const { id: raw } = await params;
    const { id, tokenHash } = owner(request, raw);
    limit(`connect-edit:${clientKey(request)}`, 30, 60_000);
    let patch;
    try {
      patch = connectProfilePatchSchema.parse(await readJson(request, 8192));
    } catch (error) {
      readableValidation(error);
    }
    if (patch.wins) await assertKnownTools(patch.wins);
    if (!(await (await connectStore()).update(id, tokenHash, patch))) throw denied();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
/** Withdrawing consent: the profile and every message it sent or received are erased. */
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    requireSameOrigin(request);
    const { id: raw } = await params;
    const { id, tokenHash } = owner(request, raw);
    limit(`connect-delete:${clientKey(request)}`, 10, 60_000);
    if (!(await (await connectStore()).remove(id, tokenHash))) throw denied();
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
