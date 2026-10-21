# CHANGELOG — CNTXT

All notable changes to the CNTXT project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] — 2026-10-21

### OmniTerminal Decommissioning & Zero-Dependency Native MCP Server (FG-21)
- **OmniTerminal Decommissioning**:
  - Removed deprecated inline terminal chat components (`OmniTerminalView`, `ChatInputBar`, `AgentRosterBar`, `OmniFloatingChat`, `ChatMessageBubble`, `OmniMarkdownViewer`, `omniDocumentSync.ts`, `omniPromptDetector.ts`, `omniRoleGate.ts`, `omniTerminalStore.ts`).
  - Purged OmniTerminal UI entry points from ActivityBar, CommandPalette, and SettingsPanel while preserving foundational PTY terminal emulator tabs (`TerminalView.tsx`, `terminalStore.ts`).
- **Zero-Dependency Native MCP Server (`scripts/mcp/cntxt-mcp-server.mjs`)**:
  - Implemented standalone Node.js Model Context Protocol (MCP) stdio server bridging external AI agents (Antigravity, Claude Code/Desktop, Cursor, Cline, Windsurf) to CNTXT's localhost REST API Gateway and Host Command Bus.
  - Exposes 8 native tools: `cntxt_open_deliverable`, `cntxt_append_deliverable`, `cntxt_list_blocks`, `cntxt_get_block`, `cntxt_upsert_block`, `cntxt_update_block_params`, `cntxt_get_active_context`, `cntxt_list_tabs`, `cntxt_focus_tab`, `cntxt_set_diagnostics`, and `cntxt_rpc`.
  - Enforced Mandatory AI Deliverable CNTXT Rich Container Invariant: all agent deliverables are automatically encapsulated inside CNTXT rich containers (`~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="Title"`).
- **PowerShell Agent Deliverable Bridge (`send-to-cntxt.ps1`)**:
  - Published zero-dependency PowerShell script for autonomous CLI and agent pipelines with auto-token discovery, candidate port fallback (9876..9881), and rich container packaging.

### CNTXT Block Parser Engine, Rich Container Scanner & Surgical Block RPC (FG-22)
- **CNTXT Block Parser Engine (`cntxtBlockParser.ts`)**:
  - Built full CNTXT block grammar parser supporting pipe syntax (`<type> | <key>=<value>...`).
  - Implemented canonical governance primitives: `id`, `tags`, `locked` (`user` | `agent`), `status` (`draft` | `review` | `ready` | `approved` | `done`), `link`, `source`, `ts`, and `title`/`label`.
  - Built `CntxtRelationshipGraph` computing forward `links`, reverse `linkedFrom` dependency back-links, and O(1) indices (`byId`, `byType`, `byTag`).
  - Implemented 5 surgical block writers: `updateBlockParams`, `updateBlockContent`, `insertBlock`, `removeBlock`, and `upsertBlock` with non-destructive round-trip AST serialization.
- **Two-Tier Rich Container Scanner (`scanners.ts`, `liveMarkdown.ts`)**:
  - Separated top-level CNTXT containers (`~~~markdown | ...`) from inner fenced code blocks, tables, and Mermaid widgets, preventing inner blocks from prematurely terminating outer deliverable containers.
- **Continuous Accent Rail & Scrollbar Controls (`cntxtBlockOverlay.ts`, `codeBlockWidget.ts`)**:
  - Replaced disjoint code block frames with an unbroken continuous left margin accent rail (`.cm-cntxt-left-rail`) spanning the entire height of the deliverable container.
  - Implemented viewport-aware scrollbar-aligned floating action popup bar providing block ID copy, status cycler, user/agent lock toggler, content copy, clear content, and block collapse controls.
  - Enforced 100% pure Lucide SVG icon paths across all code block headers, controls, and floating popups (zero emoji fallbacks).
- **Blocks RPC Domain (`hostCommandBus.ts`, `boundarySchemas.ts`)**:
  - Added `blocks.list`, `blocks.get`, `blocks.upsert`, `blocks.updateParams`, and `blocks.remove` with strict `locked=user` human permission guardrails.

### Active Thread `.cntxt` Orchestration, Inline Citation Reply Input & Visual Refinements (FG-23)
- **Visual Refinements (`index.css`)**:
  - Reduced continuous left accent rail thickness by 2px (from 3px down to 1px) and muted the line color to `color-mix(in srgb, var(--accent-primary, #6366F1) 42%, transparent)` with 1px tick marks.
