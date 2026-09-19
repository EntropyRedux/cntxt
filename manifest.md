# ContextPad Component Manifest

- **Project:** CNTXT (ContextPad) — Modular Frontend UI Development Platform
- **Version:** 0.2.1
- **Generated:** 2026-09-19
- **Specification:** Solo Dev AI-Assisted Workflow Stage 2/3 Handoff Manifest

---

## 1. Architecture & Global Invariants

All visual presenter components are 100% pure UI driven strictly by typed props and headless store hooks (`useRuntimeBridge`, `useTabStore`, `useSettingsStore`, `useRibbonStore`). Zero direct native IPC calls (`invoke()`), un-quarantined browser globals, or unhandled persistence promises exist in visual layers.

### Background Processes & Gating
All background processes (live token estimation, autosave loop, live markdown sync) are strictly gated under **Settings -> Experimental** and disabled or throttled by default:
- Autosave Interval: Configured in `useSettingsStore` (`settings.autosaveInterval`, default: 30000ms).
- Live Token Estimation: Configured in `TokenAnalytics.tsx` and `TokenEstimator.ts`.
- Experimental Settings Visibility: Controlled by `settings.enableExperimentalSettings` (default: `false`).

### E2E Verification (FG-05)
- Playwright 1.63.0 suite (`npm run test:e2e`): 21 Chromium tests green across 5 spec files (`e2e/editor`, `e2e/empty-state`, `e2e/preview`, `e2e/ribbon`, `e2e/slash-menu`), driven by `e2e/fixtures.ts` demo-mode bootstrap (`window.__CONTEXTPAD_DEMO__`).
- Unit suite: 127 Vitest tests across 14 suites (`npm test`). Playwright artifacts gitignored.

---

## 2. Component Directory & Contracts

### Shell & Core Layout
| Component | Location | Props Contract | Theme Tokens Used | Mock Data Used | Background Processes | Test Contract | Port Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ClassicShell` | `src/shell/ClassicShell.tsx` | Pure shell presenter | `--bg-main`, `--card-bg`, `--card-border`, `--text-primary` | `mocks/index.ts` (demo mode only) | Keyboard shortcuts listener | `tests/shell.contract.md` | PORT AS-IS |
| `ShellEditorContainer` | `src/shell/ShellEditorContainer.tsx` | Editor/preview pane container | `--bg-main`, `--card-border` | None | Tab synchronization | `tests/editor.contract.md` | PORT AS-IS |
| `ErrorBoundary` | `src/components/Common/ErrorBoundary.tsx` | `{ children, regionName, fallbackClassName }` | `--card-bg`, `--card-border`, `--status-error`, `--text-primary` | None | None | `tests/errorBoundary.contract.md` | PORT AS-IS |

### Navigation & Command Controls
| Component | Location | Props Contract | Theme Tokens Used | Mock Data Used | Background Processes | Test Contract | Port Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `TitleBar` | `src/components/TitleBar/TitleBar.tsx` | Window header & controls | `--bg-main`, `--card-border`, `--text-primary` | None | Native window status | `tests/titleBar.contract.md` | PORT AS-IS |
| `MenuBar` | `src/components/MenuBar/MenuBar.tsx` | Application menu | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/menuBar.contract.md` | PORT AS-IS |
| `ModularRibbon` | `src/components/Ribbon/ModularRibbon.tsx` | Formatting ribbon | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None (static tool config TR-002) | None | `tests/ribbon.contract.md` | PORT AS-IS |
| `MobileAccessoryBar` | `src/components/Mobile/MobileAccessoryBar.tsx` | Touch/mobile accessory bar | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/mobileBar.contract.md` | PORT AS-IS |

### Editor & Content Views
| Component | Location | Props Contract | Theme Tokens Used | Mock Data Used | Background Processes | Test Contract | Port Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Editor` | `src/components/Editor/Editor.tsx` | `{ tabId, content, onChange, onCursorChange }` | CodeMirror Theme Tokens (`theme/index.ts`) | None | Autosave timer | `tests/editor.contract.md` | PORT AS-IS |
| `FloatingSearch` | `src/components/Editor/FloatingSearch.tsx` | In-editor floating search & replace | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/findReplace.test.ts` | PORT AS-IS |
| `LivePreview` | `src/components/Preview/LivePreview.tsx` | `{ content, isVisible }` | `--bg-main`, `--text-primary`, `--card-bg`, `--card-border` | None | Mermaid / KaTeX render cache | `tests/livePreview.contract.md` | PORT AS-IS |

### Sidebar Panels & Utilities
| Component | Location | Props Contract | Theme Tokens Used | Mock Data Used | Background Processes | Test Contract | Port Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Sidebar` | `src/components/Sidebar/Sidebar.tsx` | Collapsible side panel | `--card-bg`, `--card-border`, `--text-primary` | None | None | `tests/sidebar.contract.md` | PORT AS-IS |
| `FileExplorer` | `src/components/Sidebar/FileExplorer.tsx` | Workspace file tree & pinned files | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | `DEFAULT_PINNED_ITEMS`, `DEFAULT_OPENED_HISTORY` (demo only) | Native directory scan | `tests/fileExplorer.contract.md` | PORT AS-IS |
| `OutlinePanel` | `src/components/Sidebar/OutlinePanel.tsx` | Markdown heading tree | `--card-bg`, `--card-border`, `--text-primary` | None | AST parsing on tab switch | `tests/outline.contract.md` | PORT AS-IS |
| `ActionManager` | `src/components/Sidebar/ActionManager.tsx` | Sandboxed script & formula manager | `--card-bg`, `--card-border`, `--text-primary`, `--status-error` | None | Sandbox execution | `tests/actionSandbox.contract.md` | PORT AS-IS |
| `TemplateManager` | `src/components/Sidebar/TemplateManager.tsx` | Reusable template snippets | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/template.contract.md` | PORT AS-IS |
| `WorkflowManager` | `src/components/Sidebar/WorkflowManager.tsx` | Multi-step workflows | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | Sequential execution | `tests/workflow.contract.md` | PORT AS-IS |
| `TokenAnalytics` | `src/components/Sidebar/TokenAnalytics.tsx` | Live LLM token estimation | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | Token estimator loop | `tests/tokenEstimator.contract.md` | PORT AS-IS |
| `FormulaPlayground` | `src/components/Sidebar/FormulaPlayground.tsx` | Excel-style math formulas | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | Formula evaluation engine | `tests/formulaParser.contract.md` | PORT AS-IS |
| `SettingsPanel` | `src/components/Sidebar/SettingsPanel.tsx` | App settings & experimental toggles | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/settings.contract.md` | PORT AS-IS |

