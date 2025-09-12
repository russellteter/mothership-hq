import { test, expect } from '@playwright/test';

test('toggle enriched-only and submit query', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /table view/i }).click();
  await page.getByRole('button', { name: /search/i }).click();

  await page.getByLabel(/Return enriched leads only/i).check();
  const limitInput = page.locator('input[type="number"]').first();
  await limitInput.fill('3');

  const textarea = page.locator('textarea');
  await textarea.first().fill('dentists in columbia sc with owner identified');
  await page.getByRole('button', { name: /find leads/i }).click();

  await expect(page.getByText('Test Business 1')).toBeVisible({ timeout: 30000 });
});
