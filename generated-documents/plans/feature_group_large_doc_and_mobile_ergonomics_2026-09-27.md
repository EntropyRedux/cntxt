# IMPLEMENTATION PLAN: LARGE DOCUMENT TRUNCATION & MOBILE ERGONOMICS
**Document ID**: `FG-09-PLAN-01`  
**Target Milestone**: CNTXT Desktop v0.3.9 & Android Mobile Runtime  
**Created Date**: 2026-09-27  
**Author**: Production Implementation Agent  
**Status**: APPROVED / PENDING EXECUTION  

---

## 1. Executive Summary & Architectural Strategy

This plan scopes the implementation of 4 interrelated features spanning both desktop and mobile/touch contexts, designed to preserve performance on low-resource environments and maximize writing ergonomics:

1. **Large Document Truncation & TOC Chunk Loading**: Prevents memory spikes and rendering lag when opening massive markdown files (>150KB on Android, >500KB on Desktop) by presenting an interactive Table of Contents outline to selectively load specific chapters or sections.
2. **Variable & Row Extraction as Action Presets**: Implements 4 granular variable extraction operations directly within CNTXT's sandboxed Action Engine, avoiding UI clutter and enabling instant cross-platform execution via the Action Sidebar, Ribbon, and Command Palette.
3. **Modernized Adaptive Fill-Up Form (`VariableFillerModal`)**: Transforms the desktop-centric variable filler into a fluid, adaptive modal that transitions from a side-by-side desktop view to a mobile-optimized full-screen view with a segmented Form/Preview toggle, keyboard-aware clearance, and a sticky `< Prev` / `Next >` navigation bar.
4. **Touch Mode Edge-Anchored Draggable FAB**: Introduces a draggable floating action button that magnets to screen edges in touch mode, providing single-tap variable navigation and form access above the virtual keyboard.

---

## 2. Scope & Platform Boundaries

| Feature Component | Desktop Runtime | Touch Mode (Desktop/Tablet) | Android Native Runtime |
| :--- | :--- | :--- | :--- |
| **Large Document Detection** | Active (Default: 500 KB / 10k lines) | Active (Default: 150 KB / 2.5k lines) | Active (Default: 150 KB / 2.5k lines) |
| **TOC Chunk Loading Modal** | Centered Dialog | Centered / Oversized Dialog | Full-Screen Bottom Sheet |
| **Extraction Actions** | Action Library (`EXTRACTION`) | Action Library (`EXTRACTION`) | Action Library (`EXTRACTION`) |
| **Fill-Up Form Layout** | 50/50 Form + Live Preview Split | Segmented Form / Preview Toggle | Full-Screen Sheet with Keyboard Clearance |
| **Sticky Navigation Bar** | Disabled (standard Tab navigation) | Enabled above bottom bar | Enabled directly above IME Keyboard |
| **Edge-Anchored Draggable FAB** | Hidden | Visible & Draggable | Visible & Draggable |

---

## 3. Detailed Implementation Phases

### Phase 1: Feature 1 — Large Document Truncation & TOC Chunk Loading

#### 1.1 Canonical Contracts & Configuration
- In `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts`:
  ```typescript
  export interface EditorSettings {
    // ... existing settings
    enableLargeDocDetection?: boolean;
    largeDocThresholdKb?: number;
    largeDocThresholdLines?: number;
  }
  ```
- In `src/store/settingsStore.ts`:
  - Add defaults: `enableLargeDocDetection: true`, `largeDocThresholdKb: 500`, `largeDocThresholdLines: 10000`.
  - In `SettingsPanel.tsx`, add controls under `Editor Settings`:
    - Checkbox: "Large Document Detection"
    - Number inputs for file size threshold (`KB`) and line count threshold (`Lines`).

#### 1.2 File Opening Interception
Intercept file loading across all entry points before setting full content into the active tab:
- `src/components/Sidebar/FileExplorer.tsx` (`handleFileClick`)
- `src/adapters/eventDispatcher.ts` (Tauri file open events)
- `src/shell/ShellFrame.tsx` (Drag-and-drop & CLI argument files)

**Interception Logic**:
```typescript
const sizeKb = Math.round(new Blob([content]).size / 1024);
const lineCount = content.split('\n').length;
const isLarge = settings.enableLargeDocDetection && (
  sizeKb >= settings.largeDocThresholdKb ||
  lineCount >= settings.largeDocThresholdLines
);

if (isLarge) {
  useLargeDocModalStore.getState().openLargeDocModal(tabId, fileName, content);
} else {
  createTab(fileName, content, lang, filePath);
}
```

#### 1.3 TOC Section Extraction & Buffer Loading
In `src/components/Modals/LargeDocModal.tsx`:
- Parse headings `#` through `######` with line ranges.
- Display an interactive tree checklist with Select All / Deselect All.
- Action 1: **Open Full Document** &mdash; injects entire raw string and closes modal.
- Action 2: **Load Selected Sections** &mdash; slices only the selected line ranges, prepends a clean metadata banner, updates the active tab, and notifies the user:
  ```markdown
  # [Truncated View] Document Title
  > ℹ️ Viewing 3 of 14 sections (Original size: 840 KB). [Open Full Document]
  
  ## Section 1
  ...
  ```
