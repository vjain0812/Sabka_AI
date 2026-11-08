import { loadCatalog } from '@/lib/server/catalog-repository';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await loadCatalog();
  const record = catalog.records.find((r) => r.tool.slug === slug);
  return Response.json(
    record ? { record, origin: catalog.origin } : { error: 'Published tool not found.' },
    { status: record ? 200 : 404, headers: { 'Cache-Control': 'no-store' } },
  );
}
