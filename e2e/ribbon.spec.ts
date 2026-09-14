import { test, expect } from './fixtures';

test.describe('Modular ribbon', () => {
  test.use({ demo: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#modular-ribbon')).toBeVisible({ timeout: 15_000 });
  });

  test('ribbon is visible in demo mode', async ({ page }) => {
    await expect(page.locator('#modular-ribbon')).toBeVisible();
  });

  test('expand button toggles ribbon to multi-row mode', async ({ page }) => {
    const expandBtn = page.locator('#modular-ribbon-expand-btn');
    await expect(expandBtn).toBeVisible();

    const ribbonBefore = page.locator('#modular-ribbon');
    const classBefore = await ribbonBefore.getAttribute('class');
    expect(classBefore).toContain('h-8.5');

    await expandBtn.click();

    const classAfter = await ribbonBefore.getAttribute('class');
    expect(classAfter).toContain('min-h-[34px]');
  });

  test('ribbon collapse button returns to single-row', async ({ page }) => {
    const expandBtn = page.locator('#modular-ribbon-expand-btn');
    await expandBtn.click();
    const ribbon = page.locator('#modular-ribbon');
    await expect(ribbon).toHaveClass(/min-h-\[34px\]/, { timeout: 2_000 });

    await expandBtn.click();
    await expect(ribbon).not.toHaveClass(/min-h-\[34px\]/, { timeout: 2_000 });
  });

  test('ribbon items are rendered (at least one visible action/tool button)', async ({ page }) => {
    const buttons = page.locator('#modular-ribbon button[aria-label]');
    await expect(buttons.first()).toBeVisible();
    expect(await buttons.count()).toBeGreaterThan(1);
  });

  test('Customize Ribbon button is present and opens the customizer', async ({ page }) => {
    const customizeBtn = page.locator('#modular-ribbon button[aria-label="Customize Ribbon"]');
    await expect(customizeBtn).toBeVisible();
    await customizeBtn.click();
    await expect(page.getByText('Customize Modular Ribbon')).toBeVisible({ timeout: 5_000 });
  });
});
