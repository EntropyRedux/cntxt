# Feature Group Implementation Plan: FG-14 Panel Apps (Web & Android Mobile Ports)
Date: 2026-10-09
Author: Prod Agent & Tri-Platform Architect
Status: [x] Scoped  [x] Ready for Execution
Target Repositories:
- `C:\Projects\LocalActive\Repo\Active\cntxt-web` (Web SaaS / Vercel Free-Tier)
- `C:\Projects\LocalActive\Repo\Active\CNTXT` (Android Mobile Target via Tauri v2 Mobile Runtime)
Authoritative References:
- Desktop Implementation Baseline: `generated-documents/plans/feature_group_FG13_panel_apps_desktop_2026-10-09.md`
- Living Context: `generated-documents/context/living_context.md` (v2.19)
- Canonical Contracts: `src/contracts/data_shapes.ts` & `src/contracts/boundarySchemas.ts`

---

## 1. Executive Summary & Objectives

With **FG-13** complete, verified, and stabilized on Desktop (`CNTXT v0.5.2` with full lifecycle management, resilient path resolution, and production CSP tuning), **FG-14** ports and tailors the Panel Apps engine to the remaining two platforms in the CNTXT tri-platform suite:

1. **Web SaaS (`cntxt-web`)**:
   - Provide zero-install browser users with the ability to create, run, and manage sandboxed HTML panel apps.
   - Persist apps and state in client-side storage (`IndexedDB` / browser storage partition) with optional export/import of `.cntxt` files.
   - Maintain strict sandbox security: prevent untrusted user HTML from stealing session tokens, GitHub provider keys, or Supabase credentials.

2. **Android Mobile (`CNTXT` Mobile Target)**:
   - Provide mobile users on phones and tablets with touch-optimized panel apps.
   - Run inside an Android WebView container with full touch event handling, virtual keyboard support, and safe-area insets.
   - Integrate seamlessly with the Android hardware back button and Scoped Storage / Storage Access Framework (SAF).

---

## 2. Core Architectural Invariants (Tri-Platform Alignment)

1. **Universal Presenter Purity**:
   - Visual components (`AppBuilderPanel.tsx`, `AppRail.tsx`, `AppPanelPlaceholder.tsx`, `SourceStep.tsx`, `DetailsStep.tsx`, `ReviewStep.tsx`) remain 100% pure UI driven strictly by typed props.
   - Zero direct calls to `window.localStorage`, `indexedDB`, Android JNI, or Tauri IPC inside visual presenters. All platform operations route through `IRuntimeBridge`.

2. **Single-File `.cntxt` Document Format**:
   - The same markdown frontmatter + dynamic-length fenced HTML block specification (`buildCntxtApp` / `parseCntxtApp`) applies across Desktop, Web, and Android. A `.cntxt` file exported from desktop opens identically on web and mobile.

3. **Origin & Credential Sandboxing**:
   - Untrusted user apps inside the iframe cannot access the host application's DOM, cookies, Supabase credentials, GitHub provider tokens, or native bridge interfaces.
   - Storage is strictly partitioned per app ID: `cntxt_app_data_<appId>`.

4. **Zero Background Runaway**:
   - Background polling, watchers, or network daemons inside panel apps suspend when the panel is closed or unmounted.

---

## 3. Web SaaS Implementation Blueprint (`cntxt-web`)

### 3.1. Web Storage & Filesystem Adaptations
In the Web environment, the browser has no arbitrary local filesystem access:
- **Registry Persistence**: `PANEL_APPS_INDEX` persists in `bridge.storage` (`localStorage` / `IndexedDB` via `BrowserRuntimeAdapter`).
- **File Storage**:
  - Panel app `.cntxt` documents are stored in the browser's virtual filesystem / workspace store.
  - Users can export any panel app as a downloadable `.cntxt` file with 1 click.
  - Users can import external `.cntxt` files via drag-and-drop or file picker into the virtual workspace.
