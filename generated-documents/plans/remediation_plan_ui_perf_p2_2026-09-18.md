# Comprehensive Remediation Plan: UI Layering, Launch Performance & Priority 2 Defects
Date: 2026-09-18
Project: CNTXT (ContextPad)
Target Feature Group: REMED-01
Author: Production Implementation Agent

---

## 1. Overview & Objectives

This plan addresses all identified defects and performance bottlenecks in the CNTXT application:
1. **UI Layering & Clipping Invariants**: Resolve the Menu Bar and Theme dropdown clipping caused by restrictive CSS containment (`height: 38px; overflow: hidden;`) and stacking context ordering in `ShellTitleBar.tsx`.
2. **Launch & Startup Acceleration**: Eliminate Vite dev-server TTFB latency via dependency pre-bundling (`optimizeDeps`) and remove the cold-start disk I/O storm in `src-tauri/src/commands/storage.rs`.
3. **Priority 2 Functional Defects**:
   - `F-08`: CodeMirror `closeBrackets()` racing `[[action:...]]` syntax during live typing.
   - `F-07`: Non-functional `enableBracketMatching` dynamic toggle in `Editor.tsx`.
   - `F-11`: Tab autosave debounce unflushed on exit (`beforeunload`) and tab resurrection on close.
   - `F-05`: FileExplorer cross-directory name collision (`activeFileName === item.name`).
   - `F-04`: React impure state updater side-effect (`safePersist` in `setFiles`).
   - `F-06`: FileExplorer infinite loading spinner on missing directories.
   - `F-10`: File history store serializing 1.25MB full document content redundantly.
   - `F-22`: `FormulaEngine` execution order inversion preventing custom formula overrides.

---

## 2. Phase-by-Phase Implementation Details

### Phase 1: UI Layering & Header Clipping Fix

#### Files Affected:
- `src/index.css`
- `src/shell/ShellTitleBar.tsx`

#### Actions:
1. **`src/index.css`**:
   - Update `header[data-shell-titlebar]` and `.shell-titlebar`:
     - Remove `height: 38px` and `overflow: hidden;`.
     - Set `min-height: 64px;` (desktop) and `overflow: visible; contain: none;`.
     - Ensure `[data-shell-ribbon]` has `overflow: visible;` so context menus and tooltips are not clipped.
2. **`src/shell/ShellTitleBar.tsx`**:
   - Assign explicit stacking order:
     - When `openMenu === 'theme'`, elevate Row 1 to `z-50` so the theme dropdown renders over Row 2.
     - Elevate Row 2 menu dropdowns (`z-50`) to display cleanly over `ModularRibbon` and `ShellEditorContainer`.

---

### Phase 2: Launch & Startup Acceleration

#### Files Affected:
- `vite.config.ts`
- `src-tauri/src/commands/storage.rs`

#### Actions:
1. **`vite.config.ts`**:
   - Add `optimizeDeps.include` with core dependencies:
     - `lucide-react`
     - `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`
     - `zustand`, `cytoscape`, `katex`
   - This pre-bundles these heavy ESM libraries during Vite start, slashing TTFB from ~12.7s down toward ~2s.
2. **`src-tauri/src/commands/storage.rs`**:
   - Refactor `KvStore` to track an `is_loaded: bool` flag or only call `load()` on cold start if the store is uninitialized.
   - Eliminates 15–20+ redundant `tokio::fs::read_to_string` full-file disk reads during the startup hydration storm.

---

### Phase 3: Priority 2 Functional Defects

#### Files Affected:
- `src/components/Editor/Editor.tsx`
- `src/store/tabStore.ts`
- `src/components/Sidebar/FileExplorer.tsx`
- `src/store/fileHistoryStore.ts`
- `src/services/formulaParser.ts`

#### Actions:
1. **`Editor.tsx` (F-08 & F-07)**:
   - Wrap `bracketMatching()` in a dynamic CodeMirror `Compartment` (`bracketMatchingCompartmentRef`).
   - Add `settings.enableBracketMatching` to the reconfiguration `useEffect` so toggling it takes immediate effect without editor rebuild.
   - Configure `closeBrackets()` to not pair brackets when typing inside or immediately adjacent to `[[action:` markers, preventing bracket collision.
2. **`tabStore.ts` (F-11)**:
   - Attach a `beforeunload` window listener that immediately executes any pending `saveTimers` synchronously before the window destroys.
   - In `closeTab()`, `closeOtherTabs()`, and `closeAllTabs()`, call `clearTimeout(saveTimers[t.id])` and `delete saveTimers[t.id]` before purging from storage, preventing stale debounced writes from resurrecting closed tabs.
3. **`FileExplorer.tsx` (F-05, F-04, F-06)**:
   - **F-05**: Replace `activeFileName === item.name` with `activeFilePath === item.path` (with fallback to name only if path is absent).
   - **F-04**: Extract `safePersist` outside of `setFiles(prev => ...)` into a clean post-update effect or helper function.
   - **F-06**: When `findFolderInTree` returns `null` or `readDirectory` fails, immediately reset the folder node's expanded state and dispatch a warning notification toast.
4. **`fileHistoryStore.ts` (F-10)**:
   - Omit the heavy full-text `content` string when storing `OpenedFileRecord` in the zustand store and persistent storage. Re-read on demand when needed.
5. **`formulaParser.ts` (F-22)**:
   - In `FormulaEngine.executeFunction`, query `this.functionRegistry.get(name.toUpperCase())` *before* the built-in switch statement. If a registered function exists, execute it; otherwise, fall through to built-ins.

---

## 3. Verification & Testing Strategy

1. **Static Verification**:
   - `npm run lint` (0 platform leaks, 100% canonical contract sync, `tsc --noEmit` exit 0).
2. **Unit Tests**:
   - `npm test` (all 14 Vitest suites, 121+ tests passing).
3. **Cargo Check**:
   - `cargo check` in `src-tauri` (Rust compiler check passing).
4. **Manual & Browser Verification**:
   - Inspect ShellTitleBar: confirm Menu Bar (File, Edit, View, Tools, Help) is fully visible at 64px height.
   - Open Theme dropdown: confirm it renders on top of the menu bar with all themes visible and selectable.
   - Open File, Edit, View menus: confirm dropdowns render over ribbon and editor without clipping.
