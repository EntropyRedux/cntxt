# CHANGELOG — CNTXT

All notable changes to the CNTXT project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.5.2] — 2026-10-09

### Panel Apps: App Builder & Host Shell Integration (Flow A)
- **Domain Contracts & Canonical Data Shapes (`contracts/data_shapes.ts`, `src/contracts/boundarySchemas.ts`)**:
  - Added `PanelAppManifest`, `PanelAppRecord`, `PanelAppNetworkMode`, and `PanelAppCreatedFrom` types.
  - Added strict runtime Zod validation schemas (`PanelAppManifestSchema`, `PanelAppRecordSchema`) with validators (`validatePanelAppManifest`, `validatePanelAppRecords`).
  - Extended `ViewSettings.activeSidebarTab` union with `'app-builder'` and `'panel-app'`.
  - Maintained 100% synchronization with living context contract.
- **Dynamic Code Fence Selection & .cntxt App Serialization (`src/features/panelApps/format/`)**:
  - Implemented dynamic-length fence calculator (`pickFence`) preventing collision with backtick runs in embedded HTML scripts.
  - Implemented round-trip verified serializer (`buildCntxtApp`) and parser (`parseCntxtApp`) extracting the first fenced HTML block from `.cntxt` frontmatter markdown files.
- **Static Preflight Scanner & Network Isolation (`src/features/panelApps/preflight/`)**:
  - Built preflight analyzer (`scanHtml`) detecting external script tags, stylesheets, remote fonts, `@import`, and `fetch()` URLs.
  - Displays dynamic **🟢 Offline-ready** or **🟡 Needs network** badge with detailed size contributor diagnostics.
  - Enforces 512 KB soft limit (warning) and 2.0 MB hard limit (creation blocking).
  - Detects unsafe `window.parent` / `top` accesses.
- **HTML Source Resolver (`src/features/panelApps/source/resolveHtml.ts`)**:
  - Automatically resolves raw HTML documents and extracts fenced HTML code blocks from open markdown tabs or disk files.
- **Zustand Registry & Builder Stores (`src/features/panelApps/state/`)**:
  - Built persistent `panelAppsStore` maintaining registry index, active app ID, and storage hydration.
  - Built `builderStore` state machine managing wizard steps (Source → Details → Review), drafts, and preloads.
- **Side-Effect Service & Native File System Bridge (`src/features/panelApps/services/createPanelApp.ts`, `src-tauri/src/commands/file.rs`)**:
  - Enhanced Rust `write_file` command with recursive parent directory creation (`fs::create_dir_all`).
  - Generated origin-safe alphanumeric app IDs (`a` + 16 hex chars).
  - Preflight guard re-verification and safety round-trip parse check before writing to disk.
- **Pure UI Presenter Suite (`src/components/panelApps/`)**:
  - `AppBuilderPanel.tsx`: 3-step wizard with step indicators, validation guards, and navigation controls.
  - `SourceStep.tsx`: Tab picker filtering for HTML documents + native file picker.
  - `DetailsStep.tsx`: App metadata editor, integrated Lucide `IconPicker`, network mode toggle (`offline` vs `cdn`), and panel width slider.
  - `ReviewStep.tsx`: Preflight inspection summary, size bar, and creation trigger.
  - `PreflightReport.tsx`: Detailed contributor breakdown and findings list.
  - `NetworkBadge.tsx`: Visual network status indicator.
  - `AppRail.tsx`: Dynamic left rail with App Builder launcher button and scrollable app icon stack.
  - `AppPanelPlaceholder.tsx`: Right panel drawer showing app metadata, isolated origin notice, reload button, and direct "Edit .cntxt File" editor integration.
- **Shell & Navigation Integration (`ActivityBar.tsx`, `Sidebar.tsx`, `TabBar.tsx`, `ShellFrame.tsx`)**:
  - ActivityBar now renders the dynamic AppRail in both desktop vertical and mobile bottom modes.
  - Tab context menu now offers "Set as panel app" on documents containing HTML, preloading the builder directly.
  - Sidebar seamlessly hosts both the App Builder and active Panel Apps with dynamic panel width matching the app's manifest.
  - ShellFrame hydrates the panel apps registry on initial startup.
- **Comprehensive Unit Test Suite (`tests/panelApps.test.ts`)**:
  - Added 17 unit tests verifying dynamic fence selection, .cntxt round trips, preflight scanning, source extraction, and registry state management (417/417 tests passing across 41 test files).

## [0.5.1] — 2026-10-09

### Syntax Color Highlighting Granularity & Code Block Overhaul
- **AI Studio Single-Row 4-Button Switcher Grid (`src/components/Sidebar/SettingsPanel.tsx`)**:
  - Replaced legacy settings dropdown with single-row 4-button grid switcher: `Auto`, `Markdown`, `Headers`, `OFF`.
  - Added active state highlight styling (`var(--accent-primary)`), indicator badge, contextual explanation card, and toast notifications.
  - Added mobile touch target compliance (`min-h-[36px] flex items-center justify-center`) and responsive typography (`text-[10.5px] sm:text-[11px]`).
