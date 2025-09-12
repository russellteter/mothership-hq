import { test, expect } from '@playwright/test';

test('enriched results show exactly 3 fake leads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: /table view/i }).click();

  // Expect fake leads (from prior test or navigate fresh and trigger quickly)
  // If needed, open search and trigger again (idempotent)
  const maybeSearch = page.getByRole('button', { name: /search/i });
  if (await maybeSearch.isVisible()) {
    await maybeSearch.click();
    await page.getByLabel(/Return enriched leads only/i).check();
    await page.locator('input[type="number"]').first().fill('3');
    await page.locator('textarea').first().fill('hvac in atlanta');
    await page.getByRole('button', { name: /find leads/i }).click();
  }

  await expect(page.getByText('Test Business 1')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Test Business 3')).toBeVisible();
  await expect(page.getByText('Test Business 4')).toHaveCount(0);
});
