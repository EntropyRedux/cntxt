# REFACTOR PLAN — ARCHITECTURAL CODEBASE REMEDIATION (v8)
> **Stage:** Refactor (Prompt 18)  
> **Project:** CNTXT (ContextPad)  
> **Workspace Root:** `C:\Projects\LocalActive\Repo\Active\CNTXT`  
> **Author:** Prod Agent  
> **Date:** 2026-10-01  
> **Target Commit:** `f26e2d3` (branch `main`)  
> **Based on Reconciled Audit:** `generated-documents/audits/raw_findings_full_codebase_verification_2026-09-30.md`  
> **Reference Architecture:** Declarative AST + Secure Keyring + Strict Capabilities + Hardened IPC Gateway  
> **Status:** Formulated for Human Review & Pass 1 Independent Auditor Plan Audit (Prompt 19)

---

## 1. Executive Summary & Root Cause Analysis

The Pass 1 Independent Audit Addendum demonstrated that shallow prototype freezing and regex denylisting cannot secure JavaScript dynamic code evaluation (`new Function`). So long as `new Function` exists and the CSP grants `script-src 'unsafe-eval'`, prototype climbing and string-concatenation evasion are unbounded.

Simultaneously, the audit demonstrated that:
1. **Silent Fallback Degradation** exists across both secrets (`.secrets_fallback.json` unencrypted writing) and sandbox runners (headless parameter-shadowing fallback).
2. **Native IPC Gating** was incomplete (`delete_file`, `secrets::*`, and `window::*` lacked session tokens).
3. **Tauri Capabilities** were over-permissive (`core:default` and `core:webview:allow-create-webview-window`).
4. **Rust Trust Boundary Validation** was lacking `#[serde(deny_unknown_fields)]`.
5. **Release Build Profiles** included `devtools` by default and omitted release optimization.

Refactor Plan v8 eliminates these root causes through an **architectural overhaul**:
- **Delete `new Function`**: Replace raw code execution with a typed, declarative Action Operation AST and registered transform engine (mirroring `FormulaEngine`), completely eliminating dynamic code generation and allowing `'unsafe-eval'` to be deleted from the CSP.
- **Delete Un-Sandboxed Fallback**: Remove the un-sandboxed fallback runner; fail loudly if execution primitives cannot run.
- **Enforce OS Keyring Only**: Delete plaintext secrets persistence entirely; require OS Keyring on desktop and Android Keystore AES-GCM on mobile.
- **Complete IPC Token Gating + Capability Lockdown**: Authenticate all 11 missing commands with ephemeral session tokens; drop `core:default`; restrict window minting; add a compile-time Rust reflection test over `generate_handler!`.
- **Harden File Operations**: Route all directory and file inspection through `validate_path`; redact `.env`; re-canonicalize immediately before `remove_dir_all`.
- **Production Build Profile**: Set `default = []`, `opt-level = 3`, `lto = "thin"`, `codegen-units = 1`, `strip = true`.

---

## 2. Issue Summary & Affected Matrix

