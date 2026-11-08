import { after } from 'next/server';
import { cookies } from 'next/headers';
import { discoveryInputSchema, reviewInputSchema } from '@/lib/domain/catalog-record';
import { ADMIN_COOKIE, loginAdmin, requireAdmin } from '@/lib/server/auth';
import { configurationStatus, serverConfig } from '@/lib/server/config';
import { SupabaseCatalogRepository } from '@/lib/server/catalog-repository';
import { startDiscovery } from '@/lib/server/discovery-pipeline';
import { AppError, errorResponse, json, readJson, requireSameOrigin } from '@/lib/server/http';

export const runtime = 'nodejs';
export const maxDuration = 180;
type Context = { params: Promise<{ path: string[] }> };
const loginWindow: { start: number; count: number } = { start: 0, count: 0 };
export async function GET(_request: Request, { params }: Context) {
  try {
    const { path } = await params;
    if (path.join('/') === 'status') return json(configurationStatus());
    const actor = await requireAdmin();
    if (['candidates', 'discovery-runs'].includes(path.join('/')))
      return json(await new SupabaseCatalogRepository(actor).listAdmin());
    return json({ error: 'Unknown admin route.' }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    requireSameOrigin(request);
    const { path } = await params;
    const route = path.join('/');
    if (route === 'login') {
      if (Date.now() - loginWindow.start > 60000) {
        loginWindow.start = Date.now();
        loginWindow.count = 0;
      }
      if (++loginWindow.count > 10)
        throw new AppError(
          429,
          'LOGIN_LIMIT',
          'Too many sign-in attempts. Wait a minute and try again.',
        );
      const session = await loginAdmin(await readJson(request, 2048));
      (await cookies()).set(ADMIN_COOKIE, session.token, {
        httpOnly: true,
        secure: new URL(serverConfig().appOrigin).protocol === 'https:',
        sameSite: 'strict',
        path: '/',
        maxAge: session.expiresIn,
      });
      return json({ signedIn: true });
    }
    if (route === 'logout') {
      (await cookies()).delete(ADMIN_COOKIE);
      return json({ signedIn: false });
    }
    const actor = await requireAdmin();
    if (route === 'discovery-runs') {
      const input = discoveryInputSchema.parse(await readJson(request, 4096));
      const started = await startDiscovery(actor, input);
      after(started.work);
      return json({ run: started.run }, 202);
    }
    if (path.length === 3 && path[0] === 'candidates' && path[2] === 'review') {
      const input = reviewInputSchema.parse(await readJson(request));
      return json({ candidate: await new SupabaseCatalogRepository(actor).review(path[1], input) });
    }
    return json({ error: 'Unknown admin operation.' }, 404);
  } catch (error) {
    return errorResponse(error);
  }
}
