# Feature Group Implementation Plan: FG-10 Free-Tier Web SaaS Engine Port to CNTXT
Date: 2026-10-01
Author: Architect & Implementation Agent
Target Repository: `C:\Projects\LocalActive\Repo\Active\CNTXT` (Single Canonical Repository)
Source / Verified Lab: `C:\Projects\LocalActive\Repo\Active\cntxt-web` (Branch: `feat/web-free-tier-readiness`)

---

## 1. Executive Summary & Objective

The objective is to consolidate `CNTXT` as the **single source of truth** across all three target platforms:
1. **Web (Production SaaS on Vercel)**
2. **Desktop (Windows / macOS / Linux via Tauri v2 + Rust)**
3. **Mobile (Android APK via Tauri v2 Mobile)**

All Web SaaS features were pre-hardened, quarantined, and verified in `cntxt-web` with 10/10 green Vitest tests, 0 TypeScript errors, and 0 platform leaks. We are now porting those clean modules into `CNTXT`.

### Architectural Invariant: Zero Contamination Guarantee
- **Rust Shell (`src-tauri/`):** 100% untouched. Native Desktop (`rfd`, `keyring`) and Android (`android_saf.rs`) remain isolated behind Rust `#[cfg(target_os)]`.
- **Runtime Bridge (`src/adapters/`):** Web SaaS services are decoupled behind `BrowserRuntimeAdapter` and optional user-opt-in sync.
- **Presenter Purity:** Visual components remain 100% pure UI driven only by typed props.
- **Automated Guard:** `node scripts/check-platform-leaks.mjs` verifies zero leaks across all files.

---

## 2. Work Breakdown Structure (Execution Steps)

### Step 1: Package Dependencies (`package.json`)
- Add `@supabase/supabase-js` (`^2.117.2`) to `dependencies`.
- Add `idb-keyval` (`^6.3.0`) to `dependencies`.
- Run `npm install` in `CNTXT`.

### Step 2: Port Web SaaS Services & Adapters
- Copy `src/services/communityLibraryService.ts` from `cntxt-web` to `CNTXT/src/services/communityLibraryService.ts`.
- Copy `src/adapters/supabaseClient.ts` from `cntxt-web` to `CNTXT/src/adapters/supabaseClient.ts`.

### Step 3: Runtime Bridge & Contract Alignment
- In `CNTXT/src/ui-contract/bridgeContract.ts`:
  - Update `IWindowBridge.getPlatform()` to return `'web' | 'macos' | 'windows' | 'linux' | 'android'`.
  - Add `onHardwareBack?: (handler: () => boolean) => () => void;` to `IWindowBridge`.
- In `CNTXT/src/adapters/browserRuntimeAdapter.ts`:
  - Update `getPlatform()` to detect Android user agent as fallback if running in browser on mobile.

### Step 4: Web Deployment Configuration
- Add `vercel.json` to `CNTXT` root with SPA rewrite rules:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- Add Supabase environment variables template to `.env.example` in `CNTXT`.

### Step 5: Test Suite Porting
- Copy `cntxt-web/src/__tests__/webReadiness.test.ts` into `CNTXT/tests/webReadiness.test.ts`.

### Step 6: 5-Gate Verification Pipeline
1. `npm run lint`: Confirm 0 TypeScript errors, 100% canonical contract sync, and 0 platform leaks outside `src/adapters/`.
2. `cargo test --manifest-path src-tauri/Cargo.toml`: Confirm all 8 native Rust security and IPC token tests pass.
3. `npm test`: Confirm all 394+ unit tests pass (including the 10 webReadiness tests).
4. `npm run build`: Confirm clean Vite production bundle is generated with zero CSP or bundling errors.

### Step 7: Commit & Documentation Closeout
- Update `manifest.md` with FG-10 services and updated test metrics.
- Commit to `main` with `feat(saas): port verified free-tier web engine to unified CNTXT repository`.

---

## 3. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Supabase import bloat in Desktop/Android | Low | Supabase JS client is lightweight, treeshaken, and inert unless configured with API credentials. |
| Memory limits during `tsc` | Low | `--max-old-space-size=4096` already configured in `CNTXT/package.json` build scripts; `tsconfig.json` excludes generated documents and builds. |
| Platform leak in shared presenters | High | Enforced by `node scripts/check-platform-leaks.mjs` in `npm run lint`. |
