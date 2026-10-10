# PROJECT BRIEF: TRI-PLATFORM HYBRID ARCHITECTURE & AGENT CANVAS
Version: v2.1
Last Updated: 2026-10-10
Status: [x] Draft  [x] Audited  [x] Approved

━━━ VISION ━━━
What this app is:
ContextPad (CNTXT) is a tri-platform structured workspace engineered for technical drafting, prompt engineering, markdown documentation, diagramming, sandboxed workflow automation, and multi-CLI agent orchestration.

What problem it solves:
Modern AI workflows require structured, token-conscious prompt drafting, rapid variable substitution, dynamic calculations, sandboxed script execution, and seamless catalog discovery across web, desktop, and mobile devices without relying on fragmented browser tabs, proprietary silos, or ephemeral terminal windows that lose their reasoning trace once closed.

Who it is for:
Solo software developers, AI principal architects, prompt engineers, and technical writers needing a fast, keyboard-first or touch-optimized, distraction-free markdown workbench and multi-agent execution canvas across web, desktop, and mobile environments.

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
                    │   fs | window | clipboard | storage | terminal | pty   │
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
         │ - GitHub Raw CDN        │  │ - Rust PTY Engine│  │ - Hardware Back    │
         │ - IndexedDB (idb-keyval)│  │ - OS Keyring     │  │ - Accessory Bar    │
         │ - Web Worker AST Engine │  │ - IPC Token Gate │  │ - Touch Insets     │
         └─────────────────────────┘  └──────────────────┘  └────────────────────┘
```

━━━ PLATFORM & RUNTIME CONTEXT ━━━
Target Platforms (Tri-Platform Hybrid Model):
  1. Web (Production SaaS): Hosted on Vercel (Free Hobby Tier). Zero-cost architecture backed by Supabase Free (Auth + User Sync), GitHub Raw CDN / jsDelivr (Community Library Catalog), browser IndexedDB (offline-first persistence), and Web Workers (sandboxed execution). Zero mocks in production.
  2. Desktop: Windows, macOS, Linux (via Tauri v2 + Rust). Native filesystem access, OS file dialogs, system keyring, window chrome, and Rust PTY process management.
  3. Mobile: Android (via Tauri v2 Mobile / Android WebView; future iOS expansion). Touch ergonomics, Android hardware back-button contract (`onHardwareBack`), virtual keyboard resizing (`interactive-widget=resizes-content`), mobile bottom navigation, and Storage Access Framework (SAF).

Production Tech Stack: 
  - Frontend: React 19 + TypeScript + Vite 6 + Zustand 5 + CodeMirror 6 + Tailwind CSS v4 + Zod 4
  - Native Shell: Rust (Tauri v2 + portable-pty)
  - Cloud / Backend: Supabase (PostgreSQL Auth & Database Sync)
  - Community Catalog: GitHub CDN (`EntropyRedux/cntxt-library`) + `idb-keyval` (IndexedDB)
  - Execution Sandbox: Recursive-descent AST Interpreter & Dedicated Web Worker (Zero `eval` / `new Function`)

━━━ HYBRID ARCHITECTURAL INVARIANTS ━━━
1. Universal Presenter Purity:
   All visual components are 100% pure UI driven strictly by typed props. Zero direct calls to `window.__TAURI__`, `invoke()`, `fetch()`, or native shell commands inside visual views. All platform capabilities route through `useRuntimeBridge()`.
2. Mock Quarantine & Real Data:
   Zero fallback mock constants or fake arrays inline in production components. Production collections initialize empty (`[]`, `null`) and populate strictly from verified runtime events.
3. Canonical Data Shapes First:
   All domain models align with `contracts/data_shapes.ts` before native types are created.
4. God-Object Prohibition:
   Monolithic contexts are strictly forbidden. Decomposed into pure Presenters, Headless Stores (`useTabStore`, `useSettingsStore`, `usePanelAppsStore`), and Runtime Adapters.
5. Native Boundary Security:
   Authenticate all IPC endpoints with cryptographic session tokens. Whitelist allowed system directories, validate canonical paths, and sanitize metacharacters.
6. UTF-8 Without BOM Integrity:
   All files written and saved strictly in UTF-8 without BOM.
7. Resilient Error Handling & Notifications:
   Zero silent failures. Typed boundary validations on all inputs. Explicit toasts/banners on every asynchronous success and failure.

━━━ PRIMARY OBJECTIVES & SCOPE ━━━
Primary (must have):
- Fast, markdown-first note drafting and document editing with CodeMirror 6.
- Sandboxed JavaScript formula evaluation and structured AST workflow actions.
- Full offline-first tri-platform continuity with Supabase sync and GitHub community prompt catalogs.
- Panel Apps System: Sandboxed monolithic HTML apps running in a dedicated side-rail drawer with keep-alive DOM host, strict CSP, and bidirectional theme synchronization.
- Blueprint Prompt Archetypes (`build`, `brainstorm`, `adapt`) with live CodeMirror tab synchronization and manual edit protection.
- The `.cntxt` Multi-Session Terminal Bus: Multiplexed CLI terminal shell sessions streaming stdout/stderr into persistent `.cntxt` documents with two-way PTY stdin interaction.
- Headless Host Command Bus: Asynchronous RPC interface (`window.CNTXT`) exposing editor, tabs, workspace, domain templates, and terminal controls to mini panel apps and external CLI agents.

Secondary (nice to have):
- Customizable formatting ribbon bar.
- Code snippet playground with dynamic formulas (`{=FORMULA()}`).
- Multi-theme engine with light/dark contrast parity.
- One-click GitHub PR/Issue submission for community prompt sharing.

━━━ EXPLICIT NON-GOALS ━━━
What this app will NOT do:
- Paid or metered server infrastructure (remains 100% free-tier compliant).
- Direct un-sandboxed shell command execution inside editor actions without user-governed PTY channel allocation.
- Proprietary lock-in file formats (all content is stored as standard plain text / markdown / `.cntxt` structured documents).
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
- FG-10: Tri-Platform Cloud Sync, Community Library & Free-Tier Web SaaS Engine
- FG-13: Panel Apps Flow A (Manifest, Rail, Preflight Scanner, .cntxt Dynamic Fence)
- FG-14: Panel Apps Flow B (Keep-Alive Host, Prompt Builder, Theme Engine, State Protocol)
- FG-15: Blueprint Prompt Archetypes & Editor Tab Bidirectional Sync
- FG-16: Host Command Bus & Mini Panel App RPC Bridge (In-Progress / Upcoming)
- FG-17: `.cntxt` Multi-Session Terminal Bus & Multi-Agent Orchestration (Planned)

━━━ ERROR HANDLING, VALIDATION & NOTIFICATIONS ━━━
- Form & Input Validation Standard: Strict runtime validation using Zod boundary schemas (`boundarySchemas.ts`).
- User Notification Strategy: Observable feedback via `useNotificationStore` toasts on all async operations.
- Crash Resilience: React Error Boundaries with graceful recovery wrapping main application containers.
