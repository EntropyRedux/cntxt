import { test, expect } from './fixtures';

async function openPreviewPane(page: import('@playwright/test').Page) {
  await page.keyboard.press('Control+k');
  const palette = page.locator('[role="dialog"]');
  await expect(palette).toBeVisible({ timeout: 5_000 });
  await palette.getByPlaceholder(/Type a command/).fill('live preview');
  await expect(palette.getByText('Open Live Preview Split Pane', { exact: true })).toBeVisible({ timeout: 5_000 });
  await palette.getByText('Open Live Preview Split Pane', { exact: true }).click();
  await expect(palette).toBeHidden({ timeout: 5_000 });
}

test.describe('Live preview rendering', () => {
  test.use({ demo: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.cm-content')).toContainText('Dynamic Formula Engine', { timeout: 10_000 });
  });

  test('toggling split preview via Command Palette shows preview pane', async ({ page }) => {
    await openPreviewPane(page);
    await expect(page.locator('.contextpad-preview-prose')).toBeVisible({ timeout: 10_000 });
  });

  test('KaTeX math renders into live DOM glyphs', async ({ page }) => {
    await openPreviewPane(page);
    const mathBlocks = page.locator('.contextpad-preview-prose .cm-live-math-block .katex');
    await expect(mathBlocks.first()).toBeVisible({ timeout: 10_000 });
    await expect(mathBlocks.first()).toContainText('attention');
  });

  test('XSS: script tags in markdown are neutralized by sanitizePreviewHtml', async ({ page }) => {
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('<script>alert("xss")</script>', { delay: 5 });
    await page.waitForTimeout(500);

    await openPreviewPane(page);

    const previewContainer = page.locator('.contextpad-preview-prose');
    await expect(previewContainer).toBeVisible({ timeout: 10_000 });
    const html = await previewContainer.innerHTML();
    expect(html).not.toContain('<script');
  });

  test('XSS: inline event handlers are stripped from rendered HTML', async ({ page }) => {
    await page.locator('.cm-content').click();
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('<img src="x" onerror="alert(1)">', { delay: 5 });
    await page.waitForTimeout(500);

    await openPreviewPane(page);

    const previewContainer = page.locator('.contextpad-preview-prose');
    await expect(previewContainer).toBeVisible({ timeout: 10_000 });
    const html = await previewContainer.innerHTML();
    expect(html).not.toContain('onerror');
  });
});