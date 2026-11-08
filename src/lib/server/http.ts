import 'server-only';
import { z } from 'zod';
import { serverConfig } from './config';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return json({ error: error.message, code: error.code }, error.status);
  if (error instanceof z.ZodError)
    return json({ error: 'Check the submitted fields and try again.', code: 'INVALID_INPUT' }, 400);
  return json(
    {
      error: 'The service could not complete this request. Your catalog remains available.',
      code: 'SERVICE_UNAVAILABLE',
    },
    503,
  );
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(serverConfig().appOrigin).origin)
    throw new AppError(
      403,
      'ORIGIN_REJECTED',
      'This request must come from the configured application origin.',
    );
  if (!request.headers.get('content-type')?.startsWith('application/json'))
    throw new AppError(415, 'JSON_REQUIRED', 'Use JSON for this request.');
}
export async function readJson(request: Request, limit = 100000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new AppError(400, 'BODY_REQUIRED', 'A JSON body is required.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  const timer = setTimeout(() => void reader.cancel(), 5000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new AppError(413, 'BODY_TOO_LARGE', 'The request exceeds the size limit.');
      }
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'A valid JSON body is required.');
    }
  } finally {
    clearTimeout(timer);
  }
}
