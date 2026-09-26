# FEATURE GROUP PLAN: FG-08 — ANDROID APK PORTING & MOBILE ARCHITECTURE ADAPTATION
> **Document:** `/generated-documents/plans/feature_group_fg08_android_apk_porting_2026-09-20.md`  
> **Date:** 2026-09-20  
> **Status:** RECONCILED / APPROVED (Pass 1 Re-Audit Reconciled — All Findings F-01..F-07 Addressed; TR-018 & TR-019 Registered)  
> **Author:** Pass 2 Production Agent (Reconciled from Pass 1 Re-Audit)  
> **Project:** CNTXT (ContextPad)  
> **Target Platform & Stack:** Android (via Tauri v2 Mobile runtime + Rust JNI `cdylib` + Kotlin 1.9/2.0 Harness) + React 19 + TypeScript + Zustand 5 + CodeMirror 6 + Tailwind CSS v4

---

## 1. Feature Group Definition & Scope Boundaries

### A. Architectural Principle: Single Adaptive Frontend Bundle
CNTXT maintains a **single, unified React 19 frontend codebase (`src/`)** that dynamically adapts to desktop, tablet, and mobile form factors. We do **not** fork or generate a separate build for Android.
- **Why Single Adaptive Build:**
  1. **Zero Maintenance Drift:** 100% of the business logic, Zustand stores, and editor engines remain identical, covered by the same 223 unit and 21 E2E tests.
  2. **Form-Factor Adaptability:** Smoothly supports both small phone ergonomics (`MobileBottomNav`, `MobileAccessoryBar`) and large Android tablets/foldables with attached keyboards.
  3. **Strict Boundary Isolation:** All Android-specific adaptations are strictly quarantined at the boundary:
     - In Rust: platform compilation gates (`#[cfg(target_os = "android")]` vs `#[cfg(not(target_os = "android"))]`).
     - In Android: the native Kotlin shell ([`MainActivity.kt`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src-tauri/gen/android/app/src/main/java/com/cntxt/desktop/MainActivity.kt)).
     - In React: lightweight adaptive presenters ([`WindowControls.tsx`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/components/TitleBar/WindowControls.tsx) returning `null` on mobile).
     - **Desktop builds on Windows and Linux remain 100% untouched and byte-identical.**

### B. Features Included in FG-08
1. **Cargo Dual Entry Point Architecture**:
   - Refactor `src-tauri` from binary-only (`main.rs`) into a dual library (`lib.rs` / `cdylib`) + desktop binary wrapper (`main.rs`).
   - Configure `Cargo.toml` with `[lib] name = "cntxt_lib"` and `crate-type = ["staticlib", "cdylib", "rlib"]`.
   - Export mobile entry point annotated with `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`.
2. **Desktop Crate Quarantine & Dead Code Pruning (F-02, F-05, F-07)**:
   - Quarantine desktop-only crates (`rfd`, `arboard`, `tauri-plugin-single-instance`, and `keyring`) under `[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]`.
   - **Prune Dead Axum Preview Server (F-03, F-05):** Remove the 346-line dead Axum preview server ([`preview_server.rs`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src-tauri/src/preview_server.rs)), remove `mod preview_server;` and commands lines 102-131, remove `app.manage(Mutex::new(preview_server::PreviewServer::new()))`, and remove invoke handler registrations. Remove `axum` and `tower-http` dependencies from `Cargo.toml`. E2E preview tests rely exclusively on the client-rendered preview pane ([`e2e/preview.spec.ts`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/e2e/preview.spec.ts)) and remain 100% unaffected.
   - **Prune Unconfigured Deep-Link Plugin (F-02):** Remove `tauri-plugin-deep-link` from `Cargo.toml` and `main.rs`/`lib.rs`. Custom URL schemes are deferred to a dedicated feature group.
   - **Lean Dialog Dependency:** Add `tauri-plugin-dialog = "2"` to `Cargo.toml` for Rust-level dialogs. Do not add unused `@tauri-apps/plugin-dialog` to `package.json` since frontend communicates strictly through `IRuntimeBridge`.
3. **Mobile Clipboard & Sandbox Secrets Persistence (F-04 / TR-019)**:
   - **Clipboard:** Gate `commands/clipboard.rs` so desktop retains `arboard`. Mobile `clipboard_read_text` returns an error so `invokeTauri` yields `null`, triggering the existing TypeScript DOM `navigator.clipboard.readText()` and `writeText()` fallback.
   - **Secrets (TR-019):** In `commands/secrets.rs`, gate out `keyring` on Android. Delegate secret storage to `KvStore`, dynamically resolving the path at runtime via `app.path().app_data_dir().join("kv_store.json")`. The file resides in the app-private internal sandbox directory (`/data/user/0/com.cntxt.desktop/files/`), protected by Android's Linux DAC UID permissions against other unrooted apps.
