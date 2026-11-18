# LIVING CONTEXT DOCUMENT
Version: v2.68
Last Updated: 2026-11-18
Last Updated By: Prod Agent (Task 86 — Session Closeout & Release v0.7.9 Publication: GitHub Releases live, Android Signed APK, README package links, clean test verification)
Project: CNTXT (ContextPad) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile)
Target Platform(s): Web (Vercel + Supabase Free-Tier) + Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Mobile (Android via Tauri v2 Mobile runtime)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4 + Rust (Tauri v2) + Supabase
━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [x] Feature Implementation (FG-01..FG-27 Complete & Verified)
  [x] Refactor (Syntax Highlighting Granularity & Code Block Aesthetic Overhaul across Desktop + Android + Web)
    [x] Testing (Vitest 792/792 Live across 66 suites, Rust Gateway & Security Test Suite 15/15 Live)
  [x] Tri-Platform Hybrid Architecture Alignment & Web SaaS Readiness (Web Free-Tier SaaS Live, Desktop Native Live, Android Mobile Live)
  [x] Packaging & Release (v0.7.9 Released, Signed, and Published to GitHub Releases)

Current Feature Group: AI Conversation Mode Foundations & Custom Container Fencing
Status: [x] v0.7.9 Released & Verified; Ready for Scoping Next Group
Background Processes: event-driven PTY streaming & debounced file-tailer synchronization (strictly gated behind Settings -> Experimental -> enableExperimentalSettings && enableTerminalBus; disabled by default)
Unit Tests: written [x] passing [x] (792/792 unit tests passing across 66 suites in CNTXT, 15 native Rust tests clean)
Active Plan: /generated-documents/plans/feature_group_FG24_linux_and_android_v071_port_2026-10-28.md

━━━ MOCK REGISTRY SNAPSHOT ━━━
* Active Mocks Physically Quarantined in `mocks/`:
  - `mocks/index.ts`: Synthetic mock arrays (`DEFAULT_PINNED_TABS`, `MOCK_WORKFLOWS`, `MOCK_FILES`) and demo-mode flags (`IS_PROTOTYPE_DEMO_MODE`) strictly isolated for browser prototype sandbox and E2E fixtures. Verified: zero production imports across `/src/`.
  - `mocks/mockRuntimeAdapter.ts`: In-memory mock runtime bridge adapter used strictly for headless unit test isolation and demo web previews.
* Mocks Active in Production `/src/`: NONE (0 inline fallback mocks, zero synthetic collections; collections initialize empty `[]` or `null`).

━━━ RECONCILED TRADEOFF HISTORY ━━━
* `TR-017` (Pillar 1 - Factory Presets): `DEFAULT_TEMPLATES` in `templateStore.ts`, `DEFAULT_RIBBON_ITEMS` in `ribbonStore.ts`, and `PRESET_FORMATTING_BUTTONS` in `formattingStore.ts` serve as factory defaults and starter prompt templates for end-user productivity upon clean install, distinct from test mocks.
* `TR-018` (Pillar 8 - Custom HTML Sanitizer): `domHelper.ts` provides a custom DOMParser + regex HTML sanitizer engineered for dual-environment operation (browser webview + Node/Vitest headless testing) with KaTeX math and SVG support, eliminating `dompurify` and `jsdom` bundle bloat on mobile. Verified by 19 unit tests.
* `TR-019` (Pillar 2 - Xterm.js Canvas Hex Theme): `TerminalView.tsx` passes literal hex palette strings to Xterm.js because the underlying Canvas/WebGL terminal renderer requires raw color strings rather than CSS custom properties. Outer wrapper UI containers are tokenized with CSS variables (`var(--...)`).
* `TR-020` (Pillar 1 - Tab Cache Discard-on-Invalid): `tabSessionCache.ts` is an ephemeral session cache; invalid or checksum-mismatched caches are discarded rather than migrated to guarantee fresh document state.

Notes:
- Task 86: Session Closeout & Release v0.7.9 Publication (2026-11-18):
  - Fixed 3-dot dropdown menu hover exit bug and widget recycling stability (commit `ea43d65`).
  - Synthesized `send_showcase_doc.mjs` test utility for clean gateway document delivery without shell string mangling (commit `9992467`).
  - Added `// platform-leak-ignore` annotations to CodeMirror DOM popover listener attachments in `codeBlockWidget.ts` (commit `c0bed8a`).
  - Packaged and signed Android arm64 release APK (`cntxt-0.7.9-arm64-release-signed.apk`, 30.13 MB) with release keystore (v2 + v3 schemes).
  - Published GitHub Release `v0.7.9` attaching all 4 signed binaries (Portable .exe, Setup .exe, MSI, Android APK).
  - Updated `README.md` with live release download links and FG-27 capability documentation (commit `19d1004`).
  - Verification: 792/792 Vitest unit tests passing across 66 suites, 15/15 native Rust tests passing, `npm run lint` 100% clean (zero type errors, zero platform leaks, contracts 100% synchronized).
  - Next Feature Scope: AI Conversation Mode Foundations & Custom Container Fencing (addressing inline code rendering and dedicated fencing syntax).
