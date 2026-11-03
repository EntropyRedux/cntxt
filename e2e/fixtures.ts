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
                    interface ExtendedWindow extends Window {
            __CONTEXTPAD_DEMO__?: boolean;
            __E2E_ACTION_TIMEOUT__?: number;
          }
          const win = window as ExtendedWindow;
          win.__CONTEXTPAD_DEMO__ = flag;
          win.__E2E_ACTION_TIMEOUT__ = 25000;
          try {
            window.localStorage.setItem('contextpad_guest_mode', 'true');
            window.localStorage.setItem('contextpad_onboarding_completed', 'true');
          } catch {
            // ignore
          }
        },
        [demo]
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };