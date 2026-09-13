# REFACTOR PLAN — Post-Port Remediation (Prompt 18, Reconciled v1.1)

- **Project:** CNTXT (ContextPad) — Tauri v2 + React 19 Desktop Platform
- **Target Repository:** `C:\Projects\LocalActive\Repo\Active\CNTXT`
- **Date:** 2026-09-13
- **Author:** Production Implementation Agent (Prompt 18 Reconciled)
- **Trigger:** Reconciled Port Audit (`reconciled_port_audit_2026-09-13.md`) & Refactor Plan Audit (`reconciled_refactor_plan_audit_2026-09-13.md`)
- **Status:** APPROVED (Pass 2 Reconciled — Ready for Git Checkpoint & Execution)
- **Tracking:** Tracked in Git under `/generated-documents/plans/`

---

## 1. Context & Architectural Invariants

This refactor plan addresses the **14 valid defects** confirmed in the Pass 2 Reconciled Port Audit and incorporates all 8 conditions from the Pass 1 Independent Plan Audit.
Before executing any code changes, this plan must:
1. Receive human execution review and sign-off on flagged decisions (TR-003, R-010, R-011, R-012).
2. Be committed locally as a Git backup restore point.

### Core Non-Negotiable Invariants Enforced
1. **Universal Presenter Purity**: Visual components in `src/components/` and `src/shell/` remain 100% pure UI driven by props and custom hooks. Direct native IPC calls (`invoke()`), direct fetch, or untyped window reaches are prohibited in views.
2. **Mock Quarantine & Clean Initial State**: Production collections initialize with clean empty states (`[]`, `''`). Synthetic demo data is physically isolated in `mocks/index.ts` and gated by `IS_PROTOTYPE_DEMO_MODE`.
3. **Canonical Data Shapes First**: All domain models align with `contracts/data_shapes.ts` before use in stores or components. Zero ad-hoc inline interfaces.
4. **Resilient Error Handling & Zero Silent Failures**: No bare `.catch(() => {})`. All async and storage rejections dispatch user-visible notifications via `useNotificationStore`.
5. **UI Crash Resilience**: React Error Boundaries wrap major UI regions (Editor, Live Preview, Sidebar, Ribbon) with graceful recovery.
6. **Native Boundary Security**: Authenticate IPC endpoints, canonicalize file paths against system roots, eliminate command injection sinks, and harden sandbox against constructor escapes.

### Approved Tradeoffs Respected (Do Not Re-litigate)
- **TR-001 (Finding PA-2.2)**: `ActionCategory` union in `contracts/data_shapes.ts:181` retains `| string` to allow user-authored custom categories in the Action Editor modal.
- **TR-002 (Finding PA-3.3)**: `DEFAULT_RIBBON_ITEMS` in `src/store/ribbonStore.ts` is recognized as static system tool configuration, not mock data.
- **TR-003 (Audit Condition 1 & 4)**: `tauri.conf.json` retains `'unsafe-eval'` in CSP strictly for the current `new Function` sandbox runner during port remediation; dead external API endpoints are pruned; full worker realm isolation is scheduled for Feature Group FG-02 (Sandboxed Actions).

---

## ━━━ ISSUE SUMMARY ━━━

### Issue R-001
- **Issue ID:** R-001
- **Source:** Port Audit `PA-2.1`
- **Severity:** MEDIUM
- **Description:** Ad-hoc domain interfaces (`PinnedItem` and `OpenedFileRecord`) defined inside `src/store/fileHistoryStore.ts` instead of canonical contracts.
- **Root cause:** `fileHistoryStore.ts` was added during the port without synchronizing its domain models to `contracts/data_shapes.ts`.
- **Affected files:**
  - `src/store/fileHistoryStore.ts`
  - `contracts/data_shapes.ts`
  - `generated-documents/context/contracts/data_shapes.ts`

### Issue R-002
- **Issue ID:** R-002
- **Source:** Port Audit `PA-3.1`
- **Severity:** CRITICAL
- **Description:** Inline synthetic datasets `DEFAULT_PINNED_ITEMS` and `DEFAULT_OPENED_HISTORY` seeded unconditionally in production store and persisted to storage without a demo gate.
- **Root cause:** Sample pinned files and history records were declared directly inside `fileHistoryStore.ts` rather than being quarantined in `mocks/index.ts` under `IS_PROTOTYPE_DEMO_MODE`.
- **Affected files:**
  - `src/store/fileHistoryStore.ts`
  - `mocks/index.ts`
  - `generated-documents/context/living_context.md`

