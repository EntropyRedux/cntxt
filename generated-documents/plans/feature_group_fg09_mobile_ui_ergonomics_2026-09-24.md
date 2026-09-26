# FEATURE GROUP PLAN: FG-09 — MOBILE UI/LAYOUT ERGONOMICS & BOTTOM SHEETS
> **Document:** `/generated-documents/plans/feature_group_fg09_mobile_ui_ergonomics_2026-09-24.md`  
> **Date:** 2026-09-24  
> **Status:** DRAFT (Pass 2 Production Agent)  
> **Project:** CNTXT (ContextPad)  

---

## 1. Goal Description

Transition CNTXT's Android port from a desktop-centric UI to a first-class mobile experience by introducing true mobile touch ergonomics, safe-area insets, and bottom sheets. The current implementation relies heavily on desktop-style modals and a top-heavy title bar, which consume valuable screen real estate and fight against Android system gestures.

This feature group will implement a lightweight, dependency-free React Bottom Sheet mechanism, restructure the shell layout to respect Android safe-areas (notches, gesture bars), and optimize the tab-switching experience for narrow portrait viewports.

---

## 2. User Review Required

> [!IMPORTANT]
> **Custom Bottom Sheet Implementation**
> Since we want to avoid heavy external dependencies like `framer-motion` or `react-spring` to keep the bundle size and memory footprint minimal, I will implement a custom `BottomSheet.tsx` component using Tailwind CSS transitions and native touch events (drag-to-dismiss). Please confirm this dependency-free approach is preferred.

> [!WARNING]
> **Title Bar Removal on Mobile**
> The desktop `ShellTitleBar.tsx` (File/Edit/View menu, minimize/close controls) will be completely hidden on Android. In its place, a minimal `MobileAppBar.tsx` will surface the active file name and a tab switcher trigger. Please confirm this divergence from the desktop layout is approved.

---

## 3. Proposed Changes

### A. Core Layout & Safe Area Insets

#### [MODIFY] [ClassicShell.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/shell/ClassicShell.tsx)
- Dynamically swap `ShellTitleBar` with `MobileAppBar` based on `bridge.platform.isMobile` and viewport width.
- Enforce `paddingTop: env(safe-area-inset-top)` on the root or app bar to prevent camera cutout/notch overlapping.
- Enforce `paddingBottom: env(safe-area-inset-bottom)` to protect the bottom navigation from Android pill/gesture navigation collision.

#### [NEW] [MobileAppBar.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Mobile/MobileAppBar.tsx)
- A compact top bar for mobile devices displaying the current active tab name.
- Tapping the app bar opens the new Mobile Tab Switcher bottom sheet.
- Includes a subtle hamburger menu for global settings (if sidebar is closed).

### B. The Bottom Sheet Architecture

#### [NEW] [BottomSheet.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Mobile/BottomSheet.tsx)
- A highly reusable, accessibility-compliant touch-draggable bottom sheet.
- Relies on Tailwind's `translate-y-full` to `translate-y-0` transitions.
- Captures `onTouchStart`, `onTouchMove`, and `onTouchEnd` to allow users to swipe down to dismiss the modal, matching Android Material 3 behavior.

### C. Modal Migrations (Responsive Modals)

#### [MODIFY] [FontSelectorModal.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Modals/FontSelectorModal.tsx)
- Refactor the floating centered window into a `BottomSheet` when `isMobile` is true.

#### [MODIFY] [VariableFillerModal.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Modals/VariableFillerModal.tsx)
- Use `BottomSheet` on mobile, keeping the centered dialog on desktop. This prevents the virtual keyboard from squishing the modal unnaturally.

#### [MODIFY] [CommandPalette.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Modals/CommandPalette.tsx)
- Shift to a full-screen or bottom-sheet takeover on mobile so the search input and results list are easily reachable with thumbs.

### D. Mobile Tab Switcher

#### [NEW] [MobileTabSwitcher.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Mobile/MobileTabSwitcher.tsx)
- Replaces the horizontal scrolling desktop tab row on mobile viewports.
- Renders as a `BottomSheet` listing all open tabs in a vertical, easily tappable list, complete with closing `x` buttons and "unsaved" indicators.

#### [MODIFY] [TabBar.tsx](file:///C:/Projects/LocalActive/Repo/Active/CNTXT/src/components/Editor/TabBar.tsx)
- Hide the standard desktop `TabBar` entirely when on mobile.

---

## 4. Verification Plan

### Automated Tests
- `npm run test` to ensure store bindings and desktop modal behaviors are not broken.
- `npm run test:e2e` to verify Playwright E2E tests still pass (which primarily run in desktop viewport sizes).

### Manual Verification
- Deploy to physical Android test device or emulator.
- **Insets:** Verify no overlap with the front camera notch (status bar) or bottom gesture navigation bar.
- **Ergonomics:** Tap the App Bar to open the Tab Switcher Bottom Sheet. Verify smooth CSS transition. Swipe down to dismiss the sheet.
- **Modals:** Trigger the Font Selector and Variable Filler. Ensure they render as bottom sheets and are usable alongside the virtual keyboard.
