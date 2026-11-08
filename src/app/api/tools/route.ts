import { loadCatalog } from '@/lib/server/catalog-repository';
import { filterCatalog } from '@/lib/domain/catalog-browse';
export async function GET(request: Request) {
  const catalog = await loadCatalog();
  const params = new URL(request.url).searchParams;
  return Response.json(
    {
      ...catalog,
      records: filterCatalog(catalog.records, {
        query: (params.get('q') ?? '').slice(0, 120),
        job: params.get('job') ?? '',
        price: params.get('price') ?? '',
        evidence: params.get('evidence') ?? '',
        workflow: params.get('workflow') ?? '',
        businessType: params.get('businessType') ?? '',
      }),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
