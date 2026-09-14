# LIVING CONTEXT DOCUMENT
Version: v1.7
Last Updated: 2026-09-14
Last Updated By: Production Implementation Agent (Pass 2 Plan Audit Reconciliation & Tradeoff Alignment)
Project: CNTXT (ContextPad)
Target Platform(s): Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Web Prototype + Mobile (Android via Tauri v2 Mobile runtime; future iOS expansion)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Rust (Tauri v2)

━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [x] Feature Implementation (FG-02 & FG-03 Re-architecture, Document Embed System, & Mobile Specification)
  [ ] Refactor
  [ ] Testing
  [ ] Sync-Back

Current Feature Group: FG-02 & FG-03: Action Execution, Extensible Formulas & In-Doc Automation
Active Plan: /generated-documents/plans/feature_group_fg04_native_file_ops_2026-09-13.md
Last Git Checkpoint: 2026-09-14 — Prod Agent Full Codebase Audit reconciled, Option B contract sync verified, 112/112 automated tests passing across 13 test suites; 0 platform leaks across 113 files

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