- Mount `LargeDocModal` inside `src/shell/ShellModalLayer.tsx`.

---

### Phase 2: Feature 3 — Granular Variable Extraction Action Presets

Implement the 4 approved extraction operations as built-in presets in `mocks/index.ts` and `src/store/actionStore.ts` under category `EXTRACTION`:

1. **`Extract Answered Variables`** (`action-extract-answered`):
   - Scans active document for filled variables or key-value pairs matching `{{varName}}` substitutions.
   - Formats and copies a clean Markdown summary table / bulleted list:
     ```markdown
     ### Extracted Document Variables
     | Variable | Value |
     | :--- | :--- |
     | client_name | Acme Corporation |
     | delivery_date | 2026-10-15 |
     ```
2. **`Extract Rows With Variables`** (`action-extract-rows-with-vars`):
   - Splits document into lines; filters lines matching `/\{\{[^}]+\}\}/`.
   - Copies matching rows to clipboard and displays an informative notification.
3. **`Extract Rows Without Variables`** (`action-extract-rows-without-vars`):
   - Inverses the filter; strips lines containing variable tags, isolating boilerplate static text.
4. **`Selection: Extract Variables`** (`action-selection-extract-vars`):
   - Inspects the active text selection (`context.selection`), extracts all unique `{{...}}` tokens, and outputs them as a formatted checklist.

---

### Phase 3: Feature 2 — Modernized Adaptive Fill-Up Form Modal (`VariableFillerModal.tsx`)

#### 3.1 Adaptive Dual-Mode Layout
- **Desktop Mode (>768px)**:
  - Clean side-by-side view with left input list and right real-time interpolated markdown preview.
- **Mobile / Touch Mode (<768px or `settings.touchOptimized`)**:
  - Full-screen container (`fixed inset-0 z-50`).
  - Segmented View Switcher:
    ```tsx
    <div className="flex p-1 bg-[var(--card-secondary-bg)] rounded-lg">
      <button onClick={() => setView('form')}>✍️ Form ({filledCount}/{total})</button>
      <button onClick={() => setView('preview')}>👁️ Live Preview</button>
    </div>
    ```

#### 3.2 Visual Viewport & Keyboard Clearance
- Register `window.visualViewport.addEventListener('resize')` when modal is mounted.
- Dynamically calculate available keyboard-free height:
  ```typescript
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  ```
- Constrain modal height to `viewportHeight` so the modal bottom bar remains persistently anchored above the software keyboard.

#### 3.3 Sticky Keyboard-Aware Navigation Bar
A dedicated navigation strip pinned above the keyboard:
- **`[ ‹ Prev ]`** and **`[ Next › ]`** buttons to automatically focus the previous/next variable input without dismissing the software keyboard.
- Current variable counter: `Variable 3 of 7 (2 required left)`.
- Primary action: **`[ ✨ Insert / Apply ]`** with active completion validation.

#### 3.4 Touch Sizing & Field Upgrades
- Increase touch input height to `h-11` (44px) with rounded corners and clear labels.
- Support multi-line textarea with auto-grow for variables with extensive default text.
- Visual completion progress bar at the top of the form.

---

### Phase 4: Touch Mode Edge-Anchored Draggable FAB

- Component: `src/components/Mobile/TouchVariableFab.tsx`
- Conditionally rendered when `settings.touchOptimized || platform.isMobile` and active tab contains `{{...}}` tokens.
- **Interactions**:
  - Drag vertically along screen edge (constrained to `top: 60px` to `bottom: ${keyboardOffset + 60}px`).
  - Snaps horizontally to nearest edge (left or right, `x: 12px` or `x: windowWidth - 52px`).
  - **Single Tap**: Auto-scrolls editor to and highlights the next variable placeholder.
  - **Long Press / Double Tap**: Opens the modernized `VariableFillerModal`.

---

## 4. Android Handoff Reference: Feature 4 (TOC Quick Append)

Documented for the Android native build team:
- **Action**: In the Android TOC outline drawer, add a secondary action on each heading node:
  - `Insert Link at Cursor`: Inserts `[Heading Title](#slug)` at caret.
  - `Insert Section Content`: Copies heading and body text to caret.

---

## 5. Verification & Testing Matrix

1. **Contract Integrity**:
   - Run `node scripts/check-contract-sync.mjs` ensuring `contracts/data_shapes.ts` matches `generated-documents/context/contracts/data_shapes.ts`.
2. **Platform Leaks Check**:
   - Run `node scripts/check-platform-leaks.mjs` verifying zero native or platform leaks outside `src/adapters/`.
3. **Unit Tests (`npm test`)**:
   - Add unit tests in `tests/largeDocModal.test.ts` testing threshold logic and section slicing.
   - Add unit tests in `tests/actionStore.test.ts` validating the 4 extraction scripts.
   - Maintain 100% test pass rate across all 33+ test suites.
4. **Release Build Validation (`npm run tauri:build`)**:
   - Verify Vite production compilation and native release executable generation.
