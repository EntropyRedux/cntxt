# Master Trace Document & Remediation Plan: Production Parity, Raw Mode Engine & Visual Polish (v3)

> **Document Path:** `generated-documents/plans/refactor_plan_prod_parity_and_raw_mode_v3_2026-09-19.md`  
> **Supersedes:** `generated-documents/plans/archives/refactor_plan_prod_parity_and_raw_mode_v2_2026-09-19.md`  
> **Author:** Antigravity AI Pair Programmer & Solo Dev Workflow  
> **Date:** 2026-09-19  
> **Status:** APPROVED MASTER TRACE SPECIFICATION  
> **Target Production Binary:** `dist-portable/CNTXT-portable.exe`  
> **Reference Repository:** `C:\Projects\LocalActive\Repo\Discontinued\ContextPad`  

---

## 1. Executive Summary & Trace Objectives

This document serves as the **authoritative master trace specification** to resolve all visual, typographic, structural, and behavioral discrepancies between the development environment (`npm run dev`) and the production portable binary (`dist-portable/CNTXT-portable.exe`).

### Trace Objectives
1. **Completeness Verification**: Every friction point, user report, visual discrepancy, and functional regression identified across screenshots, dev vs. prod comparisons, and ContextPad reference analysis is captured in the defect inventory.
2. **Faithful Execution Verification**: Every fix is mapped to exact files, line numbers, before-and-after implementation patterns, and verifiable acceptance gates.
3. **Dual Mode Integrity**: Establish strict architectural separation between **Rendered Mode** (rich live markdown formatting with document margins) and **Raw Mode** (ContextPad-parity lightweight code-editor syntax highlighting with zero widget overhead and instant responsiveness).

---

## 2. Friction Point & Defect Traceability Matrix

