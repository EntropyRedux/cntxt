# Feature Group Implementation Plan: FG-11 Web SaaS UX Redesign, Auth Gateway & Onboarding
Date: 2026-10-01
Author: Architect & Implementation Agent
Status: [x] Scoped  [x] Ready for Execution
Target Repository: `C:\Projects\LocalActive\Repo\Active\CNTXT` (Single Canonical Repository)

---

## 1. Executive Summary & Objective

The objective of **FG-11** is to tailor the **Web SaaS target (`cntxt.vercel.app`)** with a modern, high-converting, distraction-free document experience (*Google Docs / Notion / Linear-class*), eliminating desktop UI clutter while preserving 100% offline functionality and zero contamination for native Desktop and Android builds.

### Key Architectural Invariants:
1. **Tri-Platform Purity:** Desktop (`Tauri/Rust`) and Android (`Tauri Mobile`) remain **100% offline out-of-the-box** with zero forced login.
2. **Unified 48px Web Header:** On Web, the separate `TitleBar` (36px), `MenuBar` (30px), `ModularRibbon` (44px), and `TabBar` (36px) are collapsed into a **single, sleek 48px top bar** (`WebHeader.tsx`), freeing up ~100px of vertical space.
3. **Auto-Hide on Scroll:** The Web header smoothly slides away when scrolling down to maximize writing canvas area, and slides back into view when scrolling up or hovering.
4. **Option A Document Drawer:** Horizontal tabs row is removed on Web; document switching flows through the Sidebar Drawer and the `⌘K` Quick Switcher.
5. **Frictionless Auth & Guest Demo Mode:** Unauthenticated web visitors see a branded **Auth Gateway** (1-click Google and GitHub OAuth via Supabase) with an **"Explore Demo Workspace"** guest option backed by browser `IndexedDB`.
6. **First-Run Onboarding Modal:** A 3-step interactive tour for new users to configure their archetype and discover ContextPad's superpowers (`[[action:id]]` widgets, token estimators, and split preview).

---

## 2. Technical Architecture & Component Hierarchy

```
                          App.tsx
                             │
                  RuntimeBridgeProvider
                             │
                       ShellFrame.tsx
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
       Platform: 'web'             Platform: 'desktop' | 'android'
              │                             │
        useAuthStore()                      │
              │                             │
    ┌─────────┴─────────┐                   │
    ▼                   ▼                   │
  [No Auth &         [User Signed In        │
   No Guest]          or Guest Mode]        │
    │                   │                   │
WebAuthGateway          │                   │
                        ▼                   ▼
                  WebShell /          ClassicShell
                  ClassicShell         (Unchanged
                  (with WebHeader      Native Layout)
                   & Option A)              │
                        │                   │
                        └─────────┬─────────┘
                                  ▼
                         OnboardingModal
                       (if !hasCompleted)
```

---

## 3. Work Breakdown Structure (Execution Phases)

### Phase 1: Authentication & Guest Session Management (`src/store/authStore.ts`)
- Implement `useAuthStore` using Zustand:
  - State:
    - `user: UserProfile | null`
    - `isGuestMode: boolean`
    - `isInitialized: boolean`
    - `syncStatus: 'idle' | 'syncing' | 'up-to-date' | 'error'`
    - `hasCompletedOnboarding: boolean`
  - Actions:
    - `loginWithGoogle(): Promise<void>` (delegates to `supabaseClient.ts`)
    - `loginWithGitHub(): Promise<void>` (delegates to `supabaseClient.ts`)
    - `continueAsGuest(): void` (activates guest session with IndexedDB backing)
    - `signOut(): Promise<void>`
    - `completeOnboarding(): void`
    - `initAuth(): Promise<void>` (checks existing Supabase session or cached guest session)
- Unit test: `tests/authStore.test.ts` verifying guest mode transition, persistence, and state cleanliness.

### Phase 2: Web Auth Gateway (`src/components/Auth/WebAuthGateway.tsx`)
- Sleek, modern full-screen landing portal rendered exclusively when `getPlatform() === 'web'` and user is unauthenticated.
- Features:
  - Brand header with typography and gradient glow.
  - One-click **"Continue with Google"** and **"Continue with GitHub"** buttons.
  - **"Try Demo Workspace (No sign-in required)"** guest button.
  - Feature showcase carousel / badge pills (*Token Estimator*, *Executable Action Widgets*, *Split Live Preview*, *100% Free*).
