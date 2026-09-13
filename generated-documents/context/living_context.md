# LIVING CONTEXT DOCUMENT
Version: v1.2
Last Updated: 2026-09-13
Last Updated By: Antigravity Assistant (Refactor Execution Complete)
Project: CNTXT (ContextPad)
Target Platform(s): Desktop (Windows / macOS / Linux via Tauri v2 + Rust) & Web Prototype
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Rust (Tauri v2)

━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [ ] Feature Implementation
  [x] Refactor
  [ ] Testing
  [ ] Sync-Back

Current Feature Group: FG-01: Core Workspace Shell & Document Tab Lifecycle
Active Plan: /generated-documents/plans/refactor_plan_port_remediation_2026-09-13.md (Prompt 18 Reconciled v1.1)
Last Git Checkpoint: 2026-09-13 — Batch 3 Hardening Committed (58a19b9)

━━━ PROJECT BRIEF REFERENCE ━━━
Brief Version: v1.0
Brief Location: /generated-documents/context/project_brief_v1.0.md
Last Brief Update: 2026-09-13
Reason for last update: Initial project onboarding

━━━ CANONICAL DATA SHAPES ━━━
Location: /generated-documents/context/contracts/data_shapes.ts
Last Updated: 2026-09-13
Active Shapes:
- Tab, DocumentContent, PinnedTab, TabType, SupportedLanguage
- ViewSettings, EditorSettings, FormattingSettings, AutocompleteConfig, CodeLintConfig, SpellCheckConfig
- AIModel, TokenEstimate, TokenEstimatorConfig
- Action, ActionCategory, ActionExecutionContext, SandboxAPI
- Template, TemplateVariable
- VirtualFile, VirtualFileTree
- PinnedItem, OpenedFileRecord
- NotificationItem, NotificationType

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
Status: remediated
Background Processes:
- Live Token Estimator: gated in Settings -> Experimental (`enableLiveTokenEstimator`) [x]
- Document Autosave: gated in Settings -> Experimental (`enableAutosave`) [x]
- Live Markdown DOM-Sync: gated in Settings -> Experimental (`enableLiveDomSync`) [x]
Unit Tests (Prompt 14b): written [x] passing [x]
Last Audit Reconciliation: 2026-09-13 — APPROVED (Reconciled Plan v1.1)
Git Checkpoint: Batch 1 (000eee7), Batch 2 (1d94c7e), Batch 3 (58a19b9)
Notes: All 14 defects from Reconciled Port Audit fully remediated across Batches 1-4. 21 automated unit tests passing. Presenter purity enforced with zero platform leaks.

Feature Group: FG-02: Sandboxed JavaScript Actions
Status: remediated (hardening complete)
Background Processes: none
Unit Tests (Prompt 14b): written [x] passing [x]
Last Audit Reconciliation: 2026-09-13
Notes: Action sandbox hardened with regex constructor/eval scanner, shadowed globals, and frozen safeApi (R-008). 6 unit tests passing.

Feature Group: FG-03: Prompt Engineering Templates & Dynamic Formulas
Status: remediated
Background Processes: none
Unit Tests (Prompt 14b): written [x] passing [x]
Last Audit Reconciliation: 2026-09-13
Notes: FormulaEngine verified with arithmetic, math aggregations, string ops, and document metrics (R-014). 6 unit tests passing.

Feature Group: FG-04: Native File System & Workspace Explorer
Status: remediated
Background Processes: File watcher (toggle required in Settings -> Experimental)
Unit Tests (Prompt 14b): written [x] passing [x]
Last Audit Reconciliation: 2026-09-13
Notes: Native file commands secured with canonicalization and system root whitelisting (R-009). Shell injection eliminated in open_external using open = "5.3" crate (R-010). Runtime token and origin scoping enforced (R-012).
Last Audit Reconciliation: none

━━━ ARCHITECTURAL DECISIONS LOG ━━━

Decision: Decoupled Runtime Bridge Architecture (`IRuntimeBridge`)
Reasoning: Visual presenters in `src/components/` and `src/shell/` interact with platform capabilities exclusively through `useRuntimeBridge()`. In the web prototype, `BrowserRuntimeAdapter` provides Web APIs; in desktop production, `TauriRuntimeAdapter` invokes Tauri v2 plugins (`plugin:fs`, `plugin:dialog`, `plugin:clipboard`, `plugin:store`, `plugin:window`).
Alternatives considered: Direct `invoke()` in components (Rejected: violates Universal Presenter Purity).

Decision: Settings -> Experimental Gating for Background Processes
Reasoning: Background workers (live token estimation, autosave loop, live markdown sync) must not clutter main visual canvases or run uncontrollably. They reside in `SettingsPanel.tsx` and are hidden by default unless `enableExperimentalSettings` is explicitly enabled.

Decision: Physical Mock Quarantine via `mocks/index.ts`
Reasoning: All synthetic sample data is strictly isolated in `mocks/index.ts`. All stores (`tabStore`, `actionStore`, `templateStore`) and `FileExplorer` initialize with clean empty states (`[]`, `''`) and only inject mocks when `IS_PROTOTYPE_DEMO_MODE` is active.

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
Finding Source: PA-3.3
Pillar: Pillar 1 (Mock Quarantine)
Decision: `DEFAULT_RIBBON_ITEMS` in `src/store/ribbonStore.ts` classified as static system tool configuration, not mock data.
Reasoning: Formatting ribbon items (Bold, Italic, Code, Headings, Tables) are static engine command definitions, not synthetic user state. They serve as the default factory layout when user preferences are reset.
Status: APPROVED TRADEOFF

Tradeoff ID: TR-003
Date: 2026-09-13
Finding Source: Audit Condition 1 & 4 (R-008 / R-011 conflict)
Pillar: Pillar 8 (Deep Security)
Decision: Retain `'unsafe-eval'` in CSP strictly for `new Function` action sandbox during post-port remediation; prune dead external API origins (`generativelanguage.googleapis.com`, `api.anthropic.com`).
Reasoning: Removing `'unsafe-eval'` immediately breaks `new Function` sandbox execution. Full realm worker isolation (detached Web Worker with message passing) is scheduled for Feature Group FG-02 (Sandboxed JavaScript Actions).
Status: APPROVED TRADEOFF