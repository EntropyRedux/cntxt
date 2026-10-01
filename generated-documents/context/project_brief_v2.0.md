# PROJECT BRIEF: TRI-PLATFORM HYBRID ARCHITECTURE
Version: v2.0
Last Updated: 2026-10-01
Status: [x] Draft  [x] Audited  [x] Approved

━━━ VISION ━━━
What this app is:
ContextPad (CNTXT) is a tri-platform structured workspace engineered for technical drafting, prompt engineering, markdown documentation, diagramming, and workflow automation.

What problem it solves:
Modern AI workflows require structured, token-conscious prompt drafting, rapid variable substitution, dynamic calculations, sandboxed script execution, and seamless catalog discovery across web, desktop, and mobile devices without relying on fragmented browser tabs, proprietary silos, or platform lock-in.

Who it is for:
Solo software developers, AI principal architects, prompt engineers, and technical writers needing a fast, keyboard-first or touch-optimized, distraction-free markdown workbench across web, desktop, and mobile environments.

━━━ ARCHITECTURAL TOPOLOGY ━━━

```
                    ┌────────────────────────────────────────────────────────┐
                    │               Universal UI Presenters                  │
                    │        (React 19 + TypeScript + Zustand 5)             │
                    │   Pure UI driven strictly by typed props & callbacks   │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                    useRuntimeBridge()
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               IRuntimeBridge Contract                  │
                    │      fs | window | clipboard | storage | platform      │
                    └───────┬───────────────────┼────────────────────┬───────┘
                            │                   │                    │
              ┌─────────────▼──────┐  ┌─────────▼────────┐  ┌────────▼───────────┐
              │ BrowserRuntime     │  │ TauriRuntime     │  │ AndroidRuntime     │
              │ Adapter            │  │ Adapter          │  │ Adapter            │
              └───────┬────────────┘  └─────────┬────────┘  └────────┬───────────┘
                      │                         │                    │
         ┌────────────▼────────────┐  ┌─────────▼────────┐  ┌────────▼───────────┐
         │ WEB SAAS (Vercel)       │  │ DESKTOP (Tauri)  │  │ MOBILE (Android)   │
         │ - Supabase Auth & Sync  │  │ - Rust std::fs   │  │ - Android SAF      │
         │ - GitHub Raw CDN / jsDelivr│- OS Keyring      │  │ - Hardware Back    │
         │ - IndexedDB (idb-keyval)│  │ - Native Dialogs │  │ - Accessory Bar    │
         │ - Web Worker AST Engine │  │ - IPC Token Gate │  │ - Touch Insets     │
         └─────────────────────────┘  └──────────────────┘  └────────────────────┘
```

━━━ PLATFORM & RUNTIME CONTEXT ━━━
Target Platforms (Tri-Platform Hybrid Model):
  1. Web (Production SaaS): Hosted on Vercel (Free Hobby Tier). Zero-cost architecture backed by Supabase Free (Auth + User Sync), GitHub Raw CDN / jsDelivr (Community Library Catalog), browser IndexedDB (offline-first persistence), and Web Workers (sandboxed execution). Zero mocks in production.
  2. Desktop: Windows, macOS, Linux (via Tauri v2 + Rust). Native filesystem access, OS file dialogs, system keyring, and window chrome.
  3. Mobile: Android (via Tauri v2 Mobile / Android WebView; future iOS expansion). Touch ergonomics, Android hardware back-button contract (`onHardwareBack`), virtual keyboard resizing (`interactive-widget=resizes-content`), mobile bottom navigation, and Storage Access Framework (SAF).

Production Tech Stack: 
  - Frontend: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4
  - Native Shell: Rust (Tauri v2)
  - Cloud / Backend: Supabase (PostgreSQL Auth & Database Sync)
  - Community Catalog: GitHub CDN (`EntropyRedux/cntxt-library`) + `idb-keyval` (IndexedDB)
  - Execution Sandbox: Recursive-descent AST Interpreter & Dedicated Web Worker (Zero `eval` / `new Function`)

━━━ HYBRID ARCHITECTURAL INVARIANTS ━━━
1. Universal Presenter Purity:
   - Visual UI components (`src/components/`, `src/shell/`) are 100% pure UI driven strictly by typed props and user callbacks.
   - ZERO direct native IPC calls (`invoke()`), direct `localStorage`, `window.open`, or `document.*` in visual presenters.
2. The Runtime Bridge (`IRuntimeBridge`):
   - All platform-dependent capabilities route through `src/adapters/runtimeBridge.ts`.
   - `getPlatform()` returns: `'web' | 'macos' | 'windows' | 'linux' | 'android'`.
   - Web Target: `BrowserRuntimeAdapter` (IndexedDB, Web File System API, `openExternalUrl`).
   - Desktop Target: `TauriRuntimeAdapter` (Rust IPC, native dialogs, OS keyring).
   - Android Target: `AndroidRuntimeAdapter` (SAF content URIs, Android hardware back handler).
