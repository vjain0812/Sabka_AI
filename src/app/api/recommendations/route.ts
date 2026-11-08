import { businessBriefSchema } from '@/lib/domain/brief';
import { matching } from '@/lib/server/contracts';
export async function POST(request: Request) {
  // Read at most 32 KiB even if Content-Length is missing or dishonest.
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: 'A JSON brief is required.' }, { status: 400 });
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        return Response.json({ error: 'Brief is too large.' }, { status: 413 });
      }
      chunks.push(value);
    }
    const parsed = businessBriefSchema.safeParse(
      JSON.parse(Buffer.concat(chunks).toString('utf8')),
    );
    if (!parsed.success)
      return Response.json({ error: 'The business brief is invalid.' }, { status: 400 });
    return Response.json(await matching.match(parsed.data), {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'A valid JSON brief is required.' }, { status: 400 });
  }
}
