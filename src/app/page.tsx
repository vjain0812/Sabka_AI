import FigmaTemplate from '@/components/figma-template';
import { loadCatalog } from '@/lib/server/catalog-repository';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  return <FigmaTemplate records={(await loadCatalog()).records} />;
}