### Issue R-003
- **Issue ID:** R-003
- **Source:** Port Audit `PA-3.2`
- **Severity:** MEDIUM
- **Description:** `MockRuntimeAdapter` physically located in production `src/adapters/` and exposed via the public barrel `src/adapters/index.ts`.
- **Root cause:** The prototype mock runtime adapter was copied into the production adapters directory during porting and re-exported.
- **Affected files:**
  - `src/adapters/mockRuntimeAdapter.ts`
  - `src/adapters/index.ts`
  - `mocks/mockRuntimeAdapter.ts` (NEW location)

### Issue R-004
- **Issue ID:** R-004
- **Source:** Port Audit `PA-5.2`
- **Severity:** CRITICAL
- **Description:** Zero React Error Boundaries across the entire UI shell. Unhandled rendering exceptions in CodeMirror, KaTeX, Mermaid, or Markdown live preview crash the entire application to a white screen.
- **Root cause:** The AI Studio prototype omitted React Error Boundary class components.
- **Affected files:**
  - `src/components/Common/ErrorBoundary.tsx` (NEW)
  - `src/shell/ShellFrame.tsx`
  - `src/App.tsx`

### Issue R-005
- **Issue ID:** R-005
- **Source:** Port Audit `PA-5.1`
- **Severity:** CRITICAL
- **Description:** 34 silent `.catch(() => {})` persistence failures across 12 store and component files, silently swallowing storage errors and risking unnotified data loss.
- **Root cause:** Prototype code suppressed storage exceptions instead of providing resilient error handling or user feedback.
- **Affected files:**
  - `src/services/storageHelper.ts` (NEW)
  - `src/store/tabStore.ts`
  - `src/store/settingsStore.ts`
  - `src/store/workflowStore.ts`
  - `src/store/actionStore.ts`
  - `src/store/templateStore.ts`
  - `src/store/formattingStore.ts`
  - `src/store/fileHistoryStore.ts`
  - `src/store/ribbonStore.ts`
  - `src/components/Sidebar/Sidebar.tsx`
  - `src/components/Sidebar/FileExplorer.tsx`
  - `src/components/Mobile/MobileAccessoryBar.tsx`
  - `src/services/codeLanguages.ts`

### Issue R-006
- **Issue ID:** R-006
- **Source:** Port Audit `PA-5.3`
- **Severity:** MEDIUM
- **Description:** Silent `return;` on empty required fields in `ActionEditorModal.tsx` on save or test run without visual error indicators or feedback.
- **Root cause:** Modal handlers validated field presence but returned silently without setting error state or displaying feedback.
- **Affected files:**
  - `src/components/Modals/ActionEditorModal.tsx`

### Issue R-007
- **Issue ID:** R-007
- **Source:** Port Audit `PA-5.4`
- **Severity:** MEDIUM
- **Description:** Console-only catch handling (`console.error`) on async runtime bridge operations without user-facing toast alerts or status indicators.
- **Root cause:** UI components logged native/bridge failures only to the browser console.
- **Affected files:**
  - `src/components/TitleBar/TitleBar.tsx`
  - `src/components/MenuBar/MenuBar.tsx`
  - `src/components/Sidebar/ActionManager.tsx`
  - `src/store/fileHistoryStore.ts`

### Issue R-008
- **Issue ID:** R-008
- **Source:** Port Audit `PA-8.1`
- **Severity:** CRITICAL
- **Description:** Sandbox escape in `src/services/actionSandbox.ts` via `Function` constructor chaining (`({}).constructor.constructor('return this')()`), allowing untrusted action code to reach `window` and Tauri IPC internals.
- **Root cause:** Parameter shadowing in `new Function` did not block constructor traversal or freeze prototypes.
- **Affected files:**
  - `src/services/actionSandbox.ts`

### Issue R-009
- **Issue ID:** R-009
- **Source:** Port Audit `PA-8.2`
- **Severity:** CRITICAL
- **Description:** Native path traversal vulnerability in `src-tauri/src/commands/file.rs`. `delete_file` calls `fs::remove_dir_all` without path validation, and other operations do not canonicalize paths against allowed roots.
- **Root cause:** Native file commands lacked path sanitization, root boundary validation, and traversal checks.
- **Affected files:**
  - `src-tauri/src/commands/file.rs`

