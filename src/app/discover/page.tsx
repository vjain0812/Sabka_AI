import { CatalogBrowser } from '@/components/catalog-browser';
import { loadCatalog } from '@/lib/server/catalog-repository';
export const metadata = { title: 'Discover tools' };
export const dynamic = 'force-dynamic';
export default async function DiscoverPage() {
  return <CatalogBrowser catalog={await loadCatalog()} />;
}