| Finding ID | Severity | Root Cause | Affected Files |
|:---:|:---:|:---|:---|
| **P-01 / P-08** | **CRITICAL** | `new Function` dynamically compiles user strings; CSP requires `'unsafe-eval'`; fallback path does not isolate. | `src/services/actionWorker.ts`, `src/services/actionSandbox.ts`, `src/services/sandboxApiFactory.ts`, `src-tauri/tauri.conf.json`, `contracts/data_shapes.ts` |
| **P-02 / P-18** | **CRITICAL** | Silent fallback to unencrypted `.secrets_fallback.json`; mobile unconditionally bypasses keyring; erase errors swallowed. | `src-tauri/src/commands/secrets.rs`, `src-tauri/src/tests/security_tests.rs` |
| **P-03** | **CRITICAL** | Incomplete IPC token parameters: `delete_file`, `secrets::*`, and `window::*` check only window label or nothing; over-permissive capabilities. | `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/secrets.rs`, `src-tauri/src/commands/window.rs`, `src-tauri/capabilities/default.json`, `src-tauri/capabilities/extra-windows.json`, `src/adapters/tauriRuntimeAdapter.ts` |
| **P-04** | **HIGH** | `read_directory` carves out `.env`; secondary file commands bypass `validate_path`; TOCTOU gap before `remove_dir_all`. | `src-tauri/src/commands/file.rs` |
| **P-05** | **HIGH** | `Cargo.toml` specifies `default = ["devtools"]` and unoptimized release profile (`opt-level = 1`, `lto = false`). | `src-tauri/Cargo.toml` |
| **P-07** | **HIGH** | `DEFAULT_ACTIONS` in `defaultPresets.ts` carries raw executable JavaScript code strings. | `src/constants/defaultPresets.ts`, `contracts/data_shapes.ts` |
| **P-09 / P-10** | **HIGH** | Webview input not validated on Rust side with strict Serde bounds; frontend typing gaps (`any`). | `src-tauri/src/commands/*.rs`, `package.json`, `src/adapters/domHelper.ts` |
| **P-11 / P-12** | **MEDIUM** | Async operations swallow errors into console without user toast feedback; modals lack inline field validation. | `src/store/tabStore.ts`, `src/store/actionStore.ts`, `src/components/Modals/*.tsx` |
| **P-13** | **MEDIUM** | Asymmetric event listener subscriptions in React components. | `src/components/Sidebar/FileExplorer.tsx`, `src/components/Sidebar/TemplateManager.tsx` |
| **P-14** | **MEDIUM** | Session token has no expiration or window lifecycle invalidation. | `src-tauri/src/commands/mod.rs` |
| **P-15** | **MEDIUM** | Monolithic files combining UI, parsing, and state (`liveMarkdown.ts`, `FileExplorer.tsx`). | `src/extensions/liveMarkdown.ts`, `src/components/Sidebar/FileExplorer.tsx` |
| **P-16** | **MEDIUM** | Redundant `#[cfg]` command definitions in `commands/mod.rs`. | `src-tauri/src/commands/mod.rs` |
| **P-17** | **LOW** | Helper functions returning silent defaults rather than fallible `Result`. | `src/services/largeDocHelper.ts`, `src/services/formattingService.ts` |
| **P-20** | **LOW** | Type assertions in `androidRuntimeAdapter.ts`. | `src/adapters/androidRuntimeAdapter.ts` |

---

## 3. Impact & Regression Assessment

- **Breaking Changes**:
  - `Action` model migrates from `code: string` to declarative `pipeline: ActionOp[]` and registered `transform: string`. Existing presets in `defaultPresets.ts` will be rewritten into declarative pipelines. Raw dynamic JavaScript execution is deleted.
  - CSP permanently locks to `script-src 'self'`. Any dynamic `eval` or `new Function` will be blocked by the browser engine.
  - If OS Keyring is unavailable on desktop, secrets storage will fail with an explicit user error and offer session-only in-memory storage, rather than silently persisting plaintext to disk.
  - Native IPC commands will strictly require a valid session auth token. Any unauthorized call from external windows or injection vectors will immediately fail.
- **Regression Risk**: LOW to MEDIUM. Built-in actions and formulas are fully covered by unit and E2E suites. Preserving presenter purity guarantees visual UI layers remain unaffected.
- **DO NOT MODIFY Sections**: Zero violations.

---

## 4. Surgical Implementation Specifications

### Phase 1: Declarative Action Model & Complete Sandbox Elimination (P-01, P-07, P-08)

#### 1.1 Canonical Data Shapes (`contracts/data_shapes.ts` & context mirror)
Replace raw `code: string` with a typed operation AST:
```ts
export type ActionTransformName =
  | 'summarize'
  | 'formatTable'
  | 'slugify'
  | 'extractTasks'
  | 'formatJSON'
  | 'deduplicateLines'
  | 'sortLinesAsc'
  | 'sortLinesDesc'
  | 'trimLines'
  | 'uppercase'
  | 'lowercase'
  | 'titlecase';

export type ActionOp =
  | { type: 'setText'; text: string }
  | { type: 'insertAtCursor'; text: string }
  | { type: 'wrapSelection'; before: string; after: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'transform'; transform: ActionTransformName; args?: Record<string, string | number | boolean> }
  | { type: 'formula'; expression: string }
  | { type: 'toast'; message: string; toastType?: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'openTab'; title: string; content: string; language?: string }
  | { type: 'copyToClipboard'; text?: string };

export interface Action {
  id: string;
  name: string;
  description?: string;
  category: ActionCategory;
  shortcut?: string;
  enabled?: boolean;
  color?: string;
  createdAt: number;
  updatedAt: number;
  // Declarative operation pipeline — zero dynamic code generation
  pipeline: ActionOp[];
}
```

#### 1.2 Declarative Transform Engine (`src/services/actionEngine.ts`)
Create a pure, deterministic pipeline executor:
- Implements registered transforms without `eval` or `new Function`.
- Executes declarative operations sequentially on the active document snapshot.
- Emits atomic `ActionMutation` entries to the store via the Snapshot-Journal protocol.