### Issue R-010
- **Issue ID:** R-010
- **Source:** Port Audit `PA-8.3`
- **Severity:** CRITICAL
- **Description:** Command injection sink in `src-tauri/src/main.rs:open_external` invoking raw `cmd /c start ""` with unsanitized caller strings.
- **Root cause:** External URL opening relied on raw shell string interpolation without scheme whitelisting or argument sanitization.
- **Affected files:**
  - `src-tauri/Cargo.toml`
  - `src-tauri/src/main.rs`

### Issue R-011
- **Issue ID:** R-011
- **Source:** Port Audit `PA-8.4`
- **Severity:** HIGH
- **Description:** Overly permissive CSP in `src-tauri/tauri.conf.json` retaining unused external API endpoints (`generativelanguage.googleapis.com`, `api.anthropic.com`).
- **Root cause:** Prototype CSP configuration was copied over with dead external endpoints.
- **Affected files:**
  - `src-tauri/tauri.conf.json`

### Issue R-012
- **Issue ID:** R-012
- **Source:** Port Audit `PA-8.5`
- **Severity:** HIGH
- **Description:** Missing IPC authorization check on Tauri command endpoints, allowing unauthenticated commands if the webview or IPC port is probed.
- **Root cause:** Desktop backend registered commands globally without token verification middleware.
- **Affected files:**
  - `src-tauri/src/main.rs`
  - `src-tauri/src/commands/`

### Issue R-013
- **Issue ID:** R-013
- **Source:** Port Audit `PA-1.1` & `PA-1.2`
- **Severity:** MEDIUM
- **Description:** Visual presenters reach raw `window` (`getSelection`, `innerWidth`, event listeners) directly, and `scripts/check-platform-leaks.mjs` has blind spots for `@tauri-apps/api` and `window.__TAURI_`.
- **Root cause:** Presenters directly accessed browser window APIs rather than using hooks/adapters; the leak verification script did not inspect for Tauri-specific globals.
- **Affected files:**
  - `src/components/Ribbon/ModularRibbon.tsx`
  - `src/components/Sidebar/Sidebar.tsx`
  - `src/components/Mobile/MobileAccessoryBar.tsx`
  - `src/components/TitleBar/TitleBar.tsx`
  - `src/components/MenuBar/MenuBar.tsx`
  - `scripts/check-platform-leaks.mjs`

### Issue R-014
- **Issue ID:** R-014
- **Source:** Port Audit `PA-4.1` & `PA-6.1`
- **Severity:** CRITICAL
- **Description:** Hardcoded hex colors scattered outside the theme engine in services (`mermaidRenderer.ts`, `tableParser.ts`, `liveMarkdown.ts`), plus complete absence of automated test suite, behavioral test contracts, and `manifest.md`.
- **Root cause:** Fast prototyping embedded ad-hoc hex values; testing infrastructure and formal component manifests were not set up during initial port.
- **Affected files:**
  - `src/services/mermaidRenderer.ts`
  - `src/services/tableParser.ts`
  - `src/extensions/liveMarkdown.ts`
  - `manifest.md` (NEW)
  - `tests/` (NEW)
  - `package.json`

---

## ━━━ IMPACT & REGRESSION ASSESSMENT ━━━

