# CHANGELOG — CNTXT

All notable changes to the CNTXT project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 2026-09-14 — Mobile Platform Target Specification & Cross-Platform Canonical Data Shapes
- **Mobile (Android) Target Platform Specification**:
  - Published [`project_brief_v1.1.md`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/generated-documents/context/project_brief_v1.1.md) and updated [`living_context.md`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/generated-documents/context/living_context.md) (v1.5) formally adopting Android (via Tauri v2 Mobile runtime) as an official target platform alongside Desktop (Windows/macOS/Linux) and Web.
  - Documented mobile runtime architecture: touch ergonomics, soft keyboard layout handling, mobile accessory toolbar (`MobileAccessoryBar`), bottom navigation (`MobileBottomNav`), and Android Scoped Storage / Storage Access Framework (SAF) integration.
- **Canonical Data Shapes Alignment (Option B Polyglot Invariant)**:
  - Formally aligned with Core Architectural Invariant 3 (Option B): maintaining synchronized contract mirrors between `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts` across multi-platform boundaries.
  - Added `SupportedPlatformOS` and `DeviceProfile` domain shapes.
  - Expanded `IPlatformBridge` and adapter runtime detection in `src/adapters/tauriRuntimeAdapter.ts` and `src/adapters/browserRuntimeAdapter.ts` to detect Android/iOS environments.
  - Automated verification via `scripts/check-contract-sync.mjs` confirming 100% byte-identical synchronization.

### 2026-09-14 — Interactive Action Buttons, Extensible Formula Engine & Selection Control
- **Interactive In-Document Action Buttons (`[[action:id]]` & `[[action:id|Label]]`)**:
  - Implemented live interactive button widgets embedded directly in markdown documents via CodeMirror `Decoration.replace` and `WidgetType`.
  - Clicking in-document buttons executes formulas or sandboxed actions on-the-fly and reflects updates immediately in the active editor.
- **Tri-State Selection Transformation Framework**:
  - Added `selectionBehavior: 'auto' | 'replace' | 'insert'` to `Action` contract and state.
  - Implemented 3-way toggle controls in both the full `ActionEditorModal.tsx` and in-sidebar `ActionManager.tsx`.
  - `replace`: Guarantees the highlighted text is overwritten by the action output.
  - `insert`: Guarantees highlighted text is preserved, inserting output adjacent at the end of selection.
  - `auto`: Automatically infers intent based on whether the formula references `selection` or is a formatting transform.
- **Extensible Open Plugin Registry for `FormulaEngine`**:
  - Added `FormulaEngine.registerFunction(name, handler, metadata)` and instance-level `.registerFunction()` enabling runtime registration of custom formula functions.
  - Registered functions automatically integrate into the AST parser and populate the Formula Builder UI catalog.
  - Added `INSERT(expr)` and `REPLACE_SELECTION(expr)` built-in formula directives for granular text retention control.
  - Over 50+ built-in functions supported across Text, Markdown, Wrap, Lines, Math, DateTime, and Document Context categories.
- **Decoupled Headless Action Execution Service**:
  - Implemented `src/services/actionExecutor.ts` coordinating execution between `EditorView`, document stores, formula evaluation, and JavaScript sandbox without coupling UI presenters to native IPC.
  - Expanded `SandboxAPI` with `api.wrapSelection(prefix, suffix)`.
- **Comprehensive Automated Test Suite**:
  - Expanded vitest test suite to **86 automated unit tests** across 10 test files (`formulaParser`, `actionButtons`, `actionSandbox`, `actionStoreAndCompletion`, `templateVariables`, `tabStore`, `fileOps`, `findReplace`, `tokenEstimator`, `mermaidTheming`), all passing with 100% green status.
  - Scanned 108 files with zero platform leaks outside `src/adapters/` via `npm run lint`.

### 2026-09-13 — Post-Port Remediation & Architecture Hardening
- Remediated all 14 audit defects from Reconciled Port Audit across Batches 1–4.
- Hardened `actionSandbox.ts` with regex constructor/eval scanner, shadowed globals, and frozen `safeApi`.
- Gated background processes (Token Estimator, Autosave, Live Markdown Sync) under **Settings -> Experimental**.
- Hardened Tauri native file commands with canonicalization and canonical system root whitelisting (`src-tauri/src/commands/file.rs`).
- Replaced dangerous shell metacharacters and eliminated shell injection in `open_external` using `open = "5.3"` crate.
- Isolated all synthetic sample data strictly in `mocks/index.ts`.

### 2026-09-09 — Repository & Documentation Setup
- Initialized public repository (`EntropyRedux/cntxt`) with baseline commit
- Rewrote README.md to reflect the actual production repo layout, architecture rules, and current status
- Excluded design-source and working-paper directories from version control (`contextpad_replica_ai-studio/`, `generated_documents/`, `assets/`, `src-tauri/target/`, `src-tauri/gen/`)
- Documented known issues from the 2026-09-08 codebase audit

