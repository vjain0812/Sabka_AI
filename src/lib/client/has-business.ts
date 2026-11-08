'use client';
import { journeyWhenChecked, useJourney } from './journey';
import { useWorkspace, workspace } from './workspace';
import type { BusinessBrief } from '@/lib/domain/brief';

type JourneyState = ReturnType<typeof useJourney>;

/**
 * Do we already know this person's business?
 *  - Signed in: only the selected business in the account counts. A brand-new account, or a
 *    business still being set up, has none, whatever this tab typed before signing in.
 *  - Signed out: the brief on this device, or a saved device journey.
 *  - Session not checked yet: unknown, so we never guess from a stale guest brief.
 */
function knowsBusiness(journey: JourneyState, brief: BusinessBrief | null) {
  if (!journey.checked) return false;
  const goals = journey.view?.journey.goals.length ?? 0;
  if (journey.account) {
    const id = journey.identity?.id;
    if (!id) return false;
    const current = journey.account.businesses.find((b) => b.id === id);
    return Boolean(current?.profile?.category) || goals > 0;
  }
  return Boolean(brief?.profile.category) || goals > 0;
}

/** For rendering (link targets). Click handlers should use `findToolsTarget`. */
export function useHasBusiness() {
  const journey = useJourney();
  const ws = useWorkspace();
  return knowsBusiness(journey, ws.session?.brief ?? null);
}

/**
 * Where "Find AI tools" goes: new visitors and accounts with no business describe their business
 * first (/business); returning owners go straight to the problem box on the home page.
 * Waits for the session check so a click right after page load is decided correctly.
 */
export async function findToolsTarget(): Promise<'business' | 'problem'> {
  const journey = await journeyWhenChecked();
  return knowsBusiness(journey, workspace.getBrief()) ? 'problem' : 'business';
}
