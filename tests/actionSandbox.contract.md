# TEST CONTRACT: ActionSandbox (`src/services/actionSandbox.ts`)

- **Component / Module:** `executeInSandbox`
- **Status:** WORKING IN PRODUCTION
- **Pillar Alignment:** Pillar 8 (Native Boundary Security, Deep Sandbox Hardening) & TR-003

## Expected Behavior
Executes user-defined automation scripts within a protected scope, exposing safe document editing APIs (`api.getText()`, `api.setText()`, `api.getSelection()`, `api.toast()`) while blocking dangerous global prototypes, process access, and DOM reaching.

## Inputs
- `code: string`: User-authored JavaScript code snippet.
- `rawApi: any`: Optional host context bridge.

## Security Constraints Enforced
- Regex pre-scanner rejects `constructor`, `[ 'constructor' ]`, `__proto__`, and `prototype` tokens immediately.
- Global scope parameters (`globalThis`, `window`, `document`, `Function`, `eval`, `Reflect`, `Proxy`, `process`, `localStorage`, `sessionStorage`, `navigator`, `indexedDB`, `XMLHttpRequest`, `fetch`) are shadowed with `undefined`.
- Host `safeApi` instance and sub-objects (`safeApi.dialog`, `safeApi.utils`) are immutably frozen with `Object.freeze()`.
- Maximum execution timeout enforced at 4000ms.

## Edge Cases
- Infinite loops or promises that never resolve trigger timeout rejection after 4000ms.
- Code attempting `({}).constructor.constructor('return this')()` throws security exception.
- Syntax errors reject promise cleanly with readable compilation error.

## Mock Dependencies
- None.
