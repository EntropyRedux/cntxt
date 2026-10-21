# FEATURE GROUP DEFINITION: FG-21 — Omni Terminal Deprecation, Persistent REST Gateway & Native MCP Bridge

* **Date:** 2026-10-21
* **Status:** Planned
* **Target Platform & Stack:** Tri-Platform Suite (Desktop Tauri v2 + Rust / Web SaaS / Android) + Local Node.js MCP Stdio Wrapper
* **Document Path:** `generated-documents/plans/feature_group_FG21_omni_terminal_removal_and_mcp_bridge_2026-10-21.md`

---

## 1. SCOPE & BOUNDARIES

### Features Included
1. **Physical Deprecation & Removal of Omni Terminal (`FG-18` Scope Creep Cleanup):**
   * Physically remove the brittle ConPTY/ANSI-scraping Omni Terminal UI and store (`src/components/OmniTerminal/*`, `src/features/omniTerminal/*`, `src/store/omniTerminalStore.ts`, and `tests/omni*.test.ts` — ~3,071 lines).
   * Remove the `'omni-terminal'` activity bar icon and sidebar route from `ClassicShell.tsx`, `Sidebar.tsx`, and `SettingsPanel.tsx` (`enableOmniTerminal`, `isOmniFloating`, `omniStorageFolder`, `omniFloatingPosition`).
2. **Permanent & Self-Discovering Localhost REST API Gateway:**
   * **OS Keyring Token Persistence (`src-tauri/src/commands/gateway.rs`):** Persist the `cntxt_sec_...` token in the OS Keyring (`CNTXT / rest_gateway_token`) so `cntxt.exe` restarts never invalidate external agent configurations.
   * **Boot Auto-Start (`src/shell/ShellFrame.tsx`):** Automatically start the Localhost REST API Gateway on app mount when `enableExperimentalSettings && enableRestGateway` are enabled, without requiring the user to open the Settings panel first.
   * **Runtime Discovery Manifest (`gateway_runtime.json`):** Write `{ "running": true, "port": bound_port, "updatedAt": ... }` to the app data directory (`%APPDATA%\com.cntxt.desktop\gateway_runtime.json`) whenever the gateway starts or stops so local AI tools and MCP servers discover the active port (`9876–9881`) with zero port scanning.
3. **Native CNTXT MCP Server (`scripts/mcp/cntxt-mcp-server.mjs`):**
   * A zero-bloat Model Context Protocol (MCP) stdio server wrapping CNTXT's Localhost REST Gateway (`http://127.0.0.1:<port>/api/v1/rpc`) and OS Keyring / `cntxt_gateway.json` token.
   * Exposes first-class MCP tools to **Antigravity**, **Claude Code / Desktop**, **Cursor**, **Cline**, and **Windsurf**:
     * `cntxt_open_deliverable` (`tabs.create`): Open or update a dedicated Markdown tab for plans, briefs, audits, and reports.
     * `cntxt_append_deliverable` (`editor.insert` / `workspace.appendToFile`): Append a structured multi-agent turn (`## [HH:MM] @agent — Title`) into the active or shared session document tab.
     * `cntxt_get_active_context` (`editor.getActiveDocument` + `editor.getSelection`): Read the active CNTXT tab content and highlighted selection directly into the agent's context.
     * `cntxt_list_tabs` & `cntxt_focus_tab` (`tabs.list` / `tabs.focus`): Inspect and switch open tabs in CNTXT.
     * `cntxt_set_diagnostics` & `cntxt_clear_diagnostics` (`editor.setDiagnostics` / `editor.clearDiagnostics`): Render inline audit/review squigglies directly inside the CNTXT editor.
     * `cntxt_apply_template` (`templates.list` / `templates.apply`): Retrieve and render user templates from CNTXT.
     * `cntxt_notify` (`notify.show`): Surface toast notifications inside CNTXT.

### Features Explicitly Excluded (Non-Goals for this Group)
* **No In-App Terminal Chat Emulation:** CNTXT will not spawn hidden PTY shells to scrape interactive CLI agent TUIs (`agy`, `cline`, `opencode`).
* **No Inbound Prompt Polling Loop:** External GUI agents (Antigravity Desktop + Remote Control) handle user chat prompts natively; CNTXT acts strictly as the rich Document, Context, Live Preview, and Deliverable Canvas controlled via REST/MCP.

---

## 2. CANONICAL DATA SHAPES & DEPENDENCY MAPPING

### Active Schemas from `contracts/data_shapes.ts`
* `CntxtRpcRequest` / `CntxtRpcResponse`: Used unchanged by the REST Gateway and `cntxt-mcp-server.mjs`.
* `TabCreatePayload`, `EditorInsertPayload`, `EditorSetDiagnosticsPayload`, `NotifyPayload`: Used for agent deliverable display and inline diagnostics.
* `ViewSettings`: Prune deprecated `enableOmniTerminal`, `isOmniFloating`, `omniStorageFolder`, and `omniFloatingPosition` fields (with safe schema ignore/strip for existing `kv_store.json` settings).