- **Inline Citation Reply Popover (`id=user-inbox`) (`cntxtBlockOverlay.ts`, `codeBlockWidget.ts`, `cntxtBlockParser.ts`)**:
  - Added `[Respond]` button (Lucide `MessageSquarePlus`) on block headers and scrollbar floating popup.
  - Floating reply popover auto-captures highlighted text selection or cursor line range (`#<blockId> · L<start>-L<end>`) and quote snippet preview.
  - Submitting writes timestamped (`ts=...`), cited (`link=<blockId>#L<start>-L<end>`) comments directly into the dedicated user-owned block (`id=user-inbox source=@USER locked=user status=open`) pinned at the **very top of the document** via `appendUserInboxEntry`.
- **Active Thread Routing & Extension Promotion (`tabStore.ts`, `TabBar.tsx`, `hostCommandBus.ts`, `SettingsPanel.tsx`)**:
  - Added Tab context menu option "Toggle as Active Thread" with Lucide `Radio` icon and pulsing visual badge on the tab bar.
  - When an active thread tab is enabled, incoming agent deliverables (via MCP, REST Gateway, or RPC `tabs.create`) automatically prepend immediately below `id=user-inbox` via `prependDeliverableToThread`.
  - Default fallback when no tab is active thread creates a new `.cntxt` file in the configured deliverable directory (workspace `.cntxt/deliverables` or custom folder in Settings -> Storage).
  - Documents containing CNTXT pipe blocks or toggled as Active Thread automatically promote `.md` -> `.cntxt`.
- **Testing & Verification**:
  - Added 13 unit tests in `tests/cntxtBlockParserAndRichContainers.test.ts` covering parsing, relationship graphs, rich containers, surgical writers, permission guards, user inbox citation appending, deliverable prepending, and active thread routing via HostCommandBus.
  - 728/728 Vitest unit tests passing across 61 test suites.

## [0.6.0] — 2026-10-20

### Large Document Virtualization & Headless Virtual Buffer Coordinator (FG-19)
- **Virtual Buffer Coordinator (`chunkBufferService.ts`)**:
  - Implemented non-destructive bottom-to-top master disk splicing for selective TOC-chunked document editing without loading multi-megabyte files into CodeMirror 6 DOM memory.
  - Built triple-tier boundary fallback resolution: HTML comment anchors (`<!-- cntxt:section:id -->`) -> exact Markdown heading regex -> fuzzy Levenshtein distance (<= 3) -> single-section fallback -> automatic timestamped safety recovery file backup.
  - Implemented 32-bit FNV-1a master file checksumming and external modification detection (`detectExternalModification`).
- **Disk Splicing Integration (`eventDispatcher.ts`, `tabStore.ts`)**:
  - Updated `onSaveFile` to seamlessly splice modified chunk buffers into the on-disk master file without overwriting unmodified sections.
  - Added `restoreFullContent` in `tabStore.ts` to cleanly transition from chunked editing to full-document view on demand.
- **Pure Presenter Notice Banner (`ChunkNoticeBanner.tsx`, `ShellEditorContainer.tsx`, `LargeDocModal.tsx`)**:
  - Built `ChunkNoticeBanner.tsx` wrapped in `<ErrorBoundary>` showing active chunk range, section counts, and actions to switch sections or open full document.
  - Updated `LargeDocModal.tsx` with unified chunk session initialization.
- **Unit Testing**:
  - Added 17 unit tests in `tests/chunkBufferService.test.ts` covering checksums, boundary anchors, fuzzy recovery, corrupt anchor handling, HTML anchor deletion fallback, section heading rename splicing, and external modification detection.

### Host Command Bus & Localhost REST API Gateway Hardening (FG-20)
- **Editor Domain RPC Extensions (`hostCommandBus.ts`, `editorRegistry.ts`, `clientSdk.ts`)**:
  - Added advanced editor manipulation actions: `editor.setSelections` (multi-cursor), `editor.getSelections`, `editor.fold`, `editor.setDiagnostics`, `editor.clearDiagnostics`, `editor.replaceRange`, and fold/unfold range aliases.
  - Added typed boundary schemas with Zod validation in `boundarySchemas.ts`: `EditorSetSelectionsPayloadSchema`, `EditorFoldPayloadSchema`, `EditorSetDiagnosticsPayloadSchema` (monotonic `to >= from` validation), `EditorReplaceRangePayloadSchema`, and `RestGatewayConfigSchema`.
  - Extended `window.CNTXT.editor` SDK injection in `clientSdk.ts` for panel apps and external automation scripts.
