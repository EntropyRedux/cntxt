# REFACTOR PLAN — Full Codebase Audit Remediation (Prompt 18, Reconciled v1.1)

- **Project:** CNTXT (ContextPad) — Tauri v2 + React 19 Cross-Platform Platform
- **Target Repository:** `C:\Projects\LocalActive\Repo\Active\CNTXT`
- **Date:** 2026-09-14
- **Author:** Production Implementation Agent (Prompt 18 Reconciled v1.1)
- **Trigger:** Reconciled Full Codebase Audit & Reconciled Plan Audit (`raw_findings_plan_full_codebase_remediation_2026-09-14.md`)
- **Status:** APPROVED (Pass 2 Reconciled v1.1 — Ready for Git Checkpoint & Execution)
- **Tracking:** Tracked in Git under `/generated-documents/plans/`

---

## 1. Context & Architectural Invariants

This refactor plan provides the authoritative execution blueprint to remediate all **21 valid defects** confirmed during the Pass 2 Reconciled Full Codebase Audit and incorporates all **13 conditions** (`PC-1.1` through `PC-4.3`) from the Pass 1 Independent Plan Audit.

### Core Non-Negotiable Invariants Enforced
1. **Universal Presenter Purity**: Visual components in `src/components/` and `src/shell/` must be 100% pure UI driven strictly by props and headless hooks. Zero direct native IPC calls (`invoke()`), direct `fetch()`, or unmanaged `window` reaches.
2. **Mock Quarantine & Clean Production State**: Production collections initialize with clean empty states (`[]`, `null`). Synthetic demo datasets exist strictly in `mocks/index.ts` and are gated by `IS_PROTOTYPE_DEMO_MODE`. The `resetToDefaults` action in production must never leak synthetic mocks into persistent user storage.
3. **Canonical Data Shapes First**: All domain models align with `contracts/data_shapes.ts` before use in stores or components. Mirror synchronization between `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts` must remain 100% byte-identical.
4. **Open Plugin & Engine Extensibility**: All domain evaluation and command engines (formulas, slash commands, templates) must expose runtime registration APIs (`registerCommand`, `unregisterCommand`, `registerFunction`) with dynamic metadata reflection.
5. **Native Boundary Security**: Authenticate all stateful Tauri commands with `window.label() == "main"` and concrete session authorization tokens. Enforce system-root path whitelisting via path `Component::ParentDir`, Origin/Host header validation on local preview server, and dynamic `import(` prohibition in sandboxes.
6. **Resilient Error Handling & User Notifications**: Zero silent catch blocks. Async operations, storage rejections, file access, and clipboard failures must dispatch user-visible notifications via `useNotificationStore`. Never return silent `null` or empty text masquerading as success.
7. **Zero Background Timer Leaks**: No un-gated `setInterval`. Deferred timers must clean up on unmount or dismissal.

### Approved Tradeoffs Respected (Aligned with `living_context.md` v1.7)
- **TR-001**: `ActionCategory` retains `| string` union escape hatch for custom user-created categories.
- **TR-002**: `DEFAULT_RIBBON_ITEMS` and `PRESET_FORMATTING_BUTTONS` are recognized as static engine tool configurations, not synthetic mock data.
- **TR-003**: `'unsafe-eval'` in CSP strictly for `new Function` sandbox during interim port remediation.
- **TR-004**: Multi-layer regex scanner and frozen safeApi for action sandbox retained; worker realm scheduled for subsequent hardening.
- **TR-005**: Main bundle chunk size (2.2 MB) acceptable for v0.1.0 local desktop/mobile embedded application bundle.
- **TR-006**: Background productivity features (autosave, live token estimator, live DOM sync) default ON behind hidden Experimental master toggle.
- **TR-007**: `contextpad_replica_ai-studio/` preserved in repository root as reference prototype for AI Studio Sync-Back (Workflow Stage 6 / Prompt 24). Added to `.gitignore` to prevent source drift.
- **TR-008**: `has_api_key` in `secrets.rs` returns `Ok(false)` on lookup error to prevent settings UI crashes when credentials are absent.
- **TR-009**: Settings object shallow spread merge without Zod schema validation in `settingsStore.ts` approved for app-owned single-user local storage.

