import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api/v1';

/**
 * E1 acceptance (browser level, PD-004): the owner invites a warehouse
 * account from Settings → Team (grabbing the accept URL from the API
 * response — exactly what the copy-link button exposes when the invite
 * email cannot be delivered), the invitee sets a password on the public
 * invite page, lands on the Returns desk, sees nothing but Returns in the
 * nav, and can look up a serial by hand.
 */
test('team invites: warehouse account sees only the Returns desk', async ({ page }) => {
  const run = Date.now().toString(36);
  const slug = `inv${run}`;
  const inviteEmail = `${slug}-wh@example.com`;

  // 1. owner registers a tenant through the console UI
  await page.goto('/dashboard/login');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByPlaceholder('Brand / company name').fill('Invite Brand');
  await page.getByPlaceholder('Subdomain slug (e.g. acme)').fill(slug);
  await page.getByPlaceholder('Email').fill(`${slug}@example.com`);
  await page.getByPlaceholder('Password').fill('playwright-password-1');
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });

  // 2. seed one Lite serial via the API with the owner JWT (cf. returns.spec)
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
        body: JSON.stringify({ name: 'Invite Widget', sku: 'INV-001' }),
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

  // 3. Settings → Team: invite a warehouse account and capture the accept URL
  await page.goto('/dashboard/settings');
  await page.locator('[data-testid="invite-email"]').fill(inviteEmail);
  await page.locator('[data-testid="invite-role"]').selectOption('warehouse');
  const [inviteResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/tenant/invites') && r.request().method() === 'POST',
    ),
    page.locator('[data-testid="invite-send"]').click(),
  ]);
  expect(inviteResponse.status()).toBe(201);
  const invite = (await inviteResponse.json()) as { accept_url: string };
  expect(invite.accept_url).toContain('/dashboard/invite/');
  const token = invite.accept_url.split('/dashboard/invite/')[1]!;

  // the pending list shows the invite with a copy-link fallback for the owner
  const pending = page.locator('[data-testid="pending-invites"]');
  await expect(pending).toContainText(inviteEmail, { timeout: 10_000 });
  await expect(page.locator(`[data-testid="invite-copy-${inviteEmail}"]`)).toBeVisible();

  // 4. the invitee opens the link (fresh session) and sets a password
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/dashboard\/login/);
  await page.goto(`/dashboard/invite/${token}`);
  await page.locator('[data-testid="invite-password"]').fill('warehouse-pass-1');
  await page.locator('[data-testid="invite-confirm"]').fill('warehouse-pass-1');
  await page.locator('[data-testid="invite-submit"]').click();

  // 5. warehouse home is the Returns desk; the nav is Returns-only
  await expect(page).toHaveURL(/\/dashboard\/returns/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Returns' })).toBeVisible();
  const navLinks = page.locator('aside a');
  await expect(navLinks).toHaveCount(1);
  await expect(navLinks.first()).toHaveText('Returns');

  // 6. manual serial entry works for the warehouse role
  await page.locator('[data-testid="returns-serial-input"]').fill(serial);
  await page.getByRole('button', { name: 'Check' }).click();
  const card = page.locator('[data-testid="returns-card"]');
  await expect(card).toBeVisible({ timeout: 10_000 });
  await expect(card).toHaveAttribute('data-status', 'active');

  // 7. straying off the desk bounces straight back (role redirect)
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard\/returns/);
});
