# FEATURE GROUP DEFINITION: FG-24 — v0.7.1 Linux Desktop & Android Mobile Porting, Gateway Multi-Window Isolation & Native Packaging

* **Date:** 2026-10-28
* **Status:** Planned
* **Target Platform & Stack:** Linux Desktop (x86_64 `.deb`, AppImage/Portable Binary via Tauri v2 + Rust + GTK3/WebKit2GTK 4.1) & Android Mobile (`arm64-v8a` / `universal` Signed APK via Tauri v2 Mobile + Rust `cdylib` + Kotlin/WebView + React 19 + TypeScript + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4)
* **Document Path:** `generated-documents/plans/feature_group_FG24_linux_and_android_v071_port_2026-10-28.md`

---

#### 1. SCOPE & BOUNDARIES

**Features Included:**
1. **Task 66 Resolution — REST Gateway Multi-Window Event Isolation & Linux/Desktop Discovery Parity (`gateway.rs`, `tauriRuntimeAdapter.ts`):**
   * Update `src-tauri/src/commands/gateway.rs` (`handle_http_client`) to target the primary window explicitly via `app.emit_to("main", "cntxt://rpc-request", emit_payload)` instead of broadcasting `app.emit(...)` to all open windows (preventing duplicate tabs in multi-window sessions).
   * Guard `initRpcListener()` in `src/adapters/tauriRuntimeAdapter.ts` so that only the primary window (`getCurrentWindow().label === 'main'`) processes incoming `cntxt://rpc-request` events by default.
   * Harden `get_gateway_runtime_path()` and `sync_gateway_discovery_file()` in `gateway.rs` on Linux (`$XDG_CONFIG_HOME/com.cntxt.desktop/gateway_runtime.json` with fallback to `$HOME/.config/com.cntxt.desktop/gateway_runtime.json`) and synchronize `scripts/mcp/cntxt-mcp-server.mjs` to inspect `process.env.XDG_CONFIG_HOME`.
   * Gate `gateway.isAvailable()` in `src/adapters/androidRuntimeAdapter.ts` to return `false` on mobile (aligning with `RestGatewaySettingsCard.tsx` which states *"Desktop native runtime required. REST Gateway is unavailable in browser or mobile mode"*) and gate `start_rest_gateway` in `gateway.rs` on `#[cfg(any(target_os = "android", target_os = "ios"))]` to return a deterministic mobile error.
