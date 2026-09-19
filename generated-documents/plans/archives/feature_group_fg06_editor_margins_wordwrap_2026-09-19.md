# Feature Group: Editor Margin Settings & Continuous Text / Word Wrap Toggle

- **Date:** 2026-09-19
- **Plan Version:** v2.0 (Post-Audit Reconciled)
- **Audit Source:** `generated-documents/audits/raw_findings_plan_editor_margins_wordwrap_2026-09-19.md`
- **Feature Group Name:** FG-06: Editor Margin Settings & Continuous Text / Word Wrap Toggle
- **Target Platform & Stack:** Tauri v2 / React 19 + TypeScript + CodeMirror 6
- **Status:** IMPLEMENTED (all gates green) — ready for Prompt 16 feature audit

---

## 1. Features Included

1. **Editor Margin Settings** — user-controllable margin presets:
   - Max Width: `narrow` (680px) | `standard` (880px) | `wide` (1160px) | `full` (100%)
   - Horizontal Padding: `compact` (16px) | `normal` (32px) | `spacious` (64px)
2. **Continuous Text vs Word Wrap Toggle** — dynamic, zero-teardown switching between soft wrap and horizontal-scroll continuous text, driven by `settings.wordWrap`.

Explicitly excluded (next group / out of scope): LivePreview pane margins, sync-back visual polish, preset slider UX.

## 2. Data Shapes & Dependency Mapping

- Canonical shapes used: `EditorSettings` (`contracts/data_shapes.ts`).
- **Contract changes:** Added `editorMaxWidth: 'narrow' | 'standard' | 'wide' | 'full'` and `editorPadding: 'compact' | 'normal' | 'spacious'` to `EditorSettings` (required, no `?`).
- **Option B mirror sync** maintained: both `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts` updated; verified 100% byte-identical via `scripts/check-contract-sync.mjs`.
- Dependencies: CodeMirror 6 `Compartment` (existing), `EditorView.lineWrapping`, `EditorView.theme`. No new third-party dependencies.

## 3. Architecture & Frictions Resolution

### CSS Specificity (F-1/F-2 resolved)
- `src/index.css:1810`: `overflow-x: hidden !important` → `overflow-x: auto !important` — enables the horizontal scrollbar for Continuous Text. Also matched `overflow-y: auto !important`.
- `src/index.css:1851+`: Removed `!important` hardcoded width/margin/padding overrides on `.cm-rendered-canvas .cm-content` / `.cm-raw-canvas .cm-content`. Retained non-important fallback rules keyed to `var(--editor-max-width, ...)`. Dynamic CodeMirror compartment theme now wins via scoped selector specificity.

### Dynamic Compartments (Editor.tsx)
- Added `layoutCompartmentRef` and `wordWrapCompartmentRef` (2 new `Compartment`s).
- `wordWrapCompartmentRef.of(settings.wordWrap ? EditorView.lineWrapping : [])` replaces the previously static `EditorView.lineWrapping`.
- `layoutCompartmentRef.of(EditorView.theme(contentLayout))` carries the `.cm-content` max-width/margin/padding; base `.cm-content` theme rules no longer spread `contentLayout`.
- `getContentLayoutTheme` extended to accept `(isRendered, isMdOrText, wordWrap, editorMaxWidth, editorPadding)`:
  - Raw/code/continuous text → `maxWidth: 100%`, `margin: 0`.
  - Rendered + wrap → centered `maxWidth` from preset, `margin: 0 auto`.
- Secondary reconfigure effect now dispatches `layoutEffect` + `wordWrapEffect` alongside existing compartments, followed by `requestMeasure()` + `scrollIntoView`. Deps extended with `settings.wordWrap, settings.editorMaxWidth, settings.editorPadding`.
- `cm-wrap-off` class coordinated on the editor container when wrap is off.

