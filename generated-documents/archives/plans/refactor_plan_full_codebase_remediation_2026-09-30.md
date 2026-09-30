# REFACTOR PLAN — FULL CODEBASE AUDIT REMEDIATION (v7)
> **Stage:** Refactor (Prompt 18)  
> **Project:** CNTXT (ContextPad)  
> **Workspace Root:** `C:\Projects\LocalActive\Repo\Active\CNTXT`  
> **Author:** Prod Agent  
> **Date:** 2026-09-30  
> **Target Commit:** `f26e2d3` (branch `main`)  
> **Based on Reconciled Audit:** `generated-documents/audits/raw_findings_full_codebase_verification_2026-09-30.md` (Pass 1 Addendum & Pass 2 Reconciliation)  
> **Status:** Pending Human Review & Pass 1 Independent Auditor Plan Audit (Prompt 19)

---

## 1. Issue Summary

The reconciled audit report (`raw_findings_full_codebase_verification_2026-09-30.md`) verified 18 valid defects across two tiers, overturning the previous `PASS` verdict to **`FAIL`**:

### Tier 1: Security Criticals & Release Gates

- **P-01 (CRITICAL)**: **Action Sandbox Worker Prototype-Climbing Bypass & Fallback Exposure**
  - *Source:* Verification Addendum §1 (`actionWorker.ts:189-204`, `actionSandbox.ts:209-288`, `sandboxApiFactory.ts:37`)
  - *Severity:* CRITICAL
  - *Description:* `validateActionSyntax` regex denylist checks literal text, easily bypassed via string concatenation (`'con'+'structor'`, `'getProto'+'typeOf'`). `AsyncFunction.prototype` and `Object.getOwnPropertyDescriptor` are not frozen, allowing user actions to recover the real global scope and ambient capabilities. Fallback runner in `actionSandbox.ts` uses lexical parameter shadowing only.
  - *Root Cause:* Reliance on source text regex denylist rather than complete prototype hierarchy neutralization; omission of `AsyncFunction` from the freeze loop; lack of symmetrical hardening on the fallback runner.
  - *Affected Files:* `src/services/actionWorker.ts`, `src/services/sandboxApiFactory.ts`, `src/services/actionSandbox.ts`, `e2e/actionSandboxRealm.spec.ts`.

- **P-02 (CRITICAL)**: **Plaintext Secrets Fallback in `.secrets_fallback.json`**
  - *Source:* Verification Addendum §3 (`src-tauri/src/commands/secrets.rs:17-47,58,69-76,131`)
  - *Severity:* CRITICAL
  - *Description:* When OS Keyring fails, `secrets.rs` silently writes plaintext API keys to `.secrets_fallback.json` via unencrypted `fs::write`. Mobile builds unconditionally bypass the keyring and write plaintext. Failed secure-erase is swallowed with `let _ = save_fallback(...)`.
  - *Root Cause:* Graceful degradation was prioritized over security invariants, causing silent fail-open persistence to unencrypted disk.
  - *Affected Files:* `src-tauri/src/commands/secrets.rs`, `src-tauri/src/tests/security_tests.rs`.

- **P-03 (CRITICAL)**: **Incomplete Native IPC Session Token Enforcement**
  - *Source:* Verification Addendum §2 (`file.rs:437-443`, `secrets.rs:50,80,114,137`, `window.rs:4..77`)
  - *Severity:* CRITICAL
  - *Description:* `delete_file` (`file.rs:437`) has no `session_token` parameter, wrapping `fs::remove_dir_all` behind window label check only. All 4 `secrets::*` commands check only `is_authorized_window`. All 7 `window::*` commands have zero auth checks.
  - *Root Cause:* The Phase 2 IPC token implementation only updated `read_file`, `write_file`, `kv_*`, and `clipboard_*`, omitting `delete_file`, `secrets`, and `window` commands from the token parameter refactor.
  - *Affected Files:* `src-tauri/src/commands/file.rs`, `src-tauri/src/commands/secrets.rs`, `src-tauri/src/commands/window.rs`, `src-tauri/src/tests/security_tests.rs`, `src/adapters/tauriRuntimeAdapter.ts`.

