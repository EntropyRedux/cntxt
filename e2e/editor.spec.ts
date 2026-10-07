import { test, expect } from './fixtures';

test.describe('Editor core behavior', () => {
  test.use({ demo: true });

  test('welcome document loads in CodeMirror', async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.cm-content')).toContainText('Dynamic Formula Engine', { timeout: 15_000 });
  });

  test('tab is rendered with the welcome doc title', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.theme-tab-active, .theme-tab-inactive, button[title="Click to rename document"]').first()).toContainText('Welcome.md', { timeout: 15_000 });
  });

  test('typing inserts text into the editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('hello e2e', { delay: 20 });
    await expect(page.locator('.cm-content')).toContainText('hello e2e');
  });

  test('action button widget renders for valid action tokens', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Control+n');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.insertText('[[action:format-json-and-sort]]');
    await expect(page.locator('.cm-action-btn-widget')).toBeVisible({ timeout: 10_000 });
  });

  test('missing action token shows missing widget', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press('Control+n');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.insertText('[[action:nonexistent-action-id]]');
    await expect(page.locator('.cm-action-missing-widget')).toBeVisible({ timeout: 10_000 });
  });
});