### Issue R-001 (PA-2.1)
- **What breaks if this is not fixed?** Type drift between frontend stores, UI tree components (`FileExplorer.tsx`), and native Rust IPC structs; future refactors will break file history serialization without compiler warnings.
- **What is the regression risk of fixing it?** LOW. Restoring `type: 'document' | 'template' | 'action' | 'file' | 'folder'` and `path?: string | null` preserves exact runtime compatibility with `FileExplorer.tsx:139,155,160` and mock datasets.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No. It aligns FG-04 models with canonical contracts.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-002 (PA-3.1)
- **What breaks if this is not fixed?** Every real production user starts with fake pinned files and fake history (`"Project Proposal.md"`, `"API Spec.md"`), polluting their clean workspace and corrupting local storage state.
- **What is the regression risk of fixing it?** LOW. Prototype demo mode remains testable when `IS_PROTOTYPE_DEMO_MODE = true`; production desktop boots with clean empty collections (`[]`).
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No. It only affects initial state hydration in `fileHistoryStore.ts`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-003 (PA-3.2)
- **What breaks if this is not fixed?** Production bundles include dead mock adapter code, and future developers may accidentally instantiate `MockRuntimeAdapter` instead of `TauriRuntimeAdapter`.
- **What is the regression risk of fixing it?** LOW. `src/adapters/index.ts` only exports `BrowserRuntimeAdapter` and `TauriRuntimeAdapter`.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-004 (PA-5.2)
- **What breaks if this is not fixed?** A single malformed KaTeX formula, broken Mermaid diagram, or CodeMirror extension error will white-screen the entire application, causing users to lose unsaved editor work.
- **What is the regression risk of fixing it?** LOW. React Error Boundaries wrap children without altering normal render cycles; fallback cards use verified theme tokens (`--card-bg`, `--card-border`, `--text-primary`).
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No. Error boundaries protect UI regions in FG-01, FG-02, FG-03, FG-04.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-005 (PA-5.1)
- **What breaks if this is not fixed?** When IndexedDB quota is exceeded, disk is full, or Tauri store fails, user document edits, settings, actions, and templates silently fail to save. The user believes their work is persisted when it is not.
- **What is the regression risk of fixing it?** LOW. `safePersist` helper wraps `storage.setItem` across all 12 files (including `Sidebar.tsx`, `FileExplorer.tsx`, `MobileAccessoryBar.tsx`), catching errors to surface informative toast banners via `useNotificationStore`. `codeLanguages.ts` uses structured warning.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Yes, across all persistent stores. Interface contracts remain identical (`async () => Promise<boolean>`).
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-006 (PA-5.3)
- **What breaks if this is not fixed?** Users clicking "Save" or "Test" on an invalid action modal encounter zero feedback, making the UI appear completely frozen or unresponsive.
- **What is the regression risk of fixing it?** LOW. Adds local validation state, `border-[var(--status-error)]`, and helper text in `ActionEditorModal.tsx`.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No. Scoped entirely to `ActionEditorModal.tsx` in FG-02.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-007 (PA-5.4)
- **What breaks if this is not fixed?** When open/save file dialogs fail or file reading throws an exception, the user is left in the dark because errors are only printed to the developer console.
- **What is the regression risk of fixing it?** LOW. Bridges already catch errors; we wire `useNotificationStore.getState().addNotification('File Error', err.message, 'error')`.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-008 (PA-8.1)
- **What breaks if this is not fixed?** Malicious or buggy user actions can escape the sandbox via `({}).constructor.constructor('return this')()` and gain access to `window.__TAURI_INTERNALS__`.
- **What is the regression risk of fixing it?** LOW. Incremental hardening blocks both dot and bracket constructor access and freezes the `safeApi` instance without freezing host prototypes. Full worker realm isolation is staged in FG-02.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Scoped strictly to `src/services/actionSandbox.ts`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-009 (PA-8.2)
- **What breaks if this is not fixed?** Path traversal using `..` could allow arbitrary deletion of system files on the host OS via `delete_file` (`fs::remove_dir_all`).
- **What is the regression risk of fixing it?** LOW to MEDIUM. Denying canonical OS system roots (`C:\Windows`, `C:\Program Files`, etc.) and enforcing `canonicalize` prevents system damage while explicitly permitting user projects under `C:\Users\...`.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Touches `src-tauri/src/commands/file.rs`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-010 (PA-8.3)
- **What breaks if this is not fixed?** Opening external links via `cmd /c start` string concatenation allows arbitrary shell command injection.
- **What is the regression risk of fixing it?** LOW. Adopting the lightweight `open = "5.3"` crate in `src-tauri/Cargo.toml` delegates directly to the OS default handler without spawning shells.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Touches native `open_external` in `src-tauri/src/main.rs`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-011 (PA-8.4)
- **What breaks if this is not fixed?** Dead external endpoints leave open outbound connection routes in CSP.
- **What is the regression risk of fixing it?** LOW. Pruning dead external origins (`generativelanguage.googleapis.com`, `api.anthropic.com`) is safe. Retaining `'unsafe-eval'` under **TR-003** prevents breaking `new Function` sandbox execution.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Touches `src-tauri/tauri.conf.json`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-012 (PA-8.5)
- **What breaks if this is not fixed?** Unauthenticated processes probing the local IPC port could invoke Tauri backend commands.
- **What is the regression risk of fixing it?** MEDIUM. Must verify that frontend requests supply the internal session token without blocking developer workflows.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** Touches `src-tauri/src/main.rs` and `TauriRuntimeAdapter`.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-013 (PA-1.1 & PA-1.2)
- **What breaks if this is not fixed?** Direct `window` access in presenters violates Presenter Purity, and leak checker blind spots permit future platform leaks.
- **What is the regression risk of fixing it?** LOW. Encapsulating window selection and resize tracking inside `src/adapters/domHelper.ts` cleans up presenter code cleanly.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No.
- **Does fixing this touch DO NOT MODIFY sections?** No.

