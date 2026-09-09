# Platform Adapter Layer

This directory (`src/adapters/`) is the **ONLY** architectural layer permitted to interact with host platform and browser APIs.

## Strictly Permitted Files
The following files (and only these files) are allowed to access platform APIs such as `window`, `document`, `navigator`, `localStorage`, `sessionStorage`, `indexedDB`, and `navigator.clipboard`:

1. `browserRuntimeAdapter.ts` - Implements `IRuntimeBridge` for browser/web-preview environments.
2. `mockRuntimeAdapter.ts` - Implements `IRuntimeBridge` for unit tests, Storybook, and in-memory mock runs.
3. `tauriRuntimeAdapter.ts` - Implements `IRuntimeBridge` for Tauri v2 native desktop applications.
4. `browserIndexedDB.ts` - Encapsulates Web IndexedDB and storage fallback.
5. `runtimeBridge.tsx` - Provides React Context dependency injection (`useRuntimeBridge()`) and store hydration.
6. `storageKeys.ts` - Centralized storage key definitions.
7. `eventDispatcher.ts` - Event dispatcher bridge.
8. `index.ts` - Barrel exports for adapters, keys, and runtime hooks.

## Architectural Mandate
- Components, stores, and services outside `src/adapters/` MUST NEVER access platform globals directly.
- All platform interactions MUST be routed through the `IRuntimeBridge` contract defined in `src/ui-contract/bridgeContract.ts`.
- The regression barrier script `scripts/check-platform-leaks.mjs` is executed on `npm run lint` to enforce zero leaks.
