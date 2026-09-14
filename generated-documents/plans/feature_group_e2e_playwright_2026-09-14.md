# Feature Group Definition: FG-05 — Playwright E2E Browser Test Suite

- **Date:** 2026-09-14
- **Author:** Prod Agent (planning)
- **Status:** Submitted for implementation (Prompt 14)
- **Scope Document:** This file

---

## Feature Group Definition

**Feature group name:** FG-05 — Playwright E2E Browser Test Suite

**Target Platform & Stack:** Web (Vite dev server w/ `BrowserRuntimeAdapter`), @playwright/test (Chromium), Node 18+.

**Features included:**
- Playwright dev dependency + `npm run test:e2e` script.
- `playwright.config.ts` — webServer boot of `npm run dev` (`http://localhost:5173`, strictPort), baseURL fixture.
- Demo-mode helper fixture: `page.addInitScript` setting `window.__CONTEXTPAD_DEMO__` per scenario (true/false).
- Spec files:
  - `editor.spec.ts` — typing, markdown live-render, `[[action:id]]` widget click execution/render.
  - `slash-menu.spec.ts` — `/` trigger, ArrowUp/ArrowDown/Enter navigation, insertion into document.
  - `preview.spec.ts` — KaTeX glyph render, Mermaid SVG emission, XSS neutralization (`<script>`, inline `on*`, `javascript:` URIs).
  - `ribbon.spec.ts` — viewport resize → ModularRibbon multi-row expansion.
  - `empty-state.spec.ts` — `__CONTEXTPAD_DEMO__ = false`: tabs `[]`, file tree empty, no runtime crash.

**Features explicitly excluded (next group or out of scope):**
- Visual regression / screenshot baselines (`toMatchScreenshot`) — deferred, churn on CSS refactor.
- Native Tauri E2E via `tauri-driver` / WebDriver — Native OS dialogs (`rfd`), keyring, and Rust commands covered by `cargo check` + Rust unit logic; not browser-testable.
- Rust `preview_server.rs` WS path (Tauri-only) — exercised via native smoke, not Chromium.
- Coverage expansion beyond the 5 listed specs (keep lean; Vitest remains first line).

---

## Data Shapes & Dependency Mapping

- **Canonical data shapes used:** None new. E2E asserts against rendered DOM and persisted document content using the existing `Tab`, `DocumentContent`, `NotificationItem` shapes only as reference for selectors.
- **Native type translations:** None required — Playwright drives the browser adapter directly.
- **Dependencies on this group:**
  - `runtimeBridge.tsx:13-17` — `isTauriRuntime()` must continue to resolve to `BrowserRuntimeAdapter` in Chromium (no `__TAURI_INTERNALS__`).
  - `mocks/index.ts:12-14` — `IS_PROTOTYPE_DEMO_MODE` reads `window.__CONTEXTPAD_DEMO__`; must remain a runtime check (NOT build-time) for the demo fixture to work.
  - `LivePreview.tsx:352` client-side `sanitizePreviewHtml(renderedHtml)` — preview specs depend on browser-mode rendering path, not the Rust WS server.
- **What depends on this group:** future UX refactors gain a regression net for CodeMirror layout-dependent behavior, autocomplete chrome, and preview sanitization.

---

## Mock Registry Impact (Physical Clearing)

- **Which quarantined mocks does this group permanently clear?** None. This is a test-infrastructure group and clears zero mocks.
- **Mocks this group does NOT clear (explicitly):**
  - MOCK-001 (WELCOME_DOCUMENT) — still demo-only; E2E uses it as a *fixture* when `__CONTEXTPAD_DEMO__ = true`.
  - MOCK-002..MOCK-007 — untouched; still assigned to FG-02/FG-03/FG-04 native replacements.
- **Production code impact:** Zero. No production module imports `@playwright/test`; test dependency only (devDependencies).

---

## Background Processes

- **Does this feature group involve background processes?** No new production background processes.
- **Impacted existing background processes:**
  - Autosave / Live Token Estimator / Live DOM-Sync remain gated under Settings -> Experimental (TR-006). E2E specs must disable them (or run with defaults) to avoid timing flakiness in editor/slash specs. Test-fixture toggle: set `localStorage` settings or click through Settings -> Experimental in the spec itself.
- **User-facing toggles:** No change; TR-006 tradeoff unchanged.

---

## Acceptance Criteria

Define what "done" means for this feature group:
- [x] All 5 listed spec files implemented and committed under `e2e/`.
- [x] `npm run test:e2e` green on Chromium (retries enabled, headless default) — **21/21 passed** (2026-09-15).
- [x] `npm test` (Vitest) unaffected — separate script; green at **121/121**.
- [x] Presenter purity preserved — specs assert behavior via UI/DOM only; no test-only hooks or `id`-sprinkling leak into production components (selectors via accessible roles/testids or stable data attributes only).
- [x] Zero mocks unlinked/marked cleared (intentional — none in scope).
- [x] Zero inline fallback mock arrays in production code (unchanged).
- [ ] Per-feature audit reconciled (Prompt 16 PASS).
- [x] Living Context Document updated (add FG-05 row, `test:e2e` script) and committed to git.
- [x] Pushed to git.

---

## Risk Assessment

- **Most likely friction:** CodeMirror E2E interactions (focus, keystrokes, widget click through decoration layers) — CodeMirror uses contenteditable + cusom DOM; selectors should target TypeScript-level stable hooks or perform coordinate/keystroke-driven interaction rather than raw DOM text-node queries. Mitigation: prefer `editor` roles, keyboard event injection, and CodeMirror's observable DOM (`cm-content`, `.cm-line`, `.cm-action-button`) classes.
- **Preview spec flakiness:** KaTeX/Mermaid async render — use Playwright `expect` polling/web-first assertions on container text/SVG presence rather than hard sleeps.
- **Server boot conflict:** Vite dev server strictPort 5173; webServer `reuseExistingServer: !process.env.CI` to avoid port collisions during local runs with a running dev server.
- **Security/sandboxing implications:** None new as a feature; the XSS-neutralization spec is a *positive security test* asserting current `sanitizePreviewHtml` behavior — must not regress TR-003/TR-004 anyway.
- **Determinism risk:** `__CONTEXTPAD_DEMO__` must be set in `addInitScript` BEFORE bundle eval; confirm flag read ordering in `mocks/index.ts` (module top-level) — set via `context.addInitScript` in a fixture so it precedes app boot.

---

## Execution Order (Prompt 14)

1. `npm i -D @playwright/test` + `npx playwright install chromium`.
2. `playwright.config.ts` + `e2e/fixtures.ts` (demo-mode toggle fixture).
3. `empty-state.spec.ts` first (fastest signal on boot invariants).
4. `editor.spec.ts`, `slash-menu.spec.ts` (functional core).
5. `preview.spec.ts` (async render + XSS assertions).
6. `ribbon.spec.ts` (layout/responsiveness).
7. Update `package.json` scripts, LCD, CHANGELOG; audit (Prompt 16); commit; push.