### Issue R-014 (PA-4.1 & PA-6.1)
- **What breaks if this is not fixed?** Theme switching results in illegible diagram colors. Lack of automated tests prevents regression detection.
- **What is the regression risk of fixing it?** LOW. Mapping hex colors to CSS theme variables (`--card-bg`, `--text-primary`, `--status-error`, `--border-primary`) restores contrast parity. Adding Vitest creates an automated safety net.
- **Does fixing this affect adjacent feature groups or native IPC boundaries?** No.
- **Does fixing this touch DO NOT MODIFY sections?** No.

---

## ━━━ REFACTOR PLAN ━━━

### Fix R-001: Move `PinnedItem` and `OpenedFileRecord` to Canonical Contracts
- **Issue ID:** R-001
- **Approach:**
  1. Add `PinnedItem` and `OpenedFileRecord` interfaces to `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts`:
     ```typescript
     export interface PinnedItem {
       id: string;
       name: string;
       type: 'document' | 'template' | 'action' | 'file' | 'folder';
       path?: string | null;
       language?: SupportedLanguage;
       content?: string;
     }

     export interface OpenedFileRecord {
       id: string;
       name: string;
       path?: string | null;
       openedAt: number;
       language?: SupportedLanguage;
     }
     ```
  2. In `src/store/fileHistoryStore.ts`, delete local duplicate interfaces and import from `../../contracts/data_shapes`.
- **Architectural fidelity:** Preserves Canonical Data Shapes First invariant and matches runtime usage in `FileExplorer.tsx`.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-002: Quarantine File History Mock Data (`MOCK-006` & `MOCK-007`)
- **Issue ID:** R-002
- **Approach:**
  1. Cut `DEFAULT_PINNED_ITEMS` and `DEFAULT_OPENED_HISTORY` from `src/store/fileHistoryStore.ts`.
  2. Paste and export from `mocks/index.ts`. Register as `MOCK-006` and `MOCK-007` in `living_context.md`.
  3. Initialize `fileHistoryStore.ts` with clean empty states:
     ```typescript
     pinnedItems: [],
     history: [],
     ```
  4. In `initializeFileHistory()`, only seed from `mocks/index.ts` if `IS_PROTOTYPE_DEMO_MODE` is true and storage is empty. In native production, initialize empty.
- **Architectural fidelity:** Satisfies Mock Quarantine invariant; guarantees clean production state.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-003: Relocate `MockRuntimeAdapter` out of Production Adapters
- **Issue ID:** R-003
- **Approach:**
  1. Move `src/adapters/mockRuntimeAdapter.ts` to `mocks/mockRuntimeAdapter.ts`.
  2. Remove `export * from './mockRuntimeAdapter';` from `src/adapters/index.ts`.
  3. Update any test imports to reference `../../mocks/mockRuntimeAdapter`.
- **Architectural fidelity:** Preserves physical isolation of mock adapters from production adapters.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-004: Implement React Error Boundary with Graceful Fallback UI
- **Issue ID:** R-004
- **Approach:**
  1. Create `src/components/Common/ErrorBoundary.tsx` implementing `componentDidCatch` and `getDerivedStateFromError`.
  2. Render an accessible fallback card styled with verified theme tokens (`bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-primary)]`), showing error message and a "Retry / Reset View" button.
  3. Wrap major UI regions in `src/shell/ShellFrame.tsx`:
     - Wrap `<ShellEditorContainer />`
     - Wrap `<LivePreview />`
     - Wrap `<Sidebar />`
     - Wrap `<ModularRibbon />`
