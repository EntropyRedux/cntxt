# LIVING CONTEXT DOCUMENT
Version: v1.14
Last Updated: 2026-09-19
Last Updated By: Production Implementation Agent (Dev Launch Optimization & Form Accessibility Hardening)
Project: CNTXT (ContextPad)
Target Platform(s): Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Web Prototype + Mobile (Android via Tauri v2 Mobile runtime; future iOS expansion)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Rust (Tauri v2)

━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [ ] Feature Implementation (FG-01..FG-05 Complete)
  [x] Refactor (Dev Launch Optimization & Form Accessibility Hardening Complete)
  [x] Testing (Vitest 126/126 Live, Playwright 21/21 E2E Live)
  [ ] Sync-Back

Current Feature Group: REMED-01: Full Codebase Audit Remediation & Performance Hardening
Active Plan: /generated-documents/plans/refactor_plan_dev_launch_optimization_2026-09-19.md
Last Audit Reconciliation: 2026-09-18 — PASS (Post-Refactor PERF-1 Closeout Audit: raw_findings_post_refactor_perf1_closeout_2026-09-18.md, 0 valid defects, TR-DEV-1 approved)
Last Git Checkpoint: 2026-09-18 — E2E Test Suite Stability & Action Widget Boundary (commit facd2e4)

━━━ PROJECT BRIEF REFERENCE ━━━
Brief Version: v1.1
Brief Location: /generated-documents/context/project_brief_v1.1.md
Last Brief Update: 2026-09-14
Reason for last update: Formalized Mobile (Android) target platform, touch ergonomics, and Storage Access Framework context

━━━ CANONICAL DATA SHAPES ━━━
Location: /contracts/data_shapes.ts & /generated-documents/context/contracts/data_shapes.ts (Option B Polyglot Mirror Synchronized)
Last Updated: 2026-09-14
Sync Guard: Verified via scripts/check-contract-sync.mjs (100% byte-identical)
Active Shapes:
- Tab, DocumentContent, PinnedTab, TabType, SupportedLanguage
- ViewSettings, EditorSettings, FormattingSettings, AutocompleteConfig, CodeLintConfig, SpellCheckConfig
- AIModel, TokenEstimate, TokenEstimatorConfig
- Action, ActionCategory, ActionSelectionBehavior ('auto' | 'replace' | 'insert'), PersistedActionUIState, ActionExecutionContext, SandboxAPI (with wrapSelection, replaceSelection, evaluateFormula)
- Template, TemplateVariable, PersistedTemplateUIState
- VirtualFile, VirtualFileTree
- PinnedItem, OpenedFileRecord
- NotificationItem, NotificationType
- MarkdownFormatButton, RibbonItem, FormulaResult, EditorContext
- SupportedPlatformOS ('windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web'), DeviceProfile

━━━ MOCK REGISTRY (PHYSICALLY QUARANTINED) ━━━
[All active mocks reside strictly in mocks/index.ts. In native production mode, collections initialize empty [].]

Mock ID | Physical Location | Type | Real Replacement Target | Feature Group | Status
--------|-------------------|------|------------------------|---------------|-------
MOCK-001 | mocks/index.ts (WELCOME_DOCUMENT) | MOCK | Native File System (initial user workspace document) | FG-01: Document Tabs | active (demo mode)
MOCK-002 | mocks/index.ts (DEFAULT_ACTIONS) | MOCK | Native Action Registry & Persistent Store (`plugin:store`) | FG-02: Sandboxed Actions | active (demo mode)
MOCK-003 | mocks/index.ts (DEFAULT_TEMPLATES) | MOCK | Native Template Registry & Filesystem (`templates/`) | FG-03: Templates | active (demo mode)
MOCK-004 | mocks/index.ts (DEFAULT_PINNED_TABS) | MOCK | Native Pinned Tab Store (`plugin:store`) | FG-01: Document Tabs | active (demo mode)
MOCK-005 | mocks/index.ts (INITIAL_PROJECT_FILES) | MOCK | Native Workspace Directory Tree (`plugin:fs`) | FG-04: Workspace Explorer | active (demo mode)
MOCK-006 | mocks/index.ts (DEFAULT_PINNED_ITEMS) | MOCK | Native Pinned Files Store (`plugin:store`) | FG-04: Workspace Explorer | active (demo mode) / quarantined
MOCK-007 | mocks/index.ts (DEFAULT_OPENED_HISTORY) | MOCK | Native File History Store (`plugin:store`) | FG-04: Workspace Explorer | active (demo mode) / quarantined

