import { test as base, expect } from '@playwright/test';

export interface E2EOptions {
  demo?: boolean;
}

export const test = base.extend<{ app: void } & E2EOptions>({
  demo: [true, { option: true }],
  app: [
    async ({ page, demo }, use) => {
      await page.addInitScript(
        ([flag]) => {
          (window as any).__CONTEXTPAD_DEMO__ = flag;
        },
        [demo]
      );
      await page.goto('/');
      await use();
    },
    { auto: true },
  ],
});

export { expect };