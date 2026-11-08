import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/** Accountless ownership: a random key lives only on the owner's device; we keep its hash. */
export const newKey = () => randomBytes(32).toString('base64url');
export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');
export const validKey = (key: unknown): key is string =>
  typeof key === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key);