━━━ FEATURE GROUP STATUS ━━━

Feature Group: FG-01: Core Workspace Shell & Document Tab Lifecycle
Status: completed / verified
Background Processes:
- Live Token Estimator: gated in Settings -> Experimental (`enableLiveTokenEstimator`) [x]
- Document Autosave: gated in Settings -> Experimental (`enableAutosave`) [x]
- Live Markdown DOM-Sync: gated in Settings -> Experimental (`enableLiveDomSync`) [x]
Unit Tests: 21 tests passing across tabStore, tokenEstimator, fileOps
Last Audit Reconciliation: 2026-09-13 — APPROVED (Reconciled Plan v1.1)

Feature Group: FG-02: Sandboxed JavaScript Actions & In-Document Widgets
Status: completed / verified
Background Processes: none
Unit Tests: written [x] passing [x] (29 tests across actionButtons, actionSandbox, actionStoreAndCompletion)
Notes:
- Interactive in-document button syntax `[[action:id]]` and `[[action:id|Label]]` rendered as native interactive widget badges inside CodeMirror documents.
- Standalone headless execution service (`actionExecutor.ts`) coordinates execution across CodeMirror `EditorView`, active document tabs, formula evaluation, and JavaScript sandbox.
- Tri-state Selection Behavior (`selectionBehavior: 'auto' | 'replace' | 'insert'`) allows users to explicitly configure whether executing an action replaces highlighted text or inserts adjacent without deleting.
- Hardened sandbox with safe execution API (`api.wrapSelection`, `api.replaceSelection`, `api.insertAtCursor`, `api.evaluateFormula`, `api.toast`).

Feature Group: FG-03: Prompt Engineering Templates & Dynamic Formulas
Status: completed / verified
Background Processes: none
Unit Tests: written [x] passing [x] (36 tests across formulaParser, templateVariables, findReplace)
Notes:
- `FormulaEngine` made extensible via public static `FormulaEngine.registerFunction` and instance `registerFunction` registries with catalog integration.
- 50+ built-in formula functions across 7 categories (Text, Markdown, Wrap, Lines, Math, DateTime, Context).
- Dedicated formula flow directives `INSERT(expr)` and `REPLACE_SELECTION(expr)` for formula-level text retention/replacement control.
- Interactive Template Variable Extraction & Variable Filler modal (`templateVariableService.ts`).
- Floating in-editor Search & Replace widget (`FloatingSearch.tsx`) supporting case, word, and regex search.
- Dynamic Mermaid theming engine (`mermaidRenderer.ts`) reacting to active theme changes.

Feature Group: FG-04: Native File System & Workspace Explorer
Status: remediated / verified
Background Processes: none (event-driven file tree refresh)
Unit Tests: written [x] passing [x] (6 tests in fileOps)
Notes: Native file commands secured with canonicalization and system root whitelisting (R-009). Shell injection eliminated in open_external using open = "5.3" crate (R-010). Runtime token and origin scoping enforced (R-012).

