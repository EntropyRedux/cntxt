# Refactor Plan — E2E Test Suite Stability & Action Widget Boundary Resolution (F-08)

- **Date:** 2026-09-18
- **Author:** Prod Agent (Antigravity Assistant)
- **Role:** Implementation & Plan Formulation
- **Source Reports:** 
  - `generated-documents/test-reports/test_report_CNTXT_2026-09-18.md`
  - `generated-documents/audits/e2e_audit_issues_editor_tests_2026-09-18.md`
- **Living Context Reference:** `generated-documents/context/living_context.md` (v1.13, F-08 queued at line 386)

---

## 1. Executive Summary & Objectives

The Tester AI agent verified that CNTXT possesses 126/126 passing unit tests, zero platform leaks, 100% canonical contract synchronization, and 16/16 non-editor E2E tests passing. However, two issues affect `e2e/editor.spec.ts`:
1. **CI Timeout Flakiness**: Playwright defaults to a 30-second per-test timeout. During cold Vite dev-server startup combined with React 19 hydration and CodeMirror initialization in headless Chromium, tests in `editor.spec.ts` risk intermittent timeouts.
2. **Defect F-08 (Action Token Widget Replacement vs Cursor Boundary)**: Tests 4 and 5 in `editor.spec.ts` (`.cm-action-btn-widget` and `.cm-action-missing-widget`) fail to become visible after typing/inserting `[[action:...]]`. Root cause analysis reveals that in `src/extensions/liveMarkdown.ts:1509`, `isEditingAction` checks `r.head >= start && r.head <= end`. When text is typed or inserted, the cursor rests exactly at `end`, causing `isEditingAction` to evaluate to `true` and rendering the plain syntax mark `cm-live-action-token` instead of the expected `ActionButtonWidget`.

**Objective:** 
Eliminate CI timeout flakiness and resolve the cursor-boundary check in `liveMarkdown.ts` so all 21/21 E2E tests execute cleanly and reliably.

---

## 2. Root Cause Analysis

### 2.1 Playwright CI Timeout Constraint
- In `playwright.config.ts`, no top-level `timeout` or `expect.timeout` is set, inheriting the default 30,000ms.
- Vite dev-server cold start takes 5–15s. Chromium launch and initial bundle compilation require 5–10s. CodeMirror 6 editor mount and document hydration require 2–5s.
- Sequential test execution within `editor.spec.ts` can exceed 30s during cold starts, triggering false failure.

### 2.2 Defect F-08: Action Token Cursor-Boundary Evaluation
- In `src/extensions/liveMarkdown.ts` (lines 1508–1517):
  ```typescript
  // Current:
  const isEditingAction = state.selection.ranges.some(r => r.head >= start && r.head <= end);
  if (isEditingAction) {
    rangeDecos.push({
      from: start,
      to: end,
      deco: Decoration.mark({ class: 'cm-live-action-token ...' })
    });
    continue;
  }
  ```
- When a user or test completes typing `[[action:id]]`, the cursor is positioned at `r.head === end`.
- Because the condition uses `<=` instead of `<` (or fails to differentiate between a cursor collapsed at the outer boundary vs inside the token), the token remains decorated as an editable mark (`cm-live-action-token`) rather than being replaced by the `ActionButtonWidget` (`.cm-action-btn-widget`).
- Furthermore, in `e2e/editor.spec.ts`, after `insertText`, the cursor remains at `end` unless moved, blurred, or unless the boundary check is adjusted so that resting at `end` (outside the closing `]]`) allows widget replacement.

---

## 3. Targeted Technical Solution

### Step 1: Playwright Configuration Hardening (`playwright.config.ts`)
1. Add top-level `timeout: 60_000` (60s) for individual tests.
2. Add `expect: { timeout: 15_000 }` (15s) for locator assertions.
3. Configure `use: { actionTimeout: 10_000, navigationTimeout: 30_000 }`.
4. Set `webServer.timeout: 90_000` (90s) to give dev-server ample margin on constrained CI/Windows runners.

### Step 2: Cursor Boundary Rectification (`src/extensions/liveMarkdown.ts`)
1. Refine `isEditingAction`:
   - An action token is only actively being edited if the cursor is **strictly inside** the token brackets, i.e., `r.head > start && r.head < end`.
   - When the cursor is at `start` (before `[[`) or at `end` (after `]]`), the token is complete and closed; the editor should render the interactive `ActionButtonWidget` (or missing widget).
2. Support keyboard navigation to edit syntax: Alt+Click or clicking the widget dispatches cursor into `start + 2`, cleanly toggling it back to editable text if desired.

### Step 3: E2E Test Verification (`e2e/editor.spec.ts`)
1. Verify that `page.keyboard.insertText('[[action:format-json-and-sort]]')` immediately renders `.cm-action-btn-widget` when cursor is at `end`.
2. Verify that `page.keyboard.insertText('[[action:nonexistent-action-id]]')` immediately renders `.cm-action-missing-widget`.

---

## 4. Execution Sequence

1. **Update `playwright.config.ts`**:
   - Set `timeout: 60_000`, `expect: { timeout: 15_000 }`, `webServer: { timeout: 90_000 }`.
2. **Update `src/extensions/liveMarkdown.ts`**:
   - Change `r.head >= start && r.head <= end` to `r.head > start && r.head < end`.
3. **Execute Verification Gates**:
   - `npm run lint` (0 platform leaks, 100% contract sync)
   - `npm test` (126/126 unit tests)
   - `cargo check` (Rust backend clean)
   - `npm run test:e2e` (All 21/21 E2E tests passing green)
4. **Update Living Context Document (`living_context.md`)**:
   - Mark `F-08` as RESOLVED.
   - Update E2E status to `21/21 PASS (0 flaky, 0 failures)`.
5. **Commit & Push**:
   - Clean commit `fix(editor): resolve action token cursor boundary and stabilize E2E timeouts`.

---

## 5. Non-Goals & Invariants

- **Invariant 1 (Universal Presenter Purity):** No direct native IPC or fetches added to UI presenters.
- **Invariant 2 (Mock Quarantine):** Production code collections remain empty; zero inline mocks.
- **Invariant 3 (Contract Integrity):** `contracts/data_shapes.ts` remains untouched and synchronized.
- **Non-Goal:** Do not disable or remove `closeBrackets()` globally if bracket matching is healthy; only refine boundary token replacement.

---

## 6. Verification & Pass Criteria

| Gate | Pass Condition |
|---|---|
| **Gate A** | `playwright.config.ts` has 60s test timeout and 15s expect timeout |
| **Gate B** | `liveMarkdown.ts` renders `.cm-action-btn-widget` when token is complete |
| **Gate C** | `npm run lint` exits 0 with 0 platform leaks |
| **Gate D** | `npm test` passes 126/126 unit tests |
| **Gate E** | `npm run test:e2e` passes **21/21** tests with zero timeouts |
| **Gate F** | `living_context.md` reflects 21/21 E2E passes and closes defect `F-08` |
