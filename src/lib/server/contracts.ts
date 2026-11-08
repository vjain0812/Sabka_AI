import 'server-only';
import type { BusinessBrief } from '@/lib/domain/brief';
import type { DiscoveryCandidate, Recommendation, Tool } from '@/lib/domain/catalog';
import { loadCatalog } from './catalog-repository';

export type ServiceResult<T> =
  | { status: 'implemented'; data: T; version: string }
  | { status: 'planned' | 'unavailable'; code: string; message: string };
export interface CatalogRepository {
  publishedTools(): Promise<ServiceResult<Tool[]>>;
}
export interface MatchingService {
  match(brief: BusinessBrief): Promise<
    ServiceResult<{
      catalogVersion: string;
      matcherVersion: string;
      recommendations: Recommendation[];
    }>
  >;
}
export interface DiscoveryService {
  // Legacy boundary deliberately denies actor-string authorization. Use startDiscovery
  // only with an AdminActor obtained from the authenticated request.
  discover(actorId: string, query: string): Promise<ServiceResult<DiscoveryCandidate[]>>;
}
export const catalog: CatalogRepository = {
  async publishedTools() {
    const result = await loadCatalog();
    return {
      status: 'implemented',
      data: result.records.map((r) => r.tool),
      version: result.version,
    };
  },
};
export const matching: MatchingService = {
  async match() {
    return {
      status: 'planned',
      code: 'MATCHING_NOT_IMPLEMENTED',
      message: 'Matching requires a reviewed catalog and the Phase 3 eligibility engine.',
    };
  },
};
export const discovery: DiscoveryService = {
  async discover() {
    return {
      status: 'unavailable',
      code: 'AUTHENTICATED_DISCOVERY_REQUIRED',
      message:
        'Use the authenticated discovery API. An actor ID string alone never authorizes a discovery run.',
    };
  },
};