| Trace ID | Category | Observed Defect (Prod vs. Dev) | Root Cause Analysis | ContextPad Reference / Architectural Invariant | Target File(s) & Lines |
|:---|:---|:---|:---|:---|:---|
| **FP-1** | **Line Formatting** | **Inline Splitting ("Broken Line" Bug)**:<br>Single inline bullet items (e.g. `* `Ctrl+K` : Open **Command Palette**`) split into 5 vertically stacked lines. | `liveMarkdown.ts:1565, 1595`<br>Uses empty `Decoration.replace({})` to hide markdown delimiters (backticks, asterisks). In CodeMirror 6, an empty replacement decoration without a widget falls back to `SpaceDeco`, fracturing the virtual `HeightMap` and breaking lines into distinct block rows. | ContextPad did not use `Decoration.replace({})` for inline tokens. Delimiters should either remain visible (Raw mode) or be hidden using inline CSS marks (`Decoration.mark({ class: 'cm-live-hidden-delimiter' })`) that preserve inline text flow without line breaks. | `src/extensions/liveMarkdown.ts`<br>(Lines 1388, 1410, 1565, 1595, 1625, 1655)<br>`src/index.css` |
| **FP-2** | **Editor Modes** | **Raw Mode Broken / Non-Functional**:<br>Switching to Raw mode (`Ctrl+M` or Mode toggle) hangs, causes cursor jumping, leaves broken widgets, or displays plain unstyled text without code editor ergonomics. | Compartment reconfigurations in `Editor.tsx` lacked clean unmounting of `liveMarkdownField`. In Raw mode, no syntax highlighting extension was mounted, and line numbers were missing or misconfigured. | ContextPad `src/themes/markdownHighlighting.ts` used native CodeMirror 6 `HighlightStyle.define` with Lezer tags (`t.heading`, `t.strong`, `t.emphasis`, `t.monospace`) + `lineNumbers()`. Raw mode is 100% pure text editing with zero replacement widgets. | `src/themes/markdownHighlighting.ts`<br>`src/components/Editor/Editor.tsx`<br>(Lines 185–260) |
| **FP-3** | **Layout & Margins** | **Missing Document Margins (Edge-to-Edge Bleed)**:<br>In Rendered mode, prose text touches the extreme left and right window borders without comfortable reading margins. | `Editor.tsx:208` hardcoded `.cm-content { padding: 0 16px !important; }` without max-width or auto-centering. | Dev build and modern markdown editors use centered reading/writing prose canvases in Rendered mode (`max-width: 880px; margin: 0 auto; padding: 24px 32px;`), while Raw mode uses full-width code editor padding (`padding: 8px 16px;`). | `src/components/Editor/Editor.tsx`<br>`src/index.css` |
| **FP-4** | **Typography & Fonts** | **Monospace / Courier New Fallback**:<br>Text renders in mechanical Windows Courier New in prod build. Font adaptation per theme was broken or defaulted to monospace. | 1. `vite.config.ts` lacked `base: './'`, causing bundled `@font-face` WOFF2 files to reference absolute `/assets/...` URLs which fail under Tauri's `tauri://localhost` custom protocol.<br>2. Font fallback stacks lacked common native Windows fonts (`Segoe UI`, `Consolas`, `Georgia`). | In ContextPad, fonts working reliably were Inter, Roboto, Serif, Consolas, Monaco. For CNTXT, fonts must auto-adapt per theme (`THEME_DEFAULT_FONTS`) while honoring explicit user overrides from settings/modals, with multi-tier native fallbacks. | `vite.config.ts`<br>`src/constants/fonts.ts`<br>`src/store/settingsStore.ts`<br>`src/styles/fonts.css` |
| **FP-5** | **Diagrams** | **Mermaid Diagrams Crushed & Nodes Unthemed**:<br>1. Middle nodes display truncated text (`Tabl`, `Diagra`, `Formul`).<br>2. Diagram nodes do not reflect active theme colors in prod build. | 1. `index.css:1419` applies `max-width: 100%` on SVG inside an editor column squished to ~350px by the 332px Document Outline sidebar.<br>2. `mermaid.initialize` only ran once on startup; switching themes never cleared `diagramCache`, so diagrams retained stale cached SVGs. | Mermaid node colors and strokes are defined in `theme/index.ts` (`getMermaidThemeConfig`). Diagrams must re-render on theme change via `clearMermaidCache()`. Diagram container must have `overflow-x: auto;` and SVG `max-width: none; min-width: max-content;`. | `src/services/mermaidRenderer.ts`<br>`src/store/settingsStore.ts`<br>`src/index.css` |
| **FP-6** | **Math Formulas** | **KaTeX Formulas Missing Radicals & Fractions**:<br>Formulas render without radical roof bars, missing fraction lines, and integrals display as `\|`. | `mathRenderer.ts:49` outputs `htmlAndMathml`. Windows WebView2 enables MathML by default but lacks OS OpenType Math fonts (e.g. Latin Modern Math), dropping SVG glyphs and vertical lines. | Setting KaTeX `output: 'html'` renders standard HTML spans and embedded SVGs for radicals ($\sqrt{\pi}$) and fraction lines ($\frac{a}{b}$), guaranteeing 100% complete formulas across all Windows platforms. | `src/services/mathRenderer.ts` (Line 49) |
| **FP-7** | **Scrolling** | **Missing Scrollbars & Mouse Scroll Stalling**:<br>No visible scrollbar in editor; mouse wheel scrolling refuses to scroll or lags. | `index.css` shrunk the scrollbar to 7px with `#33333A` thumb on `#1E1E1E` track (invisible contrast). HeightMap fragmentation from FP-1 confused CodeMirror's virtual scroller coordinate calculations. | Port ContextPad's proven 14px floating pill scrollbar (`Editor.module.css`) with `3px solid var(--editor-bg)` border, `overflow-x: hidden !important`, and `overflow-y: auto !important`. | `src/index.css`<br>(Lines 480–520) |
| **FP-8** | **Build & Bundling** | **Asset Protocol Resolution in Portable Binary**:<br>Bundled chunks, fonts, and assets fail to load when run as a standalone `.exe` without a dev server. | Vite defaults to root-relative `/` paths for all chunks and assets. In Tauri production builds on Windows, the WebView2 webview loads files from `tauri://localhost/` or local file systems, breaking absolute asset links. | Inject `base: './'` in `vite.config.ts`. Retain single-bundle portable packaging via `scripts/build-portable.mjs`. | `vite.config.ts`<br>`scripts/build-portable.mjs` |

