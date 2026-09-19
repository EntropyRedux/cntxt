# Comprehensive Remediation Plan: Production Visual & Functional Parity with ContextPad (v2)

> **Document Path:** `generated-documents/plans/refactor_plan_prod_parity_and_raw_mode_v2_2026-09-19.md`  
> **Supersedes:** `generated-documents/plans/archives/refactor_plan_prod_dev_visual_parity_2026-09-19.md`  
> **Author:** Antigravity AI Pair Programmer & Solo Dev Workflow  
> **Date:** 2026-09-19  
> **Status:** APPROVED FOR EXECUTION  

---

## 1. Executive Summary & Root-Cause Matrix

Comprehensive visual and structural discrepancies were identified between the Development build (`npm run dev`) and the Tauri Production build (`dist-portable/CNTXT-portable.exe`). By analyzing the active codebase alongside the original reference implementation in `C:\Projects\LocalActive\Repo\Discontinued\ContextPad`, every friction point has been traced to a specific root cause:

| # | Friction Point / Defect | Observed Symptom in Prod Build | Root Cause in Codebase | Reference / Solution |
|:---|:---|:---|:---|:---|
| **FP-1** | **Vertical Inline Splitting ("Broken Line" Bug)** | A single bullet item splits into 5 vertically stacked lines (`•`, `Ctrl/Cmd+K`, `: Open`, `Command Palette`, etc.). | `liveMarkdown.ts:1565, 1595` uses empty `Decoration.replace({})` to hide backticks/asterisks. In CodeMirror 6, `Decoration.replace({})` without a widget aliases to `SpaceDeco`, fracturing the `HeightMap` and breaking lines into separate block items. | Replace `Decoration.replace({})` with `Decoration.mark({ class: 'cm-live-hidden-delimiter' })` where `.cm-live-hidden-delimiter { display: none !important; }`. |
| **FP-2** | **Raw Mode Non-Functional / Broken** | Switching from Rendered to Raw mode hangs, causes cursor jumps, or fails to restore clean text editing. | Compartment reconfigurations in `Editor.tsx` clashed with lingering `liveMarkdownField` height distortions; lack of dedicated syntax highlighting in Raw mode left text unstyled without widgets. | Replicate original ContextPad `markdownHighlighting.ts` using native CodeMirror `HighlightStyle.define` (`tags.heading`, `tags.strong`, `tags.monospace`); clean compartment teardown. |
| **FP-3** | **Missing Scrollbars & Stalled Mouse Scroll** | No visible scrollbar in the editor; mouse wheel scrolling hangs or refuses to scroll document. | `index.css` shrunk scrollbar to 7px with `#33333A` on `#1E1E1E` (invisible contrast). HeightMap fragmentation from FP-1 confused CodeMirror's virtual scroller coordinate calculations. | Port ContextPad's proven 14px floating pill scrollbar (`Editor.module.css`) with `3px solid var(--editor-bg)` border and `overflow-x: hidden !important`. |
| **FP-4** | **Monospace / Courier New Font Fallback** | Editor text renders in mechanical Windows Courier New instead of curated theme typography. | `vite.config.ts` lacked `base: './'`, causing bundled WOFF2 web fonts to reference absolute `/assets/...`. Under Tauri WebView2, absolute URLs fail to resolve locally, falling back to `monospace` (`Courier New`). | Add `base: './'` to `vite.config.ts` and update font stacks in `fonts.ts` and `settingsStore.ts` with multi-tier native Windows fallbacks (`Segoe UI`, `Consolas`, `Georgia`). |
| **FP-5** | **KaTeX Formulas Missing Radicals & Fractions** | Math formulas render without radical roof bars, missing fraction division lines, and integrals as `\|`. | `mathRenderer.ts:49` outputs `htmlAndMathml`. Windows WebView2 enables MathML by default but lacks OS OpenType Math fonts (Latin Modern Math), dropping SVG glyphs. | Set KaTeX `output: 'html'`. KaTeX generates pure HTML spans and embedded SVGs for radicals and fraction bars. |
| **FP-6** | **Mermaid Diagrams Crushed & Truncated** | Middle nodes display clipped text (`Tabl`, `Diagra`, `Formul` instead of `Tables`, `Diagrams`, `Formulas`). | `index.css:1419` applies `max-width: 100%` on SVG inside an editor squished to ~350px by the 332px Document Outline sidebar. | Set `.cm-live-mermaid-canvas { overflow-x: auto; }` and `.cm-live-mermaid-canvas svg { max-width: none; min-width: max-content; }`. Clear diagram cache on theme switch. |
| **FP-7** | **No Editor Margins (Edge-to-Edge Bleed)** | Rendered mode text begins flush against column 0 with zero breathing room. | `Editor.tsx:208` hardcoded `.cm-content { padding: 0 16px !important; maxWidth: 100%; }` with no document prose container. | Apply centered document writing margins in Rendered Mode: `max-width: 880px; margin: 0 auto; padding: 24px 32px !important`. |

