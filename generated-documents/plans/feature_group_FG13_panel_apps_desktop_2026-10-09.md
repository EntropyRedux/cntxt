# Feature Group Implementation Plan: FG-13 Panel Apps (Desktop First)
Date: 2026-10-09
Author: Prod Agent & Architect
Status: [x] Scoped  [x] Ready for Execution
Target Repository: `C:\Projects\LocalActive\Repo\Active\CNTXT` (Desktop First — Web and Android follow after stabilization)
Authoritative Reference: `generated-documents/context/panel_apps_vision_v0.2.md`

---

## 1. Executive Summary & Objective

The objective of **FG-13** is to introduce **Panel Apps** into the desktop build (`CNTXT`), enabling users to turn standalone, self-contained HTML documents into persistent, sandboxed mini-applications hosted inside CNTXT.

Each Panel App:
- Is represented by a single `.cntxt` markdown file (frontmatter manifest + fenced HTML body).
- Appears as an interactive, scrollable icon on the left rail (`ActivityBar`).
- Opens inside a dedicated right-side panel container with custom width.
- Executes within an isolated runtime environment with its own persistent storage (`localStorage`, `IndexedDB`).
- Enforces strict offline-first principles with explicit static scan badges (**Offline-ready** vs **Needs network**).
- Maintains zero access to Tauri IPC internals, session tokens, or CNTXT core storage.

---

## 2. Invariants & Scope Boundaries

