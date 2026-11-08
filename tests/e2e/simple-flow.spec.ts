import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './settle';

async function business(page: Page) {
  // Rules-only ranking keeps these runs deterministic and free of model calls.
  await page.addInitScript(() => sessionStorage.setItem('sabka-ai:v1:use-ai', 'off'));
  await page.goto('/business');
  await expect(page.getByLabel('What kind of business?')).toBeVisible();
  await page.getByLabel('What kind of business?').selectOption('Home bakery');
  await page.getByRole('radio', { name: /Customer replies/ }).check();
  await page.getByLabel('Business name (optional)').fill('PRIVATE BUSINESS');
  await page
    .getByLabel('What makes this task difficult?')
    .fill('PRIVATE PROBLEM with repeated customer order questions.');
  await page
    .getByLabel('A good result would be… (optional)')
    .fill('PRIVATE GOAL more time with family.');
  await page.getByLabel('Additional monthly budget (USD)').fill('40');
  await page.getByLabel('Time available for setup (minutes)').fill('45');
  await page.getByLabel('Notebook', { exact: true }).check();
  await page.getByLabel('WhatsApp', { exact: true }).check();
  await page.getByLabel('I reviewed my answers').check();
}
test('simple journey preserves private text, explains relevant options and offers optional help', async ({
  page,
}) => {
  await business(page);
  const requestPromise = page.waitForRequest((r) => r.url().endsWith('/api/recommend'));
  await page.getByRole('button', { name: 'Show my tool options' }).click();
  const request = await requestPromise;
  // The description is sent (with consent); the business name and goal never leave the tab.
  expect(request.postData()).not.toContain('PRIVATE BUSINESS');
  expect(request.postData()).not.toContain('PRIVATE GOAL');
  expect(JSON.parse(request.postData() ?? '{}').useAi).toBe(false);
  await expect(page.getByRole('heading', { name: 'Your top picks' })).toBeVisible();
  await expect(page.locator('article h3').first()).toBeVisible();
  await expect(page.getByText('Best match')).toBeVisible();
  await expect(page.getByText('Ranked by SABKA rules')).toBeVisible();
  const guide = page.getByRole('button', { name: /Watch a tutorial|Setup guide/ }).first();
  await guide.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(guide).toBeFocused();
  await page.getByRole('button', { name: 'Ask about this tool' }).first().click();
  await page.getByRole('button', { name: 'How many people has it helped?' }).click();
  await expect(page.getByRole('log')).toContainText('do not invent success numbers');
  await page.keyboard.press('Escape');
  await settle(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/simple-options-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'ES Español' }).click();
  await expect(page.getByRole('heading', { name: 'Tus mejores opciones' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await page.screenshot({ path: 'test-results/simple-options-spanish-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Preguntar sobre la herramienta' }).first().click();
  await page.getByRole('button', { name: '¿Cuánto cuesta?' }).click();
  await expect(page.getByRole('log')).toContainText('plan');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Editar mis respuestas' }).first().click();
  await expect(page.getByLabel('Presupuesto mensual adicional (USD)')).toHaveValue('40');
});
test('language switch persists through navigation; intro video is optional and mobile layout fits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/welcome');
  await page.screenshot({ path: 'test-results/simple-welcome-mobile.png', fullPage: true });
  await page.getByRole('switch', { name: 'New to AI?' }).check();
  await expect(page.locator('#ai-introduction')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Watch an introduction' }).click();
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.getByRole('button', { name: 'Load optional video' }).click();
  await expect(page.locator('iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/5mHxO2JpCR0/,
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'ES Español' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { name: /Hola, emprendedor/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cuéntanos sobre tu negocio' }).click();
  await expect(page.getByLabel('¿Qué tipo de negocio tienes?')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('¿Qué tipo de negocio tienes?')).toBeVisible();
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await settle(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: 'test-results/simple-business-spanish-mobile.png',
    fullPage: true,
  });
});
test('matching requires consent, preserves drafts and handles an unavailable service', async ({
  page,
}) => {
  await page.goto('/business');
  await expect(page.getByLabel('What kind of business?')).toBeVisible();
  await page.getByRole('button', { name: 'Show my tool options' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Almost there' })).toBeVisible();
  await business(page);
  await page.route('**/api/recommend', (route) =>
    route.fulfill({ status: 503, body: '{}', contentType: 'application/json' }),
  );
  await page.getByRole('button', { name: 'Show my tool options' }).click();
  await expect(page.getByRole('heading', { name: 'We couldn’t load your options.' })).toBeVisible();
  await page.getByRole('link', { name: 'Edit my answers' }).click();
  await expect(page.getByLabel('Business name (optional)')).toHaveValue('PRIVATE BUSINESS');
});