#### 1.3 Delete `new Function` and Delete Fallback Runner
- In `src/services/actionWorker.ts`: Delete `new Function(...)`. The worker now executes the declarative AST interpreter or is superseded by the direct engine.
- In `src/services/actionSandbox.ts`: Delete the un-sandboxed fallback runner (`actionSandbox.ts:209-288`). If the execution environment cannot run, fail with an explicit notification toast.
- In `src/constants/defaultPresets.ts`: Convert `DEFAULT_ACTIONS` from raw JavaScript strings to typed `pipeline: ActionOp[]`.

#### 1.4 CSP Lockdown (`src-tauri/tauri.conf.json`)
Remove `'unsafe-eval'` entirely:
```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' asset: https://asset.localhost data: blob:;"
```

---

### Phase 2: Secure Secrets Engine (P-02, P-18)

#### 2.1 Remove Plaintext Fallback
In `src-tauri/src/commands/secrets.rs`:
- Delete `fallback_path`, `load_fallback`, and `save_fallback`.
- Delete `.secrets_fallback.json` creation and unencrypted `fs::write`.

#### 2.2 Enforce Native OS Keyring on Desktop
- On Windows / macOS / Linux: Route `store_api_key`, `get_api_key`, and `delete_api_key` strictly through `keyring::Entry`.
- If the OS Keyring fails (e.g. locked keyring or headless environment), return an explicit error:
  `Err("Secure OS Keyring unavailable. Failed to securely store credentials.")`
- Frontend surfaces an option to store credentials in memory for the current session only.

#### 2.3 Android Keystore Support
- On Android: Implement native AES-GCM credential encryption via direct Android Keystore JNI calls, or return an explicit unsupported notification until Keystore JNI is wired.

#### 2.4 Fallible Return Types & Error Propagation (P-18)
- Refactor `has_api_key` signature:
  `pub fn has_api_key(window: Window, app: AppHandle, provider: String, session_token: Option<String>) -> Result<bool, String>`
  Return `Ok(true)` if found, `Ok(false)` if `keyring::Error::NoEntry`, and `Err(e)` on actual access/keyring errors.
- Remove all `let _ =` error swallowing on delete paths (`secrets.rs:73,124,127,131`).

---

### Phase 3: Native IPC Token Auth & Capability Lockdown (P-03, P-14)

#### 3.1 Complete Session Token Parameters
In `src-tauri/src/commands/`:
- **`file.rs`**: Add `session_token: Option<String>` to:
  - `delete_file` (L437)
  - `read_directory` (L411)
  - `get_file_name` (L236)
  - `detect_language_from_path` (L248)
  - `get_file_modified_time` (L287)
  - `open_file_explorer` (L478)
  - `get_dir_name` (L534)
  All validate via `super::is_authorized_request(&window, session_token.as_deref())`.
- **`secrets.rs`**: Add `session_token: Option<String>` to:
  - `store_api_key`, `get_api_key`, `delete_api_key`, `has_api_key`.
  All validate via `super::is_authorized_request(&window, session_token.as_deref())`.
- **`window.rs`**: Add `session_token: Option<String>` to:
  - `minimize_window`, `maximize_window`, `unmaximize_window`, `toggle_maximize`, `close_window`, `set_title`, `show_window`.
  All validate via `super::is_authorized_request(&window, session_token.as_deref())`.

#### 3.2 Fail-Closed Token Validation (`src-tauri/src/commands/mod.rs`)
- Remove permissive `(None, _) => true` fallbacks.
- Gate any test-only bypass strictly behind `#[cfg(test)]`.

#### 3.3 Capability Lockdown (`src-tauri/capabilities/`)
- In `default.json`: Remove `core:default`. Allowlist only the specific permissions used by the application (`core:window:allow-start-dragging`, `core:event:default`, `dialog:default`).
- In `extra-windows.json`: Drop `core:webview:allow-create-webview-window`. Prevent webviews from dynamically minting arbitrary child windows.

#### 3.4 Compile-Time Reflection Test over `generate_handler!`
In `src-tauri/src/tests/security_tests.rs`:
- Add a mechanical test that reflects over the command list in `tauri::generate_handler!` and verifies every registered command enforces session token authorization.

---

### Phase 4: Path Security & Input Redaction (P-04)

#### 4.1 Route All File Inspection through `validate_path`
In `src-tauri/src/commands/file.rs`:
- Route `get_file_name`, `detect_language_from_path`, `get_file_modified_time`, `open_file_explorer`, and `get_dir_name` through `validate_path`.
- In `delete_file`, re-canonicalize immediately before `fs::remove_dir_all(&safe_path)` to close the TOCTOU window.

#### 4.2 Delete `.env` Exemption
In `src-tauri/src/commands/file.rs:369`:
- Replace:
  `if file_name.starts_with('.') && file_name != ".env" && file_name != ".gitignore"`
  with:
  `if file_name.starts_with('.') && file_name != ".gitignore"`