3. Zero Inline Mocks for Production:
   - All production stores initialize empty (`[]` or `null`).
   - Mocks reside exclusively in `mocks/index.ts` gated strictly by `VITE_DEMO_MODE === 'true'`.
4. Canonical Data Shapes:
   - Domain models are single-source-of-truth defined in `contracts/data_shapes.ts`.

━━━ PLATFORM CAPABILITY & ISOLATION MATRIX ━━━

| Capability | Web Target (`cntxt-web`) | Desktop Target (`CNTXT`) | Mobile Target (`CNTXT` Android) |
| :--- | :--- | :--- | :--- |
| **Hosting / Shell** | Vercel Free Hobby Tier (SPA Edge) | Tauri v2 (Rust Native Binary) | Tauri v2 Mobile (Android APK) |
| **Persistence** | IndexedDB (`idb-keyval`) + Supabase | Local File System (`std::fs`) | Android Scoped Storage (SAF) |
| **Cloud Sync** | Supabase PostgreSQL Two-Way Sync | Optional Remote Sync | Optional Remote Sync |
| **Catalog Source** | GitHub Raw CDN + jsDelivr Fallback | Bundled Local Presets + GitHub | Bundled Local Presets + GitHub |
| **Script Runner** | Dedicated Web Worker AST Engine | Dedicated Web Worker AST Engine | Dedicated Web Worker AST Engine |
| **CSP Mode** | Strict (`script-src 'self'`) | Strict (`script-src 'self'`) | Strict (`script-src 'self'`) |
| **File Dialogs** | Web File System Access API / Blob | Native OS Dialogs (`rfd`) | Android SAF Intent Picker |
| **Navigation** | Browser History / URL Hash | Desktop Multi-Tab / Title Bar | Mobile Bottom Nav + Back Gesture |
| **Keyring / Secrets** | Supabase Vault / Encrypted Local | Native OS Keyring (`keyring-rs`) | Encrypted App Preferences |
| **Code Splitting** | Dynamic `import()` for Mermaid | Dynamic `import()` for Mermaid | Dynamic `import()` for Mermaid |

━━━ GOALS ━━━
Primary (must achieve):
- 100% Free-tier, zero-cost web deployment on Vercel with real Supabase cloud sync.
- Rate-limit-free Community Library backed by GitHub Raw / jsDelivr CDNs with IndexedDB caching.
- Sandboxed JavaScript user action runner with AST interpreter (Zero `new Function` / `eval`).
- Strict runtime boundary schema validation via Zod for all storage and remote sync payloads.
- Native desktop performance with system root whitelisting and cryptographic token authorization.
- Android APK mobile readiness with hardware back-button handling, keyboard accessory bar, and touch density.
- Real-time LLM token and cost estimation across major model families (Gemini, Claude, GPT, DeepSeek).
- CodeMirror 6 in-situ editor with live split preview, Mermaid diagrams, KaTeX formulas, and data tables.

Secondary (nice to have):
- Customizable formatting ribbon bar.
- Code snippet playground with dynamic formulas (`{=FORMULA()}`).
- Multi-theme engine with light/dark contrast parity.
- One-click GitHub PR/Issue submission for community prompt sharing.

━━━ EXPLICIT NON-GOALS ━━━
What this app will NOT do:
- Paid or metered server infrastructure (remains 100% free-tier compliant).
- Direct un-sandboxed shell command execution inside editor actions.
- Proprietary lock-in file formats (all content is stored as standard plain text / markdown).
- Inline fallback mock data masquerading as functional features.

━━━ CORE FEATURE GROUPS ━━━
- FG-01: Core Workspace Shell & Document Tab Lifecycle
- FG-02: Sandboxed JavaScript Actions & In-Document Widgets (AST Engine)
- FG-03: Prompt Engineering Templates & Dynamic Formulas
- FG-04: Native File System & Workspace Explorer (Desktop OS & Android SAF)
- FG-05: Playwright E2E Test Suite & Test Automation
- FG-06: Layout Margins & Theme Refinements
- FG-07: Editor Resiliency, Multi-Tab State Architecture & UX Refinements
- FG-08: Android APK Porting & Mobile Architecture Adaptation
- FG-09: Mobile UI Ergonomics & Navigation (`MobileAccessoryBar`, `MobileBottomNav`)
- FG-10: Tri-Platform Cloud Sync, Community Library & Free-Tier Web SaaS Engine (Vercel + Supabase + GitHub CDN + IndexedDB)

━━━ ERROR HANDLING, VALIDATION & NOTIFICATIONS ━━━
- Form & Input Validation Standard: Strict runtime validation using Zod boundary schemas (`boundarySchemas.ts`).
- User Notification Strategy: Observable feedback via `useNotificationStore` toasts on all async operations.
- Crash Resilience: React Error Boundaries with graceful recovery wrapping main application containers.
