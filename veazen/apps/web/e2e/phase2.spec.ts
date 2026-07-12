import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

/**
 * Phase 2 acceptance flow (§8): register tenant → create product → generate
 * batch → download CSV → walk one code through the full verification flow
 * in the browser (green → scratch redemption → yellow on revisit).
 */
test('register → product → batch → CSV → full verify flow', async ({ page }) => {
  const run = Date.now().toString(36);
  const slug = `pw${run}`;

  // 1. register a tenant through the console UI
  await page.goto('/dashboard/login');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByPlaceholder('Brand / company name').fill('Playwright Brand');
  await page.getByPlaceholder('Subdomain slug (e.g. acme)').fill(slug);
  await page.getByPlaceholder('Email').fill(`${slug}@example.com`);
  await page.getByPlaceholder('Password').fill('playwright-password-1');
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });

  // 2. create a product
  await page.goto('/dashboard/products');
  await page.getByPlaceholder('Product name *').fill('PW Widget');
  await page.getByPlaceholder('SKU * (upsert key)').fill('PW-001');
  await page.getByRole('button', { name: 'Save product' }).click();
  await expect(page.getByRole('cell', { name: 'PW Widget' })).toBeVisible({ timeout: 10_000 });

  // 3. generate a batch and wait for the worker to finish
  await page.goto('/dashboard/batches');
  await page.locator('select[name="product_id"]').selectOption({ label: 'PW Widget (PW-001)' });
  await page.getByPlaceholder('Quantity *').fill('50');
  await page.getByRole('button', { name: 'Generate batch' }).click();
  const readyRow = page.locator('[data-testid="batch-row"][data-status="ready"]');
  await expect(readyRow).toHaveCount(1, { timeout: 60_000 });

  // 4. activate at "factory exit"
  await page.getByRole('button', { name: 'Activate all' }).click();
  await expect(page.getByRole('button', { name: 'Activate all' })).toHaveCount(0, {
    timeout: 15_000,
  });

  // 5. download the one-time CSV (browser context, console credentials)
  const csv = await page.evaluate(async (api) => {
    const token = window.localStorage.getItem('vz_access');
    const headers = { authorization: `Bearer ${token}` };
    const batches = (await (await fetch(`${api}/batches`, { headers })).json()) as Array<{
      id: string;
    }>;
    const exported = (await (
      await fetch(`${api}/batches/${batches[0]!.id}/export?format=csv`, { headers })
    ).json()) as { downloadPath: string };
    return (await fetch(`${api}${exported.downloadPath}`)).text();
  }, API);
  const [serial, scratch] = csv.trim().split('\n')[1]!.split(',');
  expect(serial).toHaveLength(20);
  expect(scratch).toHaveLength(12);

  // 6. consumer verify page: green authentic state
  await page.goto(`/v/${serial}`);
  const state = page.locator('[data-testid="verify-state"]');
  await expect(state).toHaveAttribute('data-result', 'authentic');
  await expect(page.getByRole('heading', { name: 'Genuine product' })).toBeVisible();

  // 7. redeem the scratch code (display-formatted, lowercase — normalization)
  const formatted = `${scratch!.slice(0, 4)}-${scratch!.slice(4, 8)}-${scratch!.slice(8)}`;
  await page.getByPlaceholder('e.g. A1B2-C3D4-E5F6').fill(formatted.toLowerCase());
  await page.getByRole('button', { name: 'Verify hidden code' }).click();
  await expect(page.locator('[data-testid="scratch-result"]')).toContainText(
    'verified as genuine',
    { timeout: 15_000 },
  );

  // 8. revisiting now shows the yellow "already verified" state
  await page.goto(`/v/${serial}`);
  await expect(page.locator('[data-testid="verify-state"]')).toHaveAttribute(
    'data-result',
    'already_verified',
  );
});
