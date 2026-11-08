import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './settle';

test('expanded library has pagination, broader filters and sourced document tools', async ({
  page,
  request,
}) => {
  await page.goto('/discover');
  await expect(page.locator('[data-catalog-card]')).toHaveCount(12);
  const firstName = await page.locator('[data-catalog-card] h2').first().innerText();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByRole('button', { name: /^Page 2 of/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.locator('[data-catalog-card] h2').first()).not.toHaveText(firstName);
  await page.getByRole('button', { name: 'Documents & data extraction' }).click();
  await page.getByText('More filters').click();
  await page.getByLabel('Business type').selectOption('retail_ecommerce');
  await page.getByLabel('Search tools').fill('Dext');
  await expect(page.getByRole('link', { name: 'Inspect Dext evidence' })).toBeVisible();
  await expect(page.locator('[data-result-line]')).toContainText('1 tool');
  await expect(page.getByRole('navigation', { name: 'Catalog pages' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Inspect Dext evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Dext', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare with similar tools' })).toBeVisible();
  const response = await request.get(
    '/api/tools?workflow=finance_bookkeeping&businessType=retail_ecommerce&q=Dext',
  );
  expect(response.ok()).toBe(true);
  const data = await response.json();
  expect(data.records.map((r: { tool: { slug: string } }) => r.tool.slug)).toEqual(['dext']);
  await page.goto('/discover');
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('published catalog supports search, filters, evidence and empty recovery', async ({
  page,
}) => {
  await page.goto('/discover');
  await page.getByLabel('Search tools').fill('Grammarly');
  await expect(page.getByRole('link', { name: 'Inspect Grammarly evidence' })).toBeVisible();
  await expect(page.locator('[data-result-line]')).toContainText('1 tool');
  await page.getByText('More filters').click();
  await page.getByLabel('Evidence requirement').selectOption('tested');
  await expect(
    page.getByRole('heading', { name: 'No tools meet these browsing filters.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await page.getByLabel('Pricing evidence').selectOption('free');
  // Many tools now have verified free plans, so narrow to the one under test.
  await page.getByLabel('Search tools').fill('Grammarly');
  await expect(page.getByRole('link', { name: 'Inspect Grammarly evidence' })).toBeVisible();
  await page.getByRole('link', { name: 'Inspect Grammarly evidence' }).click();
  await expect(page.getByRole('heading', { name: 'Grammarly', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The evidence trail' })).toBeVisible();
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/evidence-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discover');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/catalog-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/catalog-desktop.png', fullPage: true });
});
test('there is no sign-in page and admin APIs stay closed to guests', async ({ page, request }) => {
  const response = await page.goto('/admin/discovery');
  expect(response?.status()).toBe(404);
  expect((await request.get('/api/admin/candidates')).status()).toBe(401);
  expect([401, 403]).toContain(
    (
      await request.post('/api/admin/discovery-runs', {
        headers: { Origin: process.env.PW_BASE_URL || 'http://127.0.0.1:3000' },
        data: {},
      })
    ).status(),
  );
});
