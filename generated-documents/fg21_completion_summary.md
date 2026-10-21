# FG-21 Implementation & Verification Summary

- **Feature Group:** FG-21 — Omni Terminal Deprecation, Persistent REST Gateway, Deliverable Code Blocks & Native MCP Bridge
- **Status:** Complete & Verified
- **Test Telemetry:**
  - **Vitest Unit Suites:** 60/60 suites passing (`715/715` tests green)
  - **Rust Security & Gateway Tests:** 12/12 passing (`cargo test`)
  - **Platform Purity & Contract Sync (`npm run lint`):** 0 platform leaks across 180 files, 100% contract synchronization

---

## 1. What Was Built & Cleaned Up

1. **Omni Terminal Scope Creep Removed (~3,071 Lines Pruned):**
   - Deleted `src/components/OmniTerminal/*`, `src/features/omniTerminal/*`, `src/store/omniTerminalStore.ts`, and `tests/omni*.test.ts`.
   - Cleaned up `ClassicShell.tsx`, `ActivityBar.tsx`, `Sidebar.tsx`, `CommandPalette.tsx`, `SettingsPanel.tsx`, and added automatic fallback in `settingsStore.ts` (`'omni-terminal' -> 'explorer'`).

2. **Mandatory AI Deliverable Code Block Encapsulation:**
   - Upgraded `scanners.ts` (`findCodeBlocks`) to respect CommonMark fence character and length matching (`~~~` or ` ```` ` outer deliverable fences never break when inner ` ``` ` code blocks appear inside a deliverable).
   - Added `'deliverable' | 'agent' | 'cntxt'` language metadata (`AI Deliverable`, emerald `#10B981`) in `languageMeta.ts`.
   - Configured both `send-to-cntxt.ps1` and `cntxt-mcp-server.mjs` to automatically encapsulate every AI/Agent deliverable inside a fenced code block (`~~~markdown|@agy · <Title> (HH:mm)` ... `~~~`), giving every deliverable in CNTXT a collapsible header bar with **Collapse**, **Copy**, **Clear**, and line-count controls.

3. **Permanent REST Gateway & Auto-Start on Boot:**
   - `src-tauri/src/commands/gateway.rs` now persists your `cntxt_sec_...` token in the Windows OS Keyring (`CNTXT / rest_gateway_token`).
   - `src/shell/ShellFrame.tsx` now auto-starts the Localhost REST API Gateway on app startup whenever `enableExperimentalSettings && enableRestGateway` are enabled.
   - `src/features/panelApps/rpc/hostCommandBus.ts` (`tabs.create`) now updates an existing tab's live content in place when re-opening a tab with the same `filePath`.

4. **Native CNTXT MCP Server (`scripts/mcp/cntxt-mcp-server.mjs`):**
   - Exposes `cntxt_open_deliverable`, `cntxt_append_deliverable`, `cntxt_get_active_context`, `cntxt_list_tabs`, `cntxt_focus_tab`, `cntxt_set_diagnostics`, and `cntxt_rpc` over stdio MCP.