### 2026-09-08 — Codebase Audit & Frontend Portability Restructure (AI Studio build)
- Completed full codebase audit — **verdict: NOT PRODUCTION READY** (see criticals below)
- Restructured the AI Studio frontend for portability to the production build:
  - Expanded `IRuntimeBridge` contract with `storage`, `platform`, and `theme` namespaces
  - Migrated all Zustand stores to bridge-injected persistence (`bridge.storage`)
  - Migrated all components to `bridge.clipboard` / `bridge.storage`
  - Added `scripts/check-platform-leaks.mjs` regression guard, wired into `npm run lint`
  - Centralized persistence keys in `src/adapters/storageKeys.ts`
  - Added reference `TauriRuntimeAdapter` + adapters README documenting the platform boundary
- Verified: `npm run lint` passes (typecheck + leak scan — 90 files, zero platform leaks)

### Audit Criticals (blocking release)
- **CRITICAL:** Action-sandbox bypass via `new Function()` (`src/services/actionSandbox.ts`)
- **CRITICAL:** Bundle size ~357 MB gzipped (~1.1 GB uncompressed); all CodeMirror language modes eagerly loaded
- **CRITICAL:** Zero automated test coverage across the codebase
- **HIGH:** Path-traversal validation flaw in `src-tauri/src/commands/file.rs` (`validate_path`)
- **HIGH:** CSP allows `unsafe-eval` (required only by the broken sandbox)
- **HIGH:** Unused dependencies (`canvas-confetti`, `@google/genai`, `dotenv`, `express`)

### Added
- Refactored AI Studio prototype now serves as the primary CNTXT frontend development source
- Completed Tauri v2 desktop runtime scaffolding with native IPC commands (file operations via `rfd`, window management, keyring secrets, and preview server)
- Integrated Tauri v2 capabilities (`capabilities/default.json` and `preview.json`) and app icons
- Implemented `TauriRuntimeAdapter` with `@tauri-apps/api/core` and runtime auto-detection in `RuntimeBridgeProvider`
- Synchronized Vite dev port (5173) and strictPort configuration with Tauri `tauri.conf.json`
- Modular shell frame architecture with support for multiple shell modes (Classic, Prototype, Workbench)
- Design system layer with tokens, typography, spacing, and semantic color mappings
- Primitive component library (Button, Panel, Card, Input, Tab, Badge, Kbd, Modal, Tooltip)
- Pure TypeScript UI contracts layer (`ui-contract/`) with zero native dependencies
- Runtime bridge adapter pattern for portable UI and OS-independent development
- Migration guide and parallel-development architecture documentation
- MIGRATION.md with step-by-step Tauri integration instructions
- Tailwind CSS 4.1 integration with @tailwindcss/vite plugin
- CodeMirror 6 with language pack extensions (Python, JavaScript, JSON, Markdown, etc.)
- Zustand state management for client-side app state
- Motion animation library for UI transitions
- Express.js preview server support for web-based prototyping
- DOMPurify and marked for safe markdown rendering
- Canvas confetti animations for celebration moments

### Changed
- Removed stale copied ContextPad baseline snapshot (`contextpad_src/`)
- Tightened `.gitignore` rules to exclude `*.tsbuildinfo`, `*.sqlite`, `*.db`, `.cache/`, `.vite/`
- Consolidated CNTXT repo structure to focus on active refactored AI Studio app as primary source
- Enhanced project documentation and architecture clarity

### Fixed
- Build validation: Vite production build now completes successfully with 1879 modules
- Verified typecheck passes across the active workspace
- Confirmed zero npm audit vulnerabilities

### Removed
- Legacy ContextPad source snapshot directory (archived reference no longer needed for active development)

---

## [0.1.0] — 2026-09-02

### Initial Release

#### Project Structure
- **`src/design/`** — Design system tokens (spacing, radii, elevation, z-index, motion, typography)
- **`src/primitives/`** — Atomic design components with Tailwind and Lucide icons
- **`src/ui-contract/`** — Pure TypeScript contracts for shell, tabs, themes, notifications, panels, actions, bridge
- **`src/adapters/`** — Runtime bridge adapters (browser, mock, and placeholder for Tauri)
- **`src/shell/`** — Modular shell frames (ShellFrame, ClassicShell, PrototypeShell, WorkbenchShell, and supporting modules)
- **`src/components/`** — High-level domain components (Editor, Sidebar, TabBar, Modals, Mobile, Notifications)
- **`src/store/`** — Zustand client state stores
- **`src/themes/`** — CodeMirror 6 themes and syntax highlighting extensions

#### Key Features
1. **Portability-First Architecture**
   - 100% of design, primitives, contracts, shell, components, and themes are portable to desktop runtime
   - Clean adapter boundary separates UI from OS/runtime dependencies
   - IRuntimeBridge interface defines the only contract between UI and native code

2. **Shell Mode Support**
   - **Classic Mode**: Standard ContextPad desktop layout (top menubar, right activity bar, collapsible sidebar)
   - **Prototype Mode**: Next-gen CNTXT modular UI with quick-action ribbons and streamlined toolbars
   - **Workbench Mode**: Dedicated prompt engineering layout with split-screen and token metrics