- **Architectural fidelity:** Fulfills Invariant 7 (Crash Resilience & Error Boundaries).
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-005: Safe Storage Persistence Helper (100% Coverage)
- **Issue ID:** R-005
- **Approach:**
  1. Create `src/services/storageHelper.ts`:
     ```typescript
     import { IStorageBridge } from '../ui-contract/bridgeContract';
     import { useNotificationStore } from '../store/notificationStore';

     export async function safePersist(
       storage: IStorageBridge | null,
       key: string,
       value: string,
       contextName: string
     ): Promise<boolean> {
       if (!storage) return false;
       try {
         await storage.setItem(key, value);
         return true;
       } catch (err: any) {
         console.error(`[Storage Error] Failed to persist ${contextName}:`, err);
         useNotificationStore.getState().addNotification(
           'Save Failed',
           `Could not persist ${contextName}. Storage may be unavailable.`,
           'error'
         );
         return false;
       }
     }
     ```
  2. Replace bare `.catch(() => {})` across all 8 stores (`tabStore.ts`, `settingsStore.ts`, `workflowStore.ts`, `actionStore.ts`, `templateStore.ts`, `formattingStore.ts`, `fileHistoryStore.ts`, `ribbonStore.ts`) and across UI components (`Sidebar.tsx`, `FileExplorer.tsx`, `MobileAccessoryBar.tsx`) with `safePersist`.
  3. In `src/services/codeLanguages.ts:93`, replace `.catch(() => {})` with a structured warning:
     ```typescript
     desc.load().catch((err) => {
       console.warn(`[Language Loader] Failed to load language module for '${id}':`, err);
       return null;
     });
     ```
- **Architectural fidelity:** Eliminates 100% of silent data loss failure paths.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-006: Action Editor Modal Input Validation
- **Issue ID:** R-006
- **Approach:**
  1. In `src/components/Modals/ActionEditorModal.tsx`, add form validation state:
     `const [errors, setErrors] = useState<{ name?: string; code?: string }>({});`
  2. In `handleSave()`, validate fields:
     - If `!name.trim()`, set `errors.name = 'Action name is required'`.
     - If `!code.trim()`, set `errors.code = 'Action code cannot be empty'`.
     - Render inline error messages and style invalid inputs with `border-[var(--status-error)]`.
     - Dispatch warning toast: `useNotificationStore.getState().addNotification('Validation Error', 'Please fill in all required fields.', 'warning')`.
- **Architectural fidelity:** Complies with Form & Input Validation Standard using canonical theme tokens.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-007: Surface Bridge Failures to User Notifications
- **Issue ID:** R-007
- **Approach:**
  1. In `TitleBar.tsx` and `MenuBar.tsx`, update file open/save catch blocks to dispatch user-visible toasts:
     ```typescript
     useNotificationStore.getState().addNotification('File Error', 'Failed to open or save document.', 'error');
     ```
  2. In `ActionManager.tsx`, surface execution errors via toast notifications.
- **Architectural fidelity:** Adheres to User Notification & Toast Strategy.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-008: Multi-Layer Defensive Hardening of Action Sandbox
- **Issue ID:** R-008
- **Approach:**
  1. In `src/services/actionSandbox.ts`:
     - Implement regex scanner rejecting both dot and bracket constructor access:
       ```typescript
       const FORBIDDEN_PATTERN = /\bconstructor\b|\[\s*['"`]constructor['"`]\s*\]|__proto__|prototype/i;
       if (FORBIDDEN_PATTERN.test(code)) {
         throw new Error('Security Error: Prototype and constructor access are prohibited in sandboxed actions.');
       }
       ```
     - Add `globalThis: undefined`, `window: undefined`, `document: undefined`, `Function: undefined`, `eval: undefined`, `Reflect: undefined`, `Proxy: undefined`, `XMLHttpRequest: undefined`, `fetch: undefined` to parameter shadowing.
     - Freeze the `safeApi` instance and sub-objects (`safeApi.utils`, `safeApi.dialog`) via `Object.freeze()`.
     - Retain 4000ms timeout protection.
     - Hand off full Web Worker / isolated iframe realm execution to Feature Group FG-02.
- **Architectural fidelity:** Hardens execution scope without breaking third-party libraries.
- **Regression risk:** LOW
- **Requires human decision:** NO (TR-003 covers CSP retention)

### Fix R-009: Native File Path Canonicalization & Root Whitelisting
- **Issue ID:** R-009
- **Approach:**
  1. In `src-tauri/src/commands/file.rs`:
     - Reject directory traversal sequences (`..`) unconditionally before path normalization.
     - Resolve paths via `std::fs::canonicalize`.
     - Deny access strictly to canonical OS system roots:
       - Windows: `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)`, `C:\ProgramData`
       - Unix / macOS: `/bin`, `/sbin`, `/etc`, `/usr`, `/System`, `/Library`
     - Explicitly permit user workspace paths under `C:\Users\` (Windows) or `/Users/`, `/home/` (macOS/Linux).
     - In `delete_file`, verify the target is not a filesystem drive root before calling `fs::remove_dir_all`.
- **Architectural fidelity:** Eliminates arbitrary file deletion and traversal in native Rust layer.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-010: Sanitize Shell Execution in `open_external`
- **Issue ID:** R-010
- **Approach:**
  1. Add `open = "5.3"` dependency to `src-tauri/Cargo.toml`.
  2. In `src-tauri/src/main.rs:open_external`:
     - Verify URL begins strictly with allowed protocols (`https://` or `http://`).
     - Reject shell metacharacters: `&`, `|`, `;`, `` ` ``, `$`, `\n`, `\r`, `"`, `'`.
     - Replace raw string interpolation `cmd /c start ""` with `open::that_detached(url)`.