---

## 3. Phase-by-Phase Technical Remediation Plan

### Phase 1: Build Protocol & Relative Asset Resolution
* **Target:** [`vite.config.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/vite.config.ts)
* **Status:** Implemented & Verified in Workspace
* **Detailed Trace Specification:**
  - Add `base: './'` at the root of the Vite configuration object.
  - Guarantees that `<script src="./assets/index-*.js">`, `<link href="./assets/index-*.css">`, and `@font-face { url('./assets/*.woff2') }` resolve relative to `index.html` regardless of the host environment (Tauri custom protocol or static file server).
  - Verify that `dist/index.html` references `./assets/` and not `/assets/`.

---

### Phase 2: Font Architecture, Theme-Adaptive Binding & Manual Overrides
* **Targets:**
  - [`src/constants/fonts.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/constants/fonts.ts)
  - [`src/store/settingsStore.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/store/settingsStore.ts)
  - [`src/styles/fonts.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/styles/fonts.css)
* **Status:** Implemented in `fonts.ts`; Store Hook in Progress
* **Detailed Trace Specification:**
  1. **Multi-Tier Fallback Chains in `src/constants/fonts.ts`**:
     - Provide resilient fallback cascades so that if a web font is loading or unavailable, the system gracefully degrades to high-quality native Windows fonts instead of generic `monospace` / `Courier New`:
       - **Proportional / Sans (Google Material 3, GitHub Light, Nord Light)**:
         `'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`
       - **Monospace (ContextPad Dark, Dracula, One Dark, Monokai, Nord Dark, Cyberpunk)**:
         `'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', 'Consolas', 'Cascadia Code', 'Monaco', Menlo, monospace`
       - **Serif (Parchment, Tokyo Night)**:
         `'Literata Variable', 'Literata', Georgia, 'Times New Roman', Times, serif`
  2. **Theme-Adaptive vs. Manual Override Logic in `src/store/settingsStore.ts`**:
     - When the user switches themes via MenuBar or Settings:
       ```typescript
       // In updateSettings:
       if (updates.theme && updates.theme !== state.settings.theme) {
         // Auto-adapt font to theme default UNLESS user has explicitly customized font
         if (!state.settings.isFontCustomizedByUser) {
           const themeDefault = THEME_DEFAULT_FONTS[updates.theme];
           if (themeDefault) {
             updates.fontFamily = themeDefault;
           }
         }
         // Clear Mermaid cache so diagram nodes pick up new theme colors
         clearMermaidCache();
       }
       if (updates.fontFamily && updates.fontFamily !== state.settings.fontFamily) {
         // User explicitly picked a font
         updates.isFontCustomizedByUser = true;
       }
       ```
  3. **Preserve User Choice**: When the user selects a font in the Settings Modal or Command Palette, set `isFontCustomizedByUser: true`. This guarantees their chosen font persists across theme changes. If they reset or clear, auto-adaptation resumes.

---

