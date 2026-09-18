# REFACTOR & UPDATE PLAN: Full Codebase Audit Remediation & Launch Performance Optimization

- **Project:** CNTXT (ContextPad)
- **Target Plan:** `generated-documents/plans/refactor_plan_full_audit_remediation_2026-09-18.md`
- **Related Audit:** `generated-documents/audits/raw_findings_full_codebase_2026-09-18.md`
- **Verification Audit:** `generated-documents/audits/pass2_reconciliation_verification_2026-09-18.md`
- **Author:** Production Implementation Agent (Prod Agent)
- **Date:** 2026-09-18
- **Revision:** v2.0 (Post-Review Root-Cause Amendments)
- **Mode:** Planning Mode — Awaiting User Approval (Do Not Execute Automatically)

---

## 1. Executive Summary & Root Cause Analysis

Following the Pass 1 Independent Audit and subsequent Pass 2 Reconciliation Verification, the audit verdict is **CONDITIONAL PASS — UPHELD**. 

Before the codebase can receive the formal **PASS** upgrade, this refactor plan resolves the **3 required audit corrections (R2-1, R2-2, R2-3)**, **citation adjustments (R2-4)**, and **remediates all 12 effective Valid Defects** (13 listed minus DEPS-1 reclassified CLEARED) across three prioritized implementation clusters.