---

## 2. ━━━ ISSUE SUMMARY (21 VALID DEFECTS) ━━━

### Issue R-001: `resetToDefaults` Mock State Leakage in Production Stores
- **Audit ID:** `FC-1.1` | **Severity:** CRITICAL | **Pillar:** 1. Mock Quarantine
- **Description:** `actionStore.ts:453`, `templateStore.ts:520`, and `workflowStore.ts:228-229` unconditionally inject synthetic mocks (`DEFAULT_ACTIONS`, `DEFAULT_TEMPLATES`, `DEFAULT_PINNED_TABS`) on reset without checking `IS_PROTOTYPE_DEMO_MODE`.
- **Root Cause:** Reset handlers lacked demo-mode discriminator branching.
- **Affected Files:** `src/store/actionStore.ts`, `src/store/templateStore.ts`, `src/store/workflowStore.ts`.

### Issue R-002: Native IPC Command Authentication & Window Origin Inconsistency
- **Audit ID:** `FC-8.1`, `FC-8.2`, `F-06` | **Severity:** CRITICAL | **Pillar:** 8. Deep Security
- **Description:** Tauri commands in `file.rs` (`read_file`, `write_file`, `rename_file`, `read_directory`), `storage.rs`, `secrets.rs`, and `clipboard.rs` lack window label checks (`window.label() == "main"`) and concrete session token verification.
- **Root Cause:** Helper was absent or incomplete on non-delete commands; `get_app_info` exposed token publicly.
- **Affected Files:** `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/storage.rs`, `src-tauri/src/commands/secrets.rs`, `src-tauri/src/commands/clipboard.rs`, `src-tauri/src/main.rs`, `src/adapters/tauriRuntimeAdapter.ts`.

### Issue R-003: Stored XSS & Unescaped Interpolation in Live Preview
- **Audit ID:** `F-01`, `F-02`, `F-03`, `F-04` | **Severity:** CRITICAL | **Pillar:** 8. Deep Security
- **Description:** Raw HTML from `marked` rendered directly into `dangerouslySetInnerHTML`; KaTeX configured with `trust: true`; Mermaid configured with `securityLevel: 'loose'`; `[[action:id]]` button labels interpolated unescaped; `LivePreview.tsx:161-165` inserts unescaped `res.error` into `innerHTML`.
- **Root Cause:** Missing lightweight HTML tag sanitizer and unsafe renderer default settings.
- **Affected Files:** `src/components/Preview/LivePreview.tsx`, `src/services/mathRenderer.ts`, `src/services/mermaidRenderer.ts`, `src/adapters/domHelper.ts`.

### Issue R-004: Action Sandbox Dynamic `import(` Bypass
- **Audit ID:** `F-05` | **Severity:** HIGH | **Pillar:** 8. Deep Security
- **Description:** Regex scanner in `actionSandbox.ts` does not block dynamic `import(...)` syntax, permitting module imports in the renderer context.
- **Root Cause:** Regex blacklist checked `constructor`, `__proto__`, `prototype`, and `eval`, but missed `\bimport\b`.
- **Affected Files:** `src/services/actionSandbox.ts`, `tests/actionSandbox.test.ts`.

### Issue R-005: Static Slash Command Engine Missing Open Registration API
- **Audit ID:** `FC-4.1` | **Severity:** MEDIUM | **Pillar:** 4. Open Extensibility
- **Description:** `slashCommands.ts` relies on a static array without public `registerCommand`, `unregisterCommand`, or metadata catalog reflection APIs.
- **Root Cause:** Initial implementation used hardcoded constants rather than an extensible registry class.
- **Affected Files:** `src/extensions/slashCommands.ts`, `tests/slashCommands.test.ts`.

