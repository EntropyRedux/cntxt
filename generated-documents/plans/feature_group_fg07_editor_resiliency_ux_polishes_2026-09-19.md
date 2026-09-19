# Feature Group FG-07: Editor Resiliency, Performance & UX Refinements
**Date:** 2026-09-19  
**Status:** PROPOSED (Pending User Review)  
**Target:** `c:\Projects\LocalActive\Repo\Active\CNTXT`

---

## 1. Executive Summary & Goals
Address the 14-point audit findings from manual and production testing of CNTXT, resolving key UX redundancies, improving editor performance on large documents, adding base64 single-row folding in RAW mode, enabling search-unveiling for rendered Markdown tables, and preserving deep per-tab undo/redo history.

---

## 2. Detailed Scope & Component Changes

### A. Base64 Image Folding in RAW Mode
- **Problem:** Long base64 data URLs in RAW mode cause extreme vertical line wrapping (~1,000 visual rows per image), burying the rest of the text.
- **Solution:**
  1. Add `.cm-raw-image-line` single-row CSS truncation (`white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; height: 1.6em;`).
  2. Implement `base64FoldExtension.ts` providing a custom CodeMirror `foldService` for `![...](data:image/...)` lines.
  3. Displays a native fold chevron (▸ / ▾) in the line-number gutter; collapses long strings to a single row without mutating Markdown document text (no `#` syntax pollution).

### B. Find & Replace in Rendered Markdown Tables (Option B - Search-Unveil)
- **Problem:** Rendered tables use `Decoration.replace({ widget: new TableWidget(...) })`. CodeMirror's search finds text in the document model, but cannot apply highlight marks or pinpoint scroll coordinates inside opaque replacement widgets.
- **Solution:**
  1. In `liveMarkdown.ts`, check if the active search match falls within `[tableBlock.startLine, tableBlock.endLine]`.
  2. If matched, temporarily unveil that table into raw Markdown pipe text.
  3. Native search highlighter displays the match, and `scrollIntoView` centers directly on the cell.
  4. Automatically re-folds to the rendered widget when search navigates away or closes.

### C. Undo/Redo History Depth & In-Memory State Caching
- **Problem:**
  - Toggling RAW/Rendered mode destroys and recreates the `EditorView`, wiping the undo stack.
  - Switching tabs destroys the view, losing undo history.
  - Default `newGroupDelay: 500` groups whole paragraphs into 1 undo step.
- **Solution:**
  1. Remove `settings.editorMode` and `settings.theme` from the view recreation `useEffect` dependency array in `Editor.tsx`.
  2. Configure `history({ minDepth: 250, newGroupDelay: 300 })`.
  3. Maintain an in-memory `tabStateCache: Map<string, EditorState>` so switching between tabs restores the exact `EditorState` with 0ms delay and 100% undo history intact.

### D. Large Document Optimizations
- **Problem:** `liveMarkdown.ts` iterates through the entire document length (`while (pos <= docLen)`) on every transaction, causing typing lag on documents with 5,000+ lines.
- **Solution:**
  1. When line count exceeds `settings.largeFileThreshold` (5,000 lines), constrain decoration builder iteration to `view.visibleRanges` (plus 50-line buffer).
  2. Conditionally bypass heavy extensions (`bracketMatching`, heavy variable lookups) on huge documents.

### E. Settings & UI Cleanups
1. **Touch / Mobile Density:** Consolidate "UI Layout Density" dropdown and "Touchscreen Friendly Mode" checkbox into a single toggle: "Touch-Optimized Mode" in `SettingsPanel.tsx`.
2. **Editor Typography:** Remove redundant `activeFont.researchFocus` and `badge` text box in `SettingsPanel.tsx`.
3. **Backup & Reset:** Reduce Export, Import, and Reset into a single compact 3-column row (`grid grid-cols-3 gap-1.5`) in `SettingsPanel.tsx`.
4. **Menu Bar Redundancy:** Remove redundant `X` (Hide Menu Bar) button in `ShellTitleBar.tsx`.
5. **Ghost Feature Removal:** Remove "Formula Playground" menu item and tab reference from `ShellTitleBar.tsx`, `MenuBar.tsx`, `TitleBar.tsx`, `panelContract.ts`, and contracts.
6. **Help Menu:**
   - Remove "Command Palette" (already `Ctrl+K`).
   - Rename "About ContextPad (Welcome Guide)" to "About CNTXT".
   - Add "Markdown Formatting Guide" menu item opening a comprehensive `Markdown-Guide.md` reference tab.
7. **Formatting Modal (`FormattingCustomizerModal.tsx`):**
   - Expand modal width (`max-w-4xl w-[90vw]`).
   - Replace chunky 3-card button size selector with a compact segmented pill control.
   - Replace row of 7 category buttons with a clean `<select>` dropdown.
   - Add a Category field to the Custom Button creator form.
8. **Token Analytics Status Bar Button:** Remove `<PanelRight />` icon, retaining only the `<Coins />` token icon.

---

## 3. Contract Synchronization
- Remove `'formulas'` from `activeSidebarTab` union in:
  - `c:\Projects\LocalActive\Repo\Active\CNTXT\contracts\data_shapes.ts`
  - `c:\Projects\LocalActive\Repo\Active\CNTXT\generated-documents\context\contracts\data_shapes.ts`
  - Ensure 100% byte-identical Option B sync.

---

## 4. Verification & Validation Steps
1. `npm run lint` — 0 errors, 0 warnings.
2. `npm test` — all existing + new unit tests pass (151+ tests).
3. Contract byte comparison — 100% parity.
4. Standalone portable production build verification (`CNTXT-portable.exe`).
