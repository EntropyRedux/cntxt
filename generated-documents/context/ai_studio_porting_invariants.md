# AI Studio Porting Invariants & Desktop Chrome Preservation Guide

**Version:** v1.0  
**Date:** 2026-09-13  
**Project:** CNTXT (ContextPad)  
**Authority:** Architectural Invariant — Stage 2/Stage 3 Porting & Sync-Back Protection  

---

## 1. The Core Architectural Divergence: Web Canvas vs. Desktop Frameless Window

Google AI Studio builds and previews web applications in a browser DOM sandbox (iframe). Because of browser security and environment constraints:
1. **No OS Non-Client Frame**: Web browsers cannot manipulate OS window borders or decorations. AI Studio has no concept of `tauri.conf.json`, frameless windows (`"decorations": false`), or native OS title bars.
2. **Web Navbar Bias**: AI Studio models routinely collapse all navigation, menu bars, and tools into a single web-style header bar.
3. **Missing Window Drag & OS Hitboxes**: Web browsers cannot handle desktop-native window dragging (`data-tauri-drag-region`), double-click to maximize, or OS window control button metrics (e.g. 44px hitboxes, red hover on close).

If AI Studio output is directly injected into production without reconciliation, **the desktop UI will break**:
- The window may revert to having a native OS title bar stacked on top of a web header (the "double title bar / cut-off UI" bug).
- The theme engine will fail to theme the window frame (e.g., a Parchment or Light theme will be topped with a pitch-black Windows title bar).
- Desktop window controls will disappear or trigger platform leak errors (`invoke` directly in UI).

---

## 2. The Authoritative 3-Row Desktop Header Architecture

To maintain 100% theme fidelity, maximize vertical workspace, and ensure seamless desktop UX while preserving web prototype compatibility, CNTXT mandates a **3-Row Header Architecture**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [● CNTXT] [|]  │       [Search Ctrl+K] [Rendered] [Touch] [Theme ▾]        │  ─   □   ✕   │  <- Row 1: Themed Title Bar (h-9, var(--titlebar-bg))
├────────────────────────────────────────────────────────────────────────────────────────┤
│ File   Edit   View   Tools   Help                                                      │  <- Row 2: Compact Menu Bar (h-7 desktop / h-8.5 touch)
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Welcome.md ● ] [ Untitled.md ● ]                                               +  ▾  │  <- Row 3: Document Tab Bar (or Modular Ribbon)
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Row 1: Themed Window Chrome Header (`h-9`, `var(--titlebar-bg)`)
- **Tauri Integration**: Uses `data-tauri-drag-region="true"` on the header container.
- **Double-Click Behavior**: Double-clicking empty areas calls `bridge.window.toggleMaximize()`.
- **Left**: Brand logo/text (`CNTXT`) + Left Rail toggle button (`PanelLeft`).
- **Center**: High-frequency tools:
  - Quick Search / Command Palette shortcut (`Search` + `Ctrl+K`)
  - Render MODE switcher (`Rendered` vs `Raw` markdown)
  - TOUCH MODE toggle (`touchOptimized`)
  - Theme Picker dropdown (Sun/Moon icon with real-time CSS token switching)
- **Right**: Custom Themed **Window Controls** (`−`, `□`/`❐`, `×`):
  - In Native Desktop (Tauri): Renders themed hitboxes (`w-11 h-full`) matching active theme with red hover on close.
  - In Web / AI Studio: Gracefully renders `null` (zero DOM footprint).

### Row 2: Compact Menu Bar (`h-7` in Desktop Density, `h-8.5` in Touch Mode)
- Contains standard application menus: `File`, `Edit`, `View`, `Tools`, `Help`.
- Height is deliberately reduced to `h-7` (28px) in desktop density to reclaim vertical canvas height for document editing.
- Background uses `var(--titlebar-bg)/85` with subtle border separation.

### Row 3: Document Tab Bar / Modular Ribbon
- Dedicated row for open document tabs (`Welcome.md`), tab pinning, and the optional collapsible formatting ribbon.

---

## 3. Mandatory AI Studio Sync-Back Checklist

When receiving new code drops, UI iterations, or feature injections from AI Studio, the developer or prod agent **MUST NOT** blindly overwrite the following desktop invariants:

| File / Component | Desktop Invariant to Preserve | Why AI Studio Will Break It |
|---|---|---|
| `src-tauri/tauri.conf.json` | `"decorations": false` | AI Studio doesn't generate Tauri configs or defaults to `true`. |
| `src/components/TitleBar/WindowControls.tsx` | Pure Presenter for desktop window controls | AI Studio does not have desktop window controls. |
| `src/ui-contract/bridgeContract.ts` | `IWindowBridge` (`minimize`, `maximize`, `unmaximize`, `toggleMaximize`, `isMaximized`) | AI Studio lacks native window bridge contracts. |
| `src/shell/ShellTitleBar.tsx` | 2-row layout with centered tools, drag regions, and double-click maximize | AI Studio generates a flat 1-row web navbar without window drag regions. |
| `src/index.css` | `--titlebar-bg` tokens across all 10 color themes | AI Studio may omit or overwrite theme tokens. |

---

## 4. Preservation Protocol During Code Sync-Back

If an AI Studio update touches `ShellTitleBar.tsx` or the top navigation:
1. Extract any new menu items or action callbacks into the `menuGroups` structure.
2. Maintain the `<WindowControls />` component in Row 1 right slot.
3. Maintain the `data-tauri-drag-region` attributes and double-click maximize handler.
4. Maintain `bridge.window.isNative` checks so that web prototypes continue to run without dead buttons.
5. Run verification gates (`npm run lint`, `npm test`, `cargo check`).
