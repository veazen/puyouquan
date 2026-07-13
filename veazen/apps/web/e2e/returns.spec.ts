import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

/**
 * SME suite M3 acceptance (browser level): a Lite code locks on first scan,
 * the warehouse Returns desk looks it up (paste with hyphens) and releases
 * it, and the next consumer scan is green again. Plus the Settings page
 * returns-display-policy toggle round-trips.
 */
test('returns desk: lite lock → release → verify page green again', async ({ page }) => {
  const run = Date.now().toString(36);
  const slug = `ret${run}`;

  // 1. register a tenant through the console UI
  await page.goto('/dashboard/login');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByPlaceholder('Brand / company name').fill('Returns Brand');
  await page.getByPlaceholder('Subdomain slug (e.g. acme)').fill(slug);
  await page.getByPlaceholder('Email').fill(`${slug}@example.com`);
  await page.getByPlaceholder('Password').fill('playwright-password-1');
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });

  // 2. seed data with the owner JWT from the browser context (cf. phase2 §5):
  //    Lite mode + product + auto-activating on-demand pool → one serial
  const serial = await page.evaluate(async (api) => {
    const token = window.localStorage.getItem('vz_access');
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    await fetch(`${api}/tenant/settings`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ mode: 'lite' }),
    });
    const product = (await (
      await fetch(`${api}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: 'Returns Widget', sku: 'RET-001' }),
      })
    ).json()) as { id: string };
    const batch = (await (
      await fetch(`${api}/batches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ product_id: product.id, quantity: 10, kind: 'on_demand' }),
      })
    ).json()) as { id: string };
    const deadline = Date.now() + 60_000;
    for (;;) {
      const status = (await (await fetch(`${api}/batches/${batch.id}`, { headers })).json()) as {
        status: string;
      };
      if (status.status === 'ready') {
        break;
      }
      if (Date.now() > deadline) {
        throw new Error('batch generation timed out');
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    const exported = (await (
      await fetch(`${api}/batches/${batch.id}/export?format=csv`, { headers })
    ).json()) as { downloadPath: string };
    const csv = await (await fetch(`${api}${exported.downloadPath}`)).text();
    return csv.trim().split('\n')[1]!.split(',')[0]!.trim();
  }, API);
  expect(serial).toHaveLength(20);

  // 3. consumer scans: first is green, second hits the first-scan lock
  await page.goto(`/v/${serial}`);
  await expect(page.locator('[data-testid="verify-state"]')).toHaveAttribute(
    'data-result',
    'authentic',
  );
  await page.goto(`/v/${serial}`);
  await expect(page.locator('[data-testid="verify-state"]')).toHaveAttribute(
    'data-result',
    'already_verified',
  );

  // 4. the warehouse pastes the display-formatted (hyphenated, lowercase)
  //    serial into the Returns desk — normalization happens server-side
  const formatted = serial.match(/.{1,5}/g)!.join('-').toLowerCase();
  await page.goto('/dashboard/returns');
  await page.locator('[data-testid="returns-serial-input"]').fill(formatted);
  await page.getByRole('button', { name: 'Check' }).click();
  const card = page.locator('[data-testid="returns-card"]');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toHaveAttribute('data-status', 'active');
  await expect(card.locator('[data-testid="returns-release-count"]')).toHaveText('0');

  // 5. release for resale: confirm layer → success message → card refresh
  await page.locator('[data-testid="returns-release"]').click();
  await expect(page.locator('[data-testid="returns-confirm"]')).toBeVisible();
  await page.locator('[data-testid="returns-confirm-go"]').click();
  await expect(page.locator('[data-testid="returns-action-message"]')).toContainText(
    'Released for resale',
    { timeout: 15_000 },
  );
  await expect(card.locator('[data-testid="returns-release-count"]')).toHaveText('1');
  await expect(page.locator('[data-testid="returns-release"]')).toHaveCount(0);

  // 6. the next consumer scan is a fresh green first scan again
  await page.goto(`/v/${serial}`);
  await expect(page.locator('[data-testid="verify-state"]')).toHaveAttribute(
    'data-result',
    'authentic',
  );

  // 7. settings: the returns display policy round-trips through the API
  await page.goto('/dashboard/settings');
  const policy = page.locator('[data-testid="rma-display-policy"]');
  await expect(policy).toHaveValue('fresh');
  await policy.selectOption('refurbished');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByText('Returns display policy saved.')).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.locator('[data-testid="rma-display-policy"]')).toHaveValue('refurbished', {
    timeout: 10_000,
  });
});
