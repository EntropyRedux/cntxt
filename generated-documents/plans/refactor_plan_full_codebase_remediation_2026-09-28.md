# REFACTOR PLAN — FULL CODEBASE REMEDIATION (v5)
> Stage: Refactor (Prompt 18)  
> Project: CNTXT (ContextPad)  
> Workspace Root: `C:\Projects\LocalActive\Repo\Active\CNTXT`  
> Author: Prod Agent  
> Date: 2026-09-28  
> Based on Reconciled Audit: `generated-documents/audits/raw_findings_full_codebase_2026-09-28.md`  
> Target Commit: `d0254ff` + `983c2eb` (branch `main`)  

---

## ━━━ EXECUTIVE SUMMARY & CORE ARCHITECTURAL DECISIONS ━━━

The Pass 2 reconciliation of the 2026-09-28 Full Codebase Audit confirmed **18 Valid Defects** (4 Critical, 5 High, 5 Medium, 4 Low) and **1 Approved Tradeoff**.

The root failure pattern identified across prior remediation iterations was **unverifiable remediation** and a conflict between two security objectives:
1. **CSP Hardening**: Eliminating `'unsafe-eval'` from `script-src`.
2. **User-Scripted Action Execution**: The application's core user-facing feature—allowing users to author and run custom JavaScript actions (`api.getSelection()`, `api.insertAtCursor()`, string transformation, JSON formatting, regular expressions).

Under CSP Level 3, `new Function()` requires `'unsafe-eval'`. Removing `'unsafe-eval'` from the webview CSP broke action execution in packaged desktop builds (`EvalError: call to eval() blocked by CSP`).

### The Central Human Decision (C-01 / TR-003): Action Execution vs CSP Model

To ensure **ZERO functional regressions** while maintaining sound security boundaries, two distinct architectural options are presented for human decision:

* **Option A (Tauri Webview Custom Protocol CSP with Dedicated Worker 'unsafe-eval' or Formal TR-003 Re-affirmation):**
  - Retain `'unsafe-eval'` in production CSP strictly within the desktop Tauri shell (`tauri.conf.json`), formally updating TR-003 in `living_context.md` with explicit justification: *CNTXT is a developer-oriented text editor and prompt workbench where user-authored action scripts are an intentional core product capability, analogous to Obsidian and VS Code.*
  - Combine this with a hardened dedicated Web Worker (`DedicatedWorkerGlobalScope`) and AST-level intrinsic protection so user actions execute strictly off the main DOM thread and cannot reach `window`, `document`, or Tauri IPC.
* **Option B (Safe In-Worker AST Interpreter without 'unsafe-eval'):**
  - Keep `script-src 'self'` without `'unsafe-eval'`.
  - Replace `new Function` inside the worker with a lightweight, secure JavaScript AST interpreter (such as `expr-eval` or an embedded AST evaluator) supporting the action syntax (loops, regex, assignments, `api.*` calls) without invoking native `eval()`.
  - *Tradeoff:* Certain arbitrary JS syntax (e.g. nested closures, `class`, complex async generators) may have restricted execution support.

**Recommendation:** Proceed with **Option A** (or Option A with strict AST pre-scan) for the immediate release to guarantee 100% backward compatibility for all user scripts, while enforcing physical worker thread isolation.

---

## ━━━ ISSUE SUMMARY (18 VALID DEFECTS) ━━━

### Phase 1: Critical Security & Sandbox (Priority: CRITICAL)

#### Issue ID: R-01 (C-01)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — C-01
- **Severity:** CRITICAL (Release Blocker)
- **Description:** Production CSP (`script-src 'self'`) blocks `new Function` at `actionWorker.ts:198` and `actionSandbox.ts:348`. User actions throw `EvalError` in packaged builds.
- **Root Cause:** `'unsafe-eval'` was stripped from `tauri.conf.json` without an alternative execution engine or worker-scoped CSP allowance.
- **Affected Files:** `src-tauri/tauri.conf.json`, `src/services/actionWorker.ts`, `src/services/actionSandbox.ts`, `generated-documents/context/living_context.md`.

#### Issue ID: R-02 (C-02, L-01, L-04)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — C-02, L-01, L-04
- **Severity:** CRITICAL
- **Description:** Parameter shadowing in `new Function` (`actionSandbox.ts:341-357`) does not eliminate globals; constructor climbing `({}).constructor.constructor` recovers `Function` and ambient authority. Worker global scope has unstripped network/import capabilities. `SandboxAPI` is duplicated across worker and host.
- **Root Cause:** Lexical parameter shadowing only shadows local identifiers without unbinding prototype accessors or freezing worker globals.
- **Affected Files:** `src/services/actionSandbox.ts`, `src/services/actionWorker.ts`.