- **AppData Fallback**: `bridge.fs.getDefaultAppsDir()` returns a virtual path (e.g. `virtual://apps/`) handled seamlessly by `BrowserRuntimeAdapter`.

### 3.2. Web Sandbox Security Model
Standard browsers enforce stricter cross-origin restrictions than desktop webviews:
- **Iframe Sandboxing**:
  ```html
  <iframe
    sandbox="allow-scripts allow-forms allow-modals allow-downloads allow-popups"
    srcdoc="..."
  />
  ```
- **PostMessage Bridge**:
  - The storage shim communicates with `window.parent` via `postMessage`.
  - In `cntxt-web`, the host listener verifies `event.source === iframeRef.current.contentWindow` and matches `appId` before committing writes to `bridge.storage`.
- **Content Security Policy (CSP)**:
  - `cntxt-web`'s `index.html` and `vercel.json` headers permit `frame-src 'self' data: blob: about:`.
  - The iframe's injected `<meta http-equiv="Content-Security-Policy">` enforces offline isolation (`connect-src 'none'`) when `network === 'offline'`.

### 3.3. Web UI & Layout Ergonomics
- **Desktop/Tablet Web (> 768px)**:
  - Vertical left rail in `ActivityBar.tsx`.
  - Right-side sidebar panel with custom width (280px to 1200px) or resizable splitter.
- **Mobile Browser (<= 768px)**:
  - Horizontal bottom rail integrated into `MobileBottomNav.tsx`.
  - App opens as a full-screen drawer or sliding bottom sheet with sticky header controls and a quick-close button.

---

## 4. Android Mobile Implementation Blueprint (`CNTXT` Mobile Target)

### 4.1. Android WebView Integration & Hardware Acceleration
Tauri v2 on Android uses Android `WebView` backed by Chromium:
- **Hardware Acceleration**: Ensure `android:hardwareAccelerated="true"` is maintained in `AndroidManifest.xml` so complex canvas diagrams, CSS animations, and SVG diagrams render smoothly at 60 FPS.
- **Viewport Insets & Safe Areas**:
  - The injected HTML must automatically receive or inherit viewport scaling:
    `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">`
  - Safe-area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) prevent notch and gesture navigation bar clipping.

### 4.2. Android Storage & Scoped Storage (SAF)
- **Default Apps Directory**:
  - On Android, `get_default_panel_apps_dir` maps to the application's internal files directory:
    `/data/user/0/com.cntxt.desktop/files/Panel Apps/` (or external app-specific documents directory).
  - Ensured auto-creation via Rust `fs::create_dir_all`.
- **Exporting & Sharing**:
  - Integrate with Android's system share sheet / `ACTION_CREATE_DOCUMENT` intent so users can export `.cntxt` files to Google Drive, Downloads, or SD cards.

### 4.3. Android Back-Button Lifecycle Integration
A critical mobile usability requirement:
- When a Panel App is actively open on Android, pressing the physical/gesture **Hardware Back Button** MUST:
  1. If an internal modal/sheet inside the mini-app is open, allow the mini-app to consume it.
  2. Otherwise, **close/dismiss the panel app drawer** and return to the editor.
  3. NEVER minimize or exit the entire CNTXT application while a panel app is open!
- **Implementation**:
  - In `ShellFrame.tsx` / `MobileShell.tsx`, register the active panel app with the mobile back-button priority stack (`useBackButtonHandler`).

### 4.4. Mobile UI Ergonomics
- **Horizontal Rail in `MobileAccessoryBar` / `MobileBottomNav`**:
  - Compact circular app icons with badge indicators.
  - Long-press on app icon opens the mobile context sheet (*Open*, *Reset Data*, *Edit Source*, *Remove*, *Delete*).
- **Full-Screen / 90% Bottom Sheet Drawer**:
  - On phones, sidebars are too narrow for diagram and tool apps.
  - Panel Apps render in a full-height sliding drawer with touch drag handle, title bar, quick-actions, and close button.