### Issue R-006: Dead `__cmEditorView` & Unmediated `window` Reaches in Presenters
- **Audit ID:** `FC-2.1` | **Severity:** MEDIUM | **Pillar:** 2. Presenter Purity
- **Description:** `TitleBar.tsx:188` attempts to read non-existent `(window as any).__cmEditorView`. Presenters reach `window.getSelection()` and viewport listeners directly.
- **Root Cause:** Legacy editor view reference and inline DOM reaches bypassing `domHelper.ts`.
- **Affected Files:** `src/components/TitleBar/TitleBar.tsx`, `src/components/Ribbon/ModularRibbon.tsx`, `src/adapters/domHelper.ts`.

### Issue R-007: Untyped `any` Leaks Across Sandbox, Presenters & Adapters
- **Audit ID:** `FC-3.1`, `FC-3.2`, `FC-3.3`, `FC-3.4`, `F-12` | **Severity:** MEDIUM | **Pillar:** 3. Strict Typing
- **Description:** `rawApi: any` at sandbox boundary; `(view as any).updating` in `Editor.tsx`; `language as any` in `ShellFrame.tsx`; `saveTimers` widened in `tabStore.ts:379`; `actionExecutor.ts:139` `rawApi: any` and `:224` `catch (err: any)`.
- **Root Cause:** Rapid prototyping shortcuts resulting in unprincipled type assertions.
- **Affected Files:** `src/services/actionSandbox.ts`, `src/services/actionExecutor.ts`, `src/components/Editor/Editor.tsx`, `src/adapters/tauriRuntimeAdapter.ts`, `src/adapters/domHelper.ts`, `src/store/tabStore.ts`, `src/ui-contract/actionContract.ts`, `src/ui-contract/panelContract.ts`.

### Issue R-008: Silent File Open Failure & Empty Tab Masquerade
- **Audit ID:** `FC-9.2` | **Severity:** MEDIUM | **Pillar:** 9. Error Handling
- **Description:** When native `readFile` fails, `FileExplorer.tsx:195` receives `null` and proceeds to open a blank tab with no error notification.
- **Root Cause:** Missing error check and notification dispatch before calling `createTab`; contract accessor must use `bridge.fs.readFile`.
- **Affected Files:** `src/components/Sidebar/FileExplorer.tsx`.

### Issue R-009: Silent Persistence Error Swallowing & Missing Notifications
- **Audit ID:** `FC-9.1`, `FC-9.3`, `F-15` | **Severity:** MEDIUM / LOW | **Pillar:** 9. Error Handling
- **Description:** Empty `catch {}` in `formattingStore.ts:432`, `liveMarkdown.ts:624,678`, `browserIndexedDB.ts:102`, `browserRuntimeAdapter.ts:144`; console-only errors in `slashCommands.ts:217` and `domHelper.ts`.
- **Root Cause:** Swallowed exceptions without structured logging or toast dispatch.
- **Affected Files:** `src/store/formattingStore.ts`, `src/extensions/liveMarkdown.ts`, `src/adapters/browserIndexedDB.ts`, `src/adapters/browserRuntimeAdapter.ts`, `src/extensions/slashCommands.ts`, `src/adapters/domHelper.ts`.

### Issue R-010: Unvalidated Filename Input in File Explorer
- **Audit ID:** `FC-9.4` | **Severity:** LOW | **Pillar:** 9. Validation
- **Description:** `FileExplorer.tsx:285` uses raw `window.prompt` without sanitizing path separators (`/`, `\`, `..`, `:`) and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`).
- **Root Cause:** Missing comprehensive filename validation regex before initiating file creation.
- **Affected Files:** `src/components/Sidebar/FileExplorer.tsx`.

### Issue R-011: Notification Auto-Dismiss Timer Leak
- **Audit ID:** `FC-9.5` | **Severity:** LOW | **Pillar:** 3. Lifecycle Cleanup
- **Description:** Notification auto-dismiss `setTimeout` IDs are not tracked or cleared upon manual notification dismissal or component unmount.
- **Root Cause:** Fire-and-forget timer without cleanup handle registry.
- **Affected Files:** `src/store/notificationStore.ts`.

