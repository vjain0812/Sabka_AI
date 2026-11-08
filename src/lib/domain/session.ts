import { z } from 'zod';
import { businessBriefSchema, draftSchema } from './brief';

export const SESSION_TTL = 24 * 60 * 60 * 1000;
export const savedSessionSchema = z
  .object({
    version: z.literal(1),
    brief: draftSchema,
    step: z.number().int().min(0).max(4),
    confirmedAt: z.iso.datetime().nullable(),
    matchingConsent: z.boolean().default(false),
    updatedAt: z.number().finite().nonnegative(),
    demoId: z.enum(['baker', 'hvac', 'landscaper']).nullable(),
  })
  .superRefine((session, ctx) => {
    if (session.confirmedAt && !businessBriefSchema.safeParse(session.brief).success)
      ctx.addIssue({ code: 'custom', message: 'Confirmed brief is invalid.' });
  });
export type SavedSession = z.infer<typeof savedSessionSchema>;
export function decodeSession(
  raw: string | null,
  now = Date.now(),
): { session: SavedSession | null; error: string | null } {
  if (!raw) return { session: null, error: null };
  try {
    if (raw.length > 100000) throw new Error('Oversize session');
    const session = savedSessionSchema.parse(JSON.parse(raw));
    if (now - session.updatedAt > SESSION_TTL || session.updatedAt > now + 60000)
      return {
        session: null,
        error: 'Your saved brief expired. Start again or load a fictional example.',
      };
    return { session, error: null };
  } catch {
    return {
      session: null,
      error: 'The saved brief could not be read. You can safely start again.',
    };
  }
}
