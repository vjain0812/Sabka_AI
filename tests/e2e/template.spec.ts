import { test, expect } from '@playwright/test';

test('main page uses the Figma template without the old app shell', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    /Your smartest\s*next tool,\s*found\./,
  );
  await expect(page.locator('header')).toHaveCount(1);
  await expect(page.locator('footer')).toHaveCount(1);
  await expect(page.locator('.topbar')).toHaveCount(0);
  await expect(page.locator('.workflow-orbit')).toHaveCount(2);
  await expect(page.locator('.float-node')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('font-size', '78px');
  expect(await page.evaluate(() => document.fonts.check('16px "DM Sans"'))).toBe(true);
  await expect(page.locator('#problem')).toHaveAttribute('maxlength', '300');
  await expect(page.locator('#matches article')).toHaveCount(3);
  const save = page.getByRole('button', { name: /^Save / }).first();
  await save.click();
  await expect(page.getByRole('button', { name: /^Remove / }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page
    .getByRole('button', { name: /^Remove / })
    .first()
    .click();
  await page.screenshot({ path: 'test-results/template-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'View evidence' }).first().click();
  await expect(page).toHaveURL(/\/tools\//);
});
test('template finder keeps the private draft and continues into business understanding', async ({
  page,
}) => {
  let matchingCalls = 0;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/matches')) matchingCalls++;
  });
  await page.goto('/');
  await page
    .getByLabel('Describe your biggest bottleneck')
    .fill('Private draft: writing our weekly social posts takes too long.');
  await page.getByRole('button', { name: 'Content creation', exact: true }).click();
  await page.getByRole('button', { name: 'Show my matches' }).click();
  await expect(page).toHaveURL(/\/business/);
  await expect(page.getByLabel('What makes this task difficult?')).toHaveValue(/Private draft/);
  await expect(page.getByRole('radio', { name: /Marketing & content/ })).toBeChecked();
  expect(matchingCalls).toBe(0);
});
test('template mobile navigation and intro link remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#site-mobile-nav')).toBeVisible();
  await page.locator('#site-mobile-nav').getByRole('link', { name: 'Browse stack' }).click();
  await expect(page).toHaveURL(/\/discover/);
  await expect(page.getByRole('group', { name: 'Workflow category' })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('#site-mobile-nav')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/template-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'New to AI? Start here.' }).click();
  await expect(page.getByRole('switch', { name: 'New to AI?' })).toBeVisible();
});