Feature Group: FG-05: Playwright E2E Test Suite
Status: completed / verified (2026-09-15)
Background Processes: none (test-time vite dev server via playwright webServer)
E2E Tests: 21/21 green in headless Chromium via `npm run test:e2e` (0 flaky, 0 failures; defect F-08 resolved)
Unit Tests: verified 126/126 across 14 suites (0 regressions)
Spec Files: editor (5), empty-state (3), preview (4), ribbon (5), slash-menu (3), fixtures (demo-mode bootstrap)
Notes:
- Playwright 1.63.0; single worker; `baseURL http://localhost:5173`; repo root `playwright.config.ts` + `npm run test:e2e` script. Test timeout hardened to 60s with 15s expect timeout.
- Playwright artifacts (`playwright-report/`, `test-results/`) gitignored.
- Demo mode toggled via `e2e/fixtures.ts` using `window.__CONTEXTPAD_DEMO__` (mirrors `mocks/index.ts` quarantine gate).
- Defect F-08 RESOLVED (2026-09-18): liveMarkdown cursor-boundary condition rectified to `r.head > start && r.head < end`, enabling immediate ActionButtonWidget rendering on token completion while preserving syntax-editing capability when cursor is placed inside brackets.

━━━ ARCHITECTURAL DECISIONS LOG ━━━

Decision: Decoupled Runtime Bridge Architecture (`IRuntimeBridge`)
Reasoning: Visual presenters in `src/components/` and `src/shell/` interact with platform capabilities exclusively through `useRuntimeBridge()`. In the web prototype, `BrowserRuntimeAdapter` provides Web APIs; in desktop production, `TauriRuntimeAdapter` invokes Tauri v2 plugins (`plugin:fs`, `plugin:dialog`, `plugin:clipboard`, `plugin:store`, `plugin:window`).
Alternatives considered: Direct `invoke()` in components (Rejected: violates Universal Presenter Purity).

Decision: Tri-State Selection Transformation Framework (`'auto' | 'replace' | 'insert'`)
Reasoning: Users need to use actions either as in-place text transformers (e.g. UPPER, BOLD, SORT) or as annotators/insertions (e.g. TODAY, metadata tags, templates) without losing their highlighted context. The tri-state system allows:
1. `auto`: Infers intention based on whether the formula references `selection` or is a formatting transform.
2. `replace`: Explicitly forces the highlighted text to be replaced with the action result.
3. `insert`: Guarantees the highlighted text is NEVER deleted; inserts the result at the end of the selection.
This is supported across the UI (modal + sidebar toggle), formula directives (`INSERT(expr)`, `REPLACE_SELECTION(expr)`), and JavaScript APIs (`api.insertAtCursor`, `api.replaceSelection`, `api.wrapSelection`).

Decision: Dynamic Open Plugin Registry for `FormulaEngine`
Reasoning: Built-in formulas cannot anticipate every custom prompt engineering transform or domain computation. Exposing `FormulaEngine.registerFunction(name, handler, metadata)` allows modules, user plugins, and tests to register custom functions that automatically integrate with the lexer/parser AST and appear in the Formula Builder catalog.

Decision: In-Document Action Buttons (`[[action:id]]`) via CodeMirror Decoration Widgets
Reasoning: Prompt engineers and technical writers need executable document buttons directly inside notes (e.g., Run Test, Format Table, Generate Prompt). Using CodeMirror 6 `Decoration.replace` with `WidgetType` allows interactive buttons to be embedded directly in the document flow without modifying raw markdown persistence format.

Decision: Settings -> Experimental Gating for Background Processes
Reasoning: Background workers (live token estimation, autosave loop, live markdown sync) must not clutter main visual canvases or run uncontrollably. They reside in `SettingsPanel.tsx` and are hidden by default unless `enableExperimentalSettings` is explicitly enabled.

Decision: Physical Mock Quarantine via `mocks/index.ts`
Reasoning: All synthetic sample data is strictly isolated in `mocks/index.ts`. All stores (`tabStore`, `actionStore`, `templateStore`) and `FileExplorer` initialize with clean empty states (`[]`, `''`) and only inject mocks when `IS_PROTOTYPE_DEMO_MODE` is active.