---

## 2. Phase-by-Phase Remediation Specification

### Phase 1: Build & Asset Protocol Invariants
* **Target File:** [`vite.config.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/vite.config.ts)
* **Action:**
  1. Add `base: './'` to ensure all bundled CSS, JS chunks, and `.woff2` font files resolve relative to `index.html` within Tauri’s Windows WebView2 custom asset protocol.
  2. Retain clean `esbuild` minification and exclude bloated chunk splitting to prevent IPC loading races.

### Phase 2: Font Fallback Architecture & Theme Binding
* **Target Files:**
  - [`src/constants/fonts.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/constants/fonts.ts)
  - [`src/store/settingsStore.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/store/settingsStore.ts)
  - [`src/styles/fonts.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/styles/fonts.css)
* **Action:**
  1. Update `THEME_DEFAULT_FONTS` and `CURATED_FONTS` with robust multi-tier fallback chains:
     - **Proportional / Sans (Google Material 3, GitHub Light):**  
       `'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif`
     - **Monospace (ContextPad Dark, Dracula, One Dark):**  
       `'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', 'Consolas', 'Cascadia Code', Menlo, monospace`
     - **Serif (Parchment):**  
       `'Literata Variable', 'Literata', Georgia, 'Times New Roman', Times, serif`
  2. In `settingsStore.ts`:
     - When `theme` changes, automatically apply `THEME_DEFAULT_FONTS[theme]` unless the user has explicitly selected a custom font.
     - Add an explicit `isFontCustomizedByUser` flag in settings to preserve manual user choices across theme changes.