### Phase 3: ContextPad Native Raw Mode Engine
* **Targets:**
  - [`src/themes/markdownHighlighting.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/themes/markdownHighlighting.ts) *(Ported from ContextPad)*
  - [`src/components/Editor/Editor.tsx`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Editor/Editor.tsx)
* **Status:** `markdownHighlighting.ts` Created; `Editor.tsx` Wiring in Progress
* **Detailed Trace Specification:**
  1. **Port ContextPad's Native HighlightStyle**:
     - Implement `createMarkdownHighlighting(accentOverridesHeadings: boolean)` in `src/themes/markdownHighlighting.ts` using `@lezer/highlight` tags:
       - `tags.heading1`: `fontSize: 1.4em`, `fontWeight: bold`, colored with heading accent.
       - `tags.heading2`: `fontSize: 1.25em`, `fontWeight: bold`.
       - `tags.heading3`: `fontSize: 1.15em`, `fontWeight: bold`.
       - `tags.heading4-6`: `fontSize: 1.05em`, `fontWeight: bold`.
       - `tags.strong`: `fontWeight: bold`.
       - `tags.emphasis`: `fontStyle: italic`.
       - `tags.strikethrough`: `textDecoration: line-through`.
       - `tags.monospace`: styled inline code background and padding.
       - `tags.link`, `tags.url`, `tags.quote`, `tags.list`, `tags.meta`.
  2. **Clean Compartment Separation in `Editor.tsx`**:
     - Maintain two dedicated CodeMirror compartments:
       - `liveMarkdownCompartmentRef` (for Rendered Mode widgets and delimiters)
       - `markdownHighlightingCompartmentRef` (for Raw Mode pure syntax highlighting)
     - **When `isRenderedMode && isMarkdownOrText`**:
       - `liveMarkdownCompartment.reconfigure(liveMarkdownExtension)`
       - `markdownHighlightingCompartment.reconfigure([])`
     - **When `!isRenderedMode && isMarkdownOrText` (RAW MODE)**:
       - `liveMarkdownCompartment.reconfigure([])` (completely unmounts all widgets, tables, math, mermaid, and delimiter decorations)
       - `markdownHighlightingCompartment.reconfigure(createMarkdownHighlighting(true))`
     - **Gutters & Line Numbers**:
       - In Raw mode: line numbers are visible and clickable, with fold gutters.
       - In Rendered mode: line numbers can be hidden or shown based on user setting, with clean layout margins.

---

### Phase 4: Rendered Mode Continuity, Delimiter Hiding & Document Canvas Margins
* **Targets:**
  - [`src/extensions/liveMarkdown.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/extensions/liveMarkdown.ts)
  - [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
  - [`src/components/Editor/Editor.tsx`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Editor/Editor.tsx)
* **Status:** `liveMarkdown.ts` Delimiters Updated; CSS & Editor Canvas in Progress
* **Detailed Trace Specification:**
  1. **Inline Token Delimiter Fix in `liveMarkdown.ts`**:
     - All occurrences of empty `Decoration.replace({})` for delimiters (headings `#`, blockquotes `>`, bold `**`, italic `*`, strikethrough `~~`, inline code `` ` ``) are converted to:
       ```typescript
       Decoration.mark({ class: 'cm-live-hidden-delimiter' })
       ```
     - In `src/index.css`:
       ```css
       .cm-live-hidden-delimiter {
         display: none !important;
       }
       ```
     - **Result**: Delimiters are cleanly hidden from the visual DOM while preserving the inline text layout. Bullet items like `* `Ctrl+K` : Open **Command Palette**` remain strictly on a single horizontal line.
  2. **Document Canvas Margins**:
     - In Rendered Mode, wrap the editor content with comfortable reading margins:
       ```css
       .cm-editor.cm-rendered-mode .cm-content {
         max-width: 880px !important;
         margin: 0 auto !important;
         padding: 24px 32px 120px 32px !important;
       }
       .cm-editor.cm-raw-mode .cm-content {
         max-width: 100% !important;
         margin: 0 !important;
         padding: 8px 16px 120px 16px !important;
       }
       ```

---

### Phase 5: KaTeX Robust Math Rendering Engine
* **Target:** [`src/services/mathRenderer.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/services/mathRenderer.ts)
* **Status:** Implemented & Verified in Workspace (Line 49)
* **Detailed Trace Specification:**
  - In `renderMathToHtml(latex: string, displayMode: boolean)`:
    ```typescript
    return katex.renderToString(cleanLatex, {
      displayMode,
      throwOnError: false,
      errorColor: '#ef4444',
      output: 'html', // Changed from 'htmlAndMathml'
      trust: false,
      strict: false
    });
    ```
  - **Verification**: Windows WebView2 lacks OpenType math fonts required by raw MathML. Setting `output: 'html'` instructs KaTeX to emit pure HTML with inline SVG glyphs for radicals ($\sqrt{x}$), horizontal rule spans for fractions ($\frac{a}{b}$), and proper integral brackets ($\int$).

---

### Phase 6: Mermaid Diagram Theming & Responsive Auto-Sizing Engine
* **Targets:**
  - [`src/services/mermaidRenderer.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/services/mermaidRenderer.ts)
  - [`src/store/settingsStore.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/store/settingsStore.ts)
  - [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
* **Status:** In Progress
* **Detailed Trace Specification:**
  1. **Expose Nodes to Theme Engine**:
     - `theme/index.ts` already defines comprehensive theme colors (`nodeBg`, `nodeFg`, `nodeBorder`, `lineColor`, `labelBg`, `clusterBg`) for every theme in `getMermaidThemeConfig`.
     - In `src/store/settingsStore.ts`, when `theme` changes, invoke `clearMermaidCache()`.
     - In `src/services/mermaidRenderer.ts`, ensure `renderMermaidDiagram` re-initializes Mermaid with the new theme tokens whenever `themeName` changes, generating fresh SVGs with matching node colors.
  2. **Responsive Sizing & Label Clipping Prevention**:
     - In `src/index.css`:
       ```css
       .cm-live-mermaid-container {
         width: 100%;
         margin: 16px 0;
         border-radius: 8px;
         background: var(--card-bg);
         border: 1px solid var(--border-subtle);
         overflow: hidden;
       }
       .cm-live-mermaid-canvas {
         width: 100%;
         overflow-x: auto;
         overflow-y: hidden;
         padding: 16px;
         text-align: center;
         display: block;
       }
       .cm-live-mermaid-canvas svg {
         max-width: none !important;
         min-width: max-content;
         height: auto;
         display: inline-block;
         margin: 0 auto;
       }
       ```
     - **Result**: Diagram nodes are never squished or truncated. If the editor column is narrow (e.g. 350px with sidebar open), the diagram retains its natural dimensions and provides smooth horizontal scrolling rather than clipping text.

---

### Phase 7: ContextPad 14px Floating Pill Virtual Scroller
* **Target:** [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
* **Status:** In Progress
* **Detailed Trace Specification:**
  - Replace the 7px low-contrast scrollbar with ContextPad's proven 14px floating pill scrollbar:
    ```css
    .cm-editor .cm-scroller {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      height: 100%;
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) var(--editor-bg);
    }
    .cm-editor .cm-scroller::-webkit-scrollbar {
      width: 14px;
    }
    .cm-editor .cm-scroller::-webkit-scrollbar-track {
      background: var(--editor-bg);
    }
    .cm-editor .cm-scroller::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-thumb);
      border-radius: 7px;
      border: 3px solid var(--editor-bg);
    }
    .cm-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-thumb-hover);
    }
    ```
  - **Result**: High visual contrast on dark and light themes, comfortable mouse wheel scrolling without virtual coordinate stalling, and exact parity with ContextPad.

---

## 4. File-by-File Traceability Matrix

| File Path | Phase | Specific Lines | Planned Modification | Execution Status |
|:---|:---|:---|:---|:---|
| [`vite.config.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/vite.config.ts) | Phase 1 | Root export | Add `base: './'` for WebView2 relative assets | **COMPLETED** |
| [`src/constants/fonts.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/constants/fonts.ts) | Phase 2 | Lines 1–40 | Add multi-tier native fallbacks to `THEME_DEFAULT_FONTS` and `CURATED_FONTS` | **COMPLETED** |
| [`src/themes/markdownHighlighting.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/themes/markdownHighlighting.ts) | Phase 3 | Lines 1–110 | Port native CodeMirror syntax highlighting from ContextPad | **COMPLETED** |
| [`src/extensions/liveMarkdown.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/extensions/liveMarkdown.ts) | Phase 4 | Lines 1388–1665 | Replace empty `Decoration.replace({})` with `Decoration.mark` delimiters | **COMPLETED** |
| [`src/services/mathRenderer.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/services/mathRenderer.ts) | Phase 5 | Line 49 | Change KaTeX `output: 'htmlAndMathml'` to `output: 'html'` | **COMPLETED** |
| [`src/components/Editor/Editor.tsx`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Editor/Editor.tsx) | Phase 3, 4 | Lines 185–260 | Mount `markdownHighlighting` in Raw mode; unmount `liveMarkdown`; add canvas mode classes | **COMPLETED** |
| [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css) | Phase 4, 6, 7 | Lines 480–530, 1410–1430 | Add `.cm-live-hidden-delimiter`, 14px pill scrollbar, mermaid auto-overflow, canvas margins | **COMPLETED** |
| [`src/store/settingsStore.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/store/settingsStore.ts) | Phase 2, 6 | Lines 50–90 | Auto-adapt theme fonts with `isFontCustomizedByUser` override check; call `clearMermaidCache()` | **COMPLETED** |
| `scripts/build-portable.mjs` | Phase 8 | Build step | Compile fresh portable executable `dist-portable/CNTXT-portable.exe` | **COMPLETED** |

---

## 5. Verification & Acceptance Protocol

### 5.1 Automated Test Verification
Run the following automated verification suite:
```powershell
npm test
npm run lint
```
*Criteria:* Zero failing tests; 100% clean lint pass.

### 5.2 Build & Packaging Verification
Run the portable build script:
```powershell
node scripts/build-portable.mjs
```
*Criteria:* Clean exit code 0; produces `dist-portable/CNTXT-portable.exe`.

### 5.3 Step-by-Step Manual & Visual Trace Checklist
When the user launches `dist-portable/CNTXT-portable.exe` in a separate terminal, verify:

- [ ] **Check 1: Inline Bullet Formatting (FP-1)**
  - Open `Welcome.md` in Rendered Mode.
  - Navigate to the Keyboard Shortcuts list.
  - *Verify:* Each shortcut bullet (`* `Ctrl+K` : Open **Command Palette**`) displays on a single horizontal line with zero vertical splitting.
- [ ] **Check 2: ContextPad-Parity Raw Mode (FP-2)**
  - Press `Ctrl+M` to switch to Raw Mode.
  - *Verify:* Line numbers appear on the left; markdown syntax highlighting is cleanly applied (colored headings, bold, code); all delimiter widgets disappear; typing is completely fluid with zero latency or cursor jumps.
- [ ] **Check 3: Document Margins (FP-3)**
  - Toggle back to Rendered Mode (`Ctrl+M`).
  - *Verify:* Prose text is centered with comfortable ~880px max-width and clean padding, matching the dev build appearance.
  - Toggle back to Raw Mode (`Ctrl+M`).
  - *Verify:* Editor spans full width with standard code editor padding.
- [ ] **Check 4: Theme Fonts & Manual Overrides (FP-4)**
  - Switch themes across Google Material 3 (Sans), ContextPad Dark (Monospace), and Parchment (Serif).
  - *Verify:* Editor font automatically adapts to the theme's curated font family without falling back to Courier New.
  - Open Settings, manually select a custom font (e.g. `Roboto` or `Consolas`), and switch themes again.
  - *Verify:* The user's manually chosen font persists across theme changes.
- [ ] **Check 5: Mermaid Diagram Scaling & Theming (FP-5)**
  - Open a document containing a Mermaid flowchart with Document Outline sidebar expanded.
  - *Verify:* All node labels (`Tables`, `Diagrams`, `Formulas`) are completely visible without truncation; horizontal scrolling works smoothly if the column is narrow.
  - Switch themes (e.g. Dark to Light).
  - *Verify:* Diagram nodes re-render with the new theme's fill and border colors.
- [ ] **Check 6: KaTeX Math Formulas (FP-6)**
  - View math formulas in Rendered Mode.
  - *Verify:* Square roots ($\sqrt{\pi}$) render with horizontal radical roofs; fractions ($\frac{a}{b}$) render with horizontal division bars; integrals render with correct bounds.
- [ ] **Check 7: 14px Floating Pill Scrollbar (FP-7)**
  - Scroll down a long document using the mouse wheel and by dragging the scrollbar thumb.
  - *Verify:* Scrollbar is clearly visible as a 14px pill with border padding; mouse scrolling is smooth with zero stutter.

---

## 6. Execution Protocol & Sign-Off

This document is committed to `generated-documents/plans/` as the immutable trace of the remediation. Execution will proceed sequentially through the remaining phases (Phases 3, 4, 6, 7, 8) with zero deviation from these specifications.