### Prerequisites (Upstream dependencies)
* `src-tauri/src/commands/gateway.rs` (Localhost REST Gateway, FG-20)
* `src/features/panelApps/rpc/hostCommandBus.ts` (Host Command Bus, FG-16 / FG-20)

### Downstream Dependencies (What breaks if this group is incomplete)
* `ClassicShell.tsx`, `Sidebar.tsx`, and `SettingsPanel.tsx` must cleanly remove references to `OmniTerminalView`, `OmniFloatingChat`, and `useOmniTerminalStore` so TypeScript compilation and Vite bundling succeed with zero dead imports.

---

## 3. MOCK REGISTRY IMPACT (PHYSICAL CLEARING PLAN)

| Mock ID | Physical File (`mocks/`) | Real Native Target | Clearing Action |
| :--- | :--- | :--- | :--- |
| None | N/A (Omni Terminal had zero mocks in `mocks/`) | `gateway.rs` / `hostCommandBus.ts` | Verify zero inline `DEFAULT_AGENTS` fallback arrays remain after deleting `omniTerminalStore.ts` |

**Remaining Quarantined Mocks (Surviving this session):**
* `MOCK-001` through `MOCK-007` in `mocks/index.ts` (Demo mode only).

---

## 4. BACKGROUND PROCESSES & EXPERIMENTAL SETTINGS GATING

| Process Name | Purpose & Interval | Settings Toggle Path | Default State |
| :--- | :--- | :--- | :--- |
| `Localhost REST API Gateway` | Tokio loopback TCP/HTTP server (`127.0.0.1:9876`) | Settings -> Experimental -> `Localhost REST API Gateway` (`enableRestGateway`) | OFF (Enabled in user's active profile; auto-starts on boot in `ShellFrame.tsx` when enabled) |
| `Omni Terminal Dual-Bus Sync` | **REMOVED** (Deprecated scope creep) | Removed from Settings -> Experimental | Deleted |

---

## 5. UI/UX, DESIGN SYSTEM & SURFACE PRIMITIVES

* **Surface Primitives:** Removes cluttered Omni Terminal sidebar/floating chat surfaces; preserves `RestGatewaySettingsCard.tsx` in `SettingsPanel.tsx`.
* **Theme Tokens:** All remaining surfaces strictly consume CSS variables from `theme/index.ts`.
* **Presenter Purity:** `ShellFrame.tsx` delegates REST Gateway lifecycle strictly through `bridge.gateway` (`useRuntimeBridge()`), preserving 100% Universal Presenter Purity across visual components.

---

## 6. VALIDATION, ERROR HANDLING & USER NOTIFICATIONS

* **Input Validation:** All REST & MCP calls pass through `validateRpcRequest` and domain-specific Zod schemas in `boundarySchemas.ts`.
* **Notification Strategy:** Deliverables pushed via MCP/REST trigger optional toast notifications via `notify.show`.
* **Zero Silent Failures:** Keyring read/write fallbacks and gateway startup errors log structured warnings without crashing the UI.
* **Crash Resilience:** `RestGatewaySettingsCard` remains wrapped in `<ErrorBoundary>`.

---

## 7. ACCEPTANCE CRITERIA

- [ ] `src/components/OmniTerminal/*`, `src/features/omniTerminal/*`, `src/store/omniTerminalStore.ts`, and `tests/omni*.test.ts` physically deleted.
- [ ] `ClassicShell.tsx`, `Sidebar.tsx`, and `SettingsPanel.tsx` cleaned of all Omni Terminal references.
- [ ] Canonical `contracts/data_shapes.ts` synchronized across root, `src/contracts/`, and `generated-documents/context/`.
- [ ] `gateway.rs` persists `cntxt_sec_...` token in OS Keyring (`CNTXT / rest_gateway_token`) and writes `gateway_runtime.json` on start/stop.
- [ ] `ShellFrame.tsx` auto-starts the REST Gateway on boot when `enableExperimentalSettings && enableRestGateway` are enabled.
- [ ] `scripts/mcp/cntxt-mcp-server.mjs` implemented and registered in Antigravity's MCP configuration so Antigravity can call `cntxt_*` tools natively.
- [ ] All Vitest unit suites, Rust `cargo test` suites, and `npm run lint` pass with 0 errors.

---

## 8. RISK, FRICTION & SECURITY ASSESSMENT

* **Anticipated Friction:** Existing `kv_store.json` files on disk contain `"activeSidebarTab": "omni-terminal"` (as seen in your current `kv_store.json`). When `omni-terminal` is removed, `settingsStore.ts` must gracefully coerce `"omni-terminal"` back to `"explorer"` on load so the sidebar doesn't render blank!
* **Security & Sandboxing:** Loopback-only binding (`127.0.0.1`), DNS-rebinding `Host` header verification, constant-time `X-CNTXT-Token` comparison, and OS Keyring credential storage remain strictly enforced.