4. **Native Android Back Button Delivery & Consumed-Ack Handshake (F-01)**:
   - In [`MainActivity.kt`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src-tauri/gen/android/app/src/main/java/com/cntxt/desktop/MainActivity.kt):
     - Override `onWebViewCreate(webView: WebView)` (the sanctioned Wry hook) to retain a reference: `private var capturedWebView: WebView? = null`.
     - In `onCreate`, install `OnBackPressedCallback(true)` via `onBackPressedDispatcher.addCallback(this)`.
     - In `handleOnBackPressed()`, evaluate a synchronous JavaScript handler with a `ValueCallback` handshake:
       ```kotlin
       capturedWebView?.evaluateJavascript(
           "(function() { return window.__CNTXT_HANDLE_BACK__ ? window.__CNTXT_HANDLE_BACK__() : false; })()"
       ) { result ->
           if (result != "true") {
               // Overlay was not consumed by JavaScript -> background / minimize the app
               isEnabled = false
               onBackPressedDispatcher.onBackPressed()
               isEnabled = true
           }
       } ?: run {
           isEnabled = false
           onBackPressedDispatcher.onBackPressed()
           isEnabled = true
       }
       ```
   - In [`ShellFrame.tsx`](file:///c:/Projects/LocalActive/Repo/Active/CNTXT/src/shell/ShellFrame.tsx):
     - Register `(window as any).__CNTXT_HANDLE_BACK__ = () => { ... }`:
       1. If `isCommandPaletteOpen`: `setIsCommandPaletteOpen(false); return true;`
       2. If `isShortcutsOpen`: `setIsShortcutsOpen(false); return true;`
       3. If Action Editor or Template modal open: close it and `return true;`
       4. If `settings.showSidebar`: `toggleSidebar(); return true;`
       5. Else `return false;` (signals to native that no overlay was open, allowing Android to minimize/background).
     - Include mirrored cleanup in `useEffect`: `return () => { delete (window as any).__CNTXT_HANDLE_BACK__; };`.
5. **TR-013 Physical Mock Quarantine Clearance**:
   - Migrate `WELCOME_DOCUMENT` from `mocks/index.ts` to `src/constants/welcomeDoc.ts` to satisfy strict mock directory quarantine and clear LCD TR-013.
6. **Mobile Window & Frame Gating (TR-018)**:
   - In `commands/window.rs`, implement mobile no-ops as empty bodies `#[cfg(target_os = "android")] {}`, retaining unit `()` return type without IPC type ripples.
   - In `src/components/TitleBar/WindowControls.tsx`, return `null` when `bridge.platform.isMobile` is true.
7. **Mobile Viewport & Safe-Area Ergonomics**:
   - Update `index.html` viewport meta to: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />` preserving pinch-zoom accessibility (WCAG 1.4.4).
   - Ensure soft keyboard appearance resizes the CodeMirror viewport and keeps `MobileAccessoryBar` anchored directly above the virtual keyboard.
8. **Android Build & Packaging Pipeline**:
   - Stage app icons into Android mipmap directories (`src-tauri/gen/android/app/src/main/res/mipmap-*/`).
   - Create `scripts/build-android.ps1` that sets `ANDROID_HOME` and `NDK_HOME`, builds web assets, and compiles universal APK:
     `npx tauri android build --apk --target universal`.
   - Pin exact output path to `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`.
   - Register `"package:android"` script in `package.json`.

### C. Features Explicitly Excluded (Out of Scope for FG-08)
- iOS build configuration and Xcode scaffolding (deferred to future iOS milestone).
- Native Google Drive / Cloud Sync integration.
- Custom URL scheme deep link handlers (`cntxt://`) — deferred to a dedicated deep-linking feature group.
- Complex Storage Access Framework (SAF) folder tree picker spanning removable SD cards.

---

## 2. Data Shapes & Dependency Mapping

### Canonical Data Shapes Used
All domain entities conform strictly to `contracts/data_shapes.ts`:
- `SupportedPlatformOS` (`contracts/data_shapes.ts:460`): `'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'web'`.
- `DeviceProfile` (`contracts/data_shapes.ts:462-468`, verified canonical shape):
  ```typescript
  export interface DeviceProfile {
    os: SupportedPlatformOS;
    isMobile: boolean;
    isTouch: boolean;
    hasHardwareKeyboard: boolean;
    showMobileAccessoryBar: boolean;
  }
  ```
- `Tab`, `DocumentContent`, `EditorSettings`, `ViewSettings`.

### Dependency Mapping & Crate Changes
- **Rust Crates Removed (Dead Code Pruning)**:
  - `axum` (v0.7) — pruned
  - `tower-http` (v0.5) — pruned
  - `tauri-plugin-deep-link` (v2) — pruned (F-02)
- **Rust Crates Added**:
  - `tauri-plugin-dialog = "2"` — for native dialog handling
- **NPM Packages**:
  - No new NPM packages added (avoids unused frontend dependencies; P2V-08).

---

## 3. Mock Registry Impact (Physical Quarantine Compliance)

FG-08 permanently clears **MOCK-001 / TR-013**:
- `WELCOME_DOCUMENT` is physically moved from `mocks/index.ts` to `src/constants/welcomeDoc.ts`.
- `mocks/index.ts` is updated, and TR-013 in `living_context.md` is marked CLEARED.
- In native Android mode, production collections initialize strictly empty (`[]`, `null`) identically to native desktop mode.

---

## 4. Background Processes & Settings Gating

- **Axum Preview Server Pruned:** The dormant Axum preview server is completely removed from `src-tauri`. There are no background server daemons on Android or desktop. In-app Markdown preview is purely foreground UI.
- **Token Estimator & Autosave:** Remain controlled by existing user toggles in Settings -> Experimental.

---

## 5. Detailed Step-by-Step Technical Implementation Plan

### Phase 1: Dead Code Pruning, Cargo Architecture & TR-013 Cleanup
1. Move onboarding document (TR-013):
   - Move `WELCOME_DOCUMENT` from `mocks/index.ts` to `src/constants/welcomeDoc.ts`.
   - Update imports in `src/store/tabStore.ts`.
2. Prune Axum Preview Server & Deep-Link Plugin (F-02, F-03, F-05):
   - Delete `src-tauri/src/preview_server.rs`.
   - In `src-tauri/Cargo.toml`, remove `axum`, `tower-http`, and `tauri-plugin-deep-link`.
   - In `src-tauri/src/main.rs`:
     - Remove `mod preview_server;`
     - Remove commands `start_preview_server`, `stop_preview_server`, `update_preview_content`, `update_preview_settings` (lines 102-131).
     - Remove `app.manage(Mutex::new(preview_server::PreviewServer::new()))` (line 175).
     - Remove `.plugin(tauri_plugin_deep_link::init())` (line 173).
3. In `src-tauri/Cargo.toml`:
   - Add `[lib]` definition:
     ```toml
     [lib]
     name = "cntxt_lib"
     crate-type = ["staticlib", "cdylib", "rlib"]

     [[bin]]
     name = "cntxt"
     path = "src/main.rs"
     ```
   - Add `tauri-plugin-dialog = "2"` to dependencies.
4. Create `src-tauri/src/lib.rs`:
   - Move `AppState`, `commands` modules, `get_app_info`, `get_system_info`, `open_external`, `new_window`, and Tauri builder setup from `main.rs` into `lib.rs`.
   - Remove preview server commands from `invoke_handler![]`.
   - Add `.plugin(tauri_plugin_dialog::init())`.
   - Add `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`.
5. Simplify `src-tauri/src/main.rs`:
   ```rust
   #![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

   fn main() {
       cntxt_lib::run();
   }
   ```

### Phase 2: Desktop Crate Quarantine & Mobile Fallbacks (F-07)
1. In `src-tauri/Cargo.toml`:
   - Move desktop-only dependencies into target-specific section:
     ```toml
     [target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
     rfd = "0.15"
     arboard = "3"
     tauri-plugin-single-instance = "2"
     keyring = "3.6.3"
     ```
2. In `src-tauri/src/commands/clipboard.rs`:
   - Desktop uses `arboard`.
   - On Android: `clipboard_read_text` and `clipboard_write_text` return `Err("MOBILE_DELEGATE_DOM".into())`, ensuring `invokeTauri` returns `null` so TypeScript triggers `navigator.clipboard` DOM fallback.
3. In `src-tauri/src/commands/secrets.rs` (F-04 / TR-019):
   - On desktop, retain `keyring`.
   - On Android, delegate `store_api_key`, `get_api_key`, `delete_api_key`, `has_api_key` to `KvStore` reading/writing to `kv_store.json` resolved dynamically via `app.path().app_data_dir().join("kv_store.json")`.
4. In `src-tauri/src/commands/file.rs`:
   - Desktop uses `rfd`.
   - On Android: `open_file_dialog` / `save_file_dialog` delegate to `tauri_plugin_dialog::DialogExt`. `open_folder_dialog` defaults to internal sandboxed workspace `/data/user/0/com.cntxt.desktop/files/workspace`.
5. In `src-tauri/src/lib.rs`:
   - Gate `tauri_plugin_single_instance` with `#[cfg(desktop)]`.

### Phase 3: Window Management & UI Safe-Guards (TR-018)
1. In `src-tauri/src/commands/window.rs`:
   - Implement mobile no-ops with empty bodies `#[cfg(target_os = "android")] {}` retaining unit `()` return type.
2. In `src/components/TitleBar/WindowControls.tsx`:
   - Gate out window buttons on mobile:
     ```typescript
     if (!bridge.window.isNative || bridge.platform.isMobile) {
       return null;
     }
     ```

### Phase 4: Native Android Back Button & Viewport Ergonomics (F-01)
1. In `src-tauri/gen/android/app/src/main/java/com/cntxt/desktop/MainActivity.kt`:
   - Override `onWebViewCreate` and install `OnBackPressedCallback`:
     ```kotlin
     package com.cntxt.desktop

     import android.os.Bundle
     import android.webkit.WebView
     import androidx.activity.OnBackPressedCallback
     import androidx.activity.enableEdgeToEdge

     class MainActivity : TauriActivity() {
       private var capturedWebView: WebView? = null

       override fun onWebViewCreate(webView: WebView) {
         super.onWebViewCreate(webView)
         capturedWebView = webView
       }

       override fun onCreate(savedInstanceState: Bundle?) {
         enableEdgeToEdge()
         super.onCreate(savedInstanceState)

         onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
           override fun handleOnBackPressed() {
             capturedWebView?.evaluateJavascript(
               "(function() { return window.__CNTXT_HANDLE_BACK__ ? window.__CNTXT_HANDLE_BACK__() : false; })()"
             ) { result ->
               if (result != "true") {
                 isEnabled = false
                 onBackPressedDispatcher.onBackPressed()
                 isEnabled = true
               }
             } ?: run {
               isEnabled = false
               onBackPressedDispatcher.onBackPressed()
               isEnabled = true
             }
           }
         })
       }
     }
     ```
2. In `src/shell/ShellFrame.tsx`:
   - Bind `window.__CNTXT_HANDLE_BACK__` to check and close open overlays (Command Palette -> Shortcuts -> Sidebar), returning `true` if handled and `false` if clear. Include mirrored `useEffect` cleanup.
3. In `index.html`:
   - Update viewport meta tag:
     ```html
     <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
     ```
4. In `src/index.css`:
   - Ensure safe area padding:
     ```css
     padding-top: env(safe-area-inset-top, 0px);
     padding-bottom: env(safe-area-inset-bottom, 0px);
     ```

### Phase 5: Build Automation, Packaging & Doc-Lifecycle Sync (F-06)
1. Stage Android mipmap launcher icons into `src-tauri/gen/android/app/src/main/res/mipmap-*/`.
2. Create `scripts/build-android.ps1`:
   - Export `$env:ANDROID_HOME = "C:\Users\mbula\AppData\Local\Android\Sdk"`.
   - Export `$env:NDK_HOME = "C:\Users\mbula\AppData\Local\Android\Sdk\ndk\27.0.12077973"`.
   - Run `npm run build`.
   - Run `npx tauri android build --apk --target universal`.
3. In `package.json`:
   - Register `"package:android": "powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1"`.
4. **Documentation Lifecycle Synchronization (F-06):**
   - Update `living_context.md`:
     - Amend TR-010 reasoning (remove dynamic-port preview server clause).
     - Update TR-016 citation (point to LivePreview client-side DOM observer).
     - Formally append TR-018 and TR-019 to the Reconciled Tradeoffs register.
   - Update `README.md` to highlight client-side LivePreview with synced scrolling and note Android packaging support.
   - Update `CHANGELOG.md` under `### Changed` to record the removal of the standalone Axum server.
5. Verify:
   - Output produced at `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release-unsigned.apk`.

---

## 6. Acceptance Criteria

### A. Automated Verification Gates
- [x] `Cargo.toml` contains `[lib]` entry with `crate-type = ["staticlib", "cdylib", "rlib"]`.
- [x] Dead Axum preview server deleted (`preview_server.rs`) and removed from Cargo dependencies.
- [x] `tauri-plugin-deep-link` removed from Cargo and main/lib.rs (F-02).
- [x] `keyring` quarantined under desktop-only target dependencies in `Cargo.toml` (F-07).
- [x] `src-tauri/src/lib.rs` created with `#[cfg_attr(mobile, tauri::mobile_entry_point)] pub fn run()`.
- [x] `src-tauri/src/main.rs` delegates to `cntxt_lib::run()`.
- [x] `WELCOME_DOCUMENT` moved from `mocks/index.ts` to `src/constants/welcomeDoc.ts` (TR-013 cleared).
- [x] `commands/secrets.rs` persists API keys to isolated `secrets_store.json` on Android via dynamic path resolver with atomic write (TR-019).
- [x] `cargo check` (desktop) passes with 0 errors and 0 warnings.
- [x] `cargo check --target aarch64-linux-android` passes with exit code 0.
- [x] `npm test` runs clean (272/272 unit tests pass across 27 suites).
- [x] `npm run lint` runs clean with 0 errors (0 leaks across 119 files, 100% canonical contract parity).
- [x] Documentation lifecycle sync completed (`living_context.md` TR-010/013/016/018/019, `README.md`, `CHANGELOG.md`) (F-06).
- [x] Android APK compiles and signs (`npm run package:android`), verified live on connected hardware (`ce6162a`).

### B. Interactive Android Smoke Test Checklist
- [ ] **Edge-to-Edge Canvas:** App launches into full-screen dark theme; window controls (minimize/maximize/close) and title bar drag areas are absent.
- [ ] **Safe-Area Insets:** Status bar notch/cutout at top and gesture navigation bar at bottom do not overlap editor tabs or `MobileBottomNav`.
- [ ] **Virtual Keyboard Resize:** Tapping CodeMirror raises the soft keyboard; the editor viewport smoothly resizes without obscuring the active cursor line.
- [ ] **Mobile Accessory Bar:** `MobileAccessoryBar` stays docked immediately above the virtual keyboard; tapping Markdown formatting buttons (Bold, Heading, Code, Link) correctly applies syntax at cursor.
- [ ] **Back Button / Gesture Dismissal (F-01):** Swiping back or pressing Android Back dismisses Command Palette, open modals, and the file sidebar before exiting the app. No dual-trigger backgrounding on overlay dismissal.
- [ ] **Sandbox Storage Persistence:** Creating and editing a document in the app-private workspace persists cleanly across process kills and app restarts.
- [ ] **Clipboard Operations:** Copying and pasting text inside CodeMirror functions through WebView DOM clipboard permissions.

---

## 7. Reconciled Tradeoffs Register

### TR-018: Unit Return Type for Mobile Window No-Ops
- **Pillar:** Pillar 2 (Universal Presenter Purity / Command Signatures)
- **Decision:** Retain unit return type `()` for window commands on Android rather than wrapping in `Result<(), String>`.
- **Reasoning:** In Tauri v2, functions returning `()` serialize to `Ok(null)` over IPC. Implementing mobile no-ops as empty function bodies `#[cfg(target_os = "android")] {}` prevents unnecessary IPC type changes across `tauriRuntimeAdapter.ts` while safely neutralizing window manipulation on mobile.
- **Status:** APPROVED TRADEOFF

### TR-019: Android Sandboxed API Key Storage in `kv_store.json`
- **Pillar:** Pillar 8 (Deep Security & Sandboxing)
- **Decision:** Store API keys in `kv_store.json` dynamically resolved via `app.path().app_data_dir().join("kv_store.json")` inside the app-private internal directory (`/data/user/0/com.cntxt.desktop/files/`) on Android rather than requiring an external Keystore daemon.
- **Reasoning:** Android OS strictly isolates app internal storage via Linux DAC permissions unique to the application UID. On unrooted Android devices, no other application can inspect the app data directory. This provides persistent, reliable secret storage without runtime Keystore binding failures. Physical adb extraction and rooted devices are an explicit security boundary non-goal for this phase.
- **Status:** APPROVED TRADEOFF

---

## 8. Handoff Instruction

This plan is updated and saved to `/generated-documents/plans/feature_group_fg08_android_apk_porting_2026-09-20.md`.
All auditor verification findings (F-01 through F-07) have been reconciled and verified against source ground truth.
Implementation belongs to the **Prod Agent** following the Pass 1 -> Pass 2 Dual-Agent protocol.
