# CHANGELOG — CNTXT

All notable changes to the CNTXT project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