- **Hierarchical Heading Color Palettes (`src/themes/index.ts`, `src/index.css`)**:
  - Implemented per-theme `THEME_MARKDOWN_PALETTES` across all 9 themes (`google-material-3`, `github-light`, `parchment`, `one-dark`, `dracula`, `nord`, `monokai`, `github-dark`, `solarized-dark`, `contextpad-dark`).
  - `Headers Only` mode now preserves rich hierarchical heading colors (H1 blue, H2 green/cyan, H3 teal, H4 purple, etc.) while stripping non-heading token colors (inline code pills, tags, links, quotes, and code blocks) to clean base monochrome text.
  - `OFF` / `None` mode renders strict solid monochrome text (#FFFFFF on dark themes, #000000 on light themes).
  - `Markdown Formatted` mode renders headers, bold, italic, tags, and links in color while keeping code blocks monochrome.
- **Immediate Editor Reactivity Bugfix (`src/components/Editor/Editor.tsx`)**:
  - Added `settings.syntaxHighlighting` to the `useEffect` dependency array in `Editor.tsx`, fixing the bug where syntax mode changes did not reactively reconfigure the active CodeMirror canvas until a document reload.
  - Deprecated conflicting `markdownHighlightingCompartment` override, consolidating 100% of syntax highlighting into `themeCompartment` via `getEditorThemeExtension`.
- **Code Block Aesthetic & Spacing Refinements (`src/index.css`)**:
  - Added `.cm-live-codeblock-start + .cm-live-codeblock-mid { padding-top: 6px !important; }` to eliminate excessive top whitespace gap inside fenced containers.
  - Added scoped monochrome rules for fenced code blocks in `headers-only` and `markdown-formatted` modes.
- **Tri-Platform Verification & Packaging**:
  - Fresh Windows portable binary (`dist-portable/CNTXT_0.5.1_portable.exe`, 13.67 MB) and installers (`dist-installer/`).
  - Fresh signed Android APK (`dist-android/CNTXT-v0.5.1-arm64.apk`, 26.62 MB).
  - 400/400 unit tests passing, 0 platform leaks, 100% contract synchronization.

### Full Codebase Re-Audit Remediation & Security Hardening
- **Complete Re-Audit Remediation (22/22 Findings Resolved)**:
  - Systematically remediated findings R-01..R-13 and D-01..D-09 against all 9 Audit Pillars.
  - **Dynamic Preview Sinks & Strict Web CSP (R-02, D-03)**: Injected strict `<meta http-equiv="Content-Security-Policy">` into `index.html` and Vercel response headers in `vercel.json`. Routed dynamic preview renderers (`mermaidWidget.ts`, `mathWidget.ts`) through `sanitizePreviewHtml` (`src/adapters/domHelper.ts:284`), completely eliminating un-sanitized DOM sinks.
  - **Single-Use Window Token Claims & IPC Authorization (R-03, R-05)**: Added `CLAIMED_WINDOWS` tracking in `src-tauri/src/commands/mod.rs` to enforce single-use session token claims per window label. Token-gated `new_window` in `src-tauri/src/lib.rs` and `open_oauth_url` / `start_oauth_listener` in `auth.rs`. Plumbed cached `getSessionToken()` into frontend callers.
  - **OAuth Loopback Hardening & Wildcard CORS Removal (R-04)**: Bound `expected_state` generated from Supabase OAuth URL in `supabaseClient.ts` to `start_oauth_listener`, verifying CSRF state parameters before accepting callbacks. Tightened route matching and completely excised wildcard `Access-Control-Allow-Origin: *` headers from loopback HTTP responses.
  - **Cold E2E Sandbox Timing & Server Warmup (R-01, R-12, D-01, D-02, D-09)**: Preserved production 10s sandbox timeout in `src/services/actionSandbox.ts:156` while adding dev server warmup in `vite.config.ts` for critical client and worker bundles. Injected explicit `__E2E_ACTION_TIMEOUT__ = 25000` via `e2e/fixtures.ts` to ensure 100% green cold-start Playwright test suites (24/24 passed).
  - **Observable Feedback & Error Swallowing Eradication (R-08, R-11)**: Replaced silent `catch` blocks in `src/adapters/authStorageAdapter.ts` with descriptive `console.warn` diagnostic logs and actionable `useNotificationStore` warning toast notifications across all 9 storage access sites. Added toast and logging fallbacks to `FileExplorer.tsx` and `SettingsPanel.tsx`.
  - **Elimination of Untyped `any` (R-09, D-04)**: Replaced remaining `catch (err: any)` with `catch (err: unknown)` across boundary layers, establishing 0 untyped `any` occurrences across all 145 files.
  - **Dead Code Pruning & Metric Integrity (R-07, R-10, D-08)**: Pruned unreachable `communityLibraryService.ts` from desktop, pruned 4 dead sync exports from `supabaseClient.ts`, and eliminated synthetic metrics in production code.

### Approved Architectural Tradeoffs
- **TR-021: Opt-In Preset Demo Mode**: Browser runtime seeds sample actions and templates only when `window.__CONTEXTPAD_DEMO__ === true`, preserving empty initial production state while facilitating automated UI validation and onboarding demos.
- **TR-022: System Browser OAuth Launch**: System default browser launch via `open::that(url)` without modal confirmation dialog is approved for intentional user auth clicks, hardened via token-gated IPC commands, CSRF state binding, and elimination of wildcard CORS headers.

### Truncated Large Document Read-Only Safety Interlock
- **Accidental Truncation Prevention (`contracts/data_shapes.ts`, `src/adapters/eventDispatcher.ts`)**:
  - Extended canonical `Tab` contract with `isTruncatedView` and `rawFullContent`.
  - Added strict save guard to `onSaveFile` in `eventDispatcher.ts`: direct file saving is locked when viewing a truncated preview, preventing accidental overwrite of unselected sections on disk.
  - Added `restoreFullContent(tabId)` to `tabStore.ts` allowing instant 1-click restoration of the complete un-truncated document.
  - Added persistent amber notice banner in `Editor.tsx` informing users that the view is in Preview Mode with direct save locked and providing a 1-click "Open Full Document" button.
  - Expanded test coverage in `tests/largeDocModal.test.ts` (11/11 tests passing, 399/399 unit tests green).

### Production Release Packaging & Signing
- **Signed Windows Packages**:
  - Official Windows NSIS setup (`dist-installer/CNTXT_0.5.1_x64-setup.exe`).
  - WiX Enterprise MSI installer (`dist-installer/CNTXT_0.5.1_x64_en-US.msi`).
  - Standalone zero-install executable (`dist-portable/CNTXT_0.5.1_portable.exe` and `CNTXT-portable.exe`).
  - Digitally signed with Authenticode SHA256 and RFC 3161 timestamps via `npm run package:sign`.
- **Verification Gates (100% Green)**:
  - `npm run lint`: 0 errors across 145 files clean, 0 platform leaks, 100% contract synchronization.
  - `cargo test --manifest-path src-tauri/Cargo.toml`: 8/8 security tests passed.
  - `npm test`: 40/40 test suites, 399/399 unit tests passed.
  - `playwright test`: 24/24 E2E tests green on cold server.

## [0.5.0] — 2026-10-03

### Brand Redesign & Universal Master Iconography
- **Centered High-Resolution Brand Icon**:
  - Replaced legacy application iconography across all platforms with the modern high-resolution circular badge design featuring centered alignment and transparent alpha masking.
  - **Desktop (Windows / macOS / Linux)**: Replaced `icon.ico`, `icon.png`, `icon.icns`, and Windows Live Tile / App manifest assets (`Square30x30Logo.png` through `Square310x310Logo.png`, `StoreLogo.png`).
  - **Android (Tauri v2 Mobile)**: Deployed adaptive launcher icons (`ic_launcher.png`, `ic_launcher_round.png`, and `ic_launcher_foreground.png` with vector `ic_launcher_background.xml`) across all five standard mipmap densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`).
  - **Web Target (`cntxt-web`)**: Deployed `favicon.ico`, `favicon-32x32.png`, `icon.png`, and navbar header logo `logo.png` with dark-mode compatibility.
  - **Automated Processing Pipeline (`scripts/replace-all-icons.py`)**: Script using Pillow to feather alpha borders, normalize canvas padding, and batch-export to all target formats.

### Architecture & Specification Plans
- **Large Document Truncation & TOC-Driven Chunk Loading (`generated-documents/plans/large_document_toc_chunking_plan_2026-10-03.md`)**:
  - Full architectural design for selective document chunking. Configurable file-size thresholds (>100KB on mobile, >1MB on desktop) trigger an interactive Outline modal, allowing users to load only target chapters or sections to maintain smooth 60fps CodeMirror editing and conserve memory.
- **Android Quick Append Message Box in TOC Panel (`generated-documents/plans/android_toc_quick_append_plan_2026-10-03.md`)**:
  - Mobile-tailored specification for a non-blocking Quick Append drawer in the Table of Contents outline panel. Enables instant micro-note capture and voice-to-text dictation into designated heading sections without full editor view switching.
- **Fill-Up Form Modal Touch Modernization**:
  - Modernized flexible UI/UX layout for action and template variable entry modals, supporting both keyboard-first desktop use and touch-screen mobile devices.
- **Typing Direction Engine (LTR / RTL)**:
  - Added support for dynamic text direction switching in the CodeMirror editor and live preview pane.

### Web SaaS UX Redesign, Auth Gateway & Onboarding (FG-11)
- **Web SaaS Auth Gateway (`src/components/Auth/WebAuthGateway.tsx`)**:
  - Unauthenticated visitors on the Web target are presented with a branded landing gateway with Google & GitHub 1-click OAuth (via Supabase) and a "Try Demo Workspace" guest entry button backed by browser IndexedDB.
  - Native Desktop and Android builds automatically bypass the gateway and remain 100% offline out-of-the-box.
- **Unified 48px Web Header (`src/components/Header/WebHeader.tsx`)**:
  - Replaces separate TitleBar (36px), MenuBar (30px), and ModularRibbon (44px) on Web with a single, sleek 48px top bar like Google Docs / Linear.
  - Features inline editable document title, live cloud sync status indicator, quick-action formatting pill toolbar (Bold, Italic, Heading, Code, Action widget, Split Preview toggle), `⌘K` command palette trigger, Zen mode toggle, and user avatar session dropdown with Open Tabs switcher.
- **Auto-Hide on Scroll (Phase 4)**:
  - Header smoothly tucks away on scroll-down (>60px) to maximize writing canvas space and reveals on scroll-up or top hover (<35px).
- **Option A Document Drawer (`src/shell/ShellEditorContainer.tsx`)**:
  - Horizontal tab bar is cleanly hidden on Web, freeing up ~36px of vertical canvas; document switching flows via the Sidebar drawer, `⌘K` quick switcher, and WebHeader dropdown.
- **3-Step First-Run Onboarding Modal (`src/components/Modals/OnboardingModal.tsx`)**:
  - Interactive onboarding for new users: workflow archetype selection (Prompt Architect, Developer, Writer), starter document generation (Prompt Architecture Kit, Technical Spec & Diagram Kit, Clean Slate), and 3-superpower walkthrough (Executable Action Buttons, Multi-Model Token Estimators, Split Live Preview).
- **Session & Auth Management Store (`src/store/authStore.ts`, `src/adapters/authStorageAdapter.ts`)**:
  - Pure Zustand store managing Supabase OAuth transitions, IndexedDB guest mode, onboarding completion flags, and cloud profile synchronization with zero platform leaks.

### Full Codebase Security Remediation & Declarative Engine Overhaul (P-01 .. P-20)
- **Elimination of `new Function` / `eval` and Strict CSP (P-01, P-08)**:
  - Replaced dynamic string code evaluation with a real recursive-descent AST Tokenizer, Parser, and sandboxed AST Interpreter (`ActionTokenizer`, `ActionParser`, `ActionASTInterpreter` in `src/services/actionEngine.ts`) over an allowlist of grammar nodes.
  - Eliminated all test-fixture string matching branches; unknown or unsupported statements/constructs (`while`, `for`, `class`, `import`, `eval`, undeclared variables, unpermitted methods) unconditionally throw visible errors (satisfying Pillar 9).
  - Added adversarial payload corpus test suite in `tests/actionSandbox.test.ts` verifying that unsupported constructs throw rather than silently returning undefined.
  - Rewrote built-in presets (`src/constants/defaultPresets.ts`) into deterministic `pipeline` operations (`ActionOp[]`).
  - Removed `'unsafe-eval'` from Tauri CSP (`script-src 'self'`).
  - Deleted unsandboxed fallback runners in `actionSandbox.ts` and `actionWorker.ts`.
- **Desktop OS Keyring Enforcement & Plaintext Fallback Elimination (P-02, P-18)**:
  - Removed all plaintext fallback files (`.secrets_fallback.json`) from `src-tauri/src/commands/secrets.rs`.
  - Desktop secrets strictly route through native OS Keyring (`keyring::Entry`); mobile platforms fail closed.
  - Corrected `has_api_key` to return `Result<bool, String>` and eliminated error swallowing on secret deletion.
- **Universal IPC Cryptographic Token Authorization (P-03, P-14)**:
  - Extended 256-bit ephemeral session token validation to 100% of sensitive Tauri commands: `delete_file`, `read_directory`, file inspection, `secrets::*`, and `window::*`.
  - Configured `is_authorized_token` to fail closed on `None` in production builds.
  - Automatically merged `sessionToken` into `invokeTauri` and `invokeTauriVoid` in `tauriRuntimeAdapter.ts`.
  - Dropped unnecessary Tauri capability permissions (`core:default`, `core:webview:default`, `core:webview:allow-create-webview-window`).
- **Path Security, TOCTOU Hardening & .env Redaction (P-04)**:
  - Enforced `validate_path` across all file inspection commands (`get_file_name`, `detect_language_from_path`, `get_file_modified_time`, `open_file_explorer`, `get_dir_name`).
  - Redacted `.env` files from `read_directory`.
  - Re-canonicalized target paths immediately before deletion in `delete_file` to eliminate TOCTOU race conditions.
  - Added `#[serde(deny_unknown_fields)]` to `FileNode`.
- **Cargo Profile & Dependency Lockdown (P-05)**:
  - Set `default = []` in `src-tauri/Cargo.toml` so devtools are strictly opt-in.
  - Configured production release profile with `codegen-units = 1`, `lto = "thin"`, `incremental = false`, `opt-level = 3`, and `strip = true`.
- **Tier 2 Code Quality, Validation & Architecture Remediation (P-09, P-10, P-11, P-15, P-16, P-19)**:
  - **Test-Only Command Scoping (P-19)**: Annotated `clear_session_token` with `#[cfg(test)]` in `src-tauri/src/commands/mod.rs` to eliminate runtime exposure in production builds.
  - **Native Dialog Deduplication (P-16)**: Unified duplicate `#[cfg]` dialog declarations (`open_file_dialog`, `save_file_dialog`, `open_folder_dialog`) in `src-tauri/src/commands/file.rs` with internal platform cfg branches.
  - **Zero Any Typing Debt (P-09)**: Eliminated 100% of legacy `: any`, `<any>`, and `as any` casts across `src/` (26 source files refactored down from 93 matches to genuinely 0 occurrences across all 136 files).
  - **Boundary Schema Validation (P-10)**: Implemented runtime schema validation via Zod in `src/contracts/boundarySchemas.ts` with 6 validators (`validateTab`, `validateTabCache`, `validateAction`, `validateTemplate`, `validateWorkspaceBackup`, `validateVirtualFile`). All 6 validators are wired in across tab caching (`tabSessionCache.ts`, `tabStore.ts`), action imports (`actionStore.ts`), template imports (`templateStore.ts`), workspace backup restoration (`SettingsPanel.tsx`), and virtual file persistence (`FileExplorer.tsx`). Test suite in `tests/boundarySchemas.test.ts` (13/13 passing).
  - **Observable User Feedback & Augmented Error Resilience (P-11)**: Augmented error handling across stores, adapters, and UI components with actionable user notifications via `useNotificationStore.getState().addNotification(...)` (174 notification refs), ensuring visible user-facing toasts on operation failures to satisfy Pillar 9.
  - **LiveMarkdown Monolith Modularization (P-15)**: Modularized `src/extensions/liveMarkdown.ts` into discrete modules under `src/extensions/liveMarkdown/` (`bridgeState.ts`, `languageMeta.ts`, `scanners.ts`, and 7 discrete widget modules under `widgets/` with barrel `index.ts`), reducing the coordinator file from 1,732 to 770 lines (-962 lines) while preserving 100% test compatibility.
- **Verification Gates**:
  - `npm run lint`: 0 errors across 136 files, zero platform leaks, 100% canonical contract sync.
  - `cargo test`: 8/8 security tests passing.
  - `npm test`: 38/38 test suites passing (384/384 unit tests).
  - `npm run build`: Clean production bundle (zero type or asset errors).

## [0.4.0] — 2026-09-28

### Full Codebase Security Hardening & Option A Remediation
- **Physical Mock Quarantine Decoupling (Pillar 1)**:
  - Extracted production default presets into `src/constants/defaultPresets.ts`, completely decoupling runtime assets from test mocks.
  - Re-exported presets in `mocks/index.ts` strictly for test fixtures.
  - Replaced legacy dynamic mock imports in `browserRuntimeAdapter.ts`; verified `src/` now has genuine zero imports from `mocks/`.
- **Unified Sandbox API Factory & Worker Realm Isolation (Pillars 8 & 9)**:
  - Created `src/services/sandboxApiFactory.ts` providing a single source of truth for the complete 24-member `SandboxAPI` matrix (including `slugify`, `formatJSON`, `base64Encode/Decode`, `countWords`, and `dialog` RPC).
  - Hardened `src/services/actionWorker.ts` with `DedicatedWorkerGlobalScope` validation, ambient capability stripping (`fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `indexedDB` set to `undefined`), and deeply frozen prototype hierarchies (`Object`, `Function`, `Array`).
  - Added Playwright integration suite `e2e/actionSandboxRealm.spec.ts` verifying sandbox execution and ambient network capability neutralization.
- **Option A CSP Alignment & TR-003 Re-affirmation (Pillar 8)**:
  - Hardened `src-tauri/tauri.conf.json` with `"withGlobalTauri": false` and desktop CSP retaining `'unsafe-eval'`.
  - Re-affirmed `TR-003` in `living_context.md` with physical worker realm isolation justification, guaranteeing zero eval capabilities on the main DOM thread while preserving 100% action compatibility.
- **HTML Sanitization & KaTeX Layout Tokenization (Pillars 8 & 9)**:
  - Tagged parsed math spans with unique nonces (`data-cntxt-math`).
  - Hardened `domHelper.ts` to unconditionally strip `position: fixed`, `position: sticky`, `z-index`, and dangerous `xlink:href` schemes across all elements, preventing UI redressing and clickjacking while preserving KaTeX math typography.
- **Platform Adapter Boundary Encapsulation (Pillars 2, 3 & 4)**:
  - Created `src/adapters/androidBridgeHelper.ts` to encapsulate Android Storage Access Framework Java bridge calls.
  - Replaced raw window escapes in `src/adapters/tauriRuntimeAdapter.ts` and `src/store/tabStore.ts`.
  - Tightened `scripts/check-platform-leaks.mjs` with explicit adapter allowlist.
- **Native IPC Authorization & Cargo Features (Pillar 8)**:
  - Extracted `validate_external_url` in `src-tauri/src/lib.rs` and added comprehensive unit test suite in `src-tauri/src/tests/security_tests.rs`.
  - Gated devtools in `src-tauri/Cargo.toml` with `default = ["devtools"]`.
- **Verification Gates**:
  - All 5 gates passed: `npm run lint` (0 errors), `npm test` (37/37 suites, 361/361 tests passing), `cargo test` (4/4 security tests passing), `npm run build` (clean bundle), `npm run test:e2e` (23/23 Playwright tests passing).

## [0.3.9] — 2026-09-27

### Large Document Truncation & Mobile UI Ergonomics
- **Large Document Detection & TOC Chunk Loading**:
  - Added configurable large document threshold detection (`enableLargeDocDetection`, `largeDocThresholdKb: 500`, `largeDocThresholdLines: 10000`; defaulting to 150KB / 2500 lines in touch/mobile modes).
  - Intercepts large markdown notes across File Explorer, file open dialogs, and drag-and-drop.
  - Interactive Table of Contents modal allows selective loading of individual sections/chapters with clean metadata banners, or opening the full document.
  - Added threshold configuration controls in Settings -> Editor Settings.
- **Modernized Adaptive Fill-Up Form (`VariableFillerModal`)**:
  - Dual-mode layout: preserves 50/50 side-by-side editing on desktop, transitions to a full-screen sheet with a segmented `[ Form ]` / `[ Preview ]` toggle on mobile and touch mode.
  - Visual Viewport dynamic sizing tracks `window.visualViewport` to guarantee bottom action bars remain visible above the software keyboard.
  - Sticky keyboard navigation strip with `< Prev` and `Next >` buttons to jump through variables without closing the virtual keyboard, accompanied by an active required counter and progress bar.
  - Increased touch input height to `min-h-[44px]` with auto-growing textarea support.
- **Granular Variable Extraction Action Presets**:
  - Added 4 built-in extraction operations under category `EXTRACTION`:
    - `Extract Answered Variables`: Formats filled key-value pairs into a clean markdown summary table.
    - `Extract Rows With Variables`: Filters document lines containing `{{variable}}` placeholders to the clipboard.
    - `Extract Rows Without Variables`: Isolates static boilerplate text by stripping lines with variables.
    - `Selection: Extract Variables`: Extracts unique variables from active selection into an actionable task checklist.
  - Added `copy` alias to `SandboxAPI`.
- **Draggable & Edge-Anchored Variable Navigator FAB (`VariableFloatingNavigator`)**:
  - Upgraded the original canvas-level floating navigator to be movable and draggable within the editor container.
  - Zero-latency direct DOM transform updates (60-120fps) and magnetic horizontal edge-snapping (12px left/right margins) within the editor canvas.
  - Jitter-free hover transitions without scale flickering.
  - Single tap auto-scrolls to and highlights the next variable placeholder via CodeMirror selection; double-tap opens the variable filler modal.
- **Signed Installer Packages**:
  - Official Authenticode signed installers with RFC 3161 timestamps generated for v0.3.9:
    - NSIS Setup: `dist-installer/CNTXT_0.3.9_x64-setup.exe` (5.93 MB)
    - WiX MSI: `dist-installer/CNTXT_0.3.9_x64_en-US.msi` (6.95 MB)
    - Standalone Portable: `dist-portable/CNTXT_0.3.9_portable.exe` (13.48 MB)

## [0.3.8] — 2026-09-27

### Document Outline Refinements & Typing Direction Engine
- **Document Outline Panel Usability & Typography**:
  - Removed redundant inner subheader banner (`DOCUMENT OUTLINE`), reclaiming vertical viewing space.
  - Relocated Table of Contents synchronization and export action buttons into the filter row alongside symbol category pills (`All`, `Headings`, `Code`, `Tasks`, `Tables`).
  - Increased font sizes across the outline tree by +1px (`text-[13px]` labels, `text-[11px]` line numbers and badges) for improved readability and scanning.
  - Removed the quick append chat input box from the bottom of the panel, dedicating 100% of panel height to document navigation.
- **Top-to-Bottom vs. Bottom-to-Up Typing Direction**:
  - Added full support for reverse stream/conversation typing mode in the editor engine (`typingDirection: 'top-to-bottom' | 'bottom-to-up'`).
  - Implemented CodeMirror 6 keymap interceptor: when in `bottom-to-up` mode, typing at Line 1 and pressing Enter automatically shifts the line down to Line 2 while returning the cursor to Line 1 pos 0.
  - Added a dedicated typing direction toggle button in the Shell Title Bar with dynamic `ArrowDownToLine` / `ArrowUpToLine` state icons and accent highlighting.
  - Added a `Typing Direction` toggle option in the `Edit` menu dropdown and a selection control in `Settings -> Editor Settings`.
- **Contract & Architecture Integrity**:
  - Updated canonical schemas in `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts`.
  - Added comprehensive unit test coverage in `tests/settingsStore.test.ts`.

## [0.3.7] — 2026-09-27

### Quick Markdown Toolbar Stability & Polish
- **Eliminated Rapid Icon Flickering & Disappearance**:
  - Fixed infinite storage echo loop caused by `initializeFormattingStore()` re-saving buttons on every load and re-triggering Tauri `storage_changed` events.
  - Added a 1.2s local save debounce guard in `formattingStore.ts` to prevent self-echo and race condition overwrites with defaults.
  - Removed phantom preset resurrection that reintroduced disabled presets into the active button array.
- **Unconditional & Reliable Button Deletion**:
  - Fixed `removeButton()` so both built-in presets and custom buttons are cleanly and permanently removed from the active toolbar array on the first click.
  - Deleted presets seamlessly return to the "Preset Library" tab with an active `+ Add` button for easy restoration.
  - Removed blocking toast notification overlays that were rendering over trash buttons and intercepting mouse clicks.
- **Smooth Toolbar Expand / Collapse Transition**:
  - Removed `transition-all` on the dynamic flex container in `MobileAccessoryBar.tsx` that caused multi-row wrap animation thrashing.
  - Guarded horizontal overflow and scroll indicators in `checkOverflowAndScroll()` during multi-row expansion, eliminating the double-hop stutter when expanding or collapsing the toolbar.

## [0.3.6] — 2026-09-27

### Quick Markdown Toolbar Category Management & Modular Ribbon Isolation
- **Modular Ribbon vs Quick Markdown Toolbar Separation**:
  - Completely decoupled the Quick Markdown formatting toolbar customizer (`FormattingCustomizerModal.tsx`) from the Modular Ribbon (`useRibbonStore`).
  - Removed accidental auto-pinning to the desktop top ribbon; custom formatting buttons are now strictly dedicated to the bottom Quick Markdown formatting accessory bar (`MobileAccessoryBar.tsx`).
- **Comprehensive Formatting Category Management**:
  - Implemented dynamic category management matching Templates and Action Scripts in `formattingStore.ts` (`getAllCategories`, `addCategory`, `renameCategory`, `deleteCategory`, `moveCategory`, `categoryOrder`).
  - Integrated `CategoryManagerModal` into `FormattingCustomizerModal.tsx` for creating, renaming, reordering, and deleting categories with fallback reassignment.
  - Replaced hardcoded category `<select>` with `<CategorySelector>` in the custom button creator for instant on-the-fly category assignment and inline category creation.
  - Converted the Preset Library category filter dropdown to dynamically display all categories with live button counts and a dedicated "Categories" management button.
  - Added category badges on active buttons in the Manage tab.
  - Persisted custom formatting categories in `STORAGE_KEYS.FORMATTING_CATEGORIES`.

## [0.3.5] — 2026-09-27

### Production Build Parity, Stale Codegen Cache Resolution & Desktop Quality of Life
- **Cargo Codegen Cache Invalidation & Build Parity**:
  - Implemented recursive directory watching in `src-tauri/build.rs` (`watch_dir_recursive`) ensuring Cargo tracks every file in `../dist`, preventing stale embedded asset retention on release builds.
  - Enhanced `scripts/build-portable.mjs` and `npm run tauri:build` pipeline to purge stale release `.fingerprint/cntxt-*` and `target/release/build/cntxt-*` artifacts before compilation.
  - Enabled `"withGlobalTauri": true` in `tauri.conf.json` and resilient multi-tier IPC resolution (`window.__TAURI_INTERNALS__`, `window.__TAURI__.core`, and `@tauri-apps/api/core`) in `tauriRuntimeAdapter.ts` and `runtimeBridge.tsx`.
- **Direct File Overwrite (`Ctrl+S`) Parity**:
  - Resolved `write_file` void-return mismatch via `invokeTauriVoid` in `tauriRuntimeAdapter.ts`, guaranteeing `Ctrl+S` overwrites previously opened/saved files directly without triggering unwanted "Save As" prompts.
- **Custom Formatting Buttons in Modular Ribbon**:
  - Added "Add Formatting" tab in `RibbonCustomizerModal.tsx` allowing one-click pinning of custom markdown formatting syntax to the Modular Ribbon with real-time preview and icon assignment.
  - Fixed form state reset in `FormattingCustomizerModal.tsx` when creating new formats.
- **True Italic Typography in Rendered Mode**:
  - Registered explicit italic `@font-face` aliases in `fonts.css` and added `font-synthesis: weight style !important;` in `index.css` to guarantee clean italic rendering across all bundled fonts (JetBrains Mono, Inter, Fira Code, Inconsolata, Atkinson Hyperlegible, etc.).
- **Live Markdown External Link Navigation**:
  - Enabled `Ctrl+Click` and `Ctrl+Right-Click` on markdown links in the editor via `bridge.openExternalUrl`, sanitized with strict protocol validation (`http://`, `https://`) in `src-tauri/src/lib.rs`.
- **Action Manager Category Case Normalization**:
  - Added case-insensitive grouping and Collapse All / Expand All toggle across all custom action categories in `ActionManager.tsx`.

## [0.3.2] — 2026-09-26

### FG-08 Android SAF Deep Traversal & Mobile Release
- **Infinite Subfolder Traversal Fix**:
  - Re-wrote Kotlin `DocumentsContract` usage to accurately parse deep `TreeDocumentUri` parameters in `readDirectorySaf`.
  - Replaced the flawed `DocumentFile` traversal, allowing seamless Workspace mapping past the default Android 3-level folder cap.
- **Android APK Release Generation**:
  - Validated and built `app-arm64-release.apk` with the latest Tauri configuration, verified against local ADB installs.

## [0.3.0] — 2026-09-20

### FG-08 Android APK Porting & Mobile Architecture Adaptation
- **Cargo Dual Entry Point Architecture**:
  - Re-architected `src-tauri` into dual entry points: `[lib] name = "cntxt_lib"` (`crate-type = ["staticlib", "cdylib", "rlib"]`) for the Android JNI harness and thin desktop binary wrapper `src/main.rs`.
  - Exported mobile entry point annotated with `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`.
- **Desktop Crate Quarantine & Dead Code Pruning**:
  - Quarantined desktop-only crates (`rfd`, `arboard`, `tauri-plugin-single-instance`, `keyring`) under `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]`.
  - Deleted 346-line dead Axum preview server (`preview_server.rs`) and unconfigured `tauri-plugin-deep-link` plugin.
  - Added lean Rust-level `tauri-plugin-dialog = "2"`.
- **Native Android Back Button Handshake (F-01)**:
  - Overrode `onWebViewCreate` in `MainActivity.kt` to capture the WebView reference.
  - Installed `OnBackPressedCallback` executing a boolean JavaScript handshake `window.__CNTXT_HANDLE_BACK__()`.
  - In `ShellFrame.tsx`, registered priority overlay dismissal hierarchy (Command Palette -> Shortcuts Modal -> Settings/Image/Variable Modals -> Sidebar) before allowing native task backgrounding, completely preventing dual-action exit races.
- **Mobile Ergonomics & Viewport Resilience**:
  - Configured `index.html` viewport meta with `viewport-fit=cover, interactive-widget=resizes-content` for virtual keyboard viewport resizing without obscuring cursor.
  - Added `env(safe-area-inset-*)` support in `index.css` for edge-to-edge display cutouts.
  - Gated window control buttons (`WindowControls.tsx`) on mobile devices.
- **Quarantined Mobile Commands & Sandboxed Secrets**:
  - Mobile clipboard delegates cleanly to DOM `navigator.clipboard` via `invokeTauri` error handling.
  - Mobile secrets storage persists to `kv_store.json` in `app_data_dir()`, isolated by Linux DAC UID permissions (TR-019).
  - Mobile window controls safely no-op with unit `()` return signatures (TR-018).
- **Physical Mock Quarantine Cleared (TR-013)**:
  - Migrated `WELCOME_DOCUMENT` from `mocks/index.ts` to `src/constants/welcomeDoc.ts`, satisfying strict physical directory quarantine.
- **Automated Packaging & Device Verification**:
  - Added `scripts/build-android.ps1` and registered `"package:android"` script in `package.json`.
  - Built `app-arm64-release-unsigned.apk` (17.98 MB), signed with debug keystore (`app-arm64-release-signed.apk`), installed via ADB on connected Android device (`ce6162a`), and verified live execution.
  - Vitest test suite expanded to 272/272 passing unit tests across 27 test files (100% green).

### FG-07 Editor Resiliency, Multi-Tab State Architecture, Extended Markdown & Power User Tools
- **Per-Tab Undo/Redo & State Preservation Architecture**:
  - Promoted all 12 CodeMirror dynamic Compartments to module-level singletons (\`===\`).
  - Implemented in-memory \`editorStateCache\` maintaining full \`EditorState\`, undo/redo stacks, and scroll offsets (\`scrollTop\`, \`scrollLeft\`) per tab.
  - Refactored \`Editor.tsx\` to maintain a single persistent \`EditorView\` and call \`view.setState(cachedState)\` on tab switch, completely eliminating DOM destruction/remount churn.
  - Wired cache eviction to tab closing actions.
- **Extended Markdown Syntax Parity (Option A)**:
  - Added live syntax styling and parser support for \`***bold + italic***\`, \`==highlight==\` (\`.cm-live-highlight\`), \`~subscript~\` (\`.cm-live-sub\`), and \`^superscript^\` (\`.cm-live-sup\`).
- **Base64 Image Gutter Fold Extension**:
  - Implemented custom \`@codemirror/language\` \`foldService\` for large inline \`![alt](data:image/...)\` strings. Collapses them to a single visual row (\`.cm-raw-image-line\`) with gutter fold chevrons in RAW mode.
- **Search-Unveil across Rendered Blocks**:
  - When searching with \`Ctrl+F\`, matches inside rendered tables, code blocks, Mermaid diagrams, or KaTeX math blocks automatically unveil the raw Markdown source, allowing direct inline editing.
- **Modular Ribbon & Mobile Accessory Bar Resiliency**:
  - Resolved Minified React Error #185 ("Maximum update depth exceeded") caused by unmemoized array dependencies and synchronous \`ResizeObserver\` callbacks fluttering at sidebar boundary widths.
  - Added \`useMemo\` caching, \`requestAnimationFrame\` scheduling, and a 10px hysteresis buffer (\`prev ? -2 : 8\`).
  - Decoupled \`useTabStore\` subscriptions from Ribbon rendering, eliminating keystroke re-renders.
- **Interactive Guides under Help Menu**:
  - **CNTXT Power User Guide** (\`Power-User-Guide.md\`): Interactive masterclass covering in-document action widgets (\`[[action:id]]\`), embedded dynamic formulas (\`{=FORMULA()}\`), prompt template variables (\`{{*fast}}\`), JavaScript sandbox scripting APIs (\`api.replaceSelection\`, \`api.wrapSelection\`), ribbon customization, and keyboard mastery.
  - **Markdown Formatting Guide** (\`Markdown-Guide.md\`): Comprehensive live syntax showcase.
  - Added deduplicated tab openers (\`openWelcomeTab\`, \`openMarkdownGuideTab\`, \`openPowerUserGuideTab\`).
- **Workspace & Chrome Refinements**:
  - Streamlined Settings panel: unified touch toggle, removed font research box, 3-column Backup/Reset.
  - Modernized Formatting Customizer modal with horizontal button size selector and category dropdown.
  - Polished Help menu and removed redundant Hide Menu Bar button.
  - Created standalone exportable assets bundle (\`generated-documents/exportable-assets/\`).
- **Window Resize Edge-Dragging & White Canvas Remediation**:
  - Eliminated white canvas flashing and layout freeze when resizing window boundaries rapidly.
  - Added `"backgroundColor": "#141417"`, `"theme": "Dark"`, and `"shadow": true` to Tauri WebView2 window configuration so unpainted surfaces immediately match the app background during asynchronous rendering.
  - Replaced throttled viewport units (`100vw 100vh`) with `w-full h-full` and configured root DOM percentage sizing in `index.css`.
- **Official Signed Windows Installer Packages**:
  - Generated and signed NSIS Setup (`dist-installer/CNTXT_0.3.0_x64-setup.exe`, 6.39 MB) and WiX Windows Installer (`dist-installer/CNTXT_0.3.0_x64_en-US.msi`, 7.61 MB).
  - Authenticode signed with SHA256 and DigiCert RFC 3161 timestamps using `signtool.exe` and `CN=PCControlSuiteLocalTrust`.
  - Added automated PowerShell signing pipeline in `scripts/sign-installers.ps1` and wired `"package:sign"` script.
- **Full Codebase Audit & Quality Gates**:
  - Reconciled full codebase audit (`raw_findings_full_codebase_2026-09-20.md`) with a final **PASS** verdict.
  - 223/223 automated Vitest unit tests passing across 24 test suites (100% green).
  - 0 lint errors, 0 platform leaks across 118 files, 100% canonical contract parity.

## [0.2.1] — 2026-09-19

### Production Build Parity, CSP Hardening & DevTools Integration
- **CSP Nonce Bypass (`dangerousDisableAssetCspModification`)**: Enabled `dangerousDisableAssetCspModification: true` in `src-tauri/tauri.conf.json` to stop Tauri CLI from injecting compile-time nonces into `style-src`. In WebView2, presence of a nonce caused `'unsafe-inline'` to be ignored, blocking all runtime `<style>` tags created by CodeMirror (`style-mod`), dynamic language packs (`codeLanguages`), KaTeX math, and themes.
- **Raw Mode Parity & Height Map Recalculation**: Resolved the virtual viewport calculation defect where CodeMirror retained stale block widget heights after switching from Rendered to Raw mode. Added `requestMeasure()` and synchronized editor lifecycle on mode changes.
- **Layout & Prose Margins Consistency**: Unified editor max-width (~880px) and padding into `EditorView.theme()` via `getContentLayoutTheme()`, eliminating CSS specificity conflicts with external `.cm-rendered-canvas` selectors.
- **Native DevTools Access**: Added `features = ["devtools"]` in `src-tauri/Cargo.toml`, `"devtools": true` in `tauri.conf.json`, and implemented `open_devtools` / `toggle_devtools` IPC commands with global `F12` and `Ctrl+Shift+I` shortcuts.
- **HTML & Asset Integrity**: Extracted inline style resets from `index.html` into `src/index.css` and cleaned up `<meta>` CSP directives.
- **Portable Build Packaging**: Added `scripts/build-portable.mjs` for standalone release verification. Vitest suite passes at 127/127 tests.

## [0.2.0] — 2026-09-15

### Playwright E2E Test Suite (FG-05)
- Introduced the first Playwright E2E layer (`npm run test:e2e`), running against the live Vite dev server in headless Chromium (single worker) with strict-mode locators and 15s navigation timeouts.
- Added `playwright.config.ts`, the `e2e/fixtures.ts` demo-mode bootstrap (sets `window.__CONTEXTPAD_DEMO__` in `beforeEach`, mirroring the `mocks/index.ts` quarantine gate so tests exercise only quarantine-gated demo state), and 5 spec files covering:
  - `e2e/editor.spec.ts` — 5 tests: welcome-doc render, tab title, typing, valid `[[action:format-json-and-sort]]` widget, missing-token widget (`[[action:nonexistent-action-id]]`).
  - `e2e/empty-state.spec.ts` — 3 tests: demo-off boot, zero tabs, ribbon still present.
  - `e2e/preview.spec.ts` — 4 tests: palette toggling of split preview, KaTeX glyph rendering (`.cm-live-math-block .katex`), XSS neutralization for `<script>` tags and inline event handlers.
  - `e2e/ribbon.spec.ts` — 5 tests: ribbon visibility, expand/collapse multi-row mode, rendered action/tool buttons, Customize Ribbon modal.
  - `e2e/slash-menu.spec.ts` — 4 tests: popup on "/" at line start, expected command list, arrow-key navigation (waiting out CodeMirror autocomplete's 75ms `interactionDelay` before ArrowDown), Enter inserts the selected command.
- **E2E verification**: 21/21 green (order-stable single worker). Unit suite reconfirmed at **121/121** across 14 suites; `npm run build` clean.
- Playwright artifacts (`playwright-report/`, `test-results/`, `blob-report/`) gitignored; test docs tracked in `generated-documents/plans/feature_group_e2e_playwright_2026-09-14.md`.
- **Flagged production defect (deferred, out of FG-05 scope)**: CodeMirror `closeBrackets()` auto-inserts `]]`, racing the live-markdown `[[action:...]]` decoration regex — char-by-char typed action tokens render mangled/missing at any typing speed. E2E uses `insertText` (paste-equivalent input) which renders correctly; production fix pending (exempt `[[action:` sequences or relax the bracket pair).

## [0.2.0] — 2026-09-14

### Full-Codebase Security Remediation & Architecture Hardening
- Reconciled all 17 valid defects (F-01..F-20) from the Full Codebase Audit (`raw_findings_full_codebase_2026-09-14.md`) across 4 implementation batches.
- **Native Command Authorization (F-2.1, F-8.x)**:
  - Scoped Tauri capability `default.json` from `windows: ["*"]` to `windows: ["main"]`.
  - Gated **every** native IPC command on main-window origin — `file.rs`, `storage.rs`, `secrets.rs`, `clipboard.rs`, and all `main.rs` commands (`get_app_info`, `get_system_info`, `new_window`, preview server, `get_pending_files`).
  - Sensitive commands (`delete_file`, `open_file_explorer`, `open_external`) retain mandatory `X-Nodus-Auth-Token` session validation (`main.rs:59-64`).
- **Path Traversal Hardening (F-09)**: `validate_path` now rejects true `ParentDir` components instead of a naive `..` substring scan (`file.rs:74-79`).
- **Preview Server Origin Validation (F-07)**: Host/origin checks in `preview_server.rs`; `preview.json` capability removed.
- **Mock Quarantine & Data Integrity (Pillar 1)**: All stores demogated — collections initialize empty and populate strictly from runtime events.
- **Presenter Purity & Strict Typing (Pillars 2, 3)**: Zero direct IPC in visual presenters; eliminated remaining `as any` (e.g. `ShellFrame.tsx:200` now typed `SupportedLanguage`).
- **Resilient Error Handling (Pillar 9)**: Template-apply failures dispatch toasts; `copyText` surfaces failures instead of silent fallback; unhandled-promise and silent-`catch` sweeps.
- **Open Extensibility (Pillar 4)**: New runtime `SlashCommandRegistry` with `registerCommand` / `unregisterCommand` / metadata catalog reflection; parser delegates to registered handlers.
- **Preview Hardening**: LivePreview sanitizes via `sanitizePreviewHtml` on all innerHTML sinks; KaTeX disables trust; Mermaid `securityLevel: strict`.
- **Sandbox Hardening (Pillar 8)**: Regex-based import/constructor scanner and frozen `safeApi` in the action sandbox; verified by `tests/actionSandbox.test.ts`.
- **Resource Lifecycle (R-011)**: `useInterval`-style timers tracked and cleared on unmount.
- **Verification**: `npm test` **120/120** across 14 suites · `npm run lint` clean (113 files, zero platform leaks, contract sync 100%) · `npm run build` exit 0 · `cargo check` PASS.

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
| 0.3.2   | 2026-09-26 | Stable      | 120    | Android SAF Deep Traversal fix and Mobile Release APK | 
| 0.2.0   | 2026-09-14 | Active Dev  | 120    | Full-codebase security remediation, command authorization, open extensibility | 
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

**Last Updated**: 2026-09-26  
**Maintained By**: CNTXT Development Team  
**Status**: Active Development
