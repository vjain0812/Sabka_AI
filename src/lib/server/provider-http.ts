import 'server-only';
import { AppError } from './http';

// Provider endpoints are constants in adapters. No arbitrary URL/redirect fetching.
export async function providerJson(url: string, init: RequestInit, maxBytes = 1500000) {
  const response = await fetch(url, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!response.ok)
    throw new AppError(
      response.status === 429 ? 429 : 502,
      'PROVIDER_REQUEST_FAILED',
      `Provider request failed (HTTP ${response.status}). Check credentials, limits and provider availability.`,
    );
  const reader = response.body?.getReader();
  if (!reader) throw new AppError(502, 'PROVIDER_EMPTY', 'The provider returned no response.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new AppError(
        502,
        'PROVIDER_RESPONSE_TOO_LARGE',
        'The provider response exceeded the size limit.',
      );
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new AppError(502, 'INVALID_PROVIDER_RESPONSE', 'The provider returned invalid JSON.');
  }
}