- **P-04 (HIGH)**: **Path Validation Gaps & `.env` Exposure in `read_directory`**
  - *Source:* Verification Addendum §5 (`src-tauri/src/commands/file.rs:369`)
  - *Severity:* HIGH
  - *Description:* `file.rs:369` explicitly allows `.env` files to be listed and read via `read_directory` (`file_name != ".env"`), exposing sensitive environment files to workspace enumeration.
  - *Root Cause:* Intentional developer-mode exemption in file explorer that violates security best practices in production builds.
  - *Affected Files:* `src-tauri/src/commands/file.rs`.

- **P-05 (HIGH)**: **Release Profile Misconfiguration & Default Devtools**
  - *Source:* Verification Addendum §5 (`src-tauri/Cargo.toml:17,50-55`)
  - *Severity:* HIGH
  - *Description:* `src-tauri/Cargo.toml:17` specifies `default = ["devtools"]`, packaging devtools into release builds by default. `[profile.release]` sets `opt-level = 1`, `lto = false`, `codegen-units = 16`.
  - *Root Cause:* Debug build configuration retained in release profile and default feature flags.
  - *Affected Files:* `src-tauri/Cargo.toml`.

- **P-08 (HIGH)**: **Worker Realm Defeats Module Isolation**
  - *Source:* Verification Addendum §5 (Folded into P-01)
  - *Severity:* HIGH
  - *Description:* Script execution via `new Function` inside Web Worker realm allows ambient capability recreation if prototype freezing is incomplete.
  - *Affected Files:* `src/services/actionWorker.ts`.

### Tier 2: Code Quality, Typing & Architecture

- **P-09 (HIGH)**: **73 Instances of `any` Across Production Source**
  - *Affected Files:* `src/adapters/domHelper.ts`, `src/adapters/tauriRuntimeAdapter.ts`, `src/store/actionStore.ts`, `src/services/formulaParser.ts`.
- **P-10 (HIGH)**: **Absence of Schema Validation Library (`zod`)**
  - *Affected Files:* `package.json`, `src/services/actionSandbox.ts`, `contracts/data_shapes.ts`.
- **P-11 (MEDIUM)**: **76 Console-Only Catch Blocks Without User Feedback**
  - *Affected Files:* `src/store/tabStore.ts`, `src/store/actionStore.ts`, `src/adapters/browserRuntimeAdapter.ts`.
- **P-12 (MEDIUM)**: **Missing Field-Level Form Validation in Modals**
  - *Affected Files:* `src/components/Modals/VariableFillerModal.tsx`, `src/components/Sidebar/SettingsPanel.tsx`.
- **P-13 (MEDIUM)**: **Listener Teardown Asymmetry**
  - *Affected Files:* `src/components/Sidebar/FileExplorer.tsx`, `src/components/Sidebar/TemplateManager.tsx`.
- **P-14 (MEDIUM)**: **Token Lifetime & Window Lifecycle Invalidation**
  - *Affected Files:* `src-tauri/src/commands/mod.rs`, `src/adapters/tauriRuntimeAdapter.ts`.
- **P-15 (MEDIUM)**: **Monolithic "God Files" (`liveMarkdown.ts`, `FileExplorer.tsx`)**
  - *Affected Files:* `src/extensions/liveMarkdown.ts`, `src/components/Sidebar/FileExplorer.tsx`.
- **P-16 (MEDIUM)**: **Duplicated `#[cfg]` Command Declarations**
  - *Affected Files:* `src-tauri/src/commands/mod.rs`.
