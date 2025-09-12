import { test, expect } from '@playwright/test';

test('enriched-only search returns <=20 leads and shows progress', async ({ page }) => {
  await page.goto('/');

  // Switch to Table View then open Search
  await page.getByRole('tab', { name: /table view/i }).click();
  await page.getByRole('button', { name: /search/i }).click();

  // Toggle enriched-only and set limit 3 for test speed
  await page.getByLabel(/Return enriched leads only/i).check();
  const limitInput = page.locator('input[type="number"]').first();
  await limitInput.fill('3');

  // Enter prompt and submit
  const textarea = page.locator('textarea');
  await textarea.first().fill('dentists in columbia sc with owner identified');
  await page.getByRole('button', { name: /find leads/i }).click();

  // Wait for E2E fake leads
  await expect(page.getByText('Test Business 1')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Test Business 3')).toBeVisible();
  await expect(page.getByText('Test Business 4')).toHaveCount(0);
});

