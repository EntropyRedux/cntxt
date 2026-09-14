import { test, expect } from './fixtures';

test.describe('Slash command menu', () => {
  test.use({ demo: true });

  test('slash command popup appears when typing "/" on a new line', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });

    await page.locator('.cm-content').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    const tooltip = page.locator('.cm-tooltip-autocomplete');
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
  });

  test('slash command menu lists expected commands', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });

    await page.locator('.cm-content').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.cm-tooltip-autocomplete')).toContainText('system-prompt');
  });

  test('keyboard navigation moves selection in the popup', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });

    await page.locator('.cm-content').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible({ timeout: 5_000 });
    const selected = page.locator('.cm-tooltip-autocomplete [aria-selected="true"]');
    await expect(selected).toBeVisible();
    const beforeLabel = await selected.locator('.cm-completionLabel').textContent();

    // CM interactionDelay (default 75ms) ignores arrow nav right after the tooltip opens
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowDown');
    await expect(selected).toHaveCount(1);
    const afterLabel = await selected.locator('.cm-completionLabel').textContent();
    expect(afterLabel).not.toBe(beforeLabel);
  });

  test('pressing Enter inserts the selected slash command', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });

    await page.locator('.cm-content').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('/');

    await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible({ timeout: 5_000 });
    await page.keyboard.press('Enter');

    await expect(page.locator('.cm-tooltip-autocomplete')).toBeHidden({ timeout: 5_000 });
    await expect(page.locator('.cm-content')).toContainText('/');
  });
});