- **Architectural fidelity:** Eliminates OS command injection vulnerability.
- **Regression risk:** LOW
- **Requires human decision:** YES (Adds `open = "5.3"` crate to `Cargo.toml`)

### Fix R-011: Restrict Content Security Policy (Prune Dead Origins)
- **Issue ID:** R-011
- **Approach:**
  1. In `src-tauri/tauri.conf.json`:
     - Remove dead external connect sources: `https://generativelanguage.googleapis.com` and `https://api.anthropic.com`.
     - Tighten `connect-src` to strictly `'self' ipc: http://ipc.localhost http://localhost:5173`.
     - Retain `'unsafe-eval'` under **Tradeoff TR-003** to support the `new Function` sandbox until FG-02 realm isolation is implemented.
- **Architectural fidelity:** Shrinks desktop attack surface while avoiding breaking action execution.
- **Regression risk:** LOW
- **Requires human decision:** YES (Tradeoff TR-003 approval)

### Fix R-012: IPC Authorization Gateway
- **Issue ID:** R-012
- **Approach:**
  1. Enforce Tauri v2 window capability scoping (`capabilities/default.json`), ensuring commands can only be invoked by the trusted local webview origin.
  2. Add session-scoped authorization verification to sensitive native operations (file deletion, process opening).
- **Architectural fidelity:** Secures native IPC boundary.
- **Regression risk:** MEDIUM
- **Requires human decision:** YES (Tauri capability configuration approval)

### Fix R-013: Presenter Window Access & Platform Leak Gate
- **Issue ID:** R-013
- **Approach:**
  1. In `src/components/Sidebar/Sidebar.tsx` and `src/components/Mobile/MobileAccessoryBar.tsx`, move window resize listeners to a `useWindowDimensions()` hook in `src/adapters/domHelper.ts`.
  2. In `src/components/Ribbon/ModularRibbon.tsx`, wrap `window.getSelection()` calls through editor view selection API.
  3. In `scripts/check-platform-leaks.mjs`, expand `FORBIDDEN_TOKENS` to include:
     - `'@tauri-apps/api'`
     - `'window.__TAURI_'`
     - `'__TAURI_INTERNALS__'`
- **Architectural fidelity:** Enforces Universal Presenter Purity and plugs leak gate blind spots.
- **Regression risk:** LOW
- **Requires human decision:** NO

### Fix R-014: Theme Tokens, Component Manifest & Test Contracts
- **Issue ID:** R-014
- **Approach:**
  1. In `src/services/mermaidRenderer.ts`, replace hardcoded hex palettes with verified CSS theme variables (`var(--card-bg)`, `var(--text-primary)`, `var(--border-primary)`, `var(--accent-primary)`).
  2. Create `manifest.md` documenting all components, props, state dependencies, and background toggles.
  3. Create `tests/` directory with behavioral test contracts:
     - `tests/tabStore.contract.md`
     - `tests/tokenEstimator.contract.md`
     - `tests/formulaParser.contract.md`
     - `tests/actionSandbox.contract.md`
  4. Configure Vitest in `package.json` (`"test": "vitest run"`) and add automated unit tests for formula evaluation, token calculation, and sandbox isolation.
- **Architectural fidelity:** Provides automated safety net and satisfies Stage 2 handoff deliverables.
- **Regression risk:** LOW
- **Requires human decision:** NO

---

## ━━━ EXECUTION ORDER ━━━

The 14 issues are executed in **4 dependency-ordered sequential batches** with embedded LCD updates and Git checkpoints:

