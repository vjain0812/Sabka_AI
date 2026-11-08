import 'server-only';
import { AppError } from './http';

/** Small in-memory limiter keyed by caller. Good enough per server instance; the database adds its own caps. */
const buckets = new Map<string, number[]>();
export function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
}
/** Outside production every caller shares one address, so limits are relaxed to stay usable. */
const devScale = process.env.NODE_ENV === 'production' ? 1 : 20;
export function limit(key: string, maxPerWindow: number, windowMs: number) {
  const max = maxPerWindow * devScale;
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max)
    throw new AppError(
      429,
      'RATE_LIMITED',
      'Too many requests. Please wait a moment and try again.',
    );
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) buckets.clear();
}
