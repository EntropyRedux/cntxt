import { test, expect } from './fixtures';

test.describe('Action Sandbox Worker Realm Isolation', () => {
  test.use({ demo: true });

  test('sandboxed action executes in worker realm and updates content', async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 30_000 });

    // Open a new tab
    await page.keyboard.press('Control+n');
    await expect(page.locator('.cm-content')).toBeVisible({ timeout: 10_000 });
    await page.locator('.cm-content').click();

    // Insert an action button token for built-in action
    await page.keyboard.insertText('[[action:act_summarize]]\n\n# Project Notes\nFeature implementation is progressing well.\nAll security gates are passing.');

    const actionBtn = page.locator('.cm-action-btn-widget').first();
    await expect(actionBtn).toBeVisible({ timeout: 10_000 });

    // Click the action button to trigger worker execution
    await actionBtn.click();

    // Verify document was updated with executive summary generated inside worker
    await expect(page.locator('.cm-content')).toContainText('Executive Summary', { timeout: 15_000 });
    await expect(page.locator('.cm-content')).toContainText('Key Metrics:', { timeout: 15_000 });
  });

  test('action sandbox isolates worker global scope from ambient network primitives', async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 30_000 });

    // Execute in page context to verify actionSandbox execution with isolated worker
    const result = await page.evaluate(async () => {
      try {
        const { executeInSandbox } = await import('/src/services/actionSandbox.ts');
        let setContentVal = '';
        const mockApi = {
          getText: () => 'Hello World',
          getContent: () => 'Hello World',
          getSelection: () => 'World',
          setContent: (val: string) => { setContentVal = val; },
          setText: (val: string) => { setContentVal = val; },
        };

        // Script attempting to access stripped ambient capabilities
        const maliciousCode = `
          const hasFetch = typeof fetch !== 'undefined' && fetch !== undefined;
          const hasXHR = typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest !== undefined;
          const hasWS = typeof WebSocket !== 'undefined' && WebSocket !== undefined;
          const hasImportScripts = typeof importScripts !== 'undefined' && importScripts !== undefined;
          
          api.setContent(JSON.stringify({ hasFetch, hasXHR, hasWS, hasImportScripts }));
        `;

        await executeInSandbox(maliciousCode, mockApi);
        return {
          success: true,
          content: setContentVal
        };
      } catch (err: any) {
        return { error: err.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();

    const parsedScope = JSON.parse(result.content!);
    // In our worker realm, ambient capabilities were stripped to undefined
    expect(parsedScope.hasFetch).toBe(false);
    expect(parsedScope.hasXHR).toBe(false);
    expect(parsedScope.hasWS).toBe(false);
    expect(parsedScope.hasImportScripts).toBe(false);
  });
});