- Task 85: Visual Refinements for CNTXT Special Blocks (2026-11-10):
  - Line-Anchored Native CSS Left Accent Rail: Spans 100% accurately from the top of the header row down to the end line below the block fences without premature cut-offs, replacing the virtualized JavaScript `lineBlockAt` measurement overlay.
  - Strict Theme Engine Compliance: All borders, surfaces, accent lines, and pills strictly consume theme CSS variables (`var(--accent-primary, #007ACC)`, `color-mix(...)`, `var(--status-warning)`, `var(--status-info)`), eliminating hardcoded hex colors.
  - Subtle Header Hover Container: Hovering over the header button row activates a subtle container frame and background tint across the entire block (`.cm-cntxt-container-active-hover`), making container boundaries clearly visible during interaction while preserving seamless transparent canvas when idle.
  - Trimmed Speculative AI Conversation Artifacts: Excised green `● AI DELIVERABLE` rename, `@agent` badge prefix, speculative `+ status` button, `status=` pill, and inline `[Respond]` button so the core foundations are clean and stable ahead of the AI conversation mode rework.
  - Verification: 792/792 Vitest unit tests passing across 66 suites, 15/15 Rust tests passing, Vite production build passing.
- Task 84: Refine CNTXT Code Blocks: Visual Styling Separation for Governed Code Blocks vs Rich Containers (2026-11-10):
  - Fixed visual degradation bug where adding `|` to an ordinary code block (`python | locked=user`) inadvertently applied `.cm-cntxt-container-*` (transparent background, border: none, padding: 0).
  - Explicitly separated Governed Code Blocks from Rich Containers:
    - Rich Containers (`markdown |`, `cntxt |`, `deliverable |`) retain transparent markdown container layout and unbroken continuous left margin accent rail (`.cm-cntxt-left-rail`).
    - Governed Code Blocks (`python |`, `ts |`, `sql |`, etc.) retain 100% solid code block card styling (background, border, rounded corners, padding, syntax highlighting), gaining stateful amber (`cm-codeblock-locked-user`) or blue (`cm-codeblock-locked-agent`) left border accents.
  - Added subtle hover-visible `+ status` button when a governed code block has no explicit status yet, cycling directly into `draft` on click.
  - Added 4 unit & integration tests in `tests/codeBlockInContextControls.test.ts`. All 791 Vitest tests and 15 native Rust tests passing.
- Task 83: Implement FG-27 In-Context Code Block Controls (2026-11-10):
  - Added universal Lock/Unlock button for all code blocks (ordinary and CNTXT blocks) with true read-only transaction filtering (codeBlockLockFilter.ts).
  - Prevented fence-row click traps: clicking the header bar no longer forces cursor onto linePos (the opening fence).
  - Hover-visible action button cluster ([Lock] [Clear] [Copy] [···]) with active locked indicators remaining visible.
  - Implemented 3-dot context menu (···) offering 1-click utilities (Copy with Fences, Duplicate Block, Toggle Word Wrap, Convert to Deliverable, Change Language, Delete Block) and ⚙️ Configure Parameters popover.
  - Authored comprehensive test suite in 	ests/codeBlockInContextControls.test.ts (12 tests passing). Vitest suite updated to 787/787 passing.
- Task 82: Revert FG-26 Code Block Builder Implementation (2026-11-07):
  - Safely reverted Code Block Builder rail panel, active inspector, active block store, archetype presets, and editor cursor sync.
  - Excised all 7 newly introduced files and restored 14 modified files to the exact clean state of commit 54170e1.
  - Preserved the authoritative feature group plan in generated-documents/plans/feature_group_FG26_code_block_builder_and_conversation_overhaul_2026-11-07.md for future roadmap scheduling.
  - Verified test suite restored to 775/775 passing across 65 test suites, 15/15 native Rust tests passing.
- Task 80: Full Codebase Re-Audit Pass 2 Reconciliation RA-01..RA-09 (2026-11-06):
  - RA-01 & RA-02 (Terminal Domain & Human Lock Invariants):
    - Restricted `terminal` domain execution strictly to `appId === 'internal'` in `hostCommandBus.ts:740-745`. External panel apps attempting to invoke terminal commands are rejected with `FORBIDDEN`.
    - Excised `window.CNTXT.terminal` polyfill from untrusted panel app client SDK injection (`clientSdk.ts`).
    - Enforced `e.source` origin verification and bound untrusted iframe requests strictly to `panel-app:<id>` in `AppPanelPlaceholder.tsx`. Non-internal apps can never claim `actor: 'user'`, preserving the `locked=user` human protection invariant.
  - RA-03 & RA-04 (Bearer Token Security & Hermetic Workspace):
    - Excised hardcoded developer path (`C:\Projects\LocalActive\.localactive\cntxt_gateway.json`) and cwd discovery file writes from `gateway.rs`.
    - Deleted leaked token file from `.localactive` directory.
    - Set restrictive `0o600` file permissions on Unix discovery file targets.
  - RA-05 (Hermetic Native Rust Tests):
    - Updated `test_sync_gateway_discovery_files` in `gateway.rs` to write strictly to isolated UUID subdirectories in `temp_dir()` and clean up on finish.
    - Configured `test_init_and_validate_gateway_token` to test against in-memory `GATEWAY_TOKEN` directly, leaving the host OS keyring pristine.
  - RA-06 (OAuth Provider Token Cleanup):
    - Added `localStorage.removeItem('cntxt_provider_token')` to `authStorageAdapter.ts:clearStoredAuthSession()` and `supabaseClient.ts:signOutUser()`.
    - Added validation in `supabaseClient.ts:getSessionProviderToken()` to ensure an active session exists before returning the provider token.
  - RA-07 (CORS Strict Allowlist & Preflight Reordering):
    - Implemented `is_valid_cors_origin()` with exact port parsing, blocking prefix spoofing (`http://localhost.evil.com`).
    - Reordered gateway request handling to validate Host header before handling `OPTIONS` preflight requests.
    - Added unit test `test_resolve_cors_headers_strict` in Rust suite.
  - RA-08 (Keyring & Discovery Telemetry):
    - Replaced silent `let _ =` error swallowing in `persist_gateway_token` and `sync_gateway_discovery_to_paths` with explicit stderr diagnostic logging.
  - RA-09 (Experimental Terminal Bus Gating):
    - Enforced `enableExperimentalSettings && enableTerminalBus` in `tabStore.ts:openTerminalTab()`, `CommandPalette.tsx`, and `hostCommandBus.ts:handleTerminalDomain`.
    - Added regression tests in `tests/hostCommandBus.test.ts`.
  - Verification: 775/775 Vitest unit tests passing across 65 suites, 15/15 native Rust tests passing, 0 platform leaks, scanner 0 `any` (P3=0).
