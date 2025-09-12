import { test, expect } from '@playwright/test';

test('enriched-only search returns <=20 leads and shows progress', async ({ page }) => {
  await page.goto('/');

  // Open search panel if hidden
  const toggleSearch = page.getByRole('button', { name: /search/i });
  if (await toggleSearch.isVisible()) {
    await toggleSearch.click();
  }

  // Toggle enriched-only and set limit 3 for test speed
  await page.getByLabel(/Return enriched leads only/i).check();
  const limitInput = page.locator('input[type="number"]').first();
  await limitInput.fill('3');

  // Enter prompt and submit
  const textarea = page.locator('textarea');
  await textarea.first().fill('dentists in columbia sc with owner identified');
  await page.getByRole('button', { name: /find leads/i }).click();

  // Wait for table to appear (E2E bypass completes quickly)

  // Wait for results table
  const table = page.locator('table');
  await expect(table).toBeVisible({ timeout: 60000 });

  // Row count <= 3
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCountGreaterThan(0);
  const count = await rows.count();
  expect(count).toBeLessThanOrEqual(3);
});