#### Issue ID: R-03 (C-03, H-02)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — C-03, H-02
- **Severity:** CRITICAL
- **Description:** `sanitizePreviewHtml` layout style preservation is keyed on unconstrained CSS classes (`.katex, .cm-table-math`), allowing arbitrary HTML to inject full-screen clickjacking overlays (`position: fixed; top: 0; width: 100vw; height: 100vh`). Non-DOM regex fallback diverges from DOMParser logic; SVG `xlink:href` is uninspected.
- **Root Cause:** Sanitizer relies on user-writable `class` attribute rather than internal parser state or an allowlist of computed styles.
- **Affected Files:** `src/adapters/domHelper.ts`, `src/services/tableParser.ts`.

#### Issue ID: R-04 (C-04)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — C-04
- **Severity:** CRITICAL (Process Integrity)
- **Description:** Premature declaration of `PASS (Plan v4 Reconciled)` in `living_context.md` prior to independent Pass 1 audit.
- **Root Cause:** Implementing agent updated audit verdict ahead of audit workflow.
- **Affected Files:** `generated-documents/context/living_context.md` (Already corrected in git commit `983c2eb`).

---

### Phase 2: Native IPC, Gateway & Architecture (Priority: HIGH)

#### Issue ID: R-05 (H-01, M-02)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — H-01, M-02
- **Severity:** HIGH
- **Description:** `is_authorized_window` is a pure string check on window label (`label == "main" || label.starts_with("window-")`). `withGlobalTauri: true` exposes full Tauri IPC API globally on `window.__TAURI__`. `devtools` feature in Cargo.toml is unconditionally linked.
- **Root Cause:** Incomplete capability-based security model; legacy `withGlobalTauri` left enabled.
- **Affected Files:** `src-tauri/src/commands/mod.rs`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`.

#### Issue ID: R-06 (H-03)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — H-03
- **Severity:** HIGH
- **Description:** `scripts/check-platform-leaks.mjs` excludes `src/adapters/`, hiding 14 occurrences of `AndroidBridge` and `window.__TAURI_INTERNALS__` in `tauriRuntimeAdapter.ts`.
- **Root Cause:** Broad directory exclusion in linter rather than file-specific targeting; mobile bridge logic merged into shared desktop adapter.
- **Affected Files:** `scripts/check-platform-leaks.mjs`, `src/adapters/tauriRuntimeAdapter.ts`, new `src/adapters/mobileAndroidAdapter.ts`.

#### Issue ID: R-07 (H-04)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — H-04
- **Severity:** HIGH
- **Description:** `browserRuntimeAdapter.ts` dynamically imports `DEFAULT_ACTIONS` and `DEFAULT_TEMPLATES` from `mocks/index.ts`. Contradicts the LCD claim of "zero imports from `mocks/` in `src/`".
- **Root Cause:** Dynamic import was used as a workaround to seed browser prototype storage without static import errors.
- **Affected Files:** `src/adapters/browserRuntimeAdapter.ts`, new `src/constants/defaultPresets.ts`.

#### Issue ID: R-08 (H-05)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — H-05
- **Severity:** HIGH
- **Description:** Promised Playwright realm suite (`e2e/actionSandboxRealm.spec.ts`) was never created. Zero production CSP E2E coverage.
- **Root Cause:** Omitted during test authoring in prior cycle.
- **Affected Files:** `e2e/actionSandboxRealm.spec.ts` (new file), `playwright.config.ts`.

---

### Phase 3: Validation, Typing, Test Rigor & Hygiene (Priority: MEDIUM / LOW)

#### Issue ID: R-09 (M-01)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — M-01
- **Severity:** MEDIUM
- **Description:** `test_url_forbidden_characters` tests its own local array rather than production `validate_url`; `validate_path` is never invoked in unit tests.
- **Root Cause:** Disconnected test fixtures.
- **Affected Files:** `src-tauri/src/tests/security_tests.rs`, `src-tauri/src/commands/file.rs`, `src-tauri/src/lib.rs`.

#### Issue ID: R-10 (M-03, L-04)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — M-03, L-04
- **Severity:** MEDIUM
- **Description:** Pervasive `any` at worker RPC boundary (`DIALOG_RESPONSE`, `evaluateFormula`), `actionStore.ts`, and formula parser. Duplicated `SandboxAPI` definitions.
- **Root Cause:** Loose typing across async message-passing boundaries.
- **Affected Files:** `src/services/actionWorker.ts`, `src/services/actionSandbox.ts`, `src/services/sandboxApiFactory.ts` (new).

#### Issue ID: R-11 (M-04)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — M-04
- **Severity:** MEDIUM
- **Description:** Test-harness escape hatch `window.__CONTEXTPAD_DEMO__` persists in production store (`tabStore.ts:81`).
- **Root Cause:** Test state injected via ambient window global rather than dependency injection.
- **Affected Files:** `src/store/tabStore.ts`, `src/adapters/runtimeBridge.tsx`, `e2e/fixtures.ts`.

#### Issue ID: R-12 (M-05, L-02, L-03)
- **Source:** `raw_findings_full_codebase_2026-09-28.md` — M-05, L-02, L-03
- **Severity:** LOW
- **Description:** Mojibake replacement characters in files; `Math.random()` used for dialog request correlation; `formatJSON` swallows syntax errors without feedback.
- **Root Cause:** Double-encoded UTF-8 strings; non-crypto RNG; missing toast dispatch.
- **Affected Files:** `src/services/actionWorker.ts`, `src/services/actionSandbox.ts`, `generated-documents/context/living_context.md`.

---

## ━━━ IMPACT & REGRESSION ASSESSMENT ━━━

| Issue ID | What breaks if NOT fixed? | Regression Risk of Fixing | Touches IPC or Contracts? | Human Decision Required? |
|:---|:---|:---:|:---:|:---:|
| **R-01** | All user actions throw `EvalError` in production desktop builds | **MEDIUM** (Must keep actions working) | No (CSP/Worker only) | **YES (Option A vs B)** |
| **R-02** | Actions can climb prototype constructors to access `globalThis` | **LOW** (Preserves `api.*` matrix) | No | **NO** |
| **R-03** | Malicious markdown can render full-screen clickjacking overlays | **LOW** (Preserves math formatting) | No | **NO** |
| **R-04** | Audit process integrity compromised | **NONE** | No | **NO** |
| **R-05** | Any webview can execute devtools/commands; global Tauri API leak | **LOW** (Internal app uses `@tauri-apps/api`) | Yes (`Cargo.toml`, `tauri.conf.json`) | **NO** |
| **R-06** | Platform leak scanner remains ineffective; mobile coupling in desktop | **LOW** (Preserves mobile bridge contract) | No | **NO** |
| **R-07** | LCD mock quarantine claim remains false; web adapter imports `mocks/` | **LOW** (Presets moved to constants) | No | **NO** |
| **R-08** | Worker isolation & CSP remain untested in E2E | **LOW** (Test suite only) | No | **NO** |
| **R-09** | Security tests test fixtures rather than production code | **LOW** (Rust tests only) | No | **NO** |
| **R-10** | Type safety gap and drift between worker and host APIs | **LOW** (Strict typing refactor) | No | **NO** |
| **R-11** | Test flag leaks into production window scope | **LOW** (DI seam exists) | No | **NO** |
| **R-12** | Dialog ID collisions under high concurrency; silent JSON errors | **LOW** | No | **NO** |

---

## ━━━ DETAILED STEP-BY-STEP REFACTOR PLAN ━━━

### Step 1: Action Execution & Sandbox Realm Isolation (R-01, R-02, R-10, R-12)
1. **Unify `SandboxAPI` Factory ([sandboxApiFactory.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/services/sandboxApiFactory.ts)):**
   - Create a single shared factory producing the complete 24-member `SandboxAPI` with strongly-typed interfaces.
   - Replace `Math.random()` with `crypto.randomUUID()` for dialog correlation IDs.
   - In `formatJSON`, dispatch a toast notification or return descriptive feedback if parsing fails.
2. **Dedicated Worker Realm Hardening ([actionWorker.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/services/actionWorker.ts)):**
   - Guard entry with `typeof DedicatedWorkerGlobalScope !== 'undefined' && self instanceof DedicatedWorkerGlobalScope`.
   - Strip ambient capabilities from worker global: delete or freeze `self.fetch`, `self.XMLHttpRequest`, `self.WebSocket`, `self.importScripts`.
   - Freeze `Object.prototype`, `Function.prototype`, and constructor accessors within the worker context to block prototype climbing.
3. **Execution Strategy & CSP Alignment (Option A):**
   - In `src-tauri/tauri.conf.json`: Set CSP to:
     `"default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: asset: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ipc: http://ipc.localhost http://localhost:* ws://localhost:*; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"`
   - Document TR-003 re-affirmation in `living_context.md`: Actions run exclusively in an off-thread dedicated Web Worker with ambient APIs stripped, where `'unsafe-eval'` enables compilation of user-authored automation scripts without exposing main DOM chrome or Tauri IPC.
4. **AST Pre-Execution Scanner ([actionSandbox.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/services/actionSandbox.ts)):**
   - Retain the regex/AST forbidden token scanner checking for constructor access, `__proto__`, `prototype`, `import`, `Function`, `globalThis`, and `window`.

### Step 2: HTML Sanitization & KaTeX Layout Tokenization (R-03)
1. **Nonce-Based Math Token Allowlist ([tableParser.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/services/tableParser.ts), [domHelper.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/adapters/domHelper.ts)):**
   - In `tableParser.ts`, rendered KaTeX spans are assigned a cryptographically generated or unforgeable internal data attribute: `data-cntxt-math="<uuid>"`.
   - In `domHelper.ts:sanitizePreviewHtml`:
     - Inspect `style` attributes only on elements bearing the valid `data-cntxt-math` attribute.
     - For all other arbitrary user elements, strip `position`, `z-index`, `top`, `bottom`, `left`, `right` completely, irrespective of any class name (including `.katex` or `.cm-table-math`).
     - Remove `data-cntxt-math` after verification.
   - Inspect SVG attributes to strip `xlink:href="javascript:..."`.
   - Unify non-DOM fallback sanitization to enforce identical style and protocol stripping rules.

### Step 3: Native IPC & Security Configurations (R-05, R-06, R-07, R-09)
1. **Disable Global Tauri & Scope Devtools:**
   - In `src-tauri/tauri.conf.json`, set `"withGlobalTauri": false`.
   - In `src-tauri/Cargo.toml`, feature-gate `"devtools"` under `[features]` so release builds do not link devtools binaries.
2. **Decouple Mobile Adapter ([mobileAndroidAdapter.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/adapters/mobileAndroidAdapter.ts)):**
   - Extract `AndroidBridge` interactions out of `tauriRuntimeAdapter.ts` into a dedicated mobile adapter.
   - Update `scripts/check-platform-leaks.mjs` to remove the broad `src/adapters` wildcard, scoping exclusions strictly to platform adapter boundary files.
3. **Move Default Presets to Production Constants ([defaultPresets.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/constants/defaultPresets.ts)):**
   - Move `DEFAULT_ACTIONS` and `DEFAULT_TEMPLATES` out of `mocks/index.ts` into `src/constants/defaultPresets.ts`.
   - Remove dynamic `import('../../mocks/index')` from `browserRuntimeAdapter.ts`. Production codebase achieves genuine 0 imports from `mocks/`.
4. **Fix Rust Security Tests ([security_tests.rs](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src-tauri/src/tests/security_tests.rs)):**
   - Update `test_url_forbidden_characters` to call production `commands::validate_url` (or equivalent URL helper).
   - Add unit test exercising `commands::file::validate_path` against system roots and path traversal attacks.

### Step 4: Verification, E2E Testing & Living Documentation (R-08, R-11, R-12)
1. **Add Worker Realm E2E Spec ([actionSandboxRealm.spec.ts](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/e2e/actionSandboxRealm.spec.ts)):**
   - Add Playwright tests verifying that actions execute successfully, receive document context, apply text mutations, and run in a separate Web Worker thread.
2. **Clean Test Hooks:**
   - Migrate `__CONTEXTPAD_DEMO__` in `tabStore.ts` to dependency-injected bridge options.
3. **Save All Documents in UTF-8 without BOM:**
   - Ensure clean encoding across `living_context.md`, `index.html`, and Rust source files.

---

## ━━━ EXECUTION ORDER ━━━

1. **Step 1: Default Presets Extraction (R-07)** — Decouple `mocks/` completely; unblocks clean mock quarantine.
2. **Step 2: Shared Sandbox Factory & Typing (R-10, R-12)** — Build single source of truth for `SandboxAPI` and worker message types.
3. **Step 3: Worker Realm Hardening & CSP Option A (R-01, R-02)** — Resolve production action execution and worker isolation.
4. **Step 4: HTML & KaTeX Sanitizer Tokenization (R-03)** — Secure preview DOM against UI-redressing while preserving math layout.
5. **Step 5: Native IPC & Cargo Configuration (R-05, R-06, R-09)** — Set `withGlobalTauri: false`, gate devtools, decouple Android bridge, fix Rust tests.
6. **Step 6: E2E Realm Spec & Clean Demo DI (R-08, R-11)** — Add `e2e/actionSandboxRealm.spec.ts` and clean store globals.
7. **Step 7: Verification & Audit Handshake (R-04)** — Run all 5 gates (`npm run lint`, `npm test`, `npm run test:e2e`, `cargo test`, `npm run build`), produce clean commit, and request Pass 1 audit.

---

## ━━━ BACKUP REMINDER ━━━

Prior to executing any code edits for this refactor plan, a git checkpoint and backup commit will be created. The plan must first be reviewed and approved.