Decision: Cross-Platform Expansion: Targeting Android via Tauri v2 Mobile Architecture with Scoped Storage & Virtual Keyboard Ergonomics
Reasoning: Tauri v2 provides first-class native Android compilation (via cargo-ndk and Android Studio scaffolding). By maintaining Universal Presenter Purity (IRuntimeBridge), over 95% of the existing React 19 + TypeScript + Zustand + CodeMirror codebase runs directly in Android System WebView without rewriting the business logic or stores. Mobile touch ergonomics are preserved through MobileAccessoryBar (virtual keyboard Markdown action bar), MobileBottomNav, and touchDensity settings. File system I/O on Android delegates through Tauri's official plugins (@tauri-apps/plugin-fs and @tauri-apps/plugin-dialog) adhering to Android Scoped Storage (SAF content:// URIs). Option B Data Shapes mirroring ensures cross-language domain models remain in strict synchronization.

Decision: Dedicated Tester Agent Role & Tiered Quality Verification Protocol
Reasoning: To prevent production regressions that escape static typing and headless unit tests (such as React Rules of Hooks violations and visual presenter unmounting crashes), test creation and maintenance is delegated to a dedicated Tester Agent role. The Tester role owns unit/contract tests, component lifecycle smoke tests, and Playwright E2E suites. Fast tests run on every feature checkpoint, while long-running, resource-heavy, and physical multiscreen tests are gated behind explicit human approval.


━━━ RECONCILED TRADEOFF HISTORY ━━━

Tradeoff ID: TR-001
Date: 2026-09-13
Finding Source: PA-2.2
Pillar: Pillar 1 (Canonical Data Shapes)
Decision: Retain `| string` union escape hatch on `ActionCategory` (`contracts/data_shapes.ts:181`).
Reasoning: The Action Editor explicitly supports user-defined custom categories (`category: category.trim() || 'Custom'`). Users can assign actions to novel categories not known at compile-time. Strict union typing would break custom category creation.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-002
Date: 2026-09-13
Finding Source: PA-3.3 & FC-1.2
Pillar: Pillar 1 (Mock Quarantine)
Decision: `DEFAULT_RIBBON_ITEMS` in `src/store/ribbonStore.ts` and `PRESET_FORMATTING_BUTTONS` in `src/store/formattingStore.ts` classified as static system tool configuration, not mock data.
Reasoning: Formatting ribbon items and editor formatting buttons (Bold, Italic, Code, Headings, Tables) are static engine command and tool definitions, not synthetic user state. They serve as the default factory layout when user preferences or toolbars are reset.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-003
Date: 2026-09-13
Finding Source: Audit Condition 1 & 4 (R-008 / R-011 conflict)
Pillar: Pillar 8 (Deep Security)
Decision: Retain `'unsafe-eval'` in CSP strictly for `new Function` action sandbox during post-port remediation; prune dead external API origins (`generativelanguage.googleapis.com`, `api.anthropic.com`).
Reasoning: Removing `'unsafe-eval'` immediately breaks `new Function` sandbox execution. Full realm worker isolation (detached Web Worker with message passing) is scheduled for Feature Group FG-02 (Sandboxed JavaScript Actions).
Status: APPROVED TRADEOFF

Tradeoff ID: TR-004
Date: 2026-09-13
Finding Source: F-08 (Pass 1 Completion Audit)
Pillar: Pillar 8 (Deep Security)
Decision: Retain multi-layered regex scanner and frozen safeApi for action sandbox during Port Remediation; schedule full Web Worker realm isolation for FG-02.
Reasoning: Regex pattern scanning and frozen safeApi prevent naive prototype pollutions and global leaks. Full detached Web Worker realm isolation will be engineered during Feature Group FG-02 (Sandboxed Actions).
Status: APPROVED TRADEOFF

