# Refactor Plan: Dev Launch Optimization & Form Accessibility Hardening

> **Target Date:** 2026-09-19  
> **Status:** Approved / Executing  
> **Author:** Prod Agent  
> **Target Project:** CNTXT (`C:\Projects\LocalActive\Repo\Active\CNTXT`)  

---

## 1. Context & Identified Defects

During Chrome DevTools audits and launch profiling, two critical issues were observed:
1. **LCP = 21.75s (Poor)** with a **Time to First Byte (TTFB) of 19,156 ms** (~19.16s), leading to a perceived ~15–20s startup freeze on initial dev launch.
2. **Form Accessibility & Autofill Violation**: *"A form field element should have an id or name attribute. A form field element has neither an id nor a name attribute."*

---

## 2. Root Cause Analysis

### A. 19.16s TTFB Bottleneck (Vite Dev Server Dependency Discovery)
* In development mode (`npm run dev`), Vite employs on-the-fly dependency scanning (`vite:dep-scan`) when `optimizeDeps.include` is not explicitly declared.
* When the browser initiates the first connection to `http://localhost:5173/`, Vite halts transmission of `index.html` while running esbuild over all source files to identify and pre-bundle heavy unoptimized third-party modules (`@codemirror/*`, `zustand`, `lucide-react`, `canvas-confetti`, `react-dom`, `@tauri-apps/api/*`).
* Upon completing optimization (~18s later), Vite serves `index.html` and issues a full reload message (`✨ optimized dependencies changed. reloading`).
* **Remedy**:
  1. Explicitly list core runtime vendor packages in `optimizeDeps.include` inside `vite.config.ts`.
  2. Configure `server.warmup.clientFiles` for `src/main.tsx`, `src/App.tsx`, and `src/index.css` to trigger early module compilation.

### B. Form Field Accessibility Violations
* The Chrome DevTools Autofill / accessibility audit mandates that interactive `<input>` elements possess distinct `id` and `name` attributes.
* Five component files were identified containing unlabeled search and text inputs:
  - `src/components/Sidebar/TemplateManager.tsx`: Search input (line ~529)
  - `src/components/Sidebar/ActionManager.tsx`: Search input (line ~530) & Action Name input (line ~702)
  - `src/components/Sidebar/OutlinePanel.tsx`: Outline filter input (line ~304)
  - `src/components/Sidebar/WorkflowManager.tsx`: Search input (line ~262)
  - `src/components/FloatingSearch.tsx`: Search & command inputs (lines ~381, ~469)
* **Remedy**: Assign unique, semantic `id` and `name` attributes to all identified `<input>` elements.

---

## 3. Detailed Execution Specifications

### Step 1: `vite.config.ts` Optimization
Add `optimizeDeps.include` and `server.warmup` to `vite.config.ts`:
```ts
optimizeDeps: {
  include: [
    'react',
    'react-dom',
    'react-dom/client',
    'zustand',
    'lucide-react',
    'canvas-confetti',
    'marked',
    'katex',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/search',
    '@codemirror/autocomplete',
    '@codemirror/lang-markdown',
    '@codemirror/lang-javascript',
    '@codemirror/lang-python',
    '@codemirror/lang-html',
    '@codemirror/lang-css',
    '@codemirror/lang-json',
    '@codemirror/lang-sql',
    '@codemirror/lang-rust',
    '@codemirror/lang-cpp',
    '@lezer/highlight',
    '@tauri-apps/api/core',
    '@tauri-apps/api/event',
    '@tauri-apps/api/window',
  ],
},
server: {
  port: 5173,
  strictPort: true,
  watch: process.env.DISABLE_HMR === 'true' ? null : {},
  warmup: {
    clientFiles: [
      './src/main.tsx',
      './src/App.tsx',
      './src/index.css',
    ],
  },
},
```

### Step 2: Form Attribute Updates
Update each targeted `<input>` element with descriptive `id` and `name` attributes:
1. `src/components/Sidebar/TemplateManager.tsx`:
   - `id="template-search-input"`
   - `name="templateSearch"`
2. `src/components/Sidebar/ActionManager.tsx`:
   - Search input: `id="action-search-input"` / `name="actionSearch"`
   - Custom Action Name input: `id="action-name-input"` / `name="actionName"`
3. `src/components/Sidebar/OutlinePanel.tsx`:
   - `id="outline-filter-input"`
   - `name="outlineFilter"`
4. `src/components/Sidebar/WorkflowManager.tsx`:
   - `id="workflow-search-input"`
   - `name="workflowSearch"`
5. `src/components/FloatingSearch.tsx`:
   - Default query input: `id="floating-search-input"` / `name="floatingSearchQuery"`
   - Command query input: `id="floating-search-cmd-input"` / `name="floatingSearchCmdQuery"`

---

## 4. Verification Gates
1. `npm run lint` — Zero ESLint / formatting errors.
2. `npm test` — All 126 unit tests passing.
3. `npm run test:e2e` — All 21 Playwright E2E tests passing.
4. `npm run build` — Clean production bundle build.
5. `cargo check` — Clean Rust check.
6. Dev server cold startup benchmark — TTFB verification.
