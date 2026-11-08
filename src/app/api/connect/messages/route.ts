import { z } from 'zod';
import { connectMessageSchema } from '@/lib/domain/connect';
import { connectStore } from '@/lib/server/connect-store';
import { owner, readableValidation } from '@/lib/server/connect-api';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

export async function GET(request: Request) {
  try {
    const { id, tokenHash } = owner(request);
    limit(`connect-inbox:${clientKey(request)}`, 60, 60_000);
    const messages = await (await connectStore()).inbox(id, tokenHash);
    if (!messages)
      throw new AppError(403, 'NOT_ALLOWED', 'That inbox can’t be opened from this device.');
    return json({ messages });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Say hello. Only a consenting profile can write, and only to a visible one. */
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { id, tokenHash } = owner(request);
    limit(`connect-send:${clientKey(request)}`, 20, 3600_000);
    let input;
    try {
      input = connectMessageSchema.parse(await readJson(request, 4096));
    } catch (error) {
      readableValidation(error);
    }
    const result = await (await connectStore()).send(id, tokenHash, input.toId, input.body);
    if (result === 'forbidden')
      throw new AppError(403, 'NOT_ALLOWED', 'Open your Connect profile first.');
    if (result === 'self')
      throw new AppError(400, 'INVALID_INPUT', 'You can’t message your own profile.');
    if (result === 'not_found')
      throw new AppError(404, 'NOT_FOUND', 'That business isn’t available right now.');
    if (result === 'rate_limited')
      throw new AppError(
        429,
        'RATE_LIMITED',
        'You’ve reached today’s limit for messages to this business.',
      );
    return json({ ok: true }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

const readSchema = z.object({ otherId: z.string().uuid() }).strict();
/** Mark one conversation as read. */
export async function PUT(request: Request) {
  try {
    requireSameOrigin(request);
    const { id, tokenHash } = owner(request);
    limit(`connect-read:${clientKey(request)}`, 120, 60_000);
    let input;
    try {
      input = readSchema.parse(await readJson(request, 1024));
    } catch (error) {
      readableValidation(error);
    }
    await (await connectStore()).markRead(id, tokenHash, input.otherId);
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