### Issue R-012: Unused Dependency & Remote Asset Skew
- **Audit ID:** `FC-5.1`, `FC-5.2`, `FC-6.1`, `FC-8.3` | **Severity:** LOW | **Pillar:** 5 & 8
- **Description:** `"motion"` unused in `package.json`; remote KaTeX CSS loaded from CDN in `index.html`; dev origins in production CSP; `contextpad_replica_ai-studio/` unignored.
- **Root Cause:** Dependency and asset hygiene oversights.
- **Affected Files:** `package.json`, `index.html`, `src/index.css`, `src-tauri/tauri.conf.json`, `.gitignore`.

### Issue R-013: Preview HTTP/WS Server Origin & Host Validation
- **Audit ID:** `F-07` | **Severity:** MEDIUM | **Pillar:** 8. Deep Security
- **Description:** `preview_server.rs:108-125` does not validate Origin/Host headers on HTTP/WS connections, exposing the preview document stream to local processes.
- **Root Cause:** Missing origin whitelist and query session token check on incoming socket requests.
- **Affected Files:** `src-tauri/src/preview_server.rs`.

### Issue R-014: Vestigial Capability File Cleanup
- **Audit ID:** `F-08` | **Severity:** LOW | **Pillar:** 6. Dead Surface
- **Description:** `capabilities/preview.json` targets unused `windows: ["preview"]`, referencing a window that does not exist in `tauri.conf.json`.
- **Root Cause:** Stale capability configuration from prototype windowing.
- **Affected Files:** `src-tauri/capabilities/preview.json`.

### Issue R-015: Over-Restrictive `..` Path Guard False Positives
- **Audit ID:** `F-09` | **Severity:** LOW | **Pillar:** 8. Path Traversal
- **Description:** `file.rs:75` rejects legitimate filenames containing `..` (e.g. `report..final.md`) via naive substring check.
- **Root Cause:** Path validation did not inspect path `components()` for `Component::ParentDir`.
- **Affected Files:** `src-tauri/src/commands/file.rs`.

### Issue R-016: Storage Failures Resolved as Success in Browser IndexedDB
- **Audit ID:** `F-16` | **Severity:** LOW | **Pillar:** 9. Error Handling
- **Description:** `browserIndexedDB.ts:87-90, 111-114` resolves promise on transaction error instead of rejecting or returning failure.
- **Root Cause:** Inverted promise resolution in transaction error callbacks.
- **Affected Files:** `src/adapters/browserIndexedDB.ts`.

### Issue R-017: Formula Encoding Silent Empty Returns on Failure
- **Audit ID:** `F-17` | **Severity:** LOW | **Pillar:** 9. Error Handling
- **Description:** `formulaParser.ts:576-583` catches exceptions and returns `''` on `BASE64`, `BASE64D`, and `URLDECODE` failures.
- **Root Cause:** Silent error fallback masking syntax/encoding errors from the user.
- **Affected Files:** `src/services/formulaParser.ts`.

---

## 3. ━━━ EXECUTION ORDER (4 SURGICAL BATCHES) ━━━

```
┌────────────────────────────────────────────────────────┐
│ BATCH 1: Critical Security & Mock Quarantine           │ ──> Fixes R-001, R-002, R-003, R-004, R-013, R-014, R-015
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ BATCH 2: Presenter Purity, Typing & Open Extensibility │ ──> Fixes R-005, R-006, R-007
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ BATCH 3: Resilient Error Handling & Input Validation   │ ──> Fixes R-008, R-009, R-010, R-011, R-016, R-017
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ BATCH 4: Dependency Pruning, Asset Local & Configs     │ ──> Fixes R-012
└────────────────────────────────────────────────────────┘
```

---

## 4. ━━━ STEP-BY-STEP REFACTOR DIRECTIVE ━━━

### BATCH 1: Critical Security & Mock Quarantine

