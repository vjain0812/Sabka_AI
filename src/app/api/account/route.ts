import { z } from 'zod';
import type { AccountBusiness } from '@/lib/domain/journey';
import { configurationStatus } from '@/lib/server/config';
import { journeyStore } from '@/lib/server/journey-store';
import { requester } from '@/lib/server/journey-api';
import { currentOwner, signInOwner, signOutOwner, signUpOwner } from '@/lib/server/owner-auth';
import { hashKey, validKey } from '@/lib/server/private-key';
import { clientKey, limit } from '@/lib/server/rate-limit';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

/** Who is signed in, and their businesses. Never returns tokens. */
export async function GET() {
  try {
    if (!configurationStatus().database) return json({ available: false, signedIn: false });
    const owner = await currentOwner();
    if (!owner) return json({ available: true, signedIn: false });
    // A signed-in owner must always be able to see (and use) the account menu to sign out,
    // even when the Journey tables aren't available yet. Report no businesses in that case.
    let businesses: AccountBusiness[] = [];
    try {
      const store = await journeyStore();
      businesses = await store.listForAccount({
        tokenHash: null,
        userId: owner.userId,
        accessToken: owner.accessToken,
      });
    } catch {
      businesses = [];
    }
    return json({ available: true, signedIn: true, email: owner.email, businesses });
  } catch (error) {
    return errorResponse(error);
  }
}

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sign_up'), email: z.string(), password: z.string() }).strict(),
  z.object({ action: z.literal('sign_in'), email: z.string(), password: z.string() }).strict(),
  z.object({ action: z.literal('sign_out') }).strict(),
  z.object({ action: z.literal('claim'), id: z.string().uuid(), key: z.string() }).strict(),
]);

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!configurationStatus().database)
      throw new AppError(503, 'ACCOUNTS_UNAVAILABLE', 'Accounts aren’t set up on this server.');
    let input;
    try {
      input = actionSchema.parse(await readJson(request, 4096));
    } catch {
      throw new AppError(400, 'INVALID_INPUT', 'Check the submitted fields and try again.');
    }
    switch (input.action) {
      case 'sign_up': {
        limit(`account-signup:${clientKey(request)}`, 5, 3600_000);
        const { action: _a, ...credentials } = input;
        void _a;
        return json(await signUpWithReadableErrors(credentials), 201);
      }
      case 'sign_in': {
        limit(`account-signin:${clientKey(request)}`, 10, 15 * 60_000);
        const { action: _a, ...credentials } = input;
        void _a;
        return json({ status: 'signed_in', ...(await signInWithReadableErrors(credentials)) });
      }
      case 'sign_out':
        await signOutOwner();
        return json({ ok: true });
      case 'claim': {
        // Move a journey started on this device (private key) into the signed-in account.
        const who = await requester(request);
        if (!who.userId) throw new AppError(401, 'NOT_SIGNED_IN', 'Sign in first.');
        if (!validKey(input.key)) throw new AppError(400, 'INVALID_INPUT', 'That key isn’t valid.');
        const ok = await (await journeyStore()).claim(input.id, hashKey(input.key), who);
        return json({ ok });
      }
    }
  } catch (error) {
    return errorResponse(error);
  }
}

async function signUpWithReadableErrors(credentials: unknown) {
  try {
    return await signUpOwner(credentials);
  } catch (error) {
    readable(error);
  }
}
async function signInWithReadableErrors(credentials: unknown) {
  try {
    return await signInOwner(credentials);
  } catch (error) {
    readable(error);
  }
}
function readable(error: unknown): never {
  if (error instanceof z.ZodError)
    throw new AppError(
      400,
      'INVALID_INPUT',
      error.issues[0]?.path[0] === 'password'
        ? 'Use a password with at least 8 characters.'
        : 'Enter a valid email address.',
    );
  throw error;
}
