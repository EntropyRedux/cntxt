import { test, expect } from './fixtures';

// sanitizePreviewHtml guard preserved for live markdown rendering & preview sanitization
test.describe('Live rendered markdown mode', () => {
  test.use({ demo: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.cm-content')).toContainText('Dynamic Formula Engine', { timeout: 15_000 });
  });

  test('editor starts in Live Rendered Markdown mode by default', async ({ page }) => {
    const canvas = page.locator('.cm-rendered-canvas');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
  });

  test('toggling mode via Ctrl+M switches between Raw and Rendered modes', async ({ page }) => {
    // Focus editor canvas and toggle to Raw mode
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+m');
    await expect(page.locator('.cm-raw-canvas')).toBeVisible({ timeout: 10_000 });

    // Toggle back to Rendered mode
    await page.keyboard.press('Control+m');
    await expect(page.locator('.cm-rendered-canvas')).toBeVisible({ timeout: 10_000 });
  });

  test('KaTeX display math renders into live DOM glyphs in rendered mode', async ({ page }) => {
    await page.keyboard.press('Control+n');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.insertText('$$\\mathcal{L} = \\text{attention}(Q, K, V)$$\n\nNext line');
    const mathBlock = page.locator('.cm-live-math-block .katex');
    await expect(mathBlock.first()).toBeVisible({ timeout: 10_000 });
    await expect(mathBlock.first()).toContainText('attention');
  });

  test('Markdown tables render into interactive live table widgets', async ({ page }) => {
    await page.keyboard.press('Control+n');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
    await page.locator('.cm-content').click();
    await page.keyboard.insertText('| Model | Context |\n| :--- | :--- |\n| Gemini 2.0 Flash | 1M |\n\nNext line');
    const tableContainer = page.locator('.cm-live-table-container');
    await expect(tableContainer.first()).toBeVisible({ timeout: 10_000 });
    const table = page.locator('.cm-live-table');
    await expect(table.first()).toBeVisible({ timeout: 10_000 });
    await expect(table.first()).toContainText('Gemini 2.0 Flash');
  });
});