### Modals & Dialogs
| Component | Location | Props Contract | Theme Tokens Used | Mock Data Used | Background Processes | Test Contract | Port Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ActionEditorModal` | `src/components/Modals/ActionEditorModal.tsx` | `{ isOpen, onClose, actionId }` | `--card-bg`, `--card-border`, `--status-error`, `--text-primary` | None | Sandbox test runner | `tests/actionEditor.contract.md` | PORT AS-IS |
| `TemplateVariableModal`| `src/components/Modals/TemplateVariableModal.tsx` | Template variable filler | `--card-bg`, `--card-border`, `--text-primary`, `--accent-primary` | None | None | `tests/templateVariables.test.ts` | PORT AS-IS |
| `RibbonCustomizerModal`| `src/components/Modals/RibbonCustomizerModal.tsx` | `{ isOpen, onClose }` | `--card-bg`, `--card-border`, `--text-primary` | None | None | `tests/ribbonCustomizer.contract.md` | PORT AS-IS |
| `FormattingCustomizerModal` | `src/components/Modals/FormattingCustomizerModal.tsx` | `{ isOpen, onClose }` | `--card-bg`, `--card-border`, `--text-primary` | None | None | `tests/formattingCustomizer.contract.md` | PORT AS-IS |

---

## 3. Mock Quarantine Status

All mocks are physically quarantined in `mocks/index.ts`:
- `MOCK-001` (`SAMPLE_MARKDOWN_DOCS`): Demo only
- `MOCK-002` (`SAMPLE_TEMPLATES`): Demo only
- `MOCK-003` (`SAMPLE_ACTIONS`): Demo only
- `MOCK-004` (`SAMPLE_WORKFLOWS`): Demo only
- `MOCK-005` (`SAMPLE_FILE_TREE`): Demo only
- `MOCK-006` (`DEFAULT_PINNED_ITEMS`): Demo only (quarantined under Fix R-002)
- `MOCK-007` (`DEFAULT_OPENED_HISTORY`): Demo only (quarantined under Fix R-002)
- `MockRuntimeAdapter`: Moved to `mocks/mockRuntimeAdapter.ts` (Fix R-003)
