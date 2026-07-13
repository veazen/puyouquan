import { expect, test } from '@playwright/test';

/**
 * P1 billing acceptance: Settings shows the Plan & Billing block with the
 * plan badge and the monthly usage meter. The Playwright API env has no
 * Lemon Squeezy config, so the early-access copy replaces upgrade buttons.
 */
test('settings: Plan & Billing block shows the plan badge and usage meter', async ({ page }) => {
  const run = Date.now().toString(36);
  const slug = `bill${run}`;

  await page.goto('/dashboard/login');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByPlaceholder('Brand / company name').fill('Billing Block Brand');
  await page.getByPlaceholder('Subdomain slug (e.g. acme)').fill(slug);
  await page.getByPlaceholder('Email').fill(`${slug}@example.com`);
  await page.getByPlaceholder('Password').fill('playwright-password-1');
  await page.getByRole('button', { name: 'Create tenant' }).click();
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 20_000 });

  await page.goto('/dashboard/settings');

  const section = page.locator('[data-testid="billing-section"]');
  await expect(section).toBeVisible({ timeout: 10_000 });
  await expect(section.getByRole('heading', { name: 'Plan & Billing' })).toBeVisible();

  // fresh tenant: free plan, 0 of 500 codes used this month
  await expect(page.locator('[data-testid="billing-plan"]')).toHaveText('free');
  const usage = page.locator('[data-testid="billing-usage"]');
  await expect(usage).toContainText('Codes this month');
  await expect(usage).toContainText('0 / 500');

  // no checkout URLs configured in this environment → early-access copy
  await expect(section).toContainText('Paid plans are in early access');
});