- **Native Localhost REST Gateway (`src-tauri/src/commands/gateway.rs`, `commands/mod.rs`, `lib.rs`)**:
  - Implemented native Tokio TCP/HTTP server in Rust listening on configurable port (default: 9876) with 5-port auto-fallback on bind conflict.
  - Hardened `GET /api/v1/health` minimal liveness endpoint to return strictly status and version, with zero path leaks.
  - Implemented constant-time XOR verification for `X-CNTXT-Token` headers guarding sensitive workspace and editor endpoints (`/api/v1/workspace`, `/api/v1/rpc`, `/api/v1/editor/insert`, `/api/v1/tabs/open`).
  - Implemented TCP stream chunk reading loop parsing `Content-Length` up to 10 MB for multi-segment HTTP bodies.
  - Implemented loopback-only Host header validation (`127.0.0.1`, `localhost`, `[::1]`) guarding against DNS rebinding attacks, and restricted CORS headers to loopback origins.
  - Implemented IPC request-response correlation via Tokio `oneshot::channel` and UUIDv4 `correlationId` with 15-second timeout and webview event dispatch (`cntxt://rpc-request` -> `resolve_rpc_response`).
  - Added broadcast shutdown channel for instantaneous listener termination without port parking.
  - Added `regenerate_gateway_token` command for instantaneous token invalidation and re-issuance without restarting TCP listener.
- **Bridge & Settings Presenter Card (`bridgeContract.ts`, `tauriRuntimeAdapter.ts`, `settingsStore.ts`, `RestGatewaySettingsCard.tsx`, `SettingsPanel.tsx`)**:
  - Added `IRestGatewayBridge` and status reporting to runtime bridge contracts.
  - Created pure presenter `RestGatewaySettingsCard.tsx` under Universal Presenter Purity, featuring an active green pulse listening badge, port configuration with blur/enter commit, 1-click token copy, show/hide masking, and token regeneration.
  - Quarantined card in `SettingsPanel.tsx` using `<ErrorBoundary fallbackTitle="REST Gateway Settings Error">` with explicit server shutdown on toggle off.
- **Unit Testing**:
  - Added 31 unit tests in `tests/hostCommandBus.test.ts` and 4 native Rust tests in `gateway.rs` verifying token security, constant-time verification, Host validation, and CORS resolution.

### Dual-Agent Audit Reconciliation & Production Hardening (Pass 2 Prod Agent)
- Reconciled all 15 audit findings from `generated-documents/audits/raw_findings_feature_v060_release_2026-10-19.md` in `generated-documents/audits/reconciled_audit_feature_v060_release_2026-10-20.md` (0 defects remaining).
- **FIND-01 (CRITICAL)**: Connected `initializeChunkSession` in `LargeDocModal.tsx` to active tab state (`chunkSession`, `isChunked`, `isLargeDoc`), enabling non-destructive disk splicing.
- **FIND-02 & FIND-05 (HIGH)**: Hardened against data loss by generating physical backup files: `${filePath}.edited-chunk-recovery-<timestamp>.md` on splice failure and `${filePath}.edited-chunk-conflict-<timestamp>.md` on external disk divergence.
- **FIND-03 & FIND-15 (HIGH/LOW)**: Added explicit gateway stop on experimental toggle disable and added broadcast shutdown channel for instantaneous TCP listener cleanup.
- **FIND-04 & FIND-13 (HIGH/MEDIUM)**: Added native Rust tests for gateway security and 3 chunk buffer edge-case recovery tests.
- **FIND-08 & FIND-09 (MEDIUM)**: Handled multi-segment TCP streams up to 10 MB and enforced loopback Host checks against DNS rebinding.
- **FIND-06 & FIND-07 (MEDIUM)**: Replaced `any` with strict `CntxtRpcRequest` and eliminated swallowed event errors.
- **FIND-10 (MEDIUM)**: Added `isTruncatedPreview` support in `ChunkNoticeBanner.tsx` and `ShellEditorContainer.tsx` to distinguish read-only preview tabs from active splice chunk sessions.
- **FIND-11 & FIND-12 (MEDIUM)**: Synchronized 32-bit FNV-1a checksum documentation in canonical contracts, added `foldRange`/`unfoldRange` aliases, and added `EditorReplaceRangePayloadSchema` with Zod boundary validation.
- **FIND-14 (LOW)**: Removed dead parameters from `gateway.rs` and added test coverage for `validateRestGatewayConfig`.