### Phase 3: ContextPad Native Raw Mode Implementation
* **Target Files:**
  - [`src/themes/markdownHighlighting.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/themes/markdownHighlighting.ts) *(NEW / REBUILT from ContextPad)*
  - [`src/components/Editor/Editor.tsx`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Editor/Editor.tsx)
* **Action:**
  1. Port the original ContextPad `createMarkdownHighlighting(accentOverridesHeadings)` module using CodeMirror 6's `@lezer/highlight` tags:
     - `tags.heading1`: `fontSize: 1.5em`, bold, distinct heading color.
     - `tags.heading2`: `fontSize: 1.3em`, bold.
     - `tags.heading3`: `fontSize: 1.2em`, bold.
     - `tags.strong`: `fontWeight: bold`.
     - `tags.emphasis`: `fontStyle: italic`.
     - `tags.monospace`: syntax-highlighted inline code with distinct contrast.
  2. When `settings.editorMode === 'raw'`:
     - Disengage `liveMarkdownCompartmentRef` (reconfigure to `[]`).
     - Mount `markdownHighlightingCompartment` with `createMarkdownHighlighting()`.
     - Mount `getGuttersExtension()` with line numbers and fold gutters.
     - All markdown tokens (`#`, `*`, `` ` ``, `[ ]`, `>`) remain 100% plain text: zero delimiter replacement, zero widget injection, instant typing, and zero cursor jumping.

### Phase 4: Rendered Mode Continuity & Polishing
* **Target Files:**
  - [`src/extensions/liveMarkdown.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/extensions/liveMarkdown.ts)
  - [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
* **Action:**
  1. In `liveMarkdown.ts`, eliminate all empty `Decoration.replace({})` delimiter calls (lines 1388, 1410, 1565, 1575, 1595, 1605, 1625, 1635, 1655, 1665).
  2. Replace them with `Decoration.mark({ class: 'cm-live-hidden-delimiter' })`.
  3. In `index.css`, define:
     ```css
     .cm-live-hidden-delimiter {
       display: none !important;
     }
     ```
  4. In `Editor.tsx`, style Rendered Mode with comfortable document writing margins:
     ```css
     .cm-rendered-canvas .cm-content {
       max-width: 880px !important;
       margin: 0 auto !important;
       padding: 24px 32px !important;
     }
     ```

### Phase 5: KaTeX Math Typographic Fix
* **Target File:** [`src/services/mathRenderer.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/services/mathRenderer.ts)
* **Action:**
  1. Change KaTeX render option from `output: 'htmlAndMathml'` to `output: 'html'`.
  2. Ensures KaTeX outputs standard HTML spans and embedded SVGs for radicals ($\sqrt{\pi}$) and fraction lines ($\frac{a}{b}$) across all Windows WebView2 environments without requiring local system math fonts.

### Phase 6: Mermaid Diagram Scaling & Theming
* **Target Files:**
  - [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
  - [`src/services/mermaidRenderer.ts`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/services/mermaidRenderer.ts)
* **Action:**
  1. Update `.cm-live-mermaid-canvas` to `overflow-x: auto; text-align: center; display: block;`.
  2. Change `.cm-live-mermaid-canvas svg` to `max-width: none; min-width: auto; height: auto; margin: 0 auto; display: inline-block;`.
  3. In `mermaidRenderer.ts`, hook into theme change events to invalidate `diagramCache` so diagrams re-render instantly with theme-accurate node fills and borders.

### Phase 7: ContextPad 14px Pill Scrollbar Restoration
* **Target File:** [`src/index.css`](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/index.css)
* **Action:**
  1. Replace the 7px transparent scrollbar with ContextPad's 14px floating pill scrollbar:
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

---

## 3. Verification & Acceptance Trace Matrix

| Phase | Target Deliverable | Automated / Visual Test Verification Command | Acceptance Gate |
|:---|:---|:---|:---|
| **Phase 1** | Relative Asset Paths | Inspect `dist/index.html` and `dist/assets/*.css` for `./assets/` | Zero absolute `/assets/` references |
| **Phase 2** | Font Resolution | Launch portable `.exe`; inspect editor typography | Sans themes render Plus Jakarta Sans / Segoe UI; dark themes render JetBrains Mono; zero Courier New fallback |
| **Phase 3** | Native Raw Mode | Toggle `Ctrl+M` in editor; type continuously on any line | Line numbers appear; markdown syntax highlights cleanly; zero widget fragmentation; typing is 100% stable |
| **Phase 4** | Single-Line Bullets | Inspect `Welcome.md` shortcuts section in Rendered Mode | `* `Ctrl+K` : Open **Command Palette**` renders on a single horizontal line |
| **Phase 5** | Math Formulas | Inspect KaTeX section in Rendered Mode | Fractions have division lines; square roots have radical roofs; integrals render with limits |
| **Phase 6** | Mermaid Sizing | Inspect Mermaid flowchart in narrow editor | Full node text visible (`Tables`, `Diagrams`, `Formulas`); horizontal panning enabled |
| **Phase 7** | 14px Pill Scrollbar | Scroll editor document via mouse wheel and track dragging | 14px thumb clearly visible; smooth mouse wheel scroll to bottom of document |
| **Final** | Portable Package | `node scripts/build-portable.mjs` | Clean compilation of `dist-portable/CNTXT-portable.exe` |

---

## 4. Execution Readiness
This document serves as the authoritative trace for the remediation. Once approved, changes will be applied sequentially according to Phases 1–7.
