# LIVING CONTEXT DOCUMENT
Version: v2.42
Last Updated: 2026-10-19
Last Updated By: Prod Agent (FG-19 Large Doc Virtualization & FG-20 Host RPC / REST Gateway Hardening)
Project: CNTXT (ContextPad) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile)
Target Platform(s): Web (Vercel + Supabase Free-Tier) + Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Mobile (Android via Tauri v2 Mobile runtime)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4 + Rust (Tauri v2) + Supabase
━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [x] Feature Implementation (FG-01..FG-18 Complete & Verified; Tri-Platform Suite Live)
  [x] Refactor (Syntax Highlighting Granularity & Code Block Aesthetic Overhaul across Desktop + Android + Web)
    [x] Testing (Vitest 719/719 Live across 63 suites, Playwright E2E 24/24 Live on Cold Server, Rust Security Test Suite 9/9 Live)
  [x] Tri-Platform Hybrid Architecture Alignment & Web SaaS Readiness (Web Free-Tier SaaS Live, Desktop Native Live, Android Mobile Live)
  [x] Packaging & Release (v0.6.0 Authenticode Signed Portable Executable & Native Installers Built: CNTXT_0.6.0_portable.exe, CNTXT_0.6.0_x64-setup.exe, CNTXT_0.6.0_x64_en-US.msi; v0.5.14 Android Signed APK Pipeline Live)

Current Feature Group: Large Document Virtualization (>5MB) & Host RPC / REST Gateway Hardening (FG-19 & FG-20, v0.6.0 Release)
Status: [x] complete & verified (All 15 Pass 1 audit findings reconciled & remediated, Authenticode-signed v0.6.0 release binaries built)
Background Processes: event-driven PTY streaming & debounced file-tailer synchronization (strictly gated behind Settings -> Experimental -> enableExperimentalSettings && enableTerminalBus && enableOmniTerminal; disabled by default)
Unit Tests: written [x] passing [x] (740/740 unit tests passing across 64 suites in CNTXT, 12 native Rust security tests clean, 24/24 Playwright E2E clean on cold server)
Active Plan: /generated-documents/plans/feature_group_FG18_omni_terminal_file_driven_redesign_2026-10-12.md
Notes:
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
    - Added boundary schemas with strict validation in `boundarySchemas.ts`: `EditorSetSelectionsPayloadSchema`, `EditorFoldPayloadSchema`, `EditorSetDiagnosticsPayloadSchema` (with monotonic position refinement `to >= from`), and `RestGatewayConfigSchema`.
    - Updated `window.CNTXT.editor` polyfill in `clientSdk.ts` providing seamless promise-based helper methods for panel apps and external agents.
  - Native Localhost REST API Gateway (`src-tauri/src/commands/gateway.rs`, `commands/mod.rs`, `lib.rs`):
    - Implemented native Tokio TCP/HTTP server in Rust listening on configurable port (default: 9876).
    - Hardened `GET /api/v1/health` minimal liveness endpoint to return strictly status and version, with zero path leaks (FIND-PLAN-20-01).
    - Implemented constant-time XOR verification for `X-CNTXT-Token` headers guarding sensitive workspace and editor endpoints (`/api/v1/workspace`, `/api/v1/rpc`, `/api/v1/editor/insert`, `/api/v1/tabs/open`).
    - Implemented IPC request-response correlation via Tokio `oneshot::channel` and UUIDv4 `correlationId` with 15-second timeout and webview event dispatch (`cntxt://rpc-request` -> `resolve_rpc_response`) (FIND-PLAN-20-02).
    - Added `regenerate_gateway_token` command for instantaneous token invalidation and re-issuance without restarting TCP listener.
  - Bridge & Presenter UI Integration (`bridgeContract.ts`, `tauriRuntimeAdapter.ts`, `browserRuntimeAdapter.ts`, `settingsStore.ts`, `RestGatewaySettingsCard.tsx`, `SettingsPanel.tsx`):
    - Implemented `IRestGatewayBridge` and status reporting in desktop and fallback browser runtime adapters.
    - Added `enableRestGateway` and `restGatewayPort` configuration flags to `ViewSettings` and `settingsStore.ts`.
    - Built pure presenter component `RestGatewaySettingsCard.tsx` under Universal Presenter Purity, featuring an active green pulse listening badge, port configuration, 1-click token copy, show/hide masking, and token regeneration.
    - Quarantined card in `SettingsPanel.tsx` using `<ErrorBoundary fallbackTitle="REST Gateway Settings Error">`.
  - Testing & Verification: 29/29 tests passing in `tests/hostCommandBus.test.ts`, 64/64 test suites passing (737/737 tests overall), clean `cargo check`, and clean `npm run lint` with 0 platform leaks and 100% contract synchronization.