- **P-17 (LOW)**: **Non-Fallible Function Signatures Returning Silent Fallbacks**
  - *Affected Files:* `src/services/largeDocHelper.ts`, `src/services/formattingService.ts`.
- **P-18 (LOW)**: **`has_api_key` Masks Keyring Access Errors**
  - *Affected Files:* `src-tauri/src/commands/secrets.rs:137-144`.
- **P-20 (LOW)**: **Android Adapter Type Assertions**
  - *Affected Files:* `src/adapters/androidRuntimeAdapter.ts`.

---

## 2. Impact & Regression Assessment

| Issue ID | What Breaks if Not Fixed? | Regression Risk of Fixing | IPC / Contract Boundary Impact | DO NOT MODIFY Touched? |
|:---|:---|:---:|:---:|:---:|
| **P-01 / P-08** | Malicious user action code escapes sandbox and accesses ambient network, filesystem, and environment variables via concatenation climber. | LOW | None (internal to Worker & Sandbox API). | NO |
| **P-02** | User API keys stored unencrypted in plaintext JSON on disk; key destruction on read failure. | LOW | Native secrets storage IPC. | NO |
| **P-03** | Malicious webview context can execute arbitrary `remove_dir_all` and access stored credentials by mimicking `"window-*"` label without token. | LOW | Adds `session_token` parameter to native IPC commands. Frontend adapters auto-attach. | NO |
| **P-04** | `.env` credentials exposed in directory listings. | LOW | None (redaction only). | NO |
| **P-05** | Production builds ship with developer tools enabled and unoptimized machine code. | LOW | Build configuration only. | NO |
| **P-09 / P-10** | Runtime payload drift and untyped runtime errors. | MEDIUM | Replaces ad-hoc guards with typed `zod` schemas. | NO |
| **P-11 / P-12** | Silent operation failures and poor user UX on input errors. | LOW | Adds observable toast and field error UI. | NO |
| **P-18** | UI assumes key doesn't exist when OS keyring is locked. | LOW | Changes return type to `Result<bool, String>`. | NO |

---

## 3. Surgical Refactor Plan (Tier 1 Priority)

### Step 1: Complete Native IPC Session Token Authorization (P-03)
1. **Rust Command Signatures (`file.rs`, `secrets.rs`, `window.rs`)**:
   - In `src-tauri/src/commands/file.rs`:
     - `delete_file(window: Window, path: String, session_token: Option<String>) -> Result<(), String>`: validate `super::is_authorized_request(&window, session_token.as_deref())`.
     - `read_directory(window: Window, path: String, session_token: Option<String>) -> Result<Vec<FileNode>, String>`: validate `super::is_authorized_request(&window, session_token.as_deref())`.
     - `get_file_name`, `detect_language_from_path`, `get_file_modified_time`, `open_file_explorer`, `get_dir_name`: validate session token.
   - In `src-tauri/src/commands/secrets.rs`:
     - `store_api_key(window: Window, app: AppHandle, provider: String, key: String, session_token: Option<String>) -> Result<(), String>`
     - `get_api_key(window: Window, app: AppHandle, provider: String, session_token: Option<String>) -> Result<String, String>`
     - `delete_api_key(window: Window, app: AppHandle, provider: String, session_token: Option<String>) -> Result<(), String>`
     - `has_api_key(window: Window, app: AppHandle, provider: String, session_token: Option<String>) -> Result<bool, String>`
     - All validate `super::is_authorized_request(&window, session_token.as_deref())`.
   - In `src-tauri/src/commands/window.rs`:
     - Add `session_token: Option<String>` to `minimize_window`, `maximize_window`, `unmaximize_window`, `toggle_maximize`, `close_window`, `set_title`, `show_window`, validating via `super::is_authorized_request(&window, session_token.as_deref())`.
2. **Frontend Adapter Call Sites (`tauriRuntimeAdapter.ts`)**:
   - Verify `deleteFile`, `readDirectory`, `secrets`, and `window` invoke through `invokeTauri` / `invokeTauriVoid` (which automatically attach `sessionToken: this.sessionToken`).