- Task 79: Multi-Window Targeted Routing & Code Block Header Visual Alignment (2026-11-06):
  - Multi-Window Event Isolation (`src-tauri/src/lib.rs`, `src/adapters/tauriRuntimeAdapter.ts`):
    - Changed single-instance file opening from broadcast `app.emit("open-files", ...)` to window-targeted `app.emit_to("main", "open-files", ...)`.
    - Added `getCurrentWindow().label === 'main'` guards to `onOpenFileRequested` in `tauriRuntimeAdapter.ts` to prevent secondary/popout windows from instantiating duplicate tabs.
  - Code Block Header Visual Alignment & Breathing Room (`src/extensions/liveMarkdown/widgets/codeBlockWidget.ts`, `src/index.css`):
    - Upgraded `CodeBlockHeaderWidget` padding from `px-3 py-1.5` to `px-3.5 py-2`, perfectly matching the 14px horizontal padding of `.cm-live-codeblock-mid` and providing 8px vertical breathing room.
    - Added `.cm-live-codeblock-start + .cm-live-codeblock-mid { padding-top: 6px !important; }` in `src/index.css` for comfortable separation between the header border and the first line of code without introducing margin-collapsing HeightMap drift.
  - Verification: 773/773 Vitest unit tests passing across 65 suites, 14/14 native Rust tests passing, 0 platform leaks, scanner 0 `any` (P3=0).
- Task 78: Native OS Keyring Persistence & Universal User-Home Gateway Auto-Discovery (2026-11-06):
  - Native Platform OS Keyring (`src-tauri/Cargo.toml`):
    - Enabled `windows-native`, `apple-native`, and `linux-native-sync-persistent` features for `keyring` crate v3, replacing the volatile in-memory `mock` default.
    - Verified generic credential persistence (`rest_gateway_token.CNTXT`) directly inside Windows Credential Manager (`cmdkey`). Security tokens are now generated once on initial install and remain 100% persistent across app restarts, reboots, and updates.
  - Universal User-Home Discovery Synchronization (`src-tauri/src/commands/gateway.rs`):
    - Added `get_user_home_gateway_paths()` writing active runtime discovery (`url`, `port`, `token`, `running`) to `~/.cntxt/gateway.json` and `~/.cntxt/gateway_runtime.json`.
    - Maintained synchronization with `%APPDATA%\com.cntxt.desktop\gateway_runtime.json` and canonical workspace `C:\Projects\LocalActive\.localactive\cntxt_gateway.json`.
    - Added unit test `test_sync_gateway_discovery_files`.
  - Resilient Agent Directives & MCP Auto-Discovery (`cntxt-mcp-server.mjs`, `agentDirectivesService.ts`):
    - Updated `cntxt-mcp-server.mjs` candidate config resolution to discover `~/.cntxt/gateway.json`.
    - Enhanced `getAgentBootstrapPrompt` to include `~/.cntxt/gateway.json` reference for zero-configuration agent auto-connection.
  - Verification: 773/773 unit tests passing across 65 suites, 14/14 native Rust tests passing, scanner 0 `any` (P3=0).
- Task 77: Reconciliation of Verification Defects V2-01..V2-03 & V3-01 (2026-11-06):
  - Remediated V2-01 [HIGH]: Action hydration in `actionStore.ts` now preserves all operational fields (`type`, `codeType`, `pipeline`, `selectionBehavior`, `isDefault`, `icon`, `color`, `shortcut`, and `button*`). `ActionOpSchema` and `ActionSelectionBehaviorSchema` added to `boundarySchemas.ts`.
  - Remediated V2-02 [MEDIUM]: Template hydration in `templateStore.ts` preserves `variableDefs`. `TemplateVariableSchema` added to `boundarySchemas.ts`.
  - Remediated V2-03 [LOW]: `ViewSettingsSchema` now validates `deliverableWorkspaceSubfolder`, `deliverableCustomFolderPath`, `isFontCustomizedByUser`, and nested configs (`autocompleteConfig`, `spellCheckConfig`, `codeLintConfig`). `settingsStore.ts` implements resilient field-by-field salvage instead of all-or-nothing reset on corrupted stored JSON, with structured telemetry logging.
  - Remediated V3-01 [LOW]: Guarded `settingsStore.ts` field-recovery loop against prototype keys (`__proto__`, `constructor`, `toString`). The loop now iterates strictly over schema keys via `Object.entries(shape)` and checks `Object.prototype.hasOwnProperty.call(rawObj, key)` with explicit function guard, preventing `TypeError` resets.
  - Added regression test suites in `boundarySchemas.test.ts`, `actionStoreAndCompletion.test.ts`, `templateStore.test.ts`, and `settingsStore.test.ts` (including prototype pollution recovery).
  - Verification: 773/773 unit tests passing across 65 suites, 0 platform leaks, 13/13 native Rust tests passing, scanner 0 `any` (P3=0).
