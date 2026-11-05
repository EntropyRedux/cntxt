# LIVING CONTEXT DOCUMENT
Version: v2.56
Last Updated: 2026-11-05
Last Updated By: Prod Agent (v0.7.7 Release Packaging — Zero-Margin Accuracy & Resizable Toolbar)
Project: CNTXT (ContextPad) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile)
Target Platform(s): Web (Vercel + Supabase Free-Tier) + Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Mobile (Android via Tauri v2 Mobile runtime)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4 + Rust (Tauri v2) + Supabase
━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [x] Feature Implementation (FG-01..FG-24 Complete & Verified)
  [x] Refactor (Syntax Highlighting Granularity & Code Block Aesthetic Overhaul across Desktop + Android + Web)
    [x] Testing (Vitest 741/741 Live across 64 suites, Rust Security Test Suite 13/13 Live)
  [x] Tri-Platform Hybrid Architecture Alignment & Web SaaS Readiness (Web Free-Tier SaaS Live, Desktop Native Live, Android Mobile Live)
  [x] Packaging & Release (v0.7.4 Windows Executables & Android Signed APK Staged)

Current Feature Group: FG-24 Linux Desktop & Android Mobile v0.7.4 Release
Status: [x] Implemented, Verified, Packaged & Staged
Background Processes: event-driven PTY streaming & debounced file-tailer synchronization (strictly gated behind Settings -> Experimental -> enableExperimentalSettings && enableTerminalBus; disabled by default)
Unit Tests: written [x] passing [x] (741/741 unit tests passing across 64 suites in CNTXT, 13 native Rust tests clean)
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
- Future Roadmap Note — Chronological & Cited-Line Weaved Markdown Export (`.cntxt` -> `.md`):
  - When a `.cntxt` Active Thread document is exported to standard `.md` (Markdown):
    1. Agent deliverable blocks (`~~~markdown | ... ts=<ISO-8601>`) chronologically arrange themselves using their `ts=` timestamp tags.
    2. User comments and responses inside the dedicated user-owned comment block (`id=user-inbox source=@USER`) use their `ts=` timestamps and `link=<blockId>#L<start>-L<end>` citations to weave and insert themselves directly at their cited lines inside the exported Markdown document.
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