## [0.5.15] — 2026-10-19

### KaTeX / LaTeX / MathJax Restoration, SVG-Aware Mermaid Rendering & Ephemeral Code Block Collapse
- **KaTeX, LaTeX & MathJax Layout Restoration (`domHelper.ts`, `mathRenderer.ts`, `mathWidget.ts`, `liveMarkdown.ts`, `scanners.ts`)**:
  - Expanded HTML preview sanitizer `isVerifiedMathSpan` to recognize `.katex`, `.katex-display`, `.katex-html`, and `[data-cntxt-math]`.
  - Preserved essential vertical/relative positioning styles (`top`, `bottom`, `position: relative`, `height`, `vertical-align`, `margin*`) required for exponents, subscripts, fractions, square roots, and matrices, while strictly stripping `position: fixed`, `position: sticky`, and `z-index`.
  - Added support for LaTeX/MathJax display math `\[ ... \]` in `scanners.ts` and inline math `\( ... \)` in `liveMarkdown.ts`.
  - Added code block language aliases: `mathjax`, `tex`, and `amsmath` to `languageMeta.ts` and `liveMarkdown.ts`.
  - Stamped `data-cntxt-math="true"` directly on rendered KaTeX output in `mathRenderer.ts` and `mathWidget.ts`.
- **Mermaid Diagram SVG Styling Preservation (`domHelper.ts`, `mermaidWidget.ts`)**:
  - Implemented `sanitizeSvgHtml`: an SVG-aware sanitizer that preserves internal `<style>` stylesheets, definitions, node fills, borders, fonts, and geometry, while strictly stripping `<script>`, `<iframe>`, inline `on*` event handlers, and malicious `@import` or external URLs.
  - Resolved diagram wireframing and unstyled node text by connecting `MermaidBlockWidget` to `sanitizeSvgHtml`.
- **Ephemeral Code Block Collapse in Rendered Mode (`collapseState.ts`, `codeBlockWidget.ts`, `liveMarkdown.ts`, `index.css`)**:
  - Implemented ephemeral `codeBlockCollapseField` and `toggleCodeBlockCollapseEffect` in CodeMirror 6 to track collapsed blocks in-memory per view instance with dynamic line position remapping across text edits.
  - Added interactive chevron collapse/expand toggle button (`ChevronDown` / `ChevronRight`) and collapsed line count badge (`N lines`) to `CodeBlockHeaderWidget`.
  - Preserved full accessibility of `Copy` and `Clear` action buttons on collapsed headers, and enabled 1-click header body expansion.
  - Replaced the inner code range and closing fence with `Decoration.replace({ block: true })` when collapsed, folding intermediate lines away from the viewport.
- **Verification & Packaging**:
  - Version bumped to `0.5.15` across `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`.
  - All 63 test suites passing (719/719 unit tests); 0 platform leaks across 187 files; contracts 100% in sync.
  - Recompiled production web bundle (`dist/`).
  - Built and Authenticode-signed Windows installer (`CNTXT_0.5.15_x64-setup.exe`), MSI (`CNTXT_0.5.15_x64_en-US.msi`), and standalone binary (`CNTXT_0.5.15_portable.exe`).

## [0.5.14] — 2026-10-19

### Android Signed APK Build Pipeline, Adaptive Branding & Wireless Device Deployment
- **Automated Cross-Platform Android Build Pipeline (`scripts/build-android.mjs`)**:
  - Implemented a zero-dependency Node.js cross-platform build runner `scripts/build-android.mjs` supporting both `--target arm64` and `--target universal`.
  - Configured NDK Clang toolchain environment variables (`CARGO_TARGET_*_LINKER`) for Rust `cdylib` cross-compilation (`libcntxt_lib.so`).
  - Resolved Android Gradle Plugin environment variable collision by unsetting `ANDROID_PREFS_ROOT` and standardizing on `ANDROID_USER_HOME`.
- **Release Keystore & Automated APK Signing (`release.keystore`, `build.gradle.kts`)**:
  - Generated 2048-bit RSA release keystore (`src-tauri/gen/android/app/release.keystore`) valid for 10,000 days.
  - Configured Gradle `signingConfigs` block in `src-tauri/gen/android/app/build.gradle.kts` for automatic v2/v3 signing during Gradle assembly.
