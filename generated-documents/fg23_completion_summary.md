# Feature Group FG-23 Completion Summary
**Active Thread `.cntxt` Orchestration, Inline Citation Reply Input (`id=user-inbox`), Automatic `.cntxt` Extension Promotion & Visual Refinements**

**Date:** 2026-10-21  
**Author:** Antigravity (Prod Agent)  
**Status:** Complete & Production Verified (728/728 unit tests passing across 61 test suites, TypeScript clean, Release binary compiled & deployed)

---

## 1. Executive Summary
Feature Group FG-23 successfully delivers the full human-in-the-loop and active thread orchestration infrastructure for CNTXT:
1. **Visual Refinements:**
   - Reduced continuous left accent rail thickness by 2px (from 3px down to 1px) and muted the accent line color to `color-mix(in srgb, var(--accent-primary, #6366F1) 42%, transparent)`.
   - Adhered strictly to the single icon library rule: 100% pure Lucide SVG icons across all code block headers, controls, and floating popups (zero emoji fallbacks).
2. **Inline Citation Reply Input (`id=user-inbox`):**
   - Added **[Respond]** button (`LUCIDE_SVGS.messageSquarePlus`) to both the block header widget and the scrollbar-aligned floating action popup bar.
   - When clicked, a floating citation popover appears that auto-captures the highlighted text selection or cursor line range (`#<blockId> · L<start>-L<end>`) and snippet preview.
   - Submitting automatically writes or appends timestamped (`ts=...`), cited (`link=<blockId>#L<start>-L<end>`) entries into the single pinned user-owned block (`id=user-inbox source=@USER locked=user status=open`) pinned at the **very top of the document** via `appendUserInboxEntry`.
3. **Active Thread Orchestration & Automatic Deliverable Routing:**
   - Added tab context menu option **"Toggle as Active Thread"** with Lucide `Radio` icon and pulsing visual badge on the tab bar.
   - When a tab is toggled as Active Thread, incoming agent deliverables from MCP (`cntxt_open_deliverable`), REST Gateway (`/api/v1/tabs/open`), or RPC `tabs.create` automatically prepend immediately below `id=user-inbox` via `prependDeliverableToThread`.
   - When no active thread tab exists, deliverables default to creating a new `.cntxt` file in the configured deliverable folder (workspace `.cntxt/deliverables` or custom folder configurable in Settings -> Storage).
4. **Automatic Extension Promotion:**
   - Files containing CNTXT pipe blocks (`hasCntxtPipeBlock`) or toggled as Active Thread automatically promote `.md` -> `.cntxt`.

---

## 2. Key Architecture & File Changes

| Component | File Path | Key Changes |
| :--- | :--- | :--- |
| **Data Shapes & Contracts** | `contracts/data_shapes.ts`<br>`src/contracts/data_shapes.ts`<br>`generated-documents/context/contracts/data_shapes.ts` | Added `ts?: string;` to `CntxtBlockParams`. Added `isActiveThread?: boolean;` to `Tab`. Added `deliverableSaveLocation`, `deliverableWorkspaceSubfolder`, and `deliverableCustomFolderPath` to `ViewSettings`. |
| **Zod Boundary Schemas** | `src/contracts/boundarySchemas.ts` | Added `ts: z.string().optional()` to `CntxtBlockParamsPartialSchema` and `isActiveThread: z.boolean().optional()` to `TabSchema`. |
| **Parser & Surgical Writers** | `src/services/editor/cntxtBlockParser.ts` | Added `ts` to `GOVERNANCE_KEYS`. Stripped `#L...` line anchors when resolving forward/reverse graph links. Implemented `hasCntxtPipeBlock`, `promoteToCntxtExtension`, `appendUserInboxEntry`, and `prependDeliverableToThread`. |
| **Visual Styles** | `src/index.css` | Reduced rail width to 1px with 42% muted accent color mix and 1px tick marks. |
| **Code Block Header** | `src/extensions/liveMarkdown/widgets/codeBlockWidget.ts` | Added pure Lucide `messageSquarePlus`, `send`, `x` SVGs. Added `[Respond]` button that dispatches `openCntxtReplyInputEffect`. |
| **Floating Overlays & Inbox Popover** | `src/extensions/liveMarkdown/cntxtBlockOverlay.ts` | Handled `openCntxtReplyInputEffect`, added `[Respond]` button to floating popup bar, and implemented `buildReplyPopover` with auto-captured line citation badges, snippet quote previews, and user-inbox writer. |
| **Tab Store** | `src/store/tabStore.ts` | Added `toggleActiveThread`, automatic `.cntxt` promotion on tab creation/save/content change when pipe blocks are present. |
| **Tab Bar UI** | `src/components/TabBar/TabBar.tsx` | Added "Toggle as Active Thread" context menu option with Lucide `Radio` icon and pulsing visual badge on the tab item. |
| **Host Command Bus** | `src/features/panelApps/rpc/hostCommandBus.ts` | Intercepts `tabs.create` and automatically routes agent deliverables to the active thread tab using `prependDeliverableToThread`. |
| **Settings Panel** | `src/components/Sidebar/SettingsPanel.tsx`<br>`src/store/settingsStore.ts` | Added configuration UI for Deliverable Save Location (Workspace folder vs. Custom Device Folder). |
| **Test Suite** | `tests/cntxtBlockParserAndRichContainers.test.ts` | Added comprehensive tests for extension promotion, pipe block detection, top-pinned user inbox creation/appending, and active thread routing via HostCommandBus. |

---

## 3. Verification & Test Results
- **Contracts Sync:** `scripts/check-contract-sync.mjs` passed (100% clean).
- **Platform Leaks:** `scripts/check-platform-leaks.mjs` passed (182 files scanned, 0 platform leaks).
- **TypeScript:** `npx tsc --noEmit` passed with 0 errors.
- **Unit Tests:** `npx vitest run` passed **728/728 tests** across **61 suites** (13/13 passing in `cntxtBlockParserAndRichContainers.test.ts`).
- **Production Build:** Vite production bundle built in 53s.
- **Release Compilation:** Tauri native executable compiled in release mode (`cntxt.exe`) and deployed to `$env:LOCALAPPDATA\CNTXT\cntxt.exe`.
