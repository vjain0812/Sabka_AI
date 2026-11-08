import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './settle';

const professions = [
  ['zumba-instructor', 'Zumba Instructor', ['Mindbody', 'Fitune', 'ChatGPT']],
  ['home-services', 'Plumber / Handyman / Painter', ['Jobber', 'Housecall Pro', 'Smith.ai']],
  ['leasing-agent', 'Real Estate Rental & Leasing Agent', ['EliseAI', 'Structurely', 'AppFolio']],
  ['laundromat', 'Family-Owned Laundromat', ['Cents', 'CleanCloud', 'Tidio']],
  ['home-baker', 'Granny Baker', ['ChatGPT', 'Bakesy', 'Jotform AI Agents']],
  ['farmer', 'Farmer', ['Plantix', 'CropX', 'OneSoil']],
] as const;

test('every profession workflow shows its problem, steps, three sourced tools and a human step', async ({
  page,
}) => {
  await page.goto('/workflows');
  for (const [, profession] of professions)
    await expect(page.getByRole('link', { name: profession, exact: true })).toBeVisible();
  for (const [slug, profession, tools] of professions) {
    await page.goto(`/workflows/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: profession })).toBeVisible();
    for (const tool of tools)
      await expect(
        page.getByRole('heading', { level: 3, name: new RegExp(`^${tool}`) }),
      ).toBeVisible();
    await expect(page.getByRole('link', { name: /View evidence/ })).toHaveCount(3);
    await expect(page.getByText('You decide').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Start with no new tool' })).toBeVisible();
  }
});

test('a workflow prefills the brief and the options page ranks real tools for it', async ({
  page,
}) => {
  await page.addInitScript(() => sessionStorage.setItem('sabka-ai:v1:use-ai', 'off'));
  await page.goto('/workflows/farmer');
  await page.getByRole('button', { name: 'Use this workflow for my business' }).click();
  await expect(page).toHaveURL(/\/business\?from=farmer/);
  await expect(page.getByText('Prefilled from the Farmer workflow')).toBeVisible();
  await expect(page.getByLabel('What kind of business?')).toHaveValue('Farming');
  await page.getByLabel('Additional monthly budget (USD)').fill('0');
  await page.getByLabel('Time available for setup (minutes)').fill('30');
  await page.getByLabel('I reviewed my answers').check();
  await page.getByRole('button', { name: 'Show my tool options' }).click();
  await expect(page).toHaveURL(/\/recommendations/);
  await expect(page.getByText('Workflow for businesses like yours')).toBeVisible();
  // Jobs outside the original three tasks now get real, ranked suggestions.
  await expect(page.getByRole('heading', { name: 'Your top picks' })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 3, name: /Plantix|CropX|OneSoil|Taranis/ }).first(),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Open the workflow' }).click();
  await expect(page).toHaveURL(/\/workflows\/farmer/);
});

test('workflow pages meet automated WCAG checks and fit a phone screen', async ({ page }) => {
  for (const path of ['/workflows', '/workflows/home-baker']) {
    await page.goto(path);
    await settle(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/workflows/laundromat');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
});

test('workflow cards open from anywhere on the card and the nav is trimmed', async ({ page }) => {
  await page.goto('/workflows');
  await expect(page.getByRole('link', { name: 'How it works' })).toHaveCount(0);
  const label = page.getByText('Open the workflow').nth(1);
  await label.scrollIntoViewIfNeeded();
  const box = (await label.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/workflows\/[a-z-]+$/);
});

test('tool pages show facts, comparisons and well-placed dialogs', async ({ page }) => {
  await page.goto('/tools/mindbody');
  await expect(page.getByRole('heading', { level: 1, name: 'Mindbody' })).toBeVisible();
  const facts = page.getByRole('region', { name: 'Key facts' });
  for (const label of ['Price', 'Free trial', 'Setup', 'Customers'])
    await expect(facts.getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare with similar tools' })).toBeVisible();
  await expect(page.getByText('Unknown does not mean supported.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Ask about this tool' }).first().click();
  const chat = page.getByRole('dialog');
  await expect(chat).toBeVisible();
  const box = (await chat.boundingBox())!;
  const viewport = page.viewportSize()!;
  // Docked bottom-right like a chat widget.
  expect(box.x + box.width).toBeGreaterThan(viewport.width - 60);
  expect(box.y + box.height).toBeGreaterThan(viewport.height - 60);
  await page.getByRole('button', { name: 'What does it cost?' }).click();
  await expect(page.getByRole('log')).not.toContainText('Ask me about');
});

test('the logo ribbon is long enough to loop without a gap', async ({ page }) => {
  await page.setViewportSize({ width: 3024, height: 900 });
  await page.goto('/');
  const width = await page.locator('.logo-marquee').evaluate((el) => el.scrollWidth);
  expect(width).toBeGreaterThan(3024 * 2);
});

test('the language switch is in the header on every page and translates them', async ({ page }) => {
  for (const path of [
    '/',
    '/workflows',
    '/workflows/farmer',
    '/discover',
    '/tools/acuity',
    '/business',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('group', { name: 'Language / Idioma' })).toBeVisible();
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'ES Español' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('encontrada');
  await page.goto('/discover');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Explora las herramientas');
  await page.goto('/workflows/farmer');
  await expect(page.getByRole('heading', { level: 1, name: 'Agricultor' })).toBeVisible();
  await page.goto('/tools/acuity');
  await expect(
    page.getByRole('heading', { name: 'Compara con herramientas similares' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'EN English' }).click();
  await expect(page.getByRole('heading', { name: 'Compare with similar tools' })).toBeVisible();
});