- **Android App Branding & Adaptive Launcher Icons (`src-tauri/gen/android/app/src/main/res/`)**:
  - Synchronized all CNTXT adaptive launcher icon densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`, `anydpi-v26`) and background color `#141417` to Android app resource directories.
  - Pruned conflicting default Android Studio bugdroid vector drawables (`drawable/ic_launcher_background.xml` & `drawable-v24/ic_launcher_foreground.xml`).
  - Added `android:roundIcon="@mipmap/ic_launcher_round"` to `AndroidManifest.xml`.
- **Cross-Platform npm Package Scripting (`package.json`)**:
  - Replaced Windows-only PowerShell commands in `package.json` for `"package:android"` and `"package:android:universal"` with cross-platform `node scripts/build-android.mjs`.
- **Target Device Deployment & Verification**:
  - Deployed signed release APK `cntxt-0.5.14-arm64-release-signed.apk` directly to wireless Android test device `192.168.1.35:43327`.
  - Verified `com.cntxt.desktop/.MainActivity` process execution (PID `21177`) and full UI rendering on device.

## [0.5.13] — 2026-10-17

### Hardened CSP, Pure Presenter Host Architecture & Static AST Preflight
- **Content Security Policy Hardening (`index.html`, `src-tauri/tauri.conf.json`)**:
  - Removed broad remote `http:` origins from `script-src`, `worker-src`, `frame-src`, `style-src`, `font-src`, and `img-src` to prevent MITM code injection. Retained loopback endpoints (`http://localhost:* http://127.0.0.1:* http://ipc.localhost ipc:`) strictly required for native IPC.
  - Eliminated wildcard fallback schemes and restricted frame/script contexts to safe internal sandboxes.
- **Pure Presenter Refactoring (`src/adapters/pureHost.ts`, `src/features/panelApps/host/HostPresenter.tsx`)**:
  - Decoupled native/IPC dependencies from visual UI components; visual presenters now receive strictly typed domain callbacks (`executeHostCommand`, `openExternalUrl`, `broadcastEvent`) injected via props.
  - Replaced ad-hoc `window.CNTXT` accesses inside UI views with centralized adapters.
- **Static AST Syntax Preflight Verification (`src/features/panelApps/preflight/scan.ts`)**:
  - Replaced dynamic `new Function(code)` evaluation with static AST validation using `@codemirror/lang-javascript` (`javascriptLanguage.parser.parse`), adhering to the strict zero-eval architecture invariant.
  - Eliminated catch-all `err: any` types and replaced them with structured diagnostics.
- **Floating Pop-out Window Protocol Alignment (`src/services/windowService.ts`, `src/features/panelApps/host/PanelAppFloatingWindow.tsx`)**:
  - Synchronized pop-out window dimensions and minimum constraints (`220x160`) across desktop platforms.
  - Preserved active state synchronization and tab mediation when windows are unpinned or docked.
- **Verification & Packaging**:
  - Added comprehensive unit test suites in `tests/pureHost.test.ts` verifying presenter decoupling and CSP enforcement.
  - Recompiled production web bundle (`dist/`).
  - Built and Authenticode-signed Windows installer (`CNTXT_0.5.13_x64-setup.exe`), MSI (`CNTXT_0.5.13_x64_en-US.msi`), and standalone binary (`CNTXT_0.5.13_portable.exe`).

## [0.5.12] — 2026-10-15

### Floating Pop-out Window Architecture, Compact Widget Resizing & Resilient App Builder SDK
- **Floating Pop-out Panel Apps (`windowService.ts`, `PanelAppFloatingWindow.tsx`)**:
  - Added native multi-window lifecycle management allowing Mini Panel Apps to detach into standalone, top-level desktop windows via Tauri v2 multi-webview IPC.
  - Implemented 2-way postMessage synchronization bridge between host workspace and floating child windows.
- **Compact Widget Resizing (`PanelAppContainer.tsx`, `AppBuilder.tsx`)**:
  - Enabled continuous downscaling of Mini Panel Apps to micro-widget dimensions (220px × 160px) with responsive toolbar collapsing and touch-friendly controls.
- **Resilient App Builder SDK (`appBuilderBridge.ts`, `sdk.ts`)**:
  - Hardened SDK method signatures against dropped postMessage frames; added exponential backoff retry for asynchronous host calls.
  - Persisted dirty state during sudden pop-out window close events to prevent unsaved changes.
- **Authenticode Code Signing**:
  - Added automated Authenticode SHA256 code signing to Windows NSIS setup, WiX MSI, and standalone portable executables using self-signed development certificate.
