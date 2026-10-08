import { test, expect } from './fixtures';

test.describe('Action Sandbox Worker Realm Isolation', () => {
  test('sandboxed action executes in worker realm and updates content', async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 45_000 });

    const result = await page.evaluate(async () => {
      try {
        const { executeInSandbox } = await import('/src/services/actionSandbox.ts');
        const { useTabStore } = await import('/src/store/tabStore.ts');

        const tabId = useTabStore.getState().createTab('WorkerTest.md', '# Initial Content\n');
        useTabStore.getState().setActiveTabId(tabId);

        // Execute real user code in dedicated Web Worker
        const userCode = `
          const current = api.getContent();
          api.setContent(current + '\\n## Processed By Worker\\nResult: ' + (40 + 2));
        `;

        await executeInSandbox(userCode);
        const updatedTab = useTabStore.getState().tabs.find(t => t.id === tabId);
        return { success: true, content: updatedTab?.content };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
    expect(result.content).toContain('## Processed By Worker');
    expect(result.content).toContain('Result: 42');
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
      } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : String(err) };
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

  test('action sandbox rejects dynamic imports and constructor climbers', async ({ page }) => {
    await page.goto('/');
    const cm = page.locator('.cm-editor');
    await expect(cm).toBeVisible({ timeout: 30_000 });

    const result = await page.evaluate(async () => {
      const { executeInSandbox } = await import('/src/services/actionSandbox.ts');
      const errors: string[] = [];

      try {
        await executeInSandbox('import("./foo.js")');
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      try {
        await executeInSandbox('const c = ({}).constructor.constructor; c("return fetch")()');
      } catch (e: unknown) {
        errors.push(e instanceof Error ? e.message : String(e));
      }

      return errors;
    });

    expect(result.length).toBe(2);
    expect(result[0]).toMatch(/Security Error/i);
    expect(result[1]).toMatch(/Security Error/i);
  });
});