Tradeoff ID: TR-005
Date: 2026-09-14
Finding Source: F-14 (Pass 1 Full Codebase Audit)
Pillar: Pillar 5 (Tech Stack & Dependency Fit)
Decision: Main chunk size (2.2 MB) acceptable for v0.1.0 local desktop/mobile embedded application bundle.
Reasoning: Desktop/mobile bundled runtime loads local files with zero internet transfer latency. Dynamic lazy chunking scheduled for later optimization pass.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-006
Date: 2026-09-14
Finding Source: FC-7.2 (Pass 1 Full Codebase Audit)
Pillar: Pillar 7 (Background Processes)
Decision: Background productivity features (autosave, live token estimator, live DOM sync) default ON behind hidden Experimental master toggle.
Reasoning: Standard desktop productivity expectation. Features are debounced without setInterval timers; master toggle in Settings -> Experimental provides full power-user opt-out.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-007
Date: 2026-09-14
Finding Source: FC-6.1 (Pass 1 Full Codebase Audit)
Pillar: Pillar 6 (Scope Creep & Non-Goals)
Decision: `contextpad_replica_ai-studio/` preserved in repository root as reference prototype for AI Studio Sync-Back (Workflow Stage 6 / Prompt 24).
Reasoning: Necessary artifact for sync-back workflow; excluded from build and tsconfig. Added to .gitignore to prevent accidental drift.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-008
Date: 2026-09-14
Finding Source: F-18 (Pass 1 Full Codebase Audit)
Pillar: Pillar 9 (Error Handling)
Decision: `has_api_key` in secrets.rs returns Ok(false) on lookup error.
Reasoning: Prevents settings UI and startup crashes when OS keyring credentials are absent or uninitialized.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-009
Date: 2026-09-14
Finding Source: F-20 (Pass 1 Full Codebase Audit)
Pillar: Pillar 9 (Validation)
Decision: Settings object shallow spread merge without Zod schema validation in settingsStore.ts.
Reasoning: App-owned single-user local storage with predictable default fallback keys.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-010
Date: 2026-09-14
Finding Source: F-2.4 (Pass 1 Refactor Completion Audit)
Pillar: Pillar 8 (Deep Security)
Decision: Tauri CSP connect-src permits http://localhost:5173 and ws://localhost:* in tauri.conf.json.
Reasoning: Required for local desktop development (tauri dev) with Vite dev server and HMR WebSocket, and connects to internal dynamic-port preview server (127.0.0.1:*). Host/Origin validation in preview_server.rs prevents unauthorized cross-origin access.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-012
Date: 2026-09-18
Finding Source: BG-2 (Pass 1 Full Codebase Audit 2026-09-18)
Pillar: Pillar 7 (Background Processes)
Decision: In-editor live markdown decorations (liveMarkdown.ts) are treated as active editor view state (gated by editorMode === 'rendered'), distinct from background DOM syncing to LivePreview (enableLiveDomSync).
Reasoning: Selecting 'rendered' mode is an intentional, foreground presentation choice by the user for active editing, not an autonomous background worker or daemon. Syncing the separate LivePreview pane remains independently gated by enableLiveDomSync in Settings -> Experimental.
Status: APPROVED TRADEOFF

━━━ OPERATIONAL & TROUBLESHOOTING NOTES ━━━

### Native Linker Lock / Build Cache Troubleshooting
If you ever see this linker lock error again during long `npm run tauri dev` sessions (`error: could not compile cntxt (bin "cntxt")` with a stack backtrace):
A quick clean clears any locked cache and resolves binary file locking:
```powershell
cd C:\Projects\LocalActive\Repo\Active\CNTXT\src-tauri
cargo clean
```

### Test Command Conventions
Always run tests using the npm script runner:
```powershell
# From project root C:\Projects\LocalActive\Repo\Active\CNTXT:
npm test          # Run Vitest unit & integration test suites
npm run test:e2e  # Run Playwright end-to-end browser test suites
```
*(Note: Also remember to use `npm test` instead of bare `test` when running test suites in PowerShell, as `test` is not a native PowerShell cmdlet).*
━━━ FULL CODEBASE AUDIT — 2026-09-18 ━━━