3. **Rust Security Tests (`security_tests.rs`)**:
   - Add test cases verifying `delete_file`, `read_directory`, and `store_api_key` return `Err("Unauthorized: Invalid IPC session token")` when called with missing/invalid tokens.

---

### Step 2: Eliminate Plaintext Secrets Fallback (P-02 & P-18)
1. **Remove Unencrypted Fallback File Operations**:
   - Delete `fallback_path`, `load_fallback`, and `save_fallback` writing `.secrets_fallback.json` in `src-tauri/src/commands/secrets.rs`.
2. **Enforce Platform-Native Keyring**:
   - On Desktop (Windows / macOS / Linux): Use `keyring::Entry`. If keyring access fails, return an explicit error `Err("Secure OS Keyring unavailable. Credential persistence aborted.")` rather than silently degrading to plaintext.
   - On Android: Provide secure storage via Android Keystore / encrypted SharedPreferences, or return explicit unsupported error with user notification.
3. **Fix `has_api_key` Error Masking (P-18)**:
   - In `secrets.rs:137-144`, return `Result<bool, String>`: return `Ok(true)` if found, `Ok(false)` if `keyring::Error::NoEntry`, and `Err(e)` on actual access/keyring errors.

---

### Step 3: Hardened Sandbox Prototype Neutralization (P-01 & P-08)
1. **Comprehensive Prototype Hierarchy Freezing in `actionWorker.ts`**:
   - Retrieve all function constructors:
     ```ts
     const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
     const GeneratorFunction = Object.getPrototypeOf(function*(){}).constructor;
     const AsyncGeneratorFunction = Object.getPrototypeOf(async function*(){}).constructor;
     ```
   - Freeze prototypes of `AsyncFunction`, `GeneratorFunction`, `AsyncGeneratorFunction`, `Function`, `Object`, `Array`, `Promise`.
   - Freeze reflection and descriptor inspection primitives:
     ```ts
     Object.freeze(Object.getOwnPropertyDescriptor);
     Object.freeze(Object.getOwnPropertyDescriptors);
     Object.freeze(Object.getPrototypeOf);
     Object.freeze(Object.setPrototypeOf);
     Object.freeze(Reflect);
     ```
   - Neutralize `__proto__` descriptor on `Object.prototype`:
     ```ts
     Object.defineProperty(Object.prototype, '__proto__', {
       get: () => undefined,
       set: () => {},
       configurable: false
     });
     ```
