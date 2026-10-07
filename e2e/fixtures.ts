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
          try {
            window.localStorage.setItem('contextpad_guest_mode', 'true');
            window.localStorage.setItem('contextpad_onboarding_completed', 'true');
          } catch {
            // ignore
          }
        },
        [demo]
      );
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await use();
    },
    { auto: true },
  ],
});

export { expect };