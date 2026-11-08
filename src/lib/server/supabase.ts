import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverConfig } from './config';
import { AppError } from './http';

export function databaseClient(accessToken?: string) {
  const c = serverConfig();
  if (!c.supabaseUrl || !c.supabaseAnonKey)
    throw new AppError(
      503,
      'DATABASE_NOT_CONFIGURED',
      'Supabase is not configured. The researched catalog remains available.',
    );
  const url = new URL(c.supabaseUrl);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new AppError(
      503,
      'DATABASE_CONFIG_INVALID',
      'Supabase requires a valid HTTPS project URL.',
    );
  return createClient(c.supabaseUrl, c.supabaseAnonKey, {
    // Fail over promptly to reviewed data; provider retries have a separate explicit budget.
    db: { retry: false },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(10000), cache: 'no-store' }),
    },
  });
}
