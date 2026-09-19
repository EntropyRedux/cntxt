# Refactor & Visual Parity Plan: Dev vs Production Parity
**Project**: CNTXT (`Repo/Active/CNTXT`)  
**Date**: 2026-09-19  
**Goal**: Bring the standalone production build (`CNTXT-portable.exe`) to 100% visual, typographic, and functional parity with the development build, resolving all differences identified from side-by-side screenshot analysis.

---

## 1. Executive Summary & Root Cause Analysis

From direct side-by-side inspection of 6 screenshot pairs (Left: Production Build, Right: Dev Build), we identified six distinct root causes behind the visual and functional divergence:

1. **KaTeX Math Broken in Production**:
   - *Cause*: `katex/dist/katex.min.css` was loaded via dynamic import and chunked separately by Rollup (`manualChunks`), preventing KaTeX CSS and webfonts from being linked and bundled into the production head.
   - *Result*: Mathematical expressions collapsed into unstyled Times New Roman with broken radical (`\sqrt`) and fraction elements.
2. **Editor Font Fallback to Generic Monospace (Courier New / Consolas)**:
   - *Cause*: The bundled `@fontsource-variable/jetbrains-mono` declares `@font-face` with `font-family: 'JetBrains Mono Variable'`, but the application font stack requested `'JetBrains Mono'`. Without an OS-installed JetBrains Mono, production fell back to generic Windows monospace.
3. **Document Content Divergence & Corrupted Welcome State**:
   - *Cause*: Production persists tabs to `%APPDATA%\com.cntxt.desktop\kv_store.json`. An earlier session had saved an edited/corrupted version of `Welcome.md` (containing `"The quick brown fox jumps over the lazy dog"`, stripped bold markers, and stray enters), whereas the Dev build launched with a clean slate and rendered the pristine `WELCOME_DOCUMENT`.
4. **Mobile/Tablet Formatting Accessory Bar Missing**:
   - *Cause*: The older production executable predated the accessory bar wiring into `ShellEditorContainer.tsx`, or had `showMobileAccessoryBar` persisted as false.
5. **Editor Mouse Wheel Scrolling & Scrollbars**:
   - *Cause*: Older production binary lacked the flex chain `min-h-0` fix and CodeMirror scroller CSS overrides.
6. **Mermaid Diagram Sizing**:
   - *Cause*: `.cm-live-mermaid-canvas svg` lacked min-width responsiveness, causing narrow columns to over-compress the diagram.

---

## 2. Phased Implementation Roadmap

### Phase 1: KaTeX CSS & Font Bundle Injection
- In `src/index.css`, add:
  ```css
  @import "katex/dist/katex.min.css";
  ```
- In `vite.config.ts`, remove the isolating `manualChunks` for KaTeX so Rollup bundles all KaTeX fonts and CSS directly into the primary application assets.
- Verify that `$$` display math and `$` inline math render with authentic mathematical glyphs.

### Phase 2: JetBrains Mono Variable Font Binding
- In `src/styles/fonts.css`, register `@font-face` aliases:
  ```css
  @font-face {
    font-family: 'JetBrains Mono';
    src: local('JetBrains Mono Variable');
    font-weight: 100 900;
    font-style: normal;
  }
  @font-face {
    font-family: 'Fira Code';
    src: local('Fira Code Variable');
    font-weight: 300 700;
    font-style: normal;
  }
  ```
- In `src/store/settingsStore.ts`, update `DEFAULT_SETTINGS.fontFamily` to:
  ```ts
  fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', Menlo, Monaco, 'Courier New', monospace"
  ```
- Update `src/constants/fonts.ts`, `src/themes/index.ts`, and `src/index.css` font stacks to prioritize `'JetBrains Mono Variable'`.

### Phase 3: Welcome Document Recovery & State Management
- In `src/store/tabStore.ts`, add a `resetWelcomeTab()` action that safely overwrites the corrupted `welcome-doc` in storage with the canonical `WELCOME_DOCUMENT`.
- Register the command in `src/components/Modals/CommandPalette.tsx` and `src/components/MenuBar/MenuBar.tsx` under `Help: Restore Welcome & Feature Showcase Guide`.
- When loading a tab whose content matches corrupted typing tests, detect and offer a single-click restore banner.

### Phase 4: Accessory Bar & Layout Parity
- Verify `ShellEditorContainer.tsx` renders `<MobileAccessoryBar />` whenever active tab exists and `settings.showMobileAccessoryBar !== false`.
- Ensure default setting is `true`.
- Add View menu toggle and status bar indicator.

### Phase 5: Mermaid Diagram Sizing & Visual Polish
- In `src/index.css`, refine `.cm-live-mermaid-canvas svg` to enforce `min-width: 280px; max-width: 100%; height: auto; display: block; margin: 0 auto;`.
- Add horizontal scroll overflow handling so wide diagrams remain crisp and scrollable.

### Phase 6: Automated Portable Rebuild Script & Cache Purge
- Create `scripts/build-portable.mjs` executing:
  1. Purge `dist/` directory.
  2. Purge `src-tauri/target/release/build/cntxt-*` (guaranteeing codegen assets are not stale).
  3. Run `npm run build` (Vite).
  4. Run `npx @tauri-apps/cli build -j 1`.
  5. Copy compiled binary to `dist-portable/CNTXT-portable.exe`.
- Add script `"build:portable": "node scripts/build-portable.mjs"` to `package.json`.

---

## 3. Verification & Acceptance Criteria
- [ ] `npm run lint` passes with 0 errors, 0 platform leaks, and 100% contract sync.
- [ ] `npm test` passes 100% (14 test suites, 126+ unit tests).
- [ ] Production executable runs side-by-side with Dev build.
- [ ] KaTeX math renders identical glyphs and layouts in both builds.
- [ ] JetBrains Mono typography displays in both builds.
- [ ] Scrollbars and mouse wheel scrolling function smoothly in both builds.
- [ ] Formatting accessory bar is visible in both builds.
- [ ] Mermaid diagrams render with full width and legible typography in both builds.