Audit Report: /generated-documents/audits/raw_findings_full_codebase_2026-09-18.md
Pass 2 Reconciliation: COMPLETE (appended to same report, Section "PASS 2: PROD AGENT RECONCILIATION & VERDICT")
Verification Audit: /generated-documents/audits/pass2_reconciliation_verification_2026-09-18.md (All R2-1..R2-5 corrections addressed)
Final Verdict: PASS (Upgraded from CONDITIONAL PASS on 2026-09-18)
- 29 findings evaluated:
  - 8 COMPLIANT / CLEARED (PRES-1, LIFECYCLE-1, MOD-1, DEPS-1 [canvas-confetti verified used in VariableFillerModal.tsx], DEPS-2, BG-1, SEC-1, ERR-1)
  - 8 APPROVED TRADEOFF (PERF-3 fonts via LCD Phase A, PERF-8 spawn_blocking storage, PRES-2 ShellFrame container, TYPE-1 adapter/event any, SCOPE-1 productivity defaults via TR-006, BG-2 editor rendered mode via TR-012, SEC-2 new Function via TR-003/004, VAL-1 local storage boundary via TR-009)
  - 1 QUARANTINED MOCK (MOCK-1)
  - 0 UNDOCUMENTED ISSUES (TR-012 formally registered; TR-011 reserved for 09-16 pending F-18)
  - 12 VALID DEFECTS RESOLVED & VERIFIED:
    - `PERF-1` / `MOD-2`: CodeMirror commands decoupled from formattingService via editorRegistry delegation; boot modulepreload eliminated by disabling polyfill helper and removing artificial manual chunk grouping (0 modulepreload links in dist/index.html)
    - `PERF-2`: KaTeX chunk deduplicated into single 261KB asset via resolve.dedupe in vite.config.ts
    - `SCOPE-2` / `MOCK-2`: Dead code pruned (PrototypeShell.tsx, defaultData.ts, unused exports)
    - `PERF-4`: Store initializations concurrently batched via Promise.allSettled in ShellFrame.tsx
    - `PERF-5`: Token estimation debounced by 300ms in StatusBar.tsx
    - `PERF-7`: LivePreview live sync debounced by 250ms with parsing isolation
    - `PERF-6`: LiveMarkdown skips full decoration rebuild on same-line cursor navigation
    - `SEC-3`: Content-Security-Policy meta tag added to index.html (Tauri & Vite dev compatible)
    - `ERR-2`: Observable toast notifications dispatched for dropped image failures and preview render errors
    - `PERF-9`: Converted redundant dynamic imports in actionStore.ts to top-level static imports
- Verification Gates: npm run lint (exit 0) · Vitest 126/126 (14 suites) · cargo check OK · npm run build OK (modulepreload polyfill disabled; 0 modulepreload links in dist/index.html; KaTeX single chunk preserved)

━━━ FULL CODEBASE AUDIT — 2026-09-16 ━━━

Audit Report: /generated-documents/audits/raw_findings_full_codebase_2026-09-16.md
Pass 2 Reconciliation: COMPLETE (same report, PASS 2 section)
Final Verdict: CONDITIONAL PASS
- 27 findings: 17 VALID DEFECT, 4 APPROVED TRADEOFF (F-12 via TR-003/TR-004, F-18 proposed TR-011, F-24, F-26), plus UNDOCUMENTED/deferred (F-08, F-21)
- Remediation backlog R-01..R-21; Priority 1 (CRITICAL) RESOLVED 2026-09-16: R-01 RwLock unwrap (tokio RwLock migration removes poisoning), R-02 std→tokio RwLock (update_content/update_settings now async, callers awaited), R-03 tabSessionCache.ts moved src/services/ → src/adapters/ (human-approved path) + tabStore.ts import/comment updated
- Verification 2026-09-16: npm run lint exit 0 · Vitest 121/121 (14 suites) · npm run build 21.23s · cargo check OK
- Verdict upgraded CONDITIONAL → PASS per reconciliation criteria (Priority 1 cleared + lint exit 0). Priority 2–4 backlog (R-04..R-21) remains tracked as debt.
- Remaining human decisions: TR-011 approval, F-08 fast-track, F-21 memoization scheduling


━━━ PERFORMANCE OPTIMIZATION SESSION — 2026-09-15/16 ━━━

### Context
After completing the FG-01..FG-05 feature groups and E2E suite, a performance pass was initiated to address Lighthouse-reported LCP and CLS scores.

