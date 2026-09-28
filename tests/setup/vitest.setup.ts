// Vitest global setup file
// Provides matchMedia polyfill for both node and jsdom environments.
// @testing-library/jest-dom matchers are extended per-file (inside jsdom test files)
// to avoid breaking node-env store/service tests that don't use DOM assertions.

// matchMedia polyfill (used by floating element positioning in component tests)
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as (query: string) => MediaQueryList;
}

 