2. **AST / Token Pre-Scan Hardening in `sandboxApiFactory.ts`**:
   - Enhance `validateActionSyntax(code)`:
     - Disallow bracket member access with dynamic concatenation or computed expressions:
       `FORBIDDEN_BRACKET_PATTERN = /\[\s*(['"`]?\s*[\w\s+]*\s*['"`]?|[^\]'"`\d\s]+)\s*\]/`
     - Disallow explicit references to `AsyncFunction`, `GeneratorFunction`, `getOwnPropertyDescriptor`, `getPrototypeOf`, `Reflect`.
3. **Symmetrical Fallback Hardening in `actionSandbox.ts`**:
   - In `actionSandbox.ts:209-288`, apply identical prototype freezing and pre-scan validation to the headless fallback runner.
4. **Non-Vacuous E2E Probe Test in `actionSandboxRealm.spec.ts`**:
   - Add test explicitly attempting the auditor's concatenation payload:
     `var k='con'+'structor', m='getProto'+'typeOf'; ...`
   - Assert that the runner rejects it with a security error or throws when accessing frozen descriptors.

---

### Step 4: Redact `.env` and Configure Release Cargo Profile (P-04 & P-05)
1. **Redact Sensitive Dotfiles in `file.rs` (P-04)**:
   - In `src-tauri/src/commands/file.rs:369`, replace:
     `if file_name.starts_with('.') && file_name != ".env" && file_name != ".gitignore"`
     with:
     `if file_name.starts_with('.') && file_name != ".gitignore"`
   - Redact `.env`, `.env.*`, and other credential dotfiles from directory traversal.
2. **Configure Production Cargo Profile (P-05)**:
   - In `src-tauri/Cargo.toml:17`: Set `default = []` (exclude devtools from default release).
   - In `src-tauri/Cargo.toml:50-55`:
     ```toml
     [profile.release]
     codegen-units = 1
     lto = true
     incremental = false
     opt-level = 3
     ```

---

### Step 5: Code Quality & Error Boundary Hardening (Tier 2: P-09..P-17, P-20)
1. **Install `zod` and Type Boundary Schemas (P-10, P-12)**:
   - Define schemas for IPC responses and modal form inputs.
2. **Auditing Catch Blocks & Notifications (P-11)**:
   - Audit 76 catch blocks in stores/adapters to dispatch `addNotification('ERROR', ...)` on async failures.
3. **Teardown Symmetry (P-13)**:
   - Ensure every `addEventListener` in components has a matching `removeEventListener` in the `useEffect` cleanup return.
4. **Replace Production `any` (P-09, P-20)**:
   - Clean up remaining `as any` in `domHelper.ts` and `androidRuntimeAdapter.ts`.

---

## 4. Execution Order

```
┌────────────────────────────────────────────────────────┐
│ 1. Step 1 (P-03): IPC Session Token Gating            │
│    - file.rs, secrets.rs, window.rs, security_tests    │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Step 2 (P-02, P-18): Secure OS Keyring Storage      │
│    - Remove plaintext fallback in secrets.rs           │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Step 3 (P-01, P-08): Hardened Sandbox Isolation     │
│    - Deep prototype freezing & pre-scan in actionWorker │
│    - Concatenation climber test in actionSandboxRealm  │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. Step 4 (P-04, P-05): .env Redaction & Cargo Profile │
│    - Cargo.toml release flags, file.rs dotfile check   │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 5. Step 5 (P-09..P-17): Code Quality & Tier 2 Hygiene  │
│    - Zod schemas, notification toasts, listener cleanups│
└────────────────────────────────────────────────────────┘
```

---

## 5. Verification Commands Gate Matrix

Every task in the plan must satisfy the authoritative verification matrix before any release candidate is cut:

| Step | Component | Verification Command | Gate Success Criteria |
|:---|:---|:---|:---|
| **Step 1** | IPC Token Auth | `cargo test --manifest-path src-tauri/Cargo.toml` | 100% mutating commands require token; security tests green. |
| **Step 2** | Secrets Storage | `cargo test --manifest-path src-tauri/Cargo.toml` | Zero plaintext JSON written; keyring errors surfaced. |
| **Step 3** | Sandbox Hardening | `npx playwright test e2e/actionSandboxRealm.spec.ts` | Concatenation climber payload rejected; ambient capabilities stripped. |
| **Step 4** | Cargo & Path | `cargo test && npm run lint` | Devtools excluded from default; `.env` redacted. |
| **Step 5** | Full Verification | `npm run lint && cargo test && npm test && npm run test:e2e && npm run build` | All 5 gates 100% green; clean build. |

---

## 6. Backup Reminder & Next Action

> **MANDATORY BACKUP DIRECTIVE (Prompt 18 / AGENTS.md):**  
> A git backup push must be performed BEFORE execution of this plan begins.  
> Do NOT begin code execution without confirming the backup push was made.

Per **Prompt 19** ([AGENTS.md Section 4 / S-5](file:///c:/Projects/LocalActive/AGENTS.md)), this plan must be reviewed and audited by the **Pass 1 Independent Auditor** before execution commences:

```text
reconcile audit generated-documents/audits/refactor_plan_audit_full_codebase_remediation_2026-09-30.md
```