---

### Phase A — LCP/CLS Quick Wins (COMPLETE ✅)

**CLS Fix — Resolved (0.06, Good)**
- Added `contain: layout style` + explicit heights on TitleBar (38px), Ribbon (min-height 0), and StatusBar (24px) via CSS `data-shell-*` attribute selectors in `index.css`.
- Added `data-shell-titlebar`, `data-shell-ribbon`, `data-shell-statusbar` attributes to respective shell components.
- CLS went from reportable to **0.06 (Good)** — 3 remaining micro-shifts are from Sidebar resize handle initialization (acceptable, below threshold).

**LCP — Font Network Requests Eliminated**
- Removed 3 Google Fonts `<link>` tags (2 preconnects + 1 mega-CSS) from `index.html`.
- Installed 9 Fontsource packages (`@fontsource-variable/*` for variable-axis, `@fontsource/*` for static weights) and imported them in `main.tsx`.
- Vite bundles the WOFF2 files into `dist/assets/` — **0 external font network requests** at runtime.

---

### Phase B — Lazy Editor Code-Splitting (COMPLETE ✅)

**What was done:**
- Converted `Editor` and `LivePreview` from static imports to `React.lazy()` + `Suspense` in `ShellEditorContainer.tsx`.
- Created `src/components/Editor/EditorSkeleton.tsx` — pure CSS shimmer placeholder, zero CodeMirror dependencies, renders in first frame.
- Extended `vite.config.ts` `manualChunks` with `mermaid` and `katex` entries.

**Bundle impact:**
- Main entry: **2,268 KB → 810 KB (−64%)**
- `Editor-*.js`: now a separate lazy 100 KB chunk
- `LivePreview-*.js`: now a separate lazy 52 KB chunk
- `mermaid-*.js`: now a separate lazy 737 KB chunk

**Known follow-up:** KaTeX appears as two chunks (261 KB × 2). The `katex/dist/katex.min.css` import in `main.tsx` causes a second KaTeX JS association. Fix: move that CSS import inside the lazy `LivePreview` module.

---

### Phase C — localStorage Tab Cache / IPC Hydration (COMPLETE ✅)

**Root cause discovered:** `storage.getItem()` goes through `invoke('kv_get', ...)` — a Tauri IPC bridge crossing the JS→Rust boundary. With N tabs, this is N+1 async round-trips before any tab can render, blocking the editor mount.

**What was built:**
- `src/services/tabSessionCache.ts` — write-through localStorage cache with djb2 checksum validation. All three functions guard `typeof localStorage === 'undefined'` for clean Vitest/Node.js degradation.
- `tabStore.ts` — reads cache synchronously on init (zero IPC on warm launch); parallelizes the 2 initial IPC calls into `Promise.all`; adds `isHydrating: boolean` state; writes cache on 9 mutation sites (create/close/save/pin/reorder).
- `ShellEditorContainer.tsx` — shows `EditorSkeleton` when `isHydrating: true` and no tab is active (cold-start), so LCP element shifts to shell chrome rather than `div.cm-line`.

**Verified:** `npm test` — **121/121 passing**, zero stderr noise.

---

### CRITICAL FINDING: Dev-Mode Measurement Environment

**All LCP measurements during this session were taken against the Vite dev server (`localhost:5173`), not the production Tauri binary.**

The final Lighthouse breakdown revealed:
```
Time to first byte:    12,691 ms  ← Vite dev-server compilation overhead
Resource load delay:       0 ms
Resource load duration:    0 ms
Element render delay:  2,717 ms
```

The 12.7s TTFB is Vite processing and transforming the module graph on demand — this is inherent to dev-mode and has nothing to do with our optimizations. **All three phases of work are production optimizations** that will show their full impact in `npm run tauri:build` or `npm run build` output, not in `npm run dev`.

**Rule for future performance measurement:** Always profile against `npm run build` + serve, or the compiled Tauri binary. Use `npm run dev` only for functional testing.

---

### Deferred Performance Items (Future Work)

