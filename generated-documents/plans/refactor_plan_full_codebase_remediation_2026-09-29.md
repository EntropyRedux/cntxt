# REFACTOR PLAN — FULL CODEBASE REMEDIATION (v6)
> Stage: Refactor (Prompt 18)  
> Project: CNTXT (ContextPad)  
> Workspace Root: `C:\Projects\LocalActive\Repo\Active\CNTXT`  
> Author: Prod Agent  
> Date: 2026-09-29  
> Target Commit: `b6e7f56` (branch `main`)  
> Based on Reconciled Audit: `generated-documents/audits/raw_findings_remediation_verification_2026-09-28.md`  

---

## 1. Executive Summary & Problem Formulation

The 2026-09-28 Pass 1 Verification Re-Audit (R2) confirmed that while prior sanitization and packaging fixes were successful, several core architectural defects remain open:

1. **C-02 (CRITICAL): Action Sandbox Worker Capability Exposure**:
   Inside `DedicatedWorkerGlobalScope` (`src/services/actionWorker.ts`), user-authored action code runs via `new Function(...)`. Although `safeApi` provides a scoped helper interface, ambient capabilities (`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `caches`, `indexedDB`, and dynamic `import(...)` of same-origin files) remain reachable in the worker thread.
2. **H-01 (HIGH): Label-Only Native IPC Authorization**:
   `src-tauri/src/commands/mod.rs` validates commands using only window label matching (`label == "main" || label.starts_with("window-")`). IPC commands lack cryptographic session token authorization or capability scoping.
3. **H-03 (HIGH): Android SAF Entanglement in Tauri Adapter**:
   `src/adapters/tauriRuntimeAdapter.ts` still contains Android-specific Storage Access Framework (SAF) branches, keeping it on the platform leak scanner allowlist.
4. **H-05 (HIGH): Vacuous Sandbox Realm Test**:
   `e2e/actionSandboxRealm.spec.ts` passes by testing the main-thread fallback parameter shadowing rather than actual Web Worker capability isolation.
5. **M-03 / M-04 / L-02 / L-03**:
   Unvalidated worker journal mutations, ambient `__CONTEXTPAD_DEMO__` global, pseudo-random dialog IDs, and silent error swallowing in `formatJSON`.

---

## 2. Target Remediation Specifications

### Phase 1: Worker Realm Isolation & Capability Stripping (C-02 & L-02)

#### 1.1 Worker Capability Neutralization
In `src/services/actionWorker.ts`:
- **Delete and seal ambient globals** before executing user code:
  - Network primitives: `self.fetch`, `self.XMLHttpRequest`, `self.WebSocket`, `self.EventSource`.
  - Storage primitives: `self.indexedDB`, `self.caches`.
  - Workers & communication: `self.Worker`, `self.SharedWorker`, `self.BroadcastChannel`, `self.importScripts`.
  - Dynamic imports / URLs: Neutralize `self.location` where configurable.
- **AST Pre-Scan & Syntax Sanitization**:
  Prior to compiling code in the worker or fallback runner, pass code through a fast regex / tokenizer scanner to forbid dangerous JavaScript metaprogramming constructs:
  - Dynamic imports: `import\s*\(`, `import\.meta`
  - Direct eval climbers: `constructor\s*\.\s*constructor`, `__proto__`
- **Dialog Correlation (L-02)**:
  Replace `Math.random().toString(36)` with `crypto.randomUUID()`.

#### 1.2 Non-Vacuous Test & True Worker Realm Verification (H-05)
In `e2e/actionSandboxRealm.spec.ts`:
- Test the true worker realm directly: Verify that executing code attempting `fetch(...)` or dynamic `import(...)` throws a reference or security error.
- Remove reliance on `test.use({ demo: true })` for sandbox tests; supply isolated fixtures.

---

### Phase 2: Native IPC Cryptographic Token Authorization (H-01)

#### 2.1 Native Token Generation & IPC Gateway Guard
In `src-tauri/src/commands/mod.rs` and `src-tauri/src/lib.rs`:
- Generate a cryptographically secure 256-bit ephemeral session token (`session_auth_token`) at Tauri startup in Rust memory.
- Inject the token securely into the webview initialization script (`tauri::WebviewWindowBuilder::initialization_script`), accessible exclusively by `src/adapters/tauriRuntimeAdapter.ts` through an internal runtime bridge closure (not exposed on `window`).
- Require and validate `session_auth_token` in all mutating IPC commands (`file::*`, `storage::*`, `clipboard::*`).
- Reject commands with an unauthorized error if the token is missing or mismatched, regardless of window label.

---

### Phase 3: Architecture Separation & Hygiene (H-03, M-03, M-04, L-03)

#### 3.1 Decouple Android SAF into `AndroidRuntimeAdapter` (H-03)
- Extract all `platform.isMobile` SAF branches (`readDirectory`, `createTempFileForRead`, `saveToSaf`, `consumeSharedText`) out of `src/adapters/tauriRuntimeAdapter.ts` into `src/adapters/androidRuntimeAdapter.ts`.
- `runtimeBridge.tsx` selects `AndroidRuntimeAdapter` when running on mobile, and `TauriRuntimeAdapter` when running on desktop.
- Remove `tauriRuntimeAdapter.ts` from the platform leak allowlist exemption.

#### 3.2 Runtime Schema Validation for Action Journal (M-03)
- In `src/services/actionSandbox.ts`, validate every incoming `ActionMutation` from the worker against a typed schema before executing `commitMutations`.
- Drop invalid or malformed mutation payloads with an observable error log and toast notification.

#### 3.3 Demo Mode Inversion (M-04)
- Remove `(window as any).__CONTEXTPAD_DEMO__` reads in `src/store/tabStore.ts`.
- Pass demo mode explicitly via `EditorConfigProvider` / `RuntimeBridge` initial store options.

#### 3.4 Actionable Error Handling in `formatJSON` (L-03)
- In `src/services/formattingService.ts`, catch JSON parse exceptions and notify the user via `useNotificationStore.getState().addNotification('ERROR', 'Invalid JSON syntax', 'error')` rather than silently returning unmodified text.

---

## 3. Implementation Order & Verification Matrix

| Task | Component | Verification Command | Gate Criteria |
|:---|:---|:---|:---|
| **Step 1** | C-02, L-02 (`actionWorker.ts`, `actionSandbox.ts`) | `npm test -- tests/actionSandbox.test.ts` | 100% ambient primitives neutralized; crypto UUIDs. |
| **Step 2** | H-05 (`e2e/actionSandboxRealm.spec.ts`) | `npx playwright test e2e/actionSandboxRealm.spec.ts` | Real worker tests pass without timeouts or false assurances. |
| **Step 3** | M-03, L-03 (`sandboxApiFactory.ts`, `formattingService.ts`) | `npm test -- tests/formattingService.test.ts` | Validated mutations; JSON parse errors dispatch notifications. |
| **Step 4** | M-04 (`tabStore.ts`, `runtimeBridge.tsx`) | `npm test -- tests/tabStore.test.ts` | Zero `window.__CONTEXTPAD_DEMO__` references. |
| **Step 5** | H-03 (`androidRuntimeAdapter.ts`, `tauriRuntimeAdapter.ts`) | `node scripts/check-platform-leaks.mjs` | Clean scan with zero exempted core adapters. |
| **Step 6** | H-01 (`src-tauri/src/commands/mod.rs`, `security_tests.rs`) | `cargo test` | All IPC commands require session auth token; tests green. |
| **Step 7** | Full Suite & LCD Re-reconciliation | `npm test && cargo test && npm run test:e2e` | All gates pass; bump LCD to v1.39. |

---

## 4. Rollback & Contingency Plan

1. All tasks operate within targeted modules with dedicated unit tests.
2. If any worker isolation change causes regressions in built-in default presets (`DEFAULT_ACTIONS`), fallback validation ensures standard string transformations continue working seamlessly.
3. Every commit must pass all verification gates (`lint`, `test`, `cargo test`, `test:e2e`, `contract-sync`, `platform-leaks`).