---

## 5. Work Breakdown Structure & Execution Phases

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│ Phase 1: Shared Web Port       │ ──> │ Phase 2: Android Mobile Port   │ ──> │ Phase 3: Tri-Platform Sync    │
│ (cntxt-web adapter + UI)       │     │ (touch, SAF, back-button)      │     │ (cross-import & verification)  │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
```

### Phase 1: Web SaaS Port (`cntxt-web`)
1. **Contract & Schema Parity**:
   - Verify `contracts/data_shapes.ts` and `src/contracts/boundarySchemas.ts` in `cntxt-web` match CNTXT canonical models.
2. **Feature Components Port**:
   - Port `src/features/panelApps/` (format, preflight, resolveHtml, state, services) into `cntxt-web`.
   - Port `src/components/panelApps/` (`AppBuilderPanel`, `AppRail`, `AppPanelPlaceholder`, etc.) into `cntxt-web`.
3. **Bridge & Adapter Wiring**:
   - Add virtual `getDefaultAppsDir` to `BrowserRuntimeAdapter`.
   - Wire `BrowserRuntimeAdapter.storage` for partitioned postMessage writes.
4. **Shell Integration**:
   - Add App Rail to `ActivityBar.tsx` and `MobileBottomNav.tsx`.
   - Add "Set as panel app" to tab header context menu.
5. **Verification**:
   - `npm run lint` clean (0 platform leaks).
   - `npm test` passes all panel apps test suites.
   - `npm run build` generates production bundle without bundle size regressions.

### Phase 2: Android Mobile Port (`CNTXT` Mobile)
1. **Rust Mobile File Directory**:
   - Update `get_default_panel_apps_dir` in `src-tauri/src/commands/file.rs` with `#[cfg(target_os = "android")]` returning the app internal files path.
2. **Hardware Back Button Handler**:
   - Connect active panel app state to `ShellFrame.tsx` back button stack.
3. **Mobile Bottom Sheet / Drawer Presenter**:
   - Style `AppPanelPlaceholder` for responsive full-screen mobile viewports with sticky header and touch drag bar.
4. **Long-Press Context Sheet**:
   - Replace right-click context menu on mobile with touch long-press modal bottom sheet (`AuthBottomSheet` pattern).
5. **APK Packaging & Smoke Testing**:
   - Run `npm run package:android` to compile arm64 release APK (`dist-android/`).
   - Validate on Android device/emulator: create app, render HTML/Tailwind, save state, press back button.

### Phase 3: Cross-Platform Verification & Release
1. **Tri-Platform File Round-Trip**:
   - Create `.cntxt` file on Desktop -> Export to disk.
   - Import into Web SaaS -> Verify clean execution and storage.
   - Load onto Android -> Verify touch responsiveness.
2. **Quality Gates Check**:
   - `npm run lint` clean across all 3 platforms.
   - 100% contract parity between `CNTXT` and `cntxt-web`.
   - Full automated test suites green.
3. **Documentation Closeout**:
   - Update `living_context.md`, `CHANGELOG.md`, `README.md`, and `manifest.md` across both repositories.

---

## 6. Success Metrics & Quality Criteria

| Criterion | Target Metric | Verification Method |
|:---|:---:|:---|
| **Presenter Purity** | 0 direct native calls in UI | `npm run lint` (platform leak scanner) |
| **Contract Synchronization** | 100% parity | `scripts/check-contract-sync.mjs` |
| **Storage Isolation** | 0 cross-app pollution | Automated unit test verifying partitioned key writes |
| **Sandbox Leakage** | 0 access to host tokens/DOM | Automated iframe postMessage security test |
| **Android Back Button** | 100% graceful drawer close | Manual verification on Android APK |
| **Web Build Impact** | < 25 KB gzipped addition | Vite production build chunk analyzer |