| Item | Effort | Impact |
|:---|:---:|:---:|
| KaTeX CSS import deduplication (move into `LivePreview`) | Small | Removes 261 KB duplicate chunk |
| Tauri `kv_get` batched IPC endpoint (fetch all keys in one call) | Medium | Eliminates cold-start N+1 IPC even without cache |
| Measure LCP against production Tauri build to establish baseline | Small | Confirms actual user-facing improvement |
| Vite `optimizeDeps.include` for faster dev-mode cold start | Small | Reduces dev TTFB from ~13s toward ~2–3s |

---

━━━ REMEDIATION & PERFORMANCE INVESTIGATION — 2026-09-18 ━━━

### 1. TitleBar & Menu Bar Clipping Regression Identified
- **Root Cause**: In `src/index.css`, `header[data-shell-titlebar]` was styled with `height: 38px; overflow: hidden; contain: layout style;` as part of the CLS fix.
- **Consequence**:
  1. Truncated the 2-row `ShellTitleBar` (Row 1 TitleBar 36px + Row 2 MenuBar 28px/34px = 64px–70px total). Row 2 (File, Edit, View, Tools, Help) was clipped and invisible.
  2. Any `absolute top-full` dropdown originating from Row 1 (Theme Picker) or Row 2 (Menus) was clipped at the 38px line by `overflow: hidden`.
  3. Row 1 had `z-index: auto` while Row 2 had `z-40`, causing Row 1's theme dropdown to paint behind Row 2.
- **Remediation**: Adjust `index.css` to allow natural/min-height sizing (64px desktop / 70px touch) and `overflow: visible; contain: none;`. Add stacking context rules (`z-50` for open Row 1 dropdowns) in `ShellTitleBar.tsx`.

### 2. Slow Launch Loading & Form Accessibility Resolved (2026-09-19)
- **Root Causes**:
  1. Vite dev-server on-demand module graph compilation overhead and dependency crawling holding initial `GET /` connection (~18–19s TTFB).
  2. Missing `optimizeDeps.include` in `vite.config.ts` for heavy third-party vendor libraries (`@codemirror/*`, `zustand`, `lucide-react`, `canvas-confetti`, `marked`, `katex`, `@tauri-apps/api/*`).
  3. Form input elements lacking `id` and `name` attributes across sidebar and modal components triggering DevTools accessibility/autofill audit flags.
- **Resolution**:
  1. Configured comprehensive `optimizeDeps.include` and `server.warmup` in `vite.config.ts`.
  2. Measured real-world TTFB drop: initial dev boot TTFB reduced from **19,156 ms to 851.6 ms** (95.5% reduction), with warm navigation responding in **27.8 ms**.
  3. Updated all `<input>` and `<textarea>` elements across `TemplateManager.tsx`, `ActionManager.tsx`, `OutlinePanel.tsx`, `WorkflowManager.tsx`, `FloatingSearch.tsx`, `TabBar.tsx`, `CommandPalette.tsx`, `FontSelectorModal.tsx`, `CategorySelector.tsx`, and `IconPicker.tsx` with explicit semantic `id` and `name` attributes.

### 3. Active Priority 2 Functional Defects Queued
- **F-08**: RESOLVED (2026-09-18). CodeMirror action token cursor-boundary condition rectified in `liveMarkdown.ts` (`r.head > start && r.head < end`); Playwright test timeout increased to 60s in `playwright.config.ts`. All 21/21 E2E tests passing green.
- **F-11**: Tab autosave debounce unflushed on exit (`beforeunload`), and `closeTab()` resurrecting tab content from pending timer.
- **F-05**: FileExplorer active state name collision across directories (`activeFileName === item.name`).
- **F-07**: `enableBracketMatching` setting dead until editor reload (missing `Compartment`).
- **F-04**: React anti-pattern (`safePersist` inside `setFiles` updater in `FileExplorer.tsx`).
- **F-06**: FileExplorer stale infinite loading spinner on missing paths.
- **F-10**: File history store serializing 1.25MB full document content redundantly.