import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { settle } from './settle';

const run = Date.now().toString(36);
const bakery = `E2E Bakery ${run}`;
const studio = `E2E Studio ${run}`;

async function fillBrief(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem('sabka-ai:v1:use-ai', 'off'));
  await page.goto('/business');
  await page.getByLabel('What kind of business?').selectOption('Home bakery');
  await page
    .getByLabel('What makes this task difficult?')
    .fill('Customers keep calling to ask if their order is ready.');
  await page.getByLabel('Additional monthly budget (USD)').fill('40');
  await page.getByLabel('Time available for setup (minutes)').fill('45');
  await page.getByLabel('Notebook', { exact: true }).check();
  await page.getByLabel('Phone', { exact: true }).check();
  await page.getByLabel('I reviewed my answers').check();
}
const origin = process.env.PW_BASE_URL || 'http://127.0.0.1:3000';
/** Best-effort cleanup so a failed run never leaves test businesses in the directory. */
async function forget(page: Page) {
  const raw = await page
    .evaluate(() => localStorage.getItem('sabka-ai:v1:connect'))
    .catch(() => null);
  if (!raw) return;
  const { id, key } = JSON.parse(raw) as { id: string; key: string };
  await page.request.delete(`/api/connect/profiles/${id}`, {
    headers: { Origin: origin, 'x-connect-key': key, 'Content-Type': 'application/json' },
    data: {},
  });
}
async function leave(page: Page) {
  await page.goto('/connect/me');
  await page.getByRole('tab', { name: /Profile & privacy/ }).click();
  await page.getByRole('button', { name: 'Delete my profile' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page).toHaveURL(/\/connect$/);
}

test('onboarding offers Connect, needs explicit consent, and nothing is shared without it', async ({
  page,
  request,
}) => {
  await fillBrief(page);
  await expect(page.getByRole('heading', { name: 'Meet other owners (optional)' })).toBeVisible();
  // Not ticked: fields stay hidden and nobody is listed.
  await expect(page.getByLabel('Name others will see')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show my tool options' }).click();
  await expect(page).toHaveURL(/\/recommendations/);
  const list = await (await request.get('/api/connect/profiles')).json();
  expect(list.profiles.some((p: { displayName: string }) => p.displayName === bakery)).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('sabka-ai:v1:connect'))).toBeNull();
});

test('two businesses opt in, connect, talk and withdraw', async ({ browser }) => {
  test.setTimeout(180_000); // several pages compile on first use in dev
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  try {
    // A joins through onboarding.
    await fillBrief(a);
    await a.getByLabel(/Yes, list my business in Connect/).check();
    await a.getByLabel('Name others will see').fill(bakery);
    await a.getByLabel('City or region (optional)').fill('Austin, TX');
    await a
      .getByLabel('About your business (optional)')
      .fill('Small bakery that loves swapping tips.');
    await a.getByRole('button', { name: 'Show my tool options' }).click();
    await expect(a).toHaveURL(/\/recommendations/);
    await a.goto('/connect');
    const mine = a.locator('article', { hasText: bakery });
    await expect(mine).toBeVisible();
    await expect(mine.getByText('You', { exact: true })).toBeVisible();

    // B can't join without consent, and can't publish contact details.
    await b.goto('/connect/join');
    await b.getByLabel('Name others will see').fill(studio);
    await b.getByLabel('Type of business').selectOption('Instructor or creator');
    await b.getByRole('button', { name: 'Join Connect' }).click();
    await expect(b.getByText('Please tick the box to agree before joining.')).toBeVisible();
    await b.getByLabel('About your business (optional)').fill('Email me at studio@example.com');
    await expect(
      b.getByText('Keep emails, phone numbers and links out of the public profile.'),
    ).toBeVisible();
    await b
      .getByLabel('About your business (optional)')
      .fill('A fitness studio that wants to learn.');
    await b.getByLabel(/Yes, list my business in Connect/).check();
    await b.getByRole('button', { name: 'Join Connect' }).click();
    await expect(b).toHaveURL(/\/connect\/me\?welcome=1/);
    await expect(b.getByText('You’re in. Welcome to Connect!')).toBeVisible();

    // B finds A and says hello; A's private details were never shown.
    await b.goto('/connect');
    const card = b.locator('article', { hasText: bakery });
    await expect(card).toContainText('Austin, TX');
    await card.getByRole('button', { name: 'Say hello' }).click();
    await card
      .getByLabel(/Your message to/)
      .fill('Hi! Which tool made order tracking easier for you?');
    await card.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(card.getByRole('status')).toContainText('Sent!');

    // A reads and replies.
    await a.goto('/connect/me');
    await expect(a.getByRole('tab', { name: /Messages/ })).toContainText('1');
    await a.getByRole('button', { name: new RegExp(studio) }).click();
    const thread = a.getByRole('list', { name: 'Messages' });
    await expect(thread.getByText('Which tool made order tracking easier for you?')).toBeVisible();
    await a.getByLabel('Your reply').fill('A simple order list worked best for us!');
    await a.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(thread.getByText('A simple order list worked best for us!')).toBeVisible();

    // Pausing hides A from the directory.
    await a.getByRole('tab', { name: /Profile & privacy/ }).click();
    await a.getByRole('button', { name: 'Pause my profile' }).click();
    await expect(a.getByText('You’re paused. Nobody can find you.')).toBeVisible();
    await b.goto('/connect');
    await expect(b.locator('article', { hasText: bakery })).toHaveCount(0);
    await a.getByRole('button', { name: 'Show me again' }).click();

    // Accessibility of the directory and the profile page.
    await b.goto('/connect');
    await settle(b);
    const results = await new AxeBuilder({ page: b })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations).toEqual([]);

    // Withdrawing consent erases the profile and its messages.
    await leave(a);
    await leave(b);
    await b.goto('/connect');
    await expect(b.locator('article', { hasText: studio })).toHaveCount(0);
  } finally {
    await forget(a);
    await forget(b);
    await a.context().close();
    await b.context().close();
  }
});

test('Connect is in the main navigation and works in Spanish', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Connect' }),
  ).toBeVisible();
  await page.goto('/connect');
  await page.getByRole('button', { name: 'ES Español' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aprende de dueños');
  await page.goto('/connect/join');
  await expect(page.getByRole('heading', { name: 'Únete a Connect' })).toBeVisible();
  await expect(page.getByText(/Sí, incluye mi negocio en Connect/)).toBeVisible();
  await expect(page.getByText('Nunca se muestra')).toBeVisible();
});

test('an empty directory shows labelled fictional examples that cannot be messaged', async ({
  page,
}) => {
  await page.route('**/api/connect/profiles', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { mode: 'database', profiles: [] } })
      : route.continue(),
  );
  await page.goto('/connect');
  await expect(page.getByText('Be the first to join.')).toBeVisible();
  const examples = page.locator('article', { hasText: 'Fictional example' });
  await expect(examples).toHaveCount(3);
  await expect(examples.first().getByRole('button', { name: 'Say hello' })).toHaveCount(0);
  await expect(examples.first()).toContainText('can’t be messaged');
});