- Accessibility & keyboard navigation support.

### Phase 3: The Unified 48px Web Header (`src/components/Header/WebHeader.tsx`)
- Collapses `TitleBar`, `MenuBar`, and `Ribbon` into a single, compact `h-12` (48px) bar:
  - **Left Section:**
    - App Logo & Dropdown (Home / Open File / Export / Toggle Sidebar).
    - Inline Document Title with editable rename input (`onBlur` / `Enter`).
    - Cloud Sync Indicator (Green checkmark: `Saved to Cloud` / `Offline Guest`).
  - **Center Section:**
    - Compact quick-action formatting pill toolbar:
      - Bold (`**`), Italic (`*`), Heading (`#`), Code Block (`` ``` ``).
      - Action Widget button (`[[action:id]]`).
      - Live Preview toggle (Split / Editor Only / Preview Only).
  - **Right Section:**
    - `⌘K` Command Palette shortcut trigger button.
    - Zen Mode (Distraction-Free) toggle.
    - User Profile Avatar or `Sign In to Sync` pill for guests.

### Phase 4: Document Canvas Layout, Option A Sidebar Drawer & Auto-Hide on Scroll
- **Option A Document Drawer:**
  - On Web (`isWeb`), hide the horizontal `TabBar` from `ShellEditorContainer`.
  - Add an "Open Tabs / Recent Documents" section at the top of the Sidebar (`FileExplorer.tsx` / `Sidebar.tsx`) or accessible via `⌘P` / `⌘K`.
- **Auto-Hide on Scroll:**
  - Track scroll direction in the editor container:
    - Scrolling down > 60px: translates `WebHeader` up (`-translate-y-full opacity-0`).
    - Scrolling up or hovering near top 20px: smoothly transitions `WebHeader` back (`translate-y-0 opacity-100`).
- **Centered Document Sheet Canvas:**
  - Apply `max-w-4xl mx-auto py-8 px-8` centering to CodeMirror editor container on web when preview is closed, preserving comfortable reading line length (65–85 characters).

### Phase 5: First-Run Onboarding Modal (`src/components/Modals/OnboardingModal.tsx`)
- Rendered on first login or first guest session when `!hasCompletedOnboarding`:
  - **Step 1: Welcome & Archetype:** Pick primary workflow (*Prompt Architect*, *Software Developer*, *Technical Writer*).
  - **Step 2: Starter Pack:** Choose starting document (*Prompt Engineering Kit*, *Technical Documentation & Diagrams*, or *Clean Slate*).
  - **Step 3: 3-Feature Walkthrough:** Visual cards demonstrating executable action buttons, real-time token estimator, and split markdown preview.
  - **"Enter Workspace":** Sets `hasCompletedOnboarding = true` in storage and opens the editor.

---

## 4. Verification & Quality Gates

To guarantee that native Desktop and Android builds remain 100% pristine:

| Gate | Target | Verification Criteria |
| :--- | :--- | :--- |
| **Purity Gate** | `npm run lint` | 0 TypeScript errors. `check-platform-leaks.mjs` scans 100% of files; 0 leaks outside authorized adapters. |
| **Contract Gate** | `check-contract-sync.mjs` | `contracts/data_shapes.ts` and `generated-documents/.../data_shapes.ts` 100% byte-identical. |
| **Native Gate** | `cargo test` | All 8 native Rust security, token gating, and path validation tests pass. |
| **Unit Suite** | `npm test` | All existing 394 unit tests pass, plus new tests for `authStore` and `webHeader`. |
| **Build Gate** | `npm run build` | Clean Vite production bundle created with zero CSP errors. |

---

## 5. Rollback & Isolation Invariant Checklist

- [x] Does Desktop still launch offline with native window controls? (Yes, guarded by `if (isWeb)`).
- [x] Does Android still use the Virtual Keyboard Accessory Bar & BottomNav? (Yes, guarded by `isTouch` / `isMobile`).
- [x] Are Supabase auth calls isolated to `src/adapters/supabaseClient.ts`? (Yes).
- [x] Does guest demo mode work with zero internet connectivity? (Yes, backed by browser `IndexedDB`).