### Core Objectives:
1. **Startup Bundle Decoupling (PERF-1, MOD-2)**: Remove the **actual** CodeMirror boot-graph leak: `src/services/editor/formattingService.ts:5` statically imports `{ undo, redo, indentMore, indentLess }` from `@codemirror/commands`, and `formattingService` is statically imported by `ModularRibbon.tsx:11` (boot, via `ClassicShell.tsx:6`) and `MobileAccessoryBar.tsx:11` (boot, via `ShellEditorContainer.tsx:4`). `editorRegistry.ts` is **already** decoupled (`import type { EditorView }`, commands injected via `registerCommands`, called at `Editor.tsx:256`). Decoupling `formattingService.ts` ensures `React.lazy` on `Editor.tsx` functions as designed.
2. **KaTeX Chunk Deduplication (PERF-2)**: Two separate KaTeX module instances exist (`node_modules/katex` v0.18.7 and **`node_modules/mermaid/node_modules/katex` v0.16.47**, mermaid's nested copy) — this is why two ~261 KB katex chunks are emitted despite the existing function-form `manualChunks` matcher (`vite.config.ts:28-38` already catches `node_modules/katex`). Fix via `resolve.dedupe: ['katex']` so both graphs resolve to the single top-level instance.
3. **Runtime Responsiveness & Debouncing (PERF-5, PERF-6, PERF-7)**:
   - Connect the dead `scheduleEstimate` debounce (300ms) in `StatusBar.tsx` to stop synchronous regex scans of full documents on every keystroke.
   - Debounce `LivePreview.tsx` markdown and Mermaid pipelines by 250ms during live editing.
   - Optimize `liveMarkdown.ts` selection updates to prevent full-document decoration rebuilds on same-line cursor navigation.
4. **Dead Code & Asset Pruning (MOCK-2, SCOPE-2)**:
   - Retain `canvas-confetti` (active in `VariableFillerModal.tsx:16`, correcting DEPS-1 per R2-1).
   - Prune unreferenced `src/shell/PrototypeShell.tsx` and legacy `src/constants/defaultData.ts`.
   - Clean exports in `src/shell/index.ts`.
5. **Security & Resilient Feedback (SEC-3, ERR-2, PERF-9)**:
   - Add defense-in-depth CSP `<meta>` tag in `index.html` (dev-safe with `'unsafe-inline'` for React fast-refresh + `ipc:` origins).
   - Add user-visible toast notifications on dropped-image failures and preview render warnings across all 4 audit-flagged sites.
   - Resolve redundant dynamic import warnings in `actionStore.ts` for all three flagged modules (`notificationStore`, `actionSandbox`, `actionExecutor`).
6. **Documentation & Tradeoff Reconciliation (R2-1..R2-5)**:
   - Register **TR-012: Rendered-Mode In-Editor Markdown Decoration Independence** in `living_context.md` (TR-011 is reserved by still-pending F-18 from the 09-16 cycle).
   - Fix reconciliation metrics and citations in `raw_findings_full_codebase_2026-09-18.md` and `living_context.md`.

---

## 2. Pass 2 Audit Corrections (R2-1 through R2-5)

| Ref | Type | Issue | Planned Action in Documentation |
|:---|:---:|:---|:---|
| **R2-1** | HIGH | `DEPS-1` was factually false; `canvas-confetti` is used in `VariableFillerModal.tsx:16`. | **Do NOT remove `canvas-confetti`.** Reclassify DEPS-1 as `[CLEARED / COMPLIANT]` in audit report and LCD. |
| **R2-2** | MEDIUM | `BG-2` was approved as tradeoff without registering TR-011. | Register **TR-012** in `living_context.md` defining rendered-mode in-editor decorations as explicit user view state distinct from background sync. **Note: TR-011 is already reserved** by the still-pending F-18 tradeoff from the 09-16 cycle (LCD:269) — do not reuse that ID. Restores "0 Undocumented Issues". |
| **R2-3** | MEDIUM | Arithmetic discrepancy (13 defects listed in table vs 12 stated; MOCK-1 double counted; 9 vs 8 tradeoffs). | Correct audit summary table and LCD: Total 29 = 12 Valid Defects + 8 Approved Tradeoffs + 8 Compliant/Cleared + 1 Quarantined Mock + 0 Undocumented. |
| **R2-4** | LOW | PERF-8 cited TR-006; PERF-3 cited TR-005. | Update citations: PERF-3 cites LCD Phase A (local font bundling); PERF-8 documents background offload via `tokio::task::spawn_blocking` worker threads. |
| **R2-5** | LOW | PASS condition omitted valid defects and mixed P3 items. | Rewrite PASS-upgrade condition to explicitly enumerate all 12 defects and verify their complete remediation. |

---

## 3. Detailed Component Technical Changes

### Cluster 1: Startup Performance & Bundle Decoupling (Priority 1)

#### 1. Decouple `formattingService.ts` from CodeMirror Commands (`PERF-1`, `MOD-2`)
- **Files (REVISED — root cause is *not* `editorRegistry`)**:
  - `src/services/editor/formattingService.ts`
  - `src/services/editor/editorRegistry.ts` (extend command surface)
  - `src/components/Editor/Editor.tsx` (register the expanded command set)
- **Why the retarget:** `editorRegistry.ts:1` is *already* `import type { EditorView }` and `@codemirror/commands` is *already* injected via `registerCommands` (`Editor.tsx:256`). The live boot-graph leak is `formattingService.ts:5` → `import { undo, redo, indentMore, indentLess } from '@codemirror/commands'`, which is statically imported by `ModularRibbon.tsx:11` (boot, via `ClassicShell.tsx:6`) and `MobileAccessoryBar.tsx:11` (boot, via `ShellEditorContainer.tsx:4`).
- **Technical Strategy**:
  - Extend `EditorCommands` (`editorRegistry.ts:6-10`) with `indentMore` and `indentLess`.
  - In `formattingService.ts`, drop the `@codemirror/commands` import and dispatch `undo`/`redo`/`indent`/`outdent` through `editorRegistry` (which already carries injected command closures). The `view.focus()` calls stay in `formattingService`.
  - In `Editor.tsx:256`, extend `editorRegistry.registerCommands({ undo, redo, selectAll, indentMore, indentLess })`.
  - `tabStore.ts:5` no longer transitively couples to CodeMirror at runtime (`editorRegistry` has zero runtime `@codemirror/*` imports).
- **Impact**: Removes ~316 KB of CodeMirror runtime code from the synchronous startup module graph and drops `codemirror-*.js` from the `modulepreload` list (`dist/index.html:21`).

#### 2. Consolidate KaTeX Rollup Chunking (`PERF-2`)
- **Files (REVISED — function-form matcher already exists)**:
  - `vite.config.ts`
- **Why the retarget:** `vite.config.ts:28-38` already uses the function-form `manualChunks` matcher proposed in the original plan (`node_modules/katex` → `'katex'`), yet two katex chunks are still emitted. Verified root cause: **two distinct katex module instances** exist —
  - `node_modules/katex` version **0.18.7** (used by `mathRenderer.ts:17`)
  - `node_modules/mermaid/node_modules/katex` version **0.16.47** (mermaid's nested dependency)
  A `manualChunks` matcher cannot merge two separate package instances; the nested `0.16.47` copy is a distinct module graph that Rollup chunks separately.
- **Technical Strategy**:
  - Force single-module resolution in `vite.config.ts`:
    ```ts
    resolve: {
      dedupe: ['katex'],
    },
    ```
    `dedupe: ['katex']` makes Rollup resolve *both* `import('katex')` (mathRenderer) and mermaid's nested `katex` to the single top-level `0.18.7` instance, collapsing the two chunks into one `katex.js`.
- **Impact**: Collapses the duplicate ~261 KB KaTeX chunk in `dist/assets` to exactly one `katex-*.js`.

#### 3. Batch Concurrent Store Initialization (`PERF-4`)
- **Files**:
  - `src/shell/ShellFrame.tsx`
- **Technical Strategy**:
  - In `ShellFrame.tsx:48-58`, wrap the 8 store initializers in `Promise.allSettled` with error handling:
    ```ts
    useEffect(() => {
      Promise.allSettled([
        initializeSettings(bridge.storage, bridge.platform),
        initializeTabs(bridge.storage),
        initializeTemplates(bridge.storage),
        initializeActions(bridge.storage),
        initializeWorkflows(bridge.storage),
        initializeRibbon(bridge.storage),
        initializeFormattingStore(bridge.storage),
        initializeFileHistory(bridge.storage),
      ]).catch((e) => console.error('Store init batch failed', e));
    }, [bridge]);
    ```
- **Impact**: Eliminates serial waterfall during cold-start hydration; allows I/O roundtrips to proceed concurrently.

#### 4. Dead Code & Cruft Pruning (`SCOPE-2`, `MOCK-2`, `DEPS-1` retention)
- **Files**:
  - `src/shell/PrototypeShell.tsx` (DELETE)
  - `src/constants/defaultData.ts` (DELETE)
  - `src/shell/index.ts` (Remove export of `PrototypeShell`)
  - `package.json` (RETAIN `canvas-confetti`)
- **Impact**: Eliminates dead prototype files and cleans public exports.

---

### Cluster 2: Runtime Keystroke Throttling & Responsiveness (Priority 2)

#### 5. Connect `scheduleEstimate` in StatusBar (`PERF-5`)
- **Files**:
  - `src/components/StatusBar/StatusBar.tsx`
- **Technical Strategy**:
  - In `StatusBar.tsx`, replace the unthrottled `tokenEstimatorService.estimateTokensAsync(...)` call in `useEffect` with `tokenEstimatorService.scheduleEstimate(activeTab.content, settings.selectedModelId, 300)`.
  - The service's internal timer debounces calls by 300ms and notifies subscribers, updating `StatusBar` via the existing subscription.
- **Impact**: Eliminates expensive synchronous regex runs across the document on every keystroke.

#### 6. Debounce LivePreview Markdown & Diagram Pipeline (`PERF-7`)
- **Files**:
  - `src/components/Preview/LivePreview.tsx`
- **Technical Strategy**:
  - In `LivePreview.tsx`, add a 250ms debounce when updating `syncedContent` from `content` during `isLiveSync = true`.
  - Point `formulaEvaluated` to `syncedContent` so intermediate keystrokes do not trigger `marked.parse` or Mermaid diagram re-renders until typing pauses.
- **Impact**: Smooth, 60fps typing in split-view mode with zero lag on markdown parsing and diagram layout.

#### 7. Optimize `liveMarkdown` Selection Updates (`PERF-6`)
- **Files**:
  - `src/extensions/liveMarkdown.ts`
- **Technical Strategy**:
  - In `liveMarkdownField.update(decorations, tr)`:
    - If `!tr.docChanged && tr.selection && prevTheme === nextTheme`:
      - Compare cursor line of `startState` and `state`. If cursor stayed on the same line, reuse existing decorations (`return decorations`).
  - **Scope note (REVISED):** This change is a relative cheap win for same-line cursor navigation, but the dominant cost path — full-document `buildDecorations` on every `docChanged` keystroke — is only *partially* mitigated. Because a safe viewport-limited / incremental decorate implementation is a substantial algorithm change on the live-markdown hot path, THIS PLAN resolves the same-line selection case only and explicitly defers the per-keystroke full-doc rebuild to the tracked PERF-6 backlog under `living_context.md` (marked `[DEFERRED — Keystroke Full-Doc Rebuild]`, TR-012 environment) rather than claiming false completion.
- **Impact**: Skips full-document decoration traversals on horizontal arrow key navigation within the same line; documents the residual keystroke-rebuild debt for a follow-up pass.

---

### Cluster 3: Security & Resilient Error Feedback (Priority 3)

#### 8. Add Defense-in-Depth CSP Meta Tag (`SEC-3`)
- **Files**:
  - `index.html`
- **Technical Strategy**:
  - Add `<meta http-equiv="Content-Security-Policy">` to `<head>` that does NOT break dev mode.
  - Production-safe + dev-compatible policy (mirrors the app's real runtime needs, including React Fast Refresh and Tauri IPC):
    ```html
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: asset: https:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*; frame-src 'self' http://127.0.0.1:*; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" />
    ```
    - Includes `'unsafe-inline'` (dev preamble + Tauri boot) and the `ipc:`/`http://ipc.localhost` origins already required by the existing `src-tauri/tauri.conf.json:26` CSP.

#### 9. Resilient User Feedback on Failures (`ERR-2`)
- **Files**:
  - `src/shell/ShellFrame.tsx`
  - `src/components/Preview/LivePreview.tsx`
  - `src/extensions/liveMarkdown.ts`
- **Technical Strategy** (all 4 audit sites covered):
  - `ShellFrame.tsx:192` — replace `console.error` with `addNotification('Image Import Failed', (err as Error)?.message || 'Failed to process dropped image', 'error')`.
  - `LivePreview.tsx:87` — KaTeX load failure: dispatch toast 'Math Renderer Failed to Load' (no more empty `catch (() => {})`).
  - `LivePreview.tsx:196` — Mermaid render failure: upgrade `console.warn` catch to `addNotification('Diagram Render Failed', ..., 'warning')` with static fallback (rate-limited).
  - `liveMarkdown.ts:1707` — decorator error currently returns `Decoration.none` + `console.warn`. Keep graceful fallback but surface a one-time 'Live Markdown Rendering Error' banner.

#### 10. Clean Dynamic Import Warnings (`PERF-9`)
- **Files**:
  - `src/store/actionStore.ts`
- **Technical Strategy**:
  - Convert all three to top-level static imports in `actionStore.ts` (lines 264, 287, 290, 301):
    - `import { executeActionById } from '../services/actionExecutor';`
    - `import { executeInSandbox } from '../services/actionSandbox';`
    - `import { useNotificationStore } from './notificationStore';`
  - Remove the now-unused `await import(...)` call sites.
- **Impact**: Eliminates all three Rollup "dynamic import will not move module into another chunk" warnings during `npm run build`.

---

## 4. Execution Sequence & Dependency Order

```
┌────────────────────────────────────────────────────────────┐
│ Phase 1: Documentation & Register Corrections             │
│ - Register TR-012 in living_context.md                     │
│ - Correct metrics (R2-3) & citations (R2-4)                │
│ - Update audit report appendix (R2-1..R2-5)                │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 2: Dead Code Pruning & Dep Verification              │
│ - Delete PrototypeShell.tsx & defaultData.ts               │
│ - Clean shell/index.ts exports                             │
│ - Retain canvas-confetti in package.json                   │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 3: Startup Decoupling & Bundling (P1)                │
│ - formattingService.ts → editorRegistry command routing    │
│ - vite.config.ts resolve.dedupe: ['katex'] (nested copy)   │
│ - ShellFrame.tsx Promise.allSettled store initialization   │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 4: Keystroke Throttling & Responsiveness (P2)        │
│ - StatusBar.tsx scheduleEstimate wiring (300ms)            │
│ - LivePreview.tsx debounced content pipeline (250ms)       │
│ - liveMarkdown.ts selection update optimization            │
│   (+ log PERF-6 keystroke-rebuild deferral to LCD)         │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 5: Security, Errors & Warnings (P3)                  │
│ - index.html CSP meta tag (dev-safe, incl. ipc origins)    │
│ - ShellFrame.tsx dropped image error toast                 │
│ - LivePreview katex + mermaid toasts; liveMarkdown banner  │
│ - actionStore.ts → static imports (all 3 modules)          │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│ Phase 6: Automated Verification & Verdict Upgrade          │
│ - npm run lint (0 platform leaks, 100% contracts sync)     │
│ - npm test (126/126 pass)                                  │
│ - npm run build (verify: 1 katex chunk, codemirror NOT in  │
│   startup modulepreload of dist/index.html, 0 dynamic-     │
│   import warnings; Dev+CSP smoke: npm run dev HMR intact)  │
│ - cargo check; npm run test:e2e                            │
│ - Upgrade Audit Verdict: CONDITIONAL PASS -> PASS          │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan & Success Criteria

| Verification Gate | Command | Expected Output / Acceptance Criteria |
|:---|:---|:---|
| **Platform Leaks Gate** | `npm run lint` | 0 platform leaks across 114 files; 100% contract sync; TypeScript exit 0. |
| **Unit Test Suite** | `npm test` | All 14 suites, 126+ tests pass with zero regressions. |
| **Native Rust Check** | `cargo check` (in `src-tauri/`) | Exit 0 with zero warnings or errors. |
| **Production Build Check** | `npm run build` | - Main bundle excludes CodeMirror from `modulepreload` of `dist/index.html` (`formattingService` decoupled).<br>- KaTeX emits exactly 1 JS chunk (`resolve.dedupe: ['katex']` collapsing nested `mermaid/node_modules/katex`).<br>- 0 "dynamic import will not move module into another chunk" warnings.<br>- Exit 0. |
| **Dev/HMR Smoke** | `npm run dev` | App boots, React fast-refresh preamble executes (CSP `'unsafe-inline'` present), HMR intact. |
| **E2E Regression** | `npm run test:e2e` | 21/21 green — guards mermaid diagram rendering under katex dedupe and CSP meta. |
| **Audit Verdict Upgrade** | Inspection of audit & LCD | All 12 effective valid defects resolved; TR-012 registered; PERF-6 keystroke-rebuild debt logged as deferred; audit verdict upgraded to **PASS**. |
