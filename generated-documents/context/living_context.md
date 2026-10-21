# LIVING CONTEXT DOCUMENT
Version: v2.46
Last Updated: 2026-10-21
Last Updated By: Prod Agent (v0.7.1 Release Packaging & Audit Remediation Sync)
Project: CNTXT (ContextPad) — Tri-Platform Suite (Web SaaS + Native Desktop + Android Mobile)
Target Platform(s): Web (Vercel + Supabase Free-Tier) + Desktop (Windows / macOS / Linux via Tauri v2 + Rust) + Mobile (Android via Tauri v2 Mobile runtime)
Production Stack: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4 + Rust (Tauri v2) + Supabase
━━━ CURRENT DEVELOPMENT STATE ━━━
Active Stage:
  [ ] Planning
  [ ] AI Studio — MVP Spec Build
  [ ] AI Studio — Iterations
  [ ] Porting & Spec Implementation
  [x] Feature Implementation (FG-01..FG-23 Complete & Verified)
  [x] Refactor (Syntax Highlighting Granularity & Code Block Aesthetic Overhaul across Desktop + Android + Web)
    [x] Testing (Vitest 728/728 Live across 61 suites, Rust Security Test Suite 12/12 Live)
  [x] Tri-Platform Hybrid Architecture Alignment & Web SaaS Readiness (Web Free-Tier SaaS Live, Desktop Native Live, Android Mobile Live)
  [x] Packaging & Release (v0.7.1 Authenticode Signed Portable Executable & Native Installers Built: CNTXT_0.7.1_portable.exe, CNTXT_0.7.1_x64-setup.exe, CNTXT_0.7.1_x64_en-US.msi; v0.5.14 Android Signed APK Pipeline Live)

Current Feature Group: Pass 2 Audit Reconciliation & Remediation (FG-21, FG-22, FG-23)
Status: [x] Reconciled & Remediated (All 12 findings resolved)
Background Processes: event-driven PTY streaming & debounced file-tailer synchronization (strictly gated behind Settings -> Experimental -> enableExperimentalSettings && enableTerminalBus; disabled by default)
Unit Tests: written [x] passing [x] (731/731 unit tests passing across 62 suites in CNTXT, 12 native Rust security tests clean)
Active Plan: /generated-documents/plans/feature_group_FG23_active_thread_and_user_inbox_2026-10-21.md
Notes:
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
