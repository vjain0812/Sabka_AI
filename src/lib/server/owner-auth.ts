import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { databaseClient } from './supabase';
import { serverConfig } from './config';
import { AppError } from './http';

/**
 * Business-owner accounts (Supabase Auth, email + password). Tokens live only in HttpOnly cookies:
 * a short-lived access token and a refresh token (30 days) that renews it on the server.
 */
const ACCESS = 'sabka-owner-at';
const REFRESH = 'sabka-owner-rt';
const REFRESH_DAYS = 30;
export const credentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8, 'Use at least 8 characters.').max(256),
  })
  .strict();
export type Owner = { userId: string; email: string; accessToken: string };
type Session = { access_token: string; refresh_token: string; expires_in: number };

async function writeSession(session: Session) {
  const jar = await cookies();
  const base = {
    httpOnly: true,
    secure: new URL(serverConfig().appOrigin).protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
  };
  jar.set(ACCESS, session.access_token, { ...base, maxAge: Math.min(session.expires_in, 3600) });
  jar.set(REFRESH, session.refresh_token, { ...base, maxAge: REFRESH_DAYS * 86400 });
}
async function clearSession() {
  const jar = await cookies();
  jar.delete(ACCESS);
  jar.delete(REFRESH);
}

export async function signUpOwner(input: unknown) {
  const credentials = credentialsSchema.parse(input);
  const { data, error } = await databaseClient().auth.signUp({
    ...credentials,
    // Must be in Supabase Auth → URL Configuration → Redirect URLs, else the Site URL is used.
    options: { emailRedirectTo: `${serverConfig().appOrigin}/account` },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message))
      throw new AppError(
        409,
        'ACCOUNT_EXISTS',
        'That email already has an account. Sign in instead.',
      );
    if (error.status === 429 || /rate limit/i.test(error.message))
      throw new AppError(
        429,
        'EMAIL_RATE_LIMITED',
        'Too many sign-up emails were sent recently. Wait about an hour and try again, or ask the site owner to turn off email confirmation.',
      );
    if (/password/i.test(error.message))
      throw new AppError(400, 'WEAK_PASSWORD', 'Choose a longer or less common password.');
    throw new AppError(400, 'SIGN_UP_FAILED', 'We couldn’t create the account. Please try again.');
  }
  // Supabase returns no session when the project requires email confirmation.
  if (!data.session) return { status: 'confirm_email' as const, email: credentials.email };
  await writeSession(data.session);
  return { status: 'signed_in' as const, email: credentials.email };
}

export async function signInOwner(input: unknown) {
  const credentials = credentialsSchema.parse(input);
  const { data, error } = await databaseClient().auth.signInWithPassword(credentials);
  if (error || !data.session) {
    if (error && /not confirmed/i.test(error.message))
      throw new AppError(403, 'EMAIL_NOT_CONFIRMED', 'Confirm your email first, then sign in.');
    throw new AppError(401, 'SIGN_IN_FAILED', 'That email and password don’t match.');
  }
  await writeSession(data.session);
  return { email: data.user?.email ?? credentials.email };
}

export async function signOutOwner() {
  const jar = await cookies();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;
  await clearSession();
  if (access && refresh) {
    // Best effort: revoke the refresh token so a copied cookie stops working.
    try {
      const db = databaseClient();
      await db.auth.setSession({ access_token: access, refresh_token: refresh });
      await db.auth.signOut({ scope: 'local' });
    } catch {
      /* Cookies are already cleared. */
    }
  }
}

/** The signed-in owner, renewing an expired access token when a refresh token is present. */
export async function currentOwner(): Promise<Owner | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS)?.value;
  const refresh = jar.get(REFRESH)?.value;
  if (!access && !refresh) return null;
  let db;
  try {
    db = databaseClient();
  } catch {
    return null;
  }
  if (access) {
    const { data } = await db.auth.getUser(access);
    if (data.user)
      return { userId: data.user.id, email: data.user.email ?? '', accessToken: access };
  }
  if (refresh) {
    const { data, error } = await db.auth.refreshSession({ refresh_token: refresh });
    if (!error && data.session && data.user) {
      await writeSession(data.session);
      return {
        userId: data.user.id,
        email: data.user.email ?? '',
        accessToken: data.session.access_token,
      };
    }
  }
  await clearSession();
  return null;
}