### Menu System (F-4 resolved)
- **Deviation (logged):** The revised plan targeted `src/components/TitleBar/TitleBar.tsx` and `src/components/MenuBar/MenuBar.tsx`, but those files are **dead code** — never imported by any mounted component. The live menu chrome is `src/shell/ShellTitleBar.tsx` (Row 2 menubar) and `src/components/StatusBar/StatusBar.tsx`. Implementation was applied to the live components instead.
- `ShellTitleBar.tsx`: menu item renderer now supports optional `checked?: boolean` with a `Check` indicator. View menu gained:
  - `Toggle Word Wrap` / `Disable Word Wrap (Continuous Text)` with shortcut `Alt+Z` and live checkmark.
  - Width presets (4) and Padding presets (3) with per-item checkmarks.

### Hotkey (F-6 resolved)
- CodeMirror keymap: `Alt-z` in `Editor.tsx`.
- Global window listener: `Alt+Z` branch in `ShellFrame.tsx` `handleKeyDown`, guarded to skip when `e.target` is inside `.cm-editor` (prevents double-fire with the in-editor keymap).

### Action Unification (F-7/F-9 resolved)
- Added canonical `toggleWordWrap: () => void` to `settingsStore`. Used by StatusBar pill, ShellTitleBar menu item, and ShellFrame global handler.
- SettingsPanel Word Wrap checkbox retains explicit `updateSettings({ wordWrap })` (semantically correct for a checkbox).

## 4. Files Changed

| File | Action |
|:---|:---:|
| `contracts/data_shapes.ts` | MODIFY — EditorSettings +2 fields |
| `generated-documents/context/contracts/data_shapes.ts` | MODIFY — mirror |
| `src/store/settingsStore.ts` | MODIFY — defaults + `toggleWordWrap` |
| `src/index.css` | MODIFY — overflow-x auto; de-important canvas layout |
| `src/components/Editor/Editor.tsx` | MODIFY — 2 compartments, dynamic layout, Alt-z keymap, cm-wrap-off |
| `src/components/Sidebar/SettingsPanel.tsx` | MODIFY — Max Width + Padding selectors |
| `src/components/StatusBar/StatusBar.tsx` | MODIFY — Wrap/Cont pill |
| `src/shell/ShellTitleBar.tsx` | MODIFY — checked menu items, Word Wrap + Width/Padding presets |
| `src/shell/ShellFrame.tsx` | MODIFY — global Alt+Z handler |
| `tests/settingsStore.test.ts` | MODIFY — seed + 2 new tests |

## 5. Background Processes

None introduced. Pillar 7 not applicable (no polling/daemon/watcher). No Experimental toggle gating required.

## 6. Acceptance Criteria

- [x] All features implemented natively
- [x] Presenter purity preserved (zero native IPC in UI views; store owns state)
- [x] Zero inline fallback mock arrays introduced (defaults are configuration, consistent with TR-002)
- [x] Unit test suite updated and passing (151/151)
- [x] Per-feature audit (Prompt 16a/16b) — PENDING
- [x] Living Context Document update + commit — PENDING
- [x] Pushed to git — PENDING

## 7. Verification Results (2026-09-19)

- `node scripts/check-contract-sync.mjs` — PASS (byte-identical)
- `npm run lint` (`tsc --noEmit` + express-platform-leaks + contract-sync) — **exit 0** (113 files, zero platform leaks)
- `npm test` (Vitest) — **151 passed / 151** (16 files; +2 new: toggleWordWrap, width/padding presets)
- `npm run build` — **exit 0** (23.77s)
- `cargo check` (src-tauri) — **exit 0** (37.56s)

## 8. Risks Assessment

- CSS specificity regression risk mitigated by removing `!important` and testing specificity win via CodeMirror scoped classes.
- Double-fire of Alt+Z guarded by `.cm-editor` target check + in-editor keymap ownership.
- Next most likely friction: visual polish of presets UI and LivePreview margin parity (out of scope; deferred).