- Task 60: Feature Group FG-19 — Large Document Virtualization (>5MB) & Virtual Buffer Coordinator (2026-10-19):
  - Canonical Contracts & Boundary Schemas (`contracts/data_shapes.ts`, `boundarySchemas.ts`):
    - Added canonical interfaces `ChunkSectionRange`, `ChunkSessionMetadata`, and `ChunkSpliceResult`, and extended `Tab` with `chunkSession`, `isLargeDoc`, and `totalOriginalBytes`.
    - Synchronized contracts across canonical root, `src/`, and `generated-documents/context/`.
    - Added Zod schemas `ChunkSectionRangeSchema`, `ChunkSessionMetadataSchema`, and `validateChunkSplicePayload`.
  - Headless Virtual Buffer Coordinator (`src/services/chunkBufferService.ts`):
    - Implemented 32-bit FNV-1a checksumming for master document buffers.
    - Built section parser generating structured chunk ranges with synthetic comment anchors (`<!-- cntxt:section:id -->`).
    - Implemented non-destructive bottom-to-top disk splicing (`spliceChunkIntoFullContent`) supporting triple-tier boundary resolution (comment anchors -> exact heading regex -> fuzzy Levenshtein <= 3 -> single-section fallback -> timestamped safety recovery file fallback).
    - Added external file modification detection (`detectExternalModification`).
  - Event Dispatcher & Store Splicing (`src/adapters/eventDispatcher.ts`, `src/store/tabStore.ts`):
    - Updated `onSaveFile` to non-destructively splice chunk buffer changes back into full disk master files without loading entire documents into memory.
    - Updated `restoreFullContent` in `tabStore.ts` to restore master document content and clear chunk sessions.
  - UI Presenters (`src/components/Editor/ChunkNoticeBanner.tsx`, `src/shell/ShellEditorContainer.tsx`, `src/components/Modals/LargeDocModal.tsx`):
    - Built pure presenter `ChunkNoticeBanner.tsx` with error boundary isolation displaying active chunk section count, line range, and "Open Full Doc" / "Select Sections" actions.
    - Updated `LargeDocModal.tsx` to initialize chunk sessions using `initializeChunkSession`.
  - Testing & Verification: 14/14 unit tests passing in `tests/chunkBufferService.test.ts`.

