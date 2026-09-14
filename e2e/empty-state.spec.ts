import { test, expect } from './fixtures';

test.describe('Empty state boot', () => {
  test.use({ demo: false });

  test('boots without crashing when demo mode is off', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#modular-ribbon')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('No document open')).toBeVisible();
    await expect(page.locator('.cm-editor')).toHaveCount(0);
  });

  test('no tabs in tab bar when demo mode is off', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#modular-ribbon')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.theme-tab-active, .theme-tab-inactive')).toHaveCount(0);
  });

  test('ribbon is still present when demo mode is off', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#modular-ribbon')).toBeVisible({ timeout: 15_000 });
  });
});
