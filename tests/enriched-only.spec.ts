import { test, expect } from '@playwright/test';

test('enriched-only search returns <=20 leads and shows progress', async ({ page }) => {
  await page.goto('/');

  // Open search panel if hidden
  const searchButton = page.getByRole('button', { name: /search/i });
  if (await searchButton.isVisible()) {
    await searchButton.click();
  }

  // Toggle enriched-only and set limit 3 for test speed
  await page.getByLabel(/Return enriched leads only/i).check();
  const limitInput = page.locator('input[type="number"]').first();
  await limitInput.fill('3');

  // Enter prompt and submit
  await page.getByLabel(/Describe your ideal leads/i).fill('dentists in columbia sc with owner identified');
  await page.getByRole('button', { name: /find leads/i }).click();

  // Progress shows up
  await expect(page.getByText(/Planning enrichment|Selecting high-quality candidates|Verifying|Synthesizing/i)).toBeVisible({ timeout: 30000 });

  // Wait for results table
  const table = page.locator('table');
  await expect(table).toBeVisible({ timeout: 60000 });

  // Row count <= 3
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCountGreaterThan(0);
  const count = await rows.count();
  expect(count).toBeLessThanOrEqual(3);
});

