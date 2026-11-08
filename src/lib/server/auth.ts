import 'server-only';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { databaseClient } from './supabase';
import { AppError } from './http';

export const ADMIN_COOKIE = 'sabka-admin-session';
export type AdminActor = { id: string; accessToken: string };
export async function requireAdmin(): Promise<AdminActor> {
  const accessToken = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!accessToken)
    throw new AppError(401, 'LOGIN_REQUIRED', 'Sign in with an authorized administrator account.');
  const db = databaseClient(accessToken);
  const { data, error } = await db.auth.getUser(accessToken);
  if (error || !data.user)
    throw new AppError(401, 'SESSION_EXPIRED', 'Your session expired. Sign in again.');
  const { data: allowed, error: permissionError } = await db.rpc('is_catalog_admin');
  if (permissionError)
    throw new AppError(
      503,
      'AUTHORIZATION_UNAVAILABLE',
      'Admin authorization could not be checked. Apply the catalog migration and try again.',
    );
  if (allowed !== true)
    throw new AppError(
      403,
      'ADMIN_REQUIRED',
      'This account is not an authorized catalog administrator.',
    );
  return { id: data.user.id, accessToken };
}
export async function loginAdmin(input: unknown) {
  const credentials = z
    .object({ email: z.string().email().max(254), password: z.string().min(8).max(256) })
    .strict()
    .parse(input);
  const db = databaseClient();
  const { data, error } = await db.auth.signInWithPassword(credentials);
  if (error || !data.session)
    throw new AppError(
      401,
      'LOGIN_FAILED',
      'Sign-in failed. Check your administrator credentials.',
    );
  const { data: allowed, error: permissionError } = await databaseClient(
    data.session.access_token,
  ).rpc('is_catalog_admin');
  if (permissionError || allowed !== true) {
    await db.auth.signOut();
    throw new AppError(
      403,
      'ADMIN_REQUIRED',
      'This account does not have catalog administrator access.',
    );
  }
  return { token: data.session.access_token, expiresIn: Math.min(data.session.expires_in, 3600) };
}