- Sensitive dotfiles (`.env`, `.env.*`) are strictly redacted from directory browsing.

---

### Phase 5: Production Build Profile & Strict Serde Validation (P-05, P-09, P-10)

#### 5.1 Cargo.toml Production Hardening
In `src-tauri/Cargo.toml`:
- Set `default = []` (exclude devtools from default builds).
- Configure `[profile.release]`:
  ```toml
  [profile.release]
  codegen-units = 1
  lto = "thin"
  incremental = false
  opt-level = 3
  strip = true
  ```

#### 5.2 Strict Rust Boundary Serde Validation
- Add `#[serde(deny_unknown_fields)]` to all IPC payload structs in Rust (`FileNode`, `AppInfo`, options structs).
- Reject payloads containing unrecognized or unexpected fields at the native boundary.

---

### Phase 6: Code Quality, Observability & Adversarial Gates (P-11..P-17, P-20)

1. **CSP Assertion Test**: Automated Vitest test parsing `src-tauri/tauri.conf.json` and asserting that `script-src` contains zero occurrences of `'unsafe-eval'` or `'unsafe-inline'`.
2. **Adversarial Payload Corpus Test**: Automated Playwright test verifying that code-generation payloads (`AsyncFunction`, `'con'+'structor'`, `String.fromCharCode`, prototype access) cannot execute or access real globals.
3. **Observability**: Audit `catch` blocks across `src/store/` and `src/adapters/` to dispatch actionable notification toasts on async failures.
4. **Listener Teardowns**: Audit `useEffect` in `FileExplorer.tsx` and `TemplateManager.tsx` ensuring 100% symmetric unbinding.
5. **TypeScript Hygiene**: Eliminate residual `as any` in `domHelper.ts` and `androidRuntimeAdapter.ts`.

---

## 5. Execution Order

```
┌────────────────────────────────────────────────────────┐
│ 1. Step 1 (P-05): Cargo Profile & Feature Lockdown    │
│    - default = [], opt-level = 3, lto = "thin"         │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Step 2 (P-04): Path Security & .env Redaction       │
│    - validate_path on all file commands, redact .env   │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Step 3 (P-02, P-18): Secure Keyring Secrets Engine  │
│    - Delete plaintext fallback, enforce OS Keyring     │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Step 4 (P-03, P-14): Complete IPC Token & Caps     │
│    - Token auth on delete_file, secrets, window        │
│    - Narrow capabilities, add Rust reflection test     │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. Step 5 (P-01, P-07, P-08): Declarative Action Model │
│    - Replace new Function with ActionOp pipeline       │
│    - Delete fallback runner, lock CSP to 'self'        │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 6. Step 6 (P-09..P-17, P-20): Quality & Observability  │
│    - Serde deny_unknown_fields, CSP test, corpus test  │
└────────────────────────────────────────────────────────┘
```

---

## 6. Authoritative Verification Matrix

| Step | Gate Focus | Verification Command | Exit Criteria |
|:---|:---|:---|:---|
| **Step 1** | Build Config | `cargo test --manifest-path src-tauri/Cargo.toml` | `default = []` compiles cleanly. |
| **Step 2** | Path Security | `cargo test --manifest-path src-tauri/Cargo.toml` | `.env` redacted; path tests green. |
| **Step 3** | Secrets | `cargo test --manifest-path src-tauri/Cargo.toml` | Keyring enforced; zero plaintext files written. |
| **Step 4** | IPC Auth & Caps | `cargo test --manifest-path src-tauri/Cargo.toml` | 100% commands token-gated; reflection test green. |
| **Step 5** | Declarative Actions | `npm test && npx playwright test e2e/actionSandboxRealm.spec.ts` | Zero `new Function`; CSP locked to `script-src 'self'`. |
| **Step 6** | Full Verification | `npm run lint && cargo test && npm test && npm run test:e2e && npm run build` | All 5 gates 100% green; clean production bundle. |

---

## 7. Backup Reminder & Next Action

> **MANDATORY BACKUP DIRECTIVE (Prompt 18 / AGENTS.md):**  
> A git backup push must be performed BEFORE code execution begins.  
> Do NOT begin code execution without confirming the backup push was made.

Per **Prompt 19** ([AGENTS.md Section 4 / S-5](file:///c:/Projects/LocalActive/AGENTS.md)), this plan must be audited by the **Pass 1 Independent Auditor** before execution commences:

```text
reconcile audit generated-documents/audits/refactor_plan_audit_full_codebase_remediation_2026-10-01.md
```
