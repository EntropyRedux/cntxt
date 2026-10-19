# LIVING CONTEXT DOCUMENT
Version: v2.41
Last Updated: 2026-10-19
Last Updated By: Prod Agent (KaTeX / MathJax / Mermaid Restoration, Ephemeral Code Block Collapse & v0.5.15 Release)
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
  [x] Packaging & Release (v0.5.15 Authenticode Signed Portable Executable & Native Installers Built; v0.5.14 Android Signed APK Pipeline Live)

Current Feature Group: KaTeX, MathJax, Mermaid & Ephemeral Code Block Collapse (v0.5.15 Release)
Status: [x] complete & verified (CSP hardened, AST preflight syntax checking, presenter purity decoupled, FAB dead code removed with migration, signed binaries built)
Background Processes: event-driven PTY streaming & debounced file-tailer synchronization (strictly gated behind Settings -> Experimental -> enableExperimentalSettings && enableTerminalBus && enableOmniTerminal; disabled by default)
Unit Tests: written [x] passing [x] (719/719 unit tests passing across 63 suites in CNTXT, 9 Rust security tests clean, 24/24 Playwright E2E clean on cold server)
Active Plan: /generated-documents/plans/feature_group_FG18_omni_terminal_file_driven_redesign_2026-10-12.md
Notes:
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