- Task 59: KaTeX / LaTeX / MathJax Restoration, SVG-Aware Mermaid Rendering, Ephemeral Code Block Collapse & v0.5.15 Release (2026-10-19):
  - HTML & SVG Sanitizer Hardening (`src/adapters/domHelper.ts`):
    - Added `sanitizeSvgHtml`: Preserves safe internal `<style>` stylesheets, definitions, node fills, and borders in Mermaid diagrams while stripping malicious script tags and event handlers.
    - Updated `sanitizePreviewHtml`: Expanded `isVerifiedMathSpan` to recognize `.katex`, `.katex-display`, `.katex-html`, and `[data-cntxt-math]` to preserve relative/vertical positioning styles (`top`, `bottom`, `position: relative`, `height`, `vertical-align`) required for math layout while continuing to strip `position: fixed`, `position: sticky`, and `z-index`.
  - KaTeX & LaTeX Delimiter / Language Parity:
    - Stamped root KaTeX container with `data-cntxt-math="true"` in `mathRenderer.ts` and `mathWidget.ts`.
    - Added `mathjax`, `tex`, and `amsmath` aliases in `languageMeta.ts` and `liveMarkdown.ts`.
    - Added support for LaTeX/MathJax `\[ ... \]` display math in `scanners.ts` and `\( ... \)` inline math in `liveMarkdown.ts`.
  - Mermaid Rendering: Switched canvas rendering to `sanitizeSvgHtml` in `mermaidWidget.ts`.
  - Ephemeral Code Block Collapse:
    - Created `collapseState.ts` exporting `codeBlockCollapseField` and `toggleCodeBlockCollapseEffect` with automatic line remapping across edits.
    - Added chevron collapse/expand toggle button, line count badge (`N lines`), 1-click header body expansion, and rounded corners when collapsed in `codeBlockWidget.ts`.
    - Folded body lines and closing fence using `Decoration.replace({ block: true })` in `liveMarkdown.ts`.
    - Added CSS classes `.cm-live-codeblock-collapsed` and `.cm-live-collapse-btn` in `src/index.css`.
  - Verification: 719 / 719 unit tests passing across all 63 test suites in `tests/domHelper.test.ts` and `tests/extendedMarkdown.test.ts`. `npm run lint` clean across 187 files with 0 platform leaks and 100% canonical contract sync.
  - Packaging: Version bumped to `0.5.15` in `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml`. Built and Authenticode-signed packages created in `dist-portable/` and `dist-installer/`: `CNTXT_0.5.15_portable.exe`, `CNTXT_0.5.15_x64-setup.exe`, and `CNTXT_0.5.15_x64_en-US.msi`.
- Task 58: Android Signed APK Build Pipeline, Adaptive Branding & v0.5.14 Release (2026-10-19):
  - Cross-Platform Android Build Script (`scripts/build-android.mjs`): Created zero-dependency Node.js build runner supporting `--target arm64` and `--target universal`. Automates frontend compilation, Rust NDK `cdylib` cross-compilation (`libcntxt_lib.so`), JNI staging, and Gradle release packaging.
  - Release Keystore & v2/v3 Signing: Generated 2048-bit RSA release keystore (`release.keystore`) and configured `signingConfigs` in `src-tauri/gen/android/app/build.gradle.kts` for automatic v2/v3 signing.
  - AGP Environment Resolution: Fixed AGP initialization exception by unsetting `ANDROID_PREFS_ROOT` and standardizing on `ANDROID_USER_HOME`.
  - Launcher Branding Synchronization: Synced all CNTXT adaptive launcher icon densities (`mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`, `anydpi-v26`) and background color `#141417` to `src-tauri/gen/android/app/src/main/res/`. Pruned stale default bugdroid vector drawables.
  - Live Wireless Device Deployment: Connected via ADB to `192.168.1.35:43327`, installed `cntxt-0.5.14-arm64-release-signed.apk` (`18 MB`), launched `com.cntxt.desktop/.MainActivity` (PID `21177`), and verified full UI execution.
  - Git Safety: Updated `.gitignore` to explicitly ignore `*.keystore`, `*.jks`, `.idea/`, `dist-android/`, and `scratch/` to prevent sensitive credentials or local artifacts from being pushed to GitHub.
- Task 57: Audit Reconciliation for v0.5.12 Release (2026-10-17):
  - CSP Security Hardening (Pillar 8 / FIND-01): Tightened Content Security Policy in `index.html` and `src-tauri/tauri.conf.json`, removing broad remote plaintext `http:` schemes from `script-src`, `worker-src`, `frame-src`, `style-src`, `font-src`, and `img-src` to eliminate MITM injection vectors while preserving local loopback IPC endpoints (`http://localhost:* http://127.0.0.1:* http://ipc.localhost ipc:`).
  - Zero Dynamic Evaluation in Preflight (Pillar 8 & 3 / FIND-02 & FIND-03): Replaced `new Function(code)` and `catch (err: any)` in `src/features/panelApps/preflight/scan.ts` with static AST parsing via `@codemirror/lang-javascript` (`javascriptLanguage.parser.parse`), enforcing the strict zero-eval and strict typing invariants.