### Invariants:
1. **Desktop First Purity**: Implementation is strictly confined to `CNTXT` (desktop build). Web (`cntxt-web`) and Android runtimes are intentionally not modified during initial development to prevent cross-platform friction.
2. **Single File Source of Truth**: The `.cntxt` file carries everything. No separate sidecars. The original source document is copied once; no `appSourceOf` or persistent link back exists.
3. **Dynamic-Length Fence Extraction**: HTML body code fences dynamically scale in length (e.g., ` ````html ` or ` `````html `) to be strictly longer than any backtick sequence found within the embedded HTML/JavaScript payload.
4. **Universal Presenter Purity**: Visual UI components (`PanelAppBuilderPanel.tsx`, `PanelAppContainer.tsx`, `PanelAppRailItem.tsx`) are 100% pure UI driven strictly by typed props. Zero direct Tauri IPC or disk I/O calls inside presenters.
5. **Zero IPC Reachability**: App origin must never possess capabilities to invoke Tauri commands, read session tokens, or access host application databases.

---

## 3. Work Breakdown Structure (Execution Phases)

### Phase 0: Spikes & Technical Measurements
- **Spike 0.1: Tauri v2 Custom Protocol & Origin Isolation**:
  - Test registration of custom protocol handler in Tauri v2 (`cntxt-app://[appId]/index.html` or `app://[appId].localhost/`).
  - Verify origin isolation between two distinct app IDs on Windows (WebView2).
- **Spike 0.2: Storage Lifecycle & Per-Origin Wipe**:
  - Verify `localStorage` and `IndexedDB` persistence across application reboots.
  - Validate clean per-app storage wiping on app deletion.
- **Spike 0.3: IPC Isolation Proof**:
  - Construct automated Rust test verifying that custom scheme webviews / iframes cannot invoke Tauri commands or read `window.__TAURI_INTERNALS__`.
- **Spike 0.4: Size Threshold Benchmarks**:
  - Benchmark render times and CodeMirror responsiveness across 0.5 MB, 1 MB, 2 MB, and 5 MB payloads.
  - Finalize configuration constants: `PANEL_APP_SOFT_LIMIT_BYTES` (soft warning) and `PANEL_APP_HARD_LIMIT_BYTES` (creation block).

### Phase 1: Canonical Contracts, Data Shapes & Format Engine
- **Task 1.1: Canonical Data Shapes (`contracts/data_shapes.ts`)**:
  - Add `PanelAppManifest`, `PanelAppDocument`, `PanelAppNetworkMode`, `AppRuntime`, `IAppHost` to `contracts/data_shapes.ts`.
  - Mirror to `context/contracts/data_shapes.ts` and verify with `check-contract-sync.mjs`.
- **Task 1.2: Boundary Validation Schemas (`contracts/boundarySchemas.ts`)**:
  - Create Zod schema `validatePanelAppManifest` validating `id`, `name`, `icon`, `runtime`, `network`, `panelWidth`.
- **Task 1.3: `.cntxt` Format Generator & Parser (`src/services/panelApps/panelAppFormat.ts`)**:
  - Implement `generatePanelAppDocument(manifest, html)` with dynamic fence calculation.
  - Implement `parsePanelAppDocument(rawMarkdown)` extracting manifest frontmatter and first matching HTML fence.
  - Comprehensive unit test suite in `tests/panelAppFormat.test.ts` covering fence collision test vectors.

### Phase 2: Builder UI & Presenters (Pure UI)
- **Task 2.1: Pre-Flight Static Inspector (`src/services/panelApps/panelAppPreflight.ts`)**:
  - Static HTML scanner detecting external network assets (`src`, `href`, `@import`, `fetch`).
  - Contributor size analyzer identifying large base64 blobs, inlined scripts, and styling.
  - Evaluator assigning **Offline-ready** vs **Needs network** status badge.
- **Task 2.2: Panel App Builder Panel (`src/components/Sidebar/PanelAppBuilderPanel.tsx`)**:
  - Source selection (Flow A: open tab or existing file).
  - Manifest form: Name, Icon picker (from existing lucide pack), Panel Width slider/presets, Network Mode toggle.
  - Pre-flight diagnostic display with badge, size readout, and warnings.
  - Flow B prompt generator: interactive requirements question generator and "Split with AI" helper prompt.
- **Task 2.3: Shell & Navigation Integration**:
  - Add App Builder trigger to `ActivityBar.tsx`.
  - Add "Set as panel app" option to TabBar header context menu.
  - Dynamic scrollable rail icon list in `ActivityBar.tsx` reflecting active registered panel apps.
  - Panel App right-panel drawer view container in `ShellFrame.tsx`.

### Phase 3: Desktop Host Implementation (`IAppHost`)
- **Task 3.1: Host Interface & Runtime Bridge (`src/adapters/tauriBridge.ts`)**:
  - Define `IAppHost` interface in `IRuntimeBridge`:
    ```ts
    interface IAppHost {
      mount(appId: string, container: HTMLElement): Promise<void>;
      unmount(appId: string): Promise<void>;
      clearData(appId: string): Promise<boolean>;
      reload(appId: string): Promise<void>;
    }
    ```
- **Task 3.2: Tauri Custom Protocol Handler (`src-tauri/src/commands/panel_app.rs` / `lib.rs`)**:
  - Register custom protocol serving extracted HTML by `appId`.
  - Enforce CSP response headers based on manifest `network` mode (`offline` vs `cdn`).
  - Enforce hard byte size limit at protocol level.
- **Task 3.3: Sandboxed Container & Error Resilience**:
  - `PanelAppContainer.tsx` with iframe sandbox flags and Error Overlay for parse/runtime failures.
  - File-watcher / save-listener: reloading active panel app whenever its `.cntxt` tab is saved in the editor.

### Phase 4: Verification, Security & Test Gates
- **Task 4.1: Vitest Unit Suite**:
  - Format generation & parsing (including backtick collisions).
  - Pre-flight scanner (URL detection, contributor analysis, badge computation).
  - Manifest validation.
- **Task 4.2: Rust Security & Isolation Tests**:
  - Verify custom protocol rejects path traversal attempts.
  - Verify iframe / custom scheme cannot access host IPC commands.
- **Task 4.3: Living Context & Documentation Update**:
  - Record FG-13 in `living_context.md`.
  - Synchronize changelogs and manifests.

---

## 4. Verification Checkpoints

1. `npm test` — all existing 399 tests plus new panel app suites pass cleanly.
2. `npm run lint` — 0 TypeScript errors, 0 platform leaks, 100% contract synchronization.
3. Security Gate — Rust tests in `src-tauri/` pass with zero IPC leaks.
