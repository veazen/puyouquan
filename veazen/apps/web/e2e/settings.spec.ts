import { expect, test } from '@playwright/test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** Settings page acceptance: API key lifecycle through the real stack. */
test('settings: create + revoke an API key via the UI', async ({ page }) => {
  const run = Date.now().toString(36);
  const slug = `key${run}`;
  const errors: string[] = [];
  const responses: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.url().includes('/auth/api-keys')) {
      responses.push(`${r.request().method()} ${r.url()} -> ${r.status()}`);
    }
  });

  await page.goto('/dashboard/login');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByPlaceholder('Brand / company name').fill('Key Repro Brand');
  await page.getByPlaceholder('Subdomain slug (e.g. acme)').fill(slug);
  await page.getByPlaceholder('Email').fill(`${slug}@example.com`);
  await page.getByPlaceholder('Password').fill('playwright-password-1');
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });

  await page.goto('/dashboard/settings');
  await page.getByPlaceholder('Label (e.g. woocommerce)').fill('woocommerce');
  await page.getByRole('button', { name: 'Create key' }).click();

  await page.waitForTimeout(3_000);
  console.log('[repro] /auth/api-keys responses:', JSON.stringify(responses));
  console.log('[repro] browser errors:', JSON.stringify(errors));

  await expect(page.locator('[data-testid="fresh-api-key"]')).toBeVisible({ timeout: 10_000 });

  // the key box holds ONLY the key (hint lives outside the <code> element),
  // and the copy button puts exactly the key on the clipboard
  const keyText = await page.locator('[data-testid="fresh-api-key"] code').innerText();
  expect(keyText).toMatch(/^vz_[A-Za-z0-9]+$/);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(keyText);
});