2. **Linux Desktop v0.7.1 Porting & Packaging Parity (`build-portable.mjs`, `tauri.conf.json`, `pty.rs`, `file.rs`):**
   * **Packaging & Artifact Parity (`scripts/build-portable.mjs`):** Update `build-portable.mjs` on Linux to produce both the versioned portable binary `dist-portable/CNTXT_${version}_portable` and `dist-portable/cntxt-portable` (`chmod 0o755`), and automatically copy Linux `.deb` (`bundle/deb/CNTXT_${version}_amd64.deb` or `cntxt_${version}_amd64.deb`) and `.AppImage` bundles (if built) into `dist-installer/CNTXT_${version}_amd64.deb`.
   * ** `.cntxt` File Association Registration (`src-tauri/tauri.conf.json` & `AndroidManifest.xml`):** Register `.cntxt` extension in `tauri.conf.json` (`bundle.fileAssociations`) and `AndroidManifest.xml` intent filters so both Linux desktop environments (XDG MIME / `.desktop` entry) and Android OS recognize `.cntxt` Active Thread and Panel App documents natively.
   * **Linux External Terminal Fallback Chain (`src-tauri/src/commands/pty.rs`):** Replace the single brittle `x-terminal-emulator` call on Linux in `spawn_external_terminal` with a resilient fallback chain (`$TERMINAL`, `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `alacritty`, `kitty`, `wezterm`, `xterm`) and honor `shell_override` when provided.
3. **Android Mobile v0.7.1 Porting & Touch Ergonomics for FG-22/FG-23 (`MainActivity.kt`, `TabBar.tsx`, `cntxtBlockOverlay.ts`, `build-android.mjs`):**
   * **Android Native Back-Button Handshake Restoration (`MainActivity.kt` & `cntxtBlockOverlay.ts`):** Restore `onWebViewCreate` capture and `OnBackPressedCallback` evaluation of `window.__CNTXT_HANDLE_BACK__()` in `src-tauri/gen/android/app/src/main/java/com/cntxt/desktop/MainActivity.kt` (regressed to a bare 11-line stub). Also hook open CNTXT Reply Popover / Floating Control Popup dismissal into the back-button chain so pressing Android Back closes an open CNTXT `[Respond]` popover before closing the sidebar or minimizing the app.
   * **Touch Mode Active Thread Toggle (`src/components/TabBar/TabBar.tsx`):** In touch/mobile mode (`isTouch === true`), `TabBar.tsx` renders the floating tab pill and touch dropdown list instead of the desktop horizontal tab strip where right-click context menus live. Add a touch-accessible `Radio` ("Toggle as Active Thread") button and active pulsing indicator directly inside each tab row of the touch `Open Tabs` popover so Android and Linux touch users can toggle FG-23 Active Threads without requiring a right-click mouse event.
   * **Mobile Viewport Clamping for CNTXT Reply Popover (`src/extensions/liveMarkdown/cntxtBlockOverlay.ts`):** Ensure the FG-23 `[Respond]` citation reply popover positions safely within mobile viewports when the Android virtual keyboard is raised (`interactive-widget=resizes-content`), preventing the popover from clipping off-screen.
   * **Android Version & Build Synchronization (`tauri.properties`, `scripts/build-android.mjs`):** Synchronize `tauri.properties` dynamically from `package.json` (`versionName=0.7.1`, `versionCode=7010`) inside `scripts/build-android.mjs` before Gradle assembly, and compile + sign `dist-android/cntxt-0.7.1-arm64-release-signed.apk`.

**Features Explicitly Excluded (Non-Goals for this Group):**
* **iOS / iPadOS Porting:** Apple Xcode / iOS targets remain out of scope.
* **External Scraping of `kv_store.json` (Task 67 Non-Goal):** Per Task 67 invariant, zero external scraping endpoints or backdoors into `kv_store.json` will be added.
* **Chronological & Cited-Line Weaved Markdown Export (`.cntxt` -> `.md`):** Listed in `living_context.md` as a future roadmap feature; excluded from this porting group to prevent scope creep.
* **Cloud Backend Schema Alterations:** Zero changes to Supabase PostgreSQL tables or Web SaaS Vercel deployment configuration.

---

#### 2. CANONICAL DATA SHAPES & DEPENDENCY MAPPING

**Active Schemas from `contracts/data_shapes.ts`:**
* `SupportedPlatformOS` & `DeviceProfile` (`contracts/data_shapes.ts:526-534`): Platform OS detection (`'linux'`, `'android'`, `'windows'`, `'macos'`, `'web'`) and mobile/touch ergonomics state.
* `Tab` (`contracts/data_shapes.ts:34-60`): `isActiveThread?: boolean` state rendered and toggled in `TabBar.tsx` across both desktop and touch/mobile modes.
* `ViewSettings` (`contracts/data_shapes.ts:146-185`): Experimental background process toggles (`enableExperimentalSettings`, `enableRestGateway`, `restGatewayPort`, `enableTerminalBus`, `deliverableSaveLocation`).
* `RestGatewayConfig` & `CntxtRpcRequest` (`contracts/data_shapes.ts:709-715, 923-927`): Used by `gateway.rs` and `tauriRuntimeAdapter.ts` for single-window (`main`) RPC routing.
* `CntxtBlockParams` & `CntxtParsedBlock` (`contracts/data_shapes.ts:936-961`): Used by `cntxtBlockOverlay.ts` for rich container controls and `id=user-inbox` citation replies on Linux and Android.
* **Zero Schema Mutations Required:** `contracts/data_shapes.ts` already defines all required canonical interfaces. 100% parity between `contracts/data_shapes.ts` and `generated-documents/context/contracts/data_shapes.ts` is preserved.

**Prerequisites (Upstream dependencies):**
* FG-20 (`gateway.rs`, `RestGatewaySettingsCard.tsx`), FG-21 (`cntxt-mcp-server.mjs`), FG-22 (`cntxtBlockParser.ts`, `cntxtBlockOverlay.ts`), and FG-23 (`isActiveThread`, `appendUserInboxEntry`, `prependDeliverableToThread`).

**Downstream Dependencies (What breaks if this group is incomplete):**
* Linux desktop users lack v0.7.1 `.deb` and portable binaries (`dist-installer/` and `dist-portable/` currently hold stale v0.6.0 artifacts), `.cntxt` OS file associations, and non-Debian terminal emulator spawning.
* Multi-window desktop sessions duplicate tabs whenever an MCP or REST Gateway deliverable arrives (Task 66).
* Android users are stuck on v0.5.13/v0.5.14 APK (`tauri.properties` hardcoded to `0.5.13`), cannot toggle Active Thread tabs on touch screens, and lose hardware Back-button navigation in `MainActivity.kt`.

---

#### 3. MOCK REGISTRY IMPACT (PHYSICAL CLEARING PLAN)

Every mock in `mocks/` is already quarantined behind `IS_PROTOTYPE_DEMO_MODE = false` in production builds. No new mocks are introduced.

| Mock ID | Physical File (`mocks/`) | Real Native Target | Clearing Action |
| :--- | :--- | :--- | :--- |
| `NONE` | N/A (Zero mocks targeted or added in FG-24) | Native Tauri v2 Linux (`TauriRuntimeAdapter`) & Android (`AndroidRuntimeAdapter`) | Verify zero inline `MOCK_*` / `DEFAULT_*` leaks via `localactive_scan.mjs` and `check-platform-leaks.mjs` |

**Remaining Quarantined Mocks (Surviving this session):**
* `mocks/index.ts` & `mocks/mockRuntimeAdapter.ts`: Strictly isolated for prototype/test harness mode (`IS_PROTOTYPE_DEMO_MODE === false` in all native Linux and Android builds).

---

#### 4. BACKGROUND PROCESSES & EXPERIMENTAL SETTINGS GATING

Every autonomous background process MUST have an independent user-facing toggle in the Settings panel under "Experimental Settings" (hidden by default). FG-24 introduces **zero** new autonomous background processes and enforces platform gating on existing processes:

| Process Name | Purpose & Interval | Settings Toggle Path | Default State |
| :--- | :--- | :--- | :--- |
| `Localhost REST API Gateway` | Tokio TCP loopback listener (`127.0.0.1:9876`) for MCP/CLI RPC requests (Desktop only; disabled on Android) | Settings -> Experimental -> `Localhost REST API Gateway` (`enableExperimentalSettings && enableRestGateway`) | OFF |
| `Terminal Shells & Multi-Agent Bus` | Event-driven PTY streaming (`portable-pty`, Desktop only; disabled on Android) | Settings -> Experimental -> `Terminal Shells & Multi-Agent Bus` (`enableExperimentalSettings && enableTerminalBus`) | OFF |
| `Document Autosave` | Debounced buffer persistence | Settings -> Experimental -> `Document Autosave` (`enableExperimentalSettings && enableAutosave`) | OFF (Master Experimental toggle OFF by default) |

---

#### 5. UI/UX, DESIGN SYSTEM & SURFACE PRIMITIVES

* **Surface Primitives:**
  * Touch Tab Selection Popover (`TabBar.tsx`): Adds a 44px-compliant touch action button (`Radio` icon) on each tab item in the touch dropdown menu to toggle `isActiveThread`, plus the pulsing `Radio` indicator on the floating touch tab pill when the active tab is an Active Thread.
  * CNTXT Block Overlay & Reply Popover (`cntxtBlockOverlay.ts`): Responsive positioning clamped to viewport bounds so virtual keyboard resizing on Android keeps the `[Respond]` textarea and `Send`/`Cancel` actions fully visible.
  * Settings Card (`RestGatewaySettingsCard.tsx`): Automatically displays the mobile unavailability notice on Android because `bridge.gateway.isAvailable()` returns `false` on `AndroidRuntimeAdapter`.
* **Theme Tokens:** All visual elements consume CSS custom properties (`var(--accent-primary)`, `var(--accent-container)`, `var(--status-warning)`, `var(--card-bg)`, `var(--border-primary)`) derived from `theme/index.js`. Zero hardcoded hex colors in presenters.
* **Responsive Ergonomics:** 100% pure Lucide icons (`Radio`, `Layers`, `Plus`, `X`, `Server`). Touch targets on Android/touch mode maintain `min-h-[44px]` accessibility compliance.
* **Presenter Purity:** `TabBar.tsx`, `SettingsPanel.tsx`, and `RestGatewaySettingsCard.tsx` remain 100% pure React presenters using store hooks and `useRuntimeBridge()`—zero direct `@tauri-apps/api` or `window.__TAURI__` calls outside `src/adapters/`.

---

#### 6. VALIDATION, ERROR HANDLING & USER NOTIFICATIONS

* **Input Validation:** All RPC and REST Gateway payloads continue to validate through Zod schemas in `src/contracts/boundarySchemas.ts` (`validateRpcRequest`, `validateTabCreate`, `validateBlocksUpsert`, etc.).
* **Notification Strategy:**
  * Toggling Active Thread in touch mode dispatches the existing user-visible toast notification via `useTabStore` (`Active Thread Enabled` / `Active Thread Cleared`).
  * External terminal launch failure on Linux dispatches an actionable error toast via `useNotificationStore`.
  * Disk save warnings and gateway lifecycle events dispatch structured notifications via `useNotificationStore`.
* **Zero Silent Failures:**
  * In `tauriRuntimeAdapter.ts`, `initRpcListener()` logs and notifies on listener registration errors while cleanly ignoring non-`main` window broadcasts.
  * In `build-portable.mjs` and `build-android.mjs`, missing toolchains or build artifacts fail fast with descriptive stderr diagnostics and non-zero exit codes.
* **Crash Resilience:** Primary views and settings cards (`RestGatewaySettingsCard`) remain wrapped in `<ErrorBoundary>`.

---

#### 7. ACCEPTANCE CRITERIA

- [ ] **Task 66 Multi-Window Isolation:** `gateway.rs` emits `cntxt://rpc-request` specifically to window label `"main"` via `app.emit_to("main", ...)` (or optional target window label), and `tauriRuntimeAdapter.ts` guards `initRpcListener` with `getCurrentWindow().label === 'main'`.
- [ ] **Linux Discovery Path & MCP Sync:** `gateway.rs` and `cntxt-mcp-server.mjs` resolve `$XDG_CONFIG_HOME/com.cntxt.desktop/gateway_runtime.json` and `$HOME/.config/com.cntxt.desktop/gateway_runtime.json` without relying on workspace-relative fallbacks.
- [ ] **Android Gateway & Terminal Gating:** `AndroidRuntimeAdapter` sets `gateway.isAvailable = () => false`, and `gateway.rs` gates `start_rest_gateway` on mobile targets.
- [ ] **Android Hardware Back Button Restored:** `MainActivity.kt` overrides `onWebViewCreate` and registers `OnBackPressedCallback` invoking `window.__CNTXT_HANDLE_BACK__()`, dismissing open CNTXT reply popovers, modals, and sidebars before backgrounding.
- [ ] **Touch Active Thread Support:** `TabBar.tsx` touch mode displays the pulsing `Radio` badge on the floating tab pill when `activeTab.isActiveThread` is true, and provides a touch-friendly `Radio` toggle button per tab inside the touch `Open Tabs` dropdown.
- [ ] **Linux External Terminal Resilience:** `pty.rs` (`spawn_external_terminal`) supports `shell_override` and falls back across standard Linux terminal emulators (`$TERMINAL`, `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `alacritty`, `kitty`, `wezterm`, `xterm`).
- [ ] **`.cntxt` OS File Association:** `.cntxt` extension added to `src-tauri/tauri.conf.json` and `AndroidManifest.xml`.
- [ ] **Version 0.7.1 Build Scripts & Artifacts:**
  - `scripts/build-portable.mjs` copies `CNTXT_0.7.1_portable` + `cntxt-portable` to `dist-portable/` and `CNTXT_0.7.1_amd64.deb` to `dist-installer/` on Linux.
  - `scripts/build-android.mjs` auto-syncs `tauri.properties` (`versionName=0.7.1`, `versionCode=7010`) and builds + signs `dist-android/cntxt-0.7.1-arm64-release-signed.apk`.
- [ ] **Presenter Purity & Linter Gates:** `npm run lint` (`tsc --noEmit`, `check-platform-leaks.mjs`, `check-contract-sync.mjs`) passes with 0 errors.
- [ ] **Unit & Security Tests:** Dedicated Vitest unit tests and Rust `cargo test` suites pass 100%.
- [ ] **Pass 1 Independent Blind Audit** completed and reconciled.

---

#### 8. RISK, FRICTION & SECURITY ASSESSMENT

* **Anticipated Friction:**
  1. **Tauri v2 `emit_to` vs `emit` in Rust:** In Tauri v2, `app.emit_to("main", event, payload)` requires `tauri::Emitter` in scope. We must verify that `app.emit_to("main", "cntxt://rpc-request", emit_payload)` compiles cleanly on both desktop and `aarch64-linux-android` targets.
  2. **Linux `.deb` Bundle Filename Casing:** Tauri v2's Debian bundler outputs either `CNTXT_${version}_amd64.deb` or `cntxt_${version}_amd64.deb` depending on `productName`. `scripts/build-portable.mjs` should check both candidate filenames in `src-tauri/target/release/bundle/deb/` and normalize the output in `dist-installer/CNTXT_${version}_amd64.deb`.
  3. **Android `tauri.properties` Version Drift:** Previously, `tauri.properties` remained stuck at `0.5.13` (`versionCode=5013`) when `package.json` was bumped to `0.7.1`, causing `cntxt-0.5.13-arm64-release-signed.apk` or mismatched metadata inside the APK. Having `scripts/build-android.mjs` compute `versionCode` deterministically from `package.json` `version` (`major * 10000 + minor * 100 + patch`, e.g. `0.7.1` -> `7001` or `7010` monotonic above `5013`) eliminates version drift permanently.
* **Security & Sandboxing:**
  * **Multi-Window Token & RPC Isolation:** Restricting `cntxt://rpc-request` emission and handling to the `"main"` window prevents secondary floating Panel App windows from double-executing state-mutating RPC commands.
  * **Shell Metacharacter Sanitization on Linux:** `spawn_external_terminal` in `pty.rs` validates `target_dir` via `validate_path(&target_dir)` (blocking `..` traversal and system root `/` access) and sanitizes `shell_override` via `sanitize_command()` (blocking `\0`, `\n`, `\r`, `;`, `|`, `&`, `` ` ``, `$`).
  * **Android Sandbox Isolation:** Disabling the TCP REST Gateway on Android prevents binding loopback ports on untrusted mobile networks while preserving full in-app `HostCommandBus` functionality for local Panel Apps.
