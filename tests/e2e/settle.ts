import type { Page } from '@playwright/test';

/**
 * Wait for finite entrance animations (fade/rise) to finish so accessibility checks measure the
 * resting page users read. Infinite decorative loops are ignored; motion is not disabled.
 * Runs twice because hydration can start new entrance animations after the first pass.
 */
export async function settle(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  for (let pass = 0; pass < 2; pass++) {
    await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await Promise.all(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      );
    });
  }
}