3. **Design System**
   - Semantic color tokens mapped to CSS custom variables
   - Mathematical typography scales
   - Consistent spacing, radii, elevation, and motion across all components
   - Dark/light theme support

4. **Component Library**
   - Button (variants: primary, secondary, ghost, danger, accent; sizes: sm, md, lg; touch mode)
   - Panel, Card, Input, Tab, Badge, Kbd, Modal, Tooltip
   - Editor with CodeMirror 6 integration
   - Sidebar with multiple panel types
   - Command palette, variable filler, action sandbox
   - Mobile navigation and virtual keyboard accessory bar
   - Toast notification system

5. **Runtime Bridge Contract**
   - File system operations (open, save, save-as, import, export)
   - Window management (new window, minimize, maximize, close)
   - Clipboard operations (read, write)
   - Platform detection
   - Mock and browser adapters for testing and prototyping

6. **Developer Experience**
   - TypeScript strict mode throughout
   - Vite for fast HMR during development
   - npm run dev: Development server on :3000
   - npm run build: Production build with Vite
   - npm run preview: Preview production bundle
   - npm run lint: TypeScript type checking
   - npm run clean: Clean dist artifacts

#### Build Artifacts
- **Vite Production Build**: 1879 modules, ~1.1GB main chunk (uncompressed), 357.5 MB gzipped
- **Output**: `dist/` directory with optimized HTML, CSS, and JavaScript
- **Bundle**: index.html, index-*.css, index-*.js files with content hashing

#### Dependencies
- **React 19.0.1** — UI framework
- **CodeMirror 6** — Text editor with language support
- **Tailwind CSS 4.1** — Utility-first CSS
- **Zustand 5.0.15** — State management
- **Lucide React 0.546.0** — Icon library
- **Motion 12.23.24** — Animation primitives
- **@google/genai 2.4.0** — Google Gemini API integration (optional)
- **marked 18.0.10** — Markdown parser
- **DOMPurify** — HTML sanitization
- **canvas-confetti 1.9.4** — Celebration animations
- **Express 4.21.2** — Preview server
- **Vite 6.2.3** — Build tool

#### Documentation
- **README.md** — Project overview and quickstart
- **MIGRATION.md** — Step-by-step Tauri integration guide with concrete code examples
- **docs/parallel-ui-architecture.md** — Architecture overview and design decisions

#### Known Issues / Non-Blocking
- Vite build warning: Some chunks larger than 500 kB (mitigated by build.chunkSizeWarningLimit configuration)
  - Recommendation: Future optimization via dynamic import() and manual chunk splitting
- Large main bundle due to extensive CodeMirror language pack support
  - Recommendation: Lazy-load language extensions only when needed

---

## Build Tracking

All official builds are saved to `/CNTXT` local directory with the following structure:

```
/CNTXT/
├── dist/                    # Latest production build output
├── CHANGELOG.md             # This file
├── README.md                # Project overview
├── MIGRATION.md             # Integration guide
├── package.json             # Root dependencies
├── contextpad_replica_ai-studio/
│   ├── package.json         # AI Studio build config
│   ├── src/                 # Source code
│   └── dist/                # Build artifacts
└── docs/                    # Architecture and reference docs
```

---

## How to Update This Changelog

Each build should follow this pattern:

### For Development Builds
```markdown
### Changed
- [Brief description of changes made]

### Fixed
- [Bug fixes applied]

### Added
- [New features or components added]
```

### For Release Candidates / Versions
Create a new section with version number and date:

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- [Feature list]

### Changed
- [Behavior changes]

### Fixed
- [Bug fixes]

### Removed
- [Deprecated features]
```

### Quick Update Template
When committing a new build, add an entry at the top of the [Unreleased] section:

```markdown
## [Unreleased]

### [Date] — Build #NNN
- Change 1
- Change 2
- Fix 1
```

Then promote to a release version when ready.

---

## Version History Summary

| Version | Date       | Status      | Modules | Key Change |
| :------ | :--------- | :---------- | ------: | :---------- |
| 0.1.0   | 2026-09-02 | Stable      | 1879    | Initial refactored AI Studio baseline with modular shell architecture |
| -       | Ongoing    | Development | *       | Tracking changes in [Unreleased] section above |

---

## Compatibility & Build Notes

- **Node.js**: 18+ recommended
- **npm**: 9+
- **TypeScript**: 5.8.2
- **Vite**: 6.2.3+
- **React**: 19.0.1+
- **Tailwind CSS**: 4.1.14+

### Build Command
```bash
cd contextpad_replica_ai-studio
npm install
npm run build
```

### Output Location
Built artifacts are placed in `dist/` within the build directory and can be moved to `/CNTXT` for archival.

---

**Last Updated**: 2026-09-09  
**Maintained By**: CNTXT Development Team  
**Status**: Active Development