### Batch 1: Canonical Data Shapes & Mock Quarantine
1. **R-001 (PA-2.1)** — *Reason:* Foundational domain models (`PinnedItem`, `OpenedFileRecord`) must be anchored in `contracts/data_shapes.ts` before stores and mocks can consume them cleanly.
2. **R-002 (PA-3.1)** — *Reason:* Quarantines synthetic file history datasets into `mocks/index.ts` under demo gate, guaranteeing clean initial state for production users.
3. **R-003 (PA-3.2)** — *Reason:* Relocates `MockRuntimeAdapter` out of `src/adapters/`, ensuring production code only references native/browser adapters.
4. **Batch 1 Lifecycle Action:** Register `MOCK-006` and `MOCK-007` in `living_context.md` Mock Registry; execute Git checkpoint commit.

### Batch 2: Resilient Error Handling, Validation & Crash Boundaries
5. **R-004 (PA-5.2)** — *Reason:* Mounts React Error Boundaries around Editor, Preview, and Sidebar to prevent UI crashes while downstream error handling is refactored.
6. **R-005 (PA-5.1)** — *Reason:* Implements `safePersist` helper across all 12 files and removes 34 silent `.catch(() => {})` failure paths, preventing silent data loss.
7. **R-006 (PA-5.3)** — *Reason:* Adds visual form validation to Action Editor modal to eliminate silent no-op returns.
8. **R-007 (PA-5.4)** — *Reason:* Wires user-visible toast notifications to async bridge operations.
9. **Batch 2 Lifecycle Action:** Update error resilience notes in `living_context.md`; execute Git checkpoint commit.

### Batch 3: Deep Security & Native Boundary Hardening
10. **R-008 (PA-8.1)** — *Reason:* Critical sandbox hardening blocking constructor chaining escapes before user actions are executed.
11. **R-009 (PA-8.2)** — *Reason:* Canonicalizes paths and blocks path traversal against OS system roots in native Rust `commands/file.rs`.
12. **R-010 (PA-8.3)** — *Reason:* Eliminates shell command injection sink in native `open_external` using `open = "5.3"`.
13. **R-011 (PA-8.4)** — *Reason:* Restricts CSP in `tauri.conf.json`, removing dead origins while preserving `'unsafe-eval'` under TR-003.
14. **R-012 (PA-8.5)** — *Reason:* Enforces capability scoping and authentication token checks on native IPC endpoints.
15. **Batch 3 Lifecycle Action:** Record `TR-003` in `living_context.md` Reconciled Tradeoff History; execute Git checkpoint commit.

### Batch 4: Presenter Purity, Deliverables & Testing
16. **R-013 (PA-1.1 & PA-1.2)** — *Reason:* Purifies presenters from direct window access and updates `check-platform-leaks.mjs` to enforce leak-free code.
17. **R-014 (PA-4.1 & PA-6.1)** — *Reason:* Replaces hardcoded hex with theme tokens; establishes `manifest.md`, test contracts, and Vitest automated test suite to verify full compliance.
18. **Batch 4 Lifecycle Action:** Update active stage in `living_context.md` to Testing / Refactor Completion Audit; execute Git checkpoint commit.

---

## ━━━ BACKUP REMINDER ━━━

> **CRITICAL WORKFLOW REQUIREMENT:**
> A git backup commit must be performed in the production repository BEFORE execution begins.
> Do not begin execution without confirming the backup commit was made:
> ```bash
> git -C "C:\Projects\LocalActive\Repo\Active\CNTXT" add -A
> git -C "C:\Projects\LocalActive\Repo\Active\CNTXT" commit -m "checkpoint: pre-refactor baseline before executing port remediation"
> ```

---

## 5. Human Decision Sign-Off Matrix

Before proceeding to Prompt 20 (Refactor Execution), the human reviews and signs off on the following 3 items:

| Item ID | Subject | Proposed Decision | Human Decision Required |
|---|---|---|:---:|
| **TR-003** | CSP `'unsafe-eval'` Retention | Retain `'unsafe-eval'` in CSP strictly for `new Function` sandbox during post-port remediation; prune dead external origins; stage full worker realm isolation for FG-02. | **[SIGN-OFF]** |
| **R-010** | External URL Crate Dependency | Add `open = "5.3"` to `src-tauri/Cargo.toml` to safely launch external URLs without shell command injection (`cmd /c start`). | **[SIGN-OFF]** |
| **R-012** | IPC Boundary Security | Enforce Tauri v2 window capability origin scoping (`capabilities/default.json`) with runtime token validation on sensitive commands. | **[SIGN-OFF]** |