#### Step 1.1: Demo-Gate `resetToDefaults` in Action, Template, and Workflow Stores (R-001)
- **Files:** `src/store/actionStore.ts`, `src/store/templateStore.ts`, `src/store/workflowStore.ts`
- **Specification:**
  - In `actionStore.ts:453`:
    ```ts
    resetToDefaults: () => {
      const resetActions = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_ACTIONS : [];
      set({ actions: resetActions });
      saveActions(resetActions);
    }
    ```
  - In `templateStore.ts:520`:
    ```ts
    resetToDefaults: () => {
      const resetTemplates = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_TEMPLATES : [];
      set({ templates: resetTemplates });
      saveTemplates(resetTemplates);
    }
    ```
  - In `workflowStore.ts:228-229`:
    ```ts
    resetToDefaults: () => {
      const resetWorkflows = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_PINNED_TABS : [];
      set({ workflows: resetWorkflows });
      saveWorkflows(resetWorkflows);
    }
    ```

#### Step 1.2: Concrete Native Command Authentication & Session Token Enforcement (R-002)
- **Files:** `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/storage.rs`, `src-tauri/src/commands/secrets.rs`, `src-tauri/src/commands/clipboard.rs`, `src-tauri/src/main.rs`, `src/adapters/tauriRuntimeAdapter.ts`
- **Specification:**
  - In `src-tauri/src/main.rs` (or shared commands module), implement concrete verification:
    ```rust
    pub fn verify_caller(window: &tauri::Window, token: Option<&str>, state: &tauri::State<AppState>) -> Result<(), String> {
        if window.label() != "main" {
            return Err("Unauthorized window origin".to_string());
        }
        let req_token = token.ok_or_else(|| "Missing session authorization token".to_string())?;
        if req_token != state.session_token {
            return Err("Invalid session authorization token".to_string());
        }
        Ok(())
    }
    ```
  - Enforce `verify_caller` across stateful commands in `file.rs`, `storage.rs`, `secrets.rs`, and `clipboard.rs`.
  - Ensure `get_app_info` does not return `session_token` to untrusted callers; inject token securely into webview initialization or main window state.
  - Update `src/adapters/tauriRuntimeAdapter.ts` to attach the session token to all native IPC invocations.

#### Step 1.3: Robust LivePreview HTML Sanitization & Sinks Protection (R-003)
- **Files:** `src/components/Preview/LivePreview.tsx`, `src/services/mathRenderer.ts`, `src/services/mermaidRenderer.ts`, `src/adapters/domHelper.ts`
- **Specification:**
  - Implement `sanitizePreviewHtml(html: string): string` in `src/adapters/domHelper.ts`:
    - Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` tags.
    - Strips all `on*` inline event handlers (`onload`, `onerror`, `onclick`, etc.).
    - Sanitizes `href` protocols to allow strictly: `http:`, `https:`, `mailto:`, `asset:`, `#` (EXCLUDING `file:`).
  - Apply `sanitizePreviewHtml` to `renderedHtml` before `dangerouslySetInnerHTML` in `LivePreview.tsx:345`.
  - In `LivePreview.tsx:161-165`: HTML-entity-escape `res.error` before inserting into fallback container `innerHTML`.
  - In `LivePreview.tsx:167-176`: Sanitize `res.svg` before inserting into `container.innerHTML`.
  - In `LivePreview.tsx:121-143`: HTML-entity-escape interpolated `actionId`, `label`, and `action.name` strings.
  - In `src/services/mathRenderer.ts:20`: Set `trust: false` unconditionally.
  - In `src/services/mermaidRenderer.ts:31`: Set `securityLevel: 'strict'` unconditionally.

#### Step 1.4: Block Dynamic `import(` in Action Sandbox (R-004)
- **Files:** `src/services/actionSandbox.ts`, `tests/actionSandbox.test.ts`
- **Specification:**
  - Update `FORBIDDEN_PATTERN` in `actionSandbox.ts:247`:
    ```ts
    const FORBIDDEN_PATTERN = /\bconstructor\b|\[\s*['"`]constructor['"`]\s*\]|__proto__|prototype|\beval\b|\bimport\s*\(|\bimport\b/i;
    ```
  - Add unit test in `tests/actionSandbox.test.ts` confirming dynamic `import(...)` throws security error.

#### Step 1.5: Preview Server Origin & Host Header Validation (R-013)
- **Files:** `src-tauri/src/preview_server.rs`
- **Specification:**
  - In `preview_server.rs:108-125`, validate `Host` and `Origin` headers on HTTP and WebSocket requests, ensuring connection originates strictly from `localhost` / `127.0.0.1`. Reject external or unauthenticated sockets.

#### Step 1.6: Remove Vestigial Capability File (R-014)
- **Files:** `src-tauri/capabilities/preview.json`
- **Specification:**
  - Delete `capabilities/preview.json` (or align its permissions with `"main"` window) to eliminate dead surface.

#### Step 1.7: Canonical Path Traversal Guard via Path Components (R-015)
- **Files:** `src-tauri/src/commands/file.rs`
- **Specification:**
  - In `file.rs:69-89`, replace naive `path.contains("..")` with path component inspection:
    ```rust
    let path_buf = PathBuf::from(path);
    if path_buf.components().any(|c| c == std::path::Component::ParentDir) {
        return Err("Directory traversal via '..' is prohibited".to_string());
    }
    ```
  - Allows legitimate filenames containing `..` (e.g. `doc..final.md`) while strictly blocking traversal.

---

### BATCH 2: Presenter Purity, Typing & Open Engine Extensibility

#### Step 2.1: Purge Dead `__cmEditorView` & Abstract Presenter `window` Reaches (R-006)
- **Files:** `src/components/TitleBar/TitleBar.tsx`, `src/components/Ribbon/ModularRibbon.tsx`, `src/adapters/domHelper.ts`
- **Specification:**
  - Implement `getCurrentSelectionText(): string` in `src/adapters/domHelper.ts`:
    ```ts
    export function getCurrentSelectionText(): string {
      if (typeof window === 'undefined') return '';
      return window.getSelection()?.toString() || '';
    }
    ```
  - In `TitleBar.tsx:188`: Remove `(window as any).__cmEditorView` and replace with `editorRegistry.insertTextAtCursor(...)`.
  - In `ModularRibbon.tsx:97,99`: Replace direct `window.getSelection()` with `getCurrentSelectionText()`.

#### Step 2.2: Implement Open Runtime Registration API for Slash Commands (R-005)
- **Files:** `src/extensions/slashCommands.ts`, `tests/slashCommands.test.ts`
- **Specification:**
  - Export extensible `SlashCommandEngine`:
    ```ts
    export class SlashCommandEngine {
      private static commands = new Map<string, SlashCommandDefinition>();
      public static registerCommand(cmd: SlashCommandDefinition): void;
      public static unregisterCommand(id: string): boolean;
      public static getCommands(): SlashCommandDefinition[];
    }
    ```
  - Populate with built-in commands and reflect dynamically in autocomplete. Add unit tests for registration and teardown.

#### Step 2.3: Clean Up `any` Casts Across Sandbox, Presenters, Adapters & Stores (R-007)
- **Files:** `src/services/actionSandbox.ts`, `src/services/actionExecutor.ts`, `src/components/Editor/Editor.tsx`, `src/adapters/tauriRuntimeAdapter.ts`, `src/adapters/domHelper.ts`, `src/store/tabStore.ts`, `src/ui-contract/actionContract.ts`, `src/ui-contract/panelContract.ts`
- **Specification:**
  - Type `rawApi` in `actionSandbox.ts` and `actionExecutor.ts` with `SandboxAPI`.
  - Type `catch (err: unknown)` in `actionExecutor.ts:224`.
  - In `tabStore.ts:379`: Type `saveTimers` as `Record<string, NodeJS.Timeout>`.
  - In `ui-contract/actionContract.ts` and `panelContract.ts`: Type `icon` with `React.ComponentType<{ className?: string }> | React.ReactNode`.
  - Replace `(view as any).updating` in `Editor.tsx` with proper state check.

---

### BATCH 3: Resilient Error Handling & Input Validation

#### Step 3.1: File Open Error Notification & Silent Failure Prevention (R-008)
- **Files:** `src/components/Sidebar/FileExplorer.tsx`
- **Specification:**
  - In `handleOpenFile`:
    ```ts
    const content = await bridge.fs.readFile(file.path);
    if (content === null) {
      useNotificationStore.getState().addNotification('File Error', `Failed to open "${file.name}". File could not be read.`, 'error');
      return;
    }
    ```

#### Step 3.2: Eliminate Silent Empty Catches & Surface Error Notifications (R-009)
- **Files:** `src/store/formattingStore.ts`, `src/extensions/liveMarkdown.ts`, `src/adapters/browserIndexedDB.ts`, `src/adapters/browserRuntimeAdapter.ts`, `src/extensions/slashCommands.ts`, `src/adapters/domHelper.ts`
- **Specification:**
  - Replace empty `catch {}` in `formattingStore.ts:432`, `liveMarkdown.ts:624,678`, `browserIndexedDB.ts:102`, and `browserRuntimeAdapter.ts:144` with structured `console.warn`.
  - Dispatch notification toast on template application failure in `slashCommands.ts:217`.
  - Return informative status and error toast on clipboard copy failure in `domHelper.ts:97`.

#### Step 3.3: Validate New Filename Input in File Explorer (R-010)
- **Files:** `src/components/Sidebar/FileExplorer.tsx`
- **Specification:**
  - Implement comprehensive filename validation:
    ```ts
    const ILLEGAL_FILENAME_REGEX = /[<>:"/\\|?*\x00-\x1F]|^\.{1,2}$|^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
    ```
  - Reject filenames containing path separators, illegal symbols, traversal (`..`), or Windows reserved device names with an actionable error toast.

#### Step 3.4: Manage Notification Auto-Dismiss Timers (R-011)
- **Files:** `src/store/notificationStore.ts`
- **Specification:**
  - Store timer references in an internal `Map<string, NodeJS.Timeout>()`.
  - When `dismissNotification(id)` is called, clear timeout handle and delete from map.
  - Expose `clearAllTimers()` for lifecycle teardown on unmount.

#### Step 3.5: IndexedDB Reject on Transaction Error (R-016)
- **Files:** `src/adapters/browserIndexedDB.ts`
- **Specification:**
  - In `browserIndexedDB.ts:87-90, 111-114`: Replace `resolve()` in error callbacks with `reject(event.target.error)`.

#### Step 3.6: Formula Encoding Descriptive Errors (R-017)
- **Files:** `src/services/formulaParser.ts`
- **Specification:**
  - In `formulaParser.ts:576-583`: Replace silent `return ''` with throwing descriptive errors (`throw new Error('Invalid Base64 string')`, `throw new Error('Malformed URL encoding')`).

---

### BATCH 4: Dependency Pruning, Asset Localization & Configs

#### Step 4.1: Prune Unused Dependency `"motion"` (R-012)
- **Files:** `package.json`
- **Specification:** Remove `"motion": "^12.23.24"` from `dependencies`. Run `npm run build` to verify clean bundle.

#### Step 4.2: Localize KaTeX CSS & Eliminate Render-Blocking CDN (R-012)
- **Files:** `index.html`, `src/index.css`
- **Specification:**
  - Remove `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">` from `index.html`.
  - Add `@import "katex/dist/katex.min.css";` to `src/index.css`.
  - Add inline `<style>html, body { background-color: #121418; color: #ffffff; }</style>` in `index.html` to eliminate cold-launch white screen.

#### Step 4.3: Gitignore AI Studio Prototype Directory & Scoped CSP (R-012)
- **Files:** `.gitignore`, `src-tauri/tauri.conf.json`
- **Specification:**
  - Add `/contextpad_replica_ai-studio/` to `.gitignore`.
  - Audit CSP connect-src in `tauri.conf.json`.

---

## 5. ━━━ VERIFICATION & REGRESSION GATES ━━━

Each batch must pass the following verification gates before proceeding:
1. `npm run lint`: 0 TypeScript errors, 0 platform leaks outside `src/adapters/`, 100% Option B contract synchronization.
2. `npm test`: 100% passing tests (minimum 112 tests + new tests for sandbox dynamic import and slash command engine).
3. `npm run build`: Vite production build compiles cleanly with exit code 0.