- Task 76: Agent Directives, Capabilities Discovery & Dual-Tier Security (2026-11-06):
  - Authoritative Agent Directives Service (src/services/agentDirectivesService.ts):
    - Authored single source of truth for AI agent governance and directives across REST, Host Command Bus, and MCP.
    - Enforces Rich Container syntax (~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="<Title>"), locked=user human guardrail protection, blocks.upsert surgical updates, and [[#^block-id]] citations.
  - REST Gateway Discovery Endpoints (src-tauri/src/commands/gateway.rs):
    - Added GET /api/v1/capabilities and GET /api/v1/directives (supporting text/markdown), enhanced GET /api/v1/health with discovery pointers.
  - Host Command Bus Directives Domain (src/features/panelApps/rpc/hostCommandBus.ts):
    - Registered directives domain with get and getGuide actions, validated by Zod DirectivesGetPayloadSchema.
  - Native MCP Stdio Protocol Expansion (scripts/mcp/cntxt-mcp-server.mjs):
    - Injected directives into MCP initialize.instructions, implemented resources/list and resources/read (cntxt://directives/*), and added Tool 14: cntxt_get_directives.
  - 1-Click Agent Bootstrap Prompt (RestGatewaySettingsCard.tsx, SettingsPanel.tsx):
    - Added "Copy Agent Prompt" button in Settings enabling 1-click bootstrap prompt generation for external agents (Antigravity, Claude, Cursor, Cline).
  - Verification: 763/763 unit tests passing across 65 suites, 0 platform leaks, 100% canonical contract synchronization.
- Task 75: Code Block Click Accuracy Hardening & Resizable Markdown Formatting Toolbar (2026-11-05):
  - Code Block Click Accuracy Hardening (Issue 3):
    - Eliminated CSS margins on `.cm-line` code block boundaries in `src/index.css` (`.cm-live-codeblock-start`, `.cm-live-codeblock-end`, `.cm-live-codeblock-single` set to `margin-top: 0 !important; margin-bottom: 0 !important;`).
    - Transferred bottom breathing room into measured widget box (`h-2` in `CodeBlockFooterWidget`), completely eliminating CodeMirror HeightMap margin-collapsing dead-zones and gutter line number vertical drift.
  - Size-Adjustable Markdown Formatting Toolbar (Improvement 10):
    - Implemented interactive top drag-to-resize handle (`cursor-ns-resize`) on `MobileAccessoryBar.tsx` supporting smooth mouse and touch vertical dragging.
    - Added natural `flex-wrap` multi-row wrapping for toolbar heights > 56px, while retaining smooth horizontal scrolling in compact single-row mode.
    - Added height persistence via `STORAGE_KEYS.FORMATTING_TOOLBAR_HEIGHT` (`contextpad_formatting_toolbar_height`) in `formattingStore.ts`.
    - Added double-click on handle to toggle between compact single-row (44px) and expanded (120px) height.
    - Excised legacy `ChevronUp` expand button, "Single Row" button, and multi-row toggle switchers from `MobileAccessoryBar.tsx` and `FormattingCustomizerModal.tsx`.
  - Verification:
    - Zero TypeScript errors, zero platform leaks, 100% canonical contract synchronization.
    - 752/752 unit tests passing cleanly across 64 suites.
- Task 74: Feature Group B — Modular Ribbon Optimization, Tab & File Bookmarks, and Template/Action Card Grid View (2026-11-05):
  - Modular Ribbon Optimization & Horizontal Wheel Scroll (Improvement 10):
    - Excised redundant built-in ribbon items (`toggle-view`, `command-palette`, `new-doc`, `save-file`).
    - Excised the extreme-left expand chevron (`#modular-ribbon-expand-btn`) and left divider from `ModularRibbon.tsx`.
    - Added smooth mouse-wheel horizontal scrolling handler (`onWheel`) to the ribbon items container.
  - Ribbon Tab & File Bookmarking (Improvement 7):
    - Extended `RibbonItemType` in `contracts/data_shapes.ts` with `'tab' | 'file'`.
    - Implemented ribbon button click routing: activating existing open tabs in memory or loading files from disk via `bridge.fs.readFile` with file extension syntax detection and missing-file error alerts.
    - Added "Pin Active Tab to Ribbon" and "Browse File to Pin..." to empty-area ribbon context menu.
    - Added "Pin Tab to Ribbon" option to `TabBar.tsx` tab context menu.
    - Added "Pin to Ribbon" option to `FileExplorer.tsx` file context menu.
    - Updated `RibbonCustomizerModal.tsx` with dedicated `'add_tabs_files'` tab supporting 1-click pinning from open tabs, recent files, and native workspace file dialog (`contextpad_workspace_path`).
  - Card / Grid View for Templates & Actions (Improvement 8):
    - Created Notion-style `TemplateCardItem.tsx` and `ActionCardItem.tsx` with category badges, 2-line preview, dynamic variables indicator, formula badge, and quick run/insert hover controls.
    - Added view mode toggle controls (`LayoutGrid` / `LayoutList`) to `TemplateManager.tsx` and `ActionManager.tsx`.
    - Added `templateViewMode` and `actionViewMode` ('list' | 'grid') preferences to `settingsStore.ts`.
  - Verification & Release:
    - Bumped version to `v0.7.6` across `package.json`, `tauri.conf.json`, `Cargo.toml`.
    - Verified zero TypeScript errors, zero platform leaks, and 100% canonical contract synchronization.
    - Verified 751/751 unit tests passing cleanly across 64 suites.
- Task 72: Full Codebase Audit Reconciliation & Hardening (2026-11-03):
  - Executed complete Pass 2 Prod Agent reconciliation across all 16 findings from Pass 1 Full Codebase Audit (`generated-documents/audits/raw_findings_full_codebase_cntxt_2026-11-03.md`).
  - FIND-01 & FIND-02 (Pillar 1): Reconciled factory UI configurations (`DEFAULT_TEMPLATES`, `DEFAULT_RIBBON_ITEMS`, `PRESET_FORMATTING_BUTTONS`) as approved product presets (`TR-017`).
  - FIND-03 (Pillar 1): Established formal Mock Registry Snapshot documenting quarantined files `mocks/index.ts` and `mocks/mockRuntimeAdapter.ts`.
  - FIND-04 (Pillar 1): Implemented `migratePanelAppManifest` in `boundarySchemas.ts` ensuring forward-compatible deterministic migration path for evolving panel-app manifests.
  - FIND-05 (Pillar 9): Eliminated 6 empty `catch {}` blocks in `AppPanelPlaceholder.tsx` by replacing them with structured console diagnostics and error posting.
  - FIND-06 (Pillar 9): Added structured diagnostic recording (`recordDiagnostic`) and user notification in `SettingsPanel.tsx` on REST gateway stop failures.
  - FIND-07 (Pillar 9): Created structured in-memory diagnostic ring buffer service (`diagnosticLogger.ts`) with sensitive field redaction and wired into `ErrorBoundary.tsx`. Added unit suite `diagnosticLogger.test.ts`.
  - FIND-08 (Pillar 4): Refactored `HostCommandBus.ts` to use a dynamic domain registry (`domainHandlers` Map and `registerDomain` API), eliminating hardcoded switch dispatch.
  - FIND-09 (Pillar 8): Documented custom DOMParser HTML sanitizer in `domHelper.ts` as approved dual-environment tradeoff (`TR-018`).
  - FIND-10 (Pillar 8): Added CSRF `expected_state` validation on POST `/auth/token` path in `src-tauri/src/commands/auth.rs`.
  - FIND-11 (Pillar 2): Replaced hardcoded hex literals in `WindowControls.tsx` and `TerminalView.tsx` with tokenized design variables (`var(--...)`).
  - FIND-12 (Pillar 10): Optimized linear `Array.includes` scans in bulk actions/templates to O(1) `Set` lookups in `actionStore.ts`, `ActionManager.tsx`, and `TemplateManager.tsx`.
  - FIND-13 (Pillar 5): Cleaned `package.json` by deduplicating `vite` and moving `@tailwindcss/vite` and `@vitejs/plugin-react` to `devDependencies`.
  - FIND-14 (Pillar 3): Replaced `(window as any)` assertions in `mocks/index.ts` and `e2e/fixtures.ts` with typed `Window` interface extensions.
  - FIND-15 (Pillar 9): Reconciled native Rust test count to 13/13 in `living_context.md`.
  - FIND-16 (Governance): Scaffolding `.agent-state.json` at project root tracking live state and audit status.
- Task 71: Editor CodeBlock Header Rendering & DOM Update Stability (2026-10-28):
  - Fixed CodeBlockHeaderWidget DOM recycling: updated `updateDOM()` in `CodeBlockHeaderWidget` (`codeBlockWidget.ts`) to `return false`, forcing CodeMirror 6 to re-run `toDOM()` when widget parameters or line positions change. Fixes blank/unpopulated codeblock header rendering.
  - Normalized container line height in `src/index.css`: restored `line-height: 0 !important; font-size: 0 !important;` on inactive `.cm-live-codeblock-start` and `.cm-live-codeblock-end` lines to collapse underlying hidden markdown fence lines, while maintaining `font-size: 0.9em !important; line-height: 1.6 !important;` on `.cm-live-active-row`.
  - Staged Linux Desktop and Android `v0.7.3` release packages. Verified 738/738 Vitest tests clean across 63 suites.
- Task 70: Android REST Gateway LAN Support, Screen Wake & Background Reliability (2026-10-28):
  - Rust REST Gateway LAN Binding & Hardening (commands/gateway.rs):
    - Enabled 0.0.0.0 binding when allow_lan is enabled or automatically on Android.
    - Added RFC 1918 private IP validation (192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12) for incoming connections and Host headers (preventing DNS rebinding while allowing LAN companion requests).
    - Hardened token persistence on Android at /data/data/com.cntxt.desktop/files/gateway_token.txt.
    - Added UDP-based get_local_lan_ip() to detect and advertise device Wi-Fi IP.
    - Verified Rust tests 4/4 clean in commands::gateway::tests.
  - Frontend UI & Presenter Purity (RestGatewaySettingsCard.tsx & SettingsPanel.tsx):
    - Added pure UI controls for LAN mode toggle, Wi-Fi LAN IP display endpoint, and URL copy action.
    - Added "Keep Screen Awake" setting toggle to prevent mobile display sleep during live companion review sessions.
    - Synchronized canonical data shapes across contracts/data_shapes.ts, boundarySchemas.ts, and bridgeContract.ts.
    - 738/738 Vitest tests clean across 63 suites.
  - Native Android Lifecycle & Locks (MainActivity.kt & Manifest):
    - Injected setKeepScreenOn (FLAG_KEEP_SCREEN_ON) and setWifiLock (WIFI_MODE_FULL_HIGH_PERF) in AndroidInterface.
    - Declared android.permission.WAKE_LOCK and android.permission.ACCESS_WIFI_STATE in AndroidManifest.xml.
- Task 69: Core Editor Stability — Click Accuracy, HR Rules & Codeblock Header Alignment (2026-10-28):
  - Fixed click accuracy and typing inside fenced code blocks: removed `codeContent` comparison from `CodeBlockHeaderWidget.eq()` and implemented `updateDOM()` to prevent DOM recreation and cursor jumping on keystrokes.
  - Fixed horizontal rule `---` trapping cursor: added `if (hrMatch && !isLineActive)` in `liveMarkdown.ts` so active lines remain raw editable text.
  - Adjusted codeblock container margins in `src/index.css`. User verified click accuracy is fully stabilized; space above codeblock header recorded in `issues_improvements.md` for dedicated visual tuning in next session.
  - Unit tests: 736/736 passing across 63 test suites, lint clean.
- Task 68: Feature Group FG-24 — Linux Desktop & Android Mobile v0.7.1 Ports & Wireless ADB Deployment (2026-10-28):
  - Linux Desktop Porting & Installation:
    - Built and staged `dist-installer/CNTXT_0.7.1_amd64.deb` (8.9 MB) and `dist-portable/CNTXT_0.7.1_portable` / `cntxt-portable` (15 MB).
    - Installed Linux package into host user environment (`~/.local/bin/cntxt`, `~/.local/share/applications/CNTXT.desktop`, `~/.local/share/icons/hicolor/`).
    - Added `.cntxt` file association and language detection across `tauri.conf.json`, `file.rs`, `tauriRuntimeAdapter.ts`, and `ShellFrame.tsx`.
    - Added multi-terminal fallback support in `pty.rs` honoring user shell override and iterating `$TERMINAL`, `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `alacritty`, `kitty`, `wezterm`, and `xterm`.
    - Hardened `validate_path` in `file.rs` to detect and reject cross-platform backslash directory traversal sequences (`folder\..\..\secret.txt`) on Unix systems.
  - Android Mobile Porting & Touch Ergonomics:
    - Built and staged `dist-android/cntxt-0.7.1-arm64-release-signed.apk` (19 MB, `versionCode=7001`, `versionName=0.7.1`, verified v2/v3 signatures).
    - Established wireless ADB over TCP port 5555 with connected POCO F1 at `192.168.1.138:5555` and deployed `v0.7.1`.
    - Deployed and launched `cntxt-0.7.1-arm64-release-signed.apk` to USB-connected tablet device (`2405CPCFBG` / `ce6162a`).
    - Restored `onWebViewCreate` and `OnBackPressedCallback` handshake in `MainActivity.kt` delegating to `window.__CNTXT_HANDLE_BACK__()`.
    - Added touch-mode Active Thread support in `TabBar.tsx`: displays pulsing `Radio` icon on the floating tab pill and provides 1-tap touch-accessible `Radio` toggle buttons per tab in the `Open Tabs` dropdown.
    - Clamped `[Respond]` inline citation popover in `cntxtBlockOverlay.ts` to mobile viewport bounds and wired into the Android back button dismissal hierarchy.
    - Enabled and Verified Localhost REST Gateway on Android:
      - Lifted mobile restrictions in `gateway.rs` and `androidRuntimeAdapter.ts` (exposing `bridge.gateway.isAvailable() === true`).
      - Verified Tokio TCP listener binds cleanly to `127.0.0.1:9876` on Android.
      - Tested `/api/v1/health` returning `{"status":"ok","version":"0.7.1"}` and `/api/v1/rpc` executing `tabs.list` and `/api/v1/tabs/open` creating tabs in the live Android UI via ADB and loopback.
  - Task 66 Multi-Window Event Isolation & Discovery:
    - Isolated external REST Gateway RPC requests via `app.emit_to("main", ...)` in `gateway.rs` and added `getCurrentWindow().label === 'main'` listener guard in `tauriRuntimeAdapter.ts`.
    - Added `$XDG_CONFIG_HOME` resolution in `gateway.rs` and `cntxt-mcp-server.mjs`.
    - Gated REST Gateway on mobile platforms (`AndroidRuntimeAdapter.gateway.isAvailable() === false`).
- Task 66: High-Priority Architectural Finding — REST Gateway Multi-Window Event Isolation (2026-10-28):
  - Finding: When external tools (e.g. `odin-reviewer`, external test harness, MCP client) send requests to `/api/v1/tabs/open` or `/api/v1/rpc`, `src-tauri/src/commands/gateway.rs` issues a global application-level event broadcast via `app.emit("cntxt://rpc-request", emit_payload)`.
  - Impact: In multi-window desktop configurations (e.g., primary docked window + secondary popout/floating window), all webviews in the process receive the event simultaneously and instantiate duplicate tabs.
  - Priority Resolution Architecture:
    1. Update `gateway.rs` to route requests explicitly to the primary window via `app.emit_to("main", ...)` (or allow an optional target window label in the payload).
    2. Guard `initRpcListener` in `tauriRuntimeAdapter.ts` using `getCurrentWindow().label === 'main'` so secondary windows ignore external gateway broadcasts by default.
    3. Ensure `gateway_runtime.json` synchronization in `APPDATA/com.cntxt.desktop/` always reflects live port binds without relying on workspace-relative fallbacks.
- Task 67: External Workflow Protocol & Boundary Invariant — Zero Scraping of In-Memory Editor State (2026-10-28):
  - Invariant: External automation pipelines (such as Odin Reviewer) must never attempt to scrape internal editor database files (`kv_store.json`) or background tab buffers to infer live user input (such as manual observations).
  - Automation pipelines must strictly wait for the human reviewer to state that manual observations are ready, and read the saved file directly from the task review folder on disk (`manual_observations.md`).
  - CNTXT gateway interaction by external scripts is strictly restricted to locating/updating the active `Review.md` tab.
- Task 65: Pass 2 Prod Agent Audit Reconciliation (2026-10-21):
  - Executed complete reconciliation and remediation of all 12 findings from Pass 1 Independent Blind Auditor report (`generated-documents/audits/raw_findings_feature_cntxt_fg21_fg22_2026-10-21.md`).
  - FIND-01 (Pillar 8): Enforced `effectiveActor` guardrail in `hostCommandBus.ts` so external RPC callers cannot self-assert `actor: 'user'` on `locked=user` blocks. Only internal UI callers (`appId === 'internal'`) can mutate user-locked blocks.
  - FIND-02 (Pillar 6): Completely excised legacy Omni Terminal remnants (`Sidebar.tsx`, `settingsStore.ts`, `data_shapes.ts`, `boundarySchemas.ts`, `ActivityBar.tsx`).
  - FIND-03 (Pillar 8): Refactored `gateway.rs` and `cntxt-mcp-server.mjs` to dynamically resolve `%APPDATA%\com.cntxt.desktop\gateway_runtime.json` (and platform equivalents), sync `{ running: false, port: 0 }` on shutdown, and support candidate loopback ports.
  - FIND-04 (Pillar 9): Eliminated silent error swallowing on disk writes in `hostCommandBus.ts`. Dispatched `Disk Save Warning` toast notifications and returned structured `{ savedToDisk, diskError }` telemetry.
  - FIND-05 (Pillar 9): Preserved original disk `filePath` during ordinary content editing in `tabStore.ts`. Extension promotion to `.cntxt` is restricted to untitled tabs or explicit user commands (`toggleActiveThread`).
  - FIND-06 (Pillar 6): Authored canonical plan document `generated-documents/plans/feature_group_FG23_active_thread_and_user_inbox_2026-10-21.md`.
  - FIND-07 & FIND-08 (Pillars 6 & 4): Refactored `cntxt-mcp-server.mjs` to a unified dynamic tool registry (`Map`), added declared tools `cntxt_clear_diagnostics`, `cntxt_apply_template`, and `cntxt_notify`, and removed undeclared raw `cntxt_rpc` passthrough.
  - FIND-09 (Pillar 2): Replaced hardcoded hex `#F59E0B` and Tailwind palette classes with CSS custom properties (`--status-warning`, `--status-info`) and tokenized classes (`cm-cntxt-pill-user`, `cm-cntxt-pill-agent`).
  - FIND-10 (Pillar 9): Added structured diagnostic warning on gateway stop failures in `ShellFrame.tsx`.
  - FIND-11 (Pillar 9): Surfaced JSON-RPC parse errors (`-32700`) and logged config parse warnings to stderr in `cntxt-mcp-server.mjs`.
  - FIND-12 (Pillar 6): Pruned stale doc comments and reconciled living context state.
- Task 64: Feature Group FG-23 — Active Thread `.cntxt` Orchestration, Inline Citation Reply Input & Visual Refinements (2026-10-21):
  - Visual Refinements:
    - Reduced continuous left accent rail thickness by 2px (from 3px down to 1px) and muted the line color to `color-mix(in srgb, var(--accent-primary, #6366F1) 42%, transparent)`.
    - Enforced 100% pure Lucide SVG icons across all code block headers, controls, and floating popups (zero emoji fallbacks).
  - Inline Citation Reply Popover (`id=user-inbox`):
    - Added [Respond] button (`LUCIDE_SVGS.messageSquarePlus`) to both the block header widget and the scrollbar-aligned floating controls bar.
    - Floating reply popover auto-captures highlighted text selection or cursor line range (`#<blockId> · L<start>-L<end>`) and snippet preview.
    - Submitting automatically writes or appends timestamped (`ts=...`) line citations into the pinned single user-owned block (`id=user-inbox source=@USER locked=user status=open`) at the very top of the document via `appendUserInboxEntry`.
  - Active Thread Routing & `.cntxt` Promotion:
    - Added Tab context menu option "Toggle as Active Thread" with Lucide `Radio` icon and pulsing visual badge on the tab bar.
    - When a tab is toggled as Active Thread, incoming agent deliverables from MCP (`cntxt_open_deliverable`), REST Gateway (`/api/v1/tabs/open`), or RPC `tabs.create` automatically prepend immediately below `id=user-inbox` via `prependDeliverableToThread`.
    - When no active thread tab exists, deliverables default to creating a new `.cntxt` file in the configured deliverable folder (workspace `.cntxt/deliverables` or custom folder configurable in Settings -> Storage).
    - Automatic Extension Promotion: Documents containing CNTXT pipe blocks (`hasCntxtPipeBlock`) or toggled as Active Thread automatically promote `.md` -> `.cntxt`.
- Master Strategic Roadmap (Authoritative Future Updates):
  1. CNTXT Library (Personal & Community):
     - Personal Library: Private cloud/Git sync for personal templates, custom prompt actions, code block presets, and custom themes across Desktop, Android, and Web.
     - Community Library: Public hub for discovering, sharing, and 1-click importing community-created workflows, interactive widgets, templates, and agent directives.
  2. Workflow Builder (Universal Workflow Engine):
     - Elevation of the current panel App Builder into a universal Workflow Engine.
     - App Builder becomes a specialized sub-workflow recipe (Schema -> UI Form -> State Binding -> Panel App).
     - Declarative multi-stage pipelines for document proofreading, Project Odin review/audit QC, data transformations, and chained prompt/script execution.
     - Multi-surface triggers: Activity Bar, Ribbon bookmarks, Slash Commands (`/run-workflow`), Hotkeys, or external agent MCP calls.
  3. Code Blocks Builder (First-Class Primitives & Conversation/Audit Optimizations):
     - Promotion of code blocks from syntax boxes to first-class interactive CNTXT primitives.
     - Dedicated Activity Bar rail panel (`block-builder`) with primitive picker, visual parameter inspector (`id`, `title`, `locked`, `status`, `tags`), live interactive preview, and 1-click document insertion.
     - Flagship Primitive: Notion-Like Interactive Tables (drag-to-resize columns, row/col operations, keyboard cell editing, sorting, bidirectional GFM sync).
     - Conversation & Audit Mode Usability Overhaul:
       - Active Thread visual indicators, banner, and state differentiation for `.cntxt` files.
       - Smart Comment Visibility: User responses and notes collapsed in document view by default, surfacing in a conversational side-rail or margin timeline.
       - Chronological & Cited-Line Weaved Markdown Export: `.cntxt` -> `.md` export engine sorting deliverables by ISO-8601 timestamps and weaving user comments directly beneath their cited line numbers (`link=<blockId>#L<start>-L<end>`).
       - Audit Mode Optimizations: Structured checklist tables, pass/fail/flag criteria, and 1-click copy cards for external review platforms (e.g., Mercor Studio).
- Task 63: Feature Group FG-22 — CNTXT Block Parser Engine, Rich Container Rendering & Surgical Block RPC (2026-10-21):
  - Implemented `cntxtBlockParser.ts` supporting pipe (`|`) info strings (`id`, `tags`, `locked`, `status`, `link`, `source`, `title`), `CntxtRelationshipGraph` (`byId`, `byType`, `byTag`, `links`, `linkedFrom`), and 5 surgical block writers (`updateBlockParams`, `updateBlockContent`, `insertBlock`, `removeBlock`, `upsertBlock`).
  - Implemented Two-Tier Rich Container scanner (`findCntxtContainers` in `scanners.ts`), seamless editor canvas styling with unbroken left margin accent rail and scrollbar-aligned floating control popup (`cntxtBlockOverlay.ts`), pure Lucide SVG icons (`codeBlockWidget.ts`), and `blocks.*` RPC/MCP domain (`hostCommandBus.ts`, `cntxt-mcp-server.mjs`, `send-to-cntxt.ps1`).
- Task 62: v0.6.0 Dual-Agent Audit Reconciliation & Production Hardening (2026-10-20):
  - Pass 2 Reconciliation Report (`generated-documents/audits/reconciled_audit_feature_v060_release_2026-10-20.md`):
    - All 15 audit findings from Pass 1 independent auditor reconciled and remediated (0 open defects).
  - Virtual Document Chunking Remediations (FG-19):
    - FIND-01 (CRITICAL): Connected `initializeChunkSession` to `LargeDocModal.tsx` section selection, activating `activeTab.chunkSession` and non-destructive disk splicing.
    - FIND-02 & FIND-05 (HIGH): Hardened file safety against data loss — auto-creates timestamped recovery files (`.edited-chunk-recovery-<ts>.md` on splice failure and `.edited-chunk-conflict-<ts>.md` on master file external modification divergence).
    - FIND-10 (MEDIUM): Updated `ChunkNoticeBanner.tsx` and `ShellEditorContainer.tsx` to distinguish legacy read-only preview tabs from active splice sessions.
    - FIND-13 (MEDIUM): Added 3 unit tests in `chunkBufferService.test.ts` for corrupt boundary and HTML anchor deletion recovery.
  - Host RPC & Localhost REST Gateway Remediations (FG-20):
    - FIND-03 & FIND-15 (HIGH/LOW): Added immediate broadcast shutdown channel in `gateway.rs` and teardown hook in `SettingsPanel.tsx` on experimental toggle disable. Added debounced port input commit in `RestGatewaySettingsCard.tsx`.
    - FIND-04 & FIND-14 (HIGH/LOW): Added 4 native Rust unit tests covering token security, loopback host validation, and CORS; pruned dead parameters from `gateway.rs`.
    - FIND-08 & FIND-09 (MEDIUM): Upgraded native HTTP server in `gateway.rs` with TCP stream chunk accumulator up to 10 MB, strict loopback Host validation (`127.0.0.1`, `localhost`, `[::1]`) against DNS rebinding, and loopback CORS origin restriction.
    - FIND-06 & FIND-07 (MEDIUM): Replaced `any` with strict typing (`CntxtRpcRequest`, `unknown`) and eliminated swallowed listener errors in `tauriRuntimeAdapter.ts`.
    - FIND-11 & FIND-12 (MEDIUM): Synchronized 32-bit FNV-1a checksum documentation in canonical contracts, added `foldRange`/`unfoldRange` aliases, and added `EditorReplaceRangePayloadSchema` with Zod boundary validation. Added next-5-ports auto-fallback on port bind collisions.
  - Packaging & Verification:
    - 740/740 Vitest unit tests passing across 64 test suites.
    - 12/12 native Rust tests passing in `src-tauri`.
    - Recompiled and Authenticode-signed v0.6.0 binaries in `dist-portable/` and `dist-installer/`.
- Task 61: Feature Group FG-20 — Host Command Bus & Localhost REST Gateway Hardening (2026-10-19):
  - Headless Host Command Bus & Editor Extensions (`hostCommandBus.ts`, `editorRegistry.ts`, `clientSdk.ts`):
    - Added high-fidelity editor manipulation RPCs: `editor.setSelections`, `editor.getSelections`, `editor.fold`, `editor.setDiagnostics`, `editor.clearDiagnostics`, and `editor.replaceRange`.
    - Added boundary schemas with strict validation in `boundarySchemas.ts`.
  - Native Localhost REST API Gateway (`src-tauri/src/commands/gateway.rs`, `commands/mod.rs`, `lib.rs`):
    - Implemented native Tokio TCP/HTTP server in Rust listening on configurable port (default: 9876).
- Task 60: Feature Group FG-19 — Large Document Virtualization (>5MB) & Virtual Buffer Coordinator (2026-10-19):
  - Implemented 32-bit FNV-1a checksumming and non-destructive bottom-to-top disk splicing (`chunkBufferService.ts`).
- Task 59: KaTeX / LaTeX / MathJax Restoration, SVG-Aware Mermaid Rendering, Ephemeral Code Block Collapse & v0.5.15 Release (2026-10-19).
- Task 58: Android Signed APK Build Pipeline, Adaptive Branding & v0.5.14 Release (2026-10-19).
- Task 57: Audit Reconciliation for v0.5.12 Release (2026-10-17).
