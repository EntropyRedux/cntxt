# FEATURE GROUP DEFINITION: FG-20 Host Command Bus & Localhost REST Gateway Hardening
* **Date:** 2026-10-19
* **Status:** Planned (Adjusted by Prod Agent post-Plan Audit)
* **Target Platform & Stack:** Desktop (Windows, macOS, Linux via Tauri v2 + Rust) + Web / Mobile RPC
* **Document Path:** generated-documents/plans/feature_group_FG20_host_rpc_rest_gateway_2026-10-19.md
* **Authoritative Reference:** generated-documents/context/vision_multi_agent_terminal_bus_2026-10-10.md
* **Audit Reconciliation:** Reconciled against FIND-PLAN-20-01, FIND-PLAN-20-02, FIND-PLAN-20-03, FIND-PLAN-20-04

---

#### 1. SCOPE & BOUNDARIES
**Features Included:**
* **Advanced CodeMirror Editor Manipulation RPCs**:
  - `editor.setSelections`: Set multi-cursor primary and secondary selection ranges (`anchor`, `head`).
  - `editor.getSelections`: Query all active cursor locations and selected text spans.
  - `editor.foldRange` & `editor.unfoldRange`: Programmatic line and block folding/unfolding via `@codemirror/language`.
  - `editor.foldAll` & `editor.unfoldAll`: Bulk folding of all markdown headings or code fences.
  - `editor.setDiagnostics` & `editor.clearDiagnostics`: Inject inline diagnostic markers, lint annotations, and badges into the active editor via `@codemirror/lint`.
  - `editor.replaceRange`: Replace text within an explicit `[from, to]` character or line range without displacing other document state.
* **Localhost REST Gateway in Tauri (`src-tauri`)**:
  - Lightweight embedded async HTTP server in Rust (Tokio TCP listener / Axum or tiny_http) bound strictly to `127.0.0.1` (default port 9876, fallback to ephemeral port).
  - Translates incoming HTTP JSON requests into `HostCommandBus` execution calls via correlated Tauri IPC bridge.
  - **Hardened Endpoint Surface (FIND-PLAN-20-01)**:
    - `GET /api/v1/health`: **Minimal public liveness check ONLY** (`{ "status": "ok", "version": "0.5.15" }`). Zero private filesystem paths, workspace locations, or active document metadata exposed to unauthenticated callers.
    - `GET /api/v1/workspace`: **Authenticated metadata endpoint** (requires `X-CNTXT-Token`). Returns active workspace directory path, open tab list, active document title, and dirty status.
    - `POST /api/v1/rpc`: Universal JSON-RPC gateway executing any valid `CntxtRpcRequest` across `editor`, `tabs`, `workspace`, `templates`, `actions`, and `terminal` domains (requires `X-CNTXT-Token`).
    - `POST /api/v1/editor/insert`: Rapid ergonomic helper for CLI agents (`agy`, `cline`, `opencode`) to inject prompt artifacts or code directly into the active tab (requires `X-CNTXT-Token`).
    - `POST /api/v1/tabs/open`: Opens a file path or creates an untitled tab with supplied content (requires `X-CNTXT-Token`).
* **Request-Response Correlation Architecture (FIND-PLAN-20-02)**:
  - To prevent hung HTTP connections over asynchronous Tauri window events:
    1. The Rust HTTP handler generates a unique UUIDv4 `correlationId`.
    2. Rust inserts a Tokio `oneshot::Sender<CntxtRpcResponse>` into an in-memory `Arc<RwLock<HashMap<String, oneshot::Sender<CntxtRpcResponse>>>>`.
    3. Rust emits `cntxt://rpc-request` with payload `{ correlationId, request }` to the webview window.
    4. Frontend `HostCommandBus` executes the command and invokes Tauri command `invoke('rpc_response', { correlationId, response })`.
    5. The Rust handler retrieves and triggers the corresponding `oneshot::Sender`, resolving the HTTP response.
    6. A strict 15-second timeout guards the receiver; if frontend does not respond within 15 seconds, returns HTTP 504 Gateway Timeout.
* **Token Authentication & Boundary Security (`X-CNTXT-Token`)**:
  - Mandatory HTTP header `X-CNTXT-Token` on every non-health request.
  - Cryptographically secure 256-bit token generated on first run and stored securely in local app storage / OS Keyring.
  - Constant-time verification in Rust (`subtle::ConstantTimeEq`) to prevent timing attacks.
  - Strict loopback enforcement: binds only to `127.0.0.1` / `::1`, immediately rejecting non-loopback network interfaces.
* **Settings UI & Token Management**:
  - Experimental Settings card: Localhost REST API Gateway with live server status badge (Running / Stopped / Port).
  - Masked token field with Copy Token and Regenerate Token buttons.
  - Configurable port input with automatic collision fallback.

**Features Explicitly Excluded (Non-Goals for this Group):**
* **Public Internet Expose / Cloud Webhook Tunneling**: The REST gateway binds strictly to 127.0.0.1 for local pair-programming CLI agents. Excludes public tunneling services.
* **Arbitrary Shell Process Execution via REST**: Commands dispatched to terminal domain are routed through the existing PTY engine with canonical token verification; arbitrary unmonitored OS process spawning via HTTP is strictly forbidden.
* **Web Browser SaaS Direct REST Hosting**: The HTTP server runs natively on Desktop (Tauri). Web SaaS builds gracefully report REST gateway as unsupported while preserving internal `window.CNTXT` iframe RPC.

---

#### 2. CANONICAL DATA SHAPES & DEPENDENCY MAPPING
**Target Data Shapes to Add to `contracts/data_shapes.ts` (FIND-PLAN-20-03):**
* `EditorSelectionRange`:
  ```typescript
  export interface EditorSelectionRange {
    anchor: number;
    head: number;
  }
  ```
* `EditorSetSelectionsPayload`:
  ```typescript
  export interface EditorSetSelectionsPayload {
    selections: EditorSelectionRange[];
    mainIndex?: number;
  }
  ```
* `EditorFoldPayload`:
  ```typescript
  export interface EditorFoldPayload {
    line?: number;
    all?: boolean;
    unfold?: boolean;
  }
  ```
* `EditorDiagnosticPayload`:
  ```typescript
  export interface EditorDiagnosticItem {
    from: number;
    to: number;
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    source?: string;
  }
  export interface EditorSetDiagnosticsPayload {
    diagnostics: EditorDiagnosticItem[];
  }
  ```
* `RestGatewayConfig`:
  ```typescript
  export interface RestGatewayConfig {
    enabled: boolean;
    port: number;
    authToken: string;
  }
  ```

**Prerequisites (Upstream dependencies):**
* `contracts/data_shapes.ts`: Extended RPC contracts.
* `contracts/boundarySchemas.ts`: Zod validation schemas for all new editor RPC actions.
* `src/features/panelApps/rpc/hostCommandBus.ts`: Central execution dispatcher.
* `src/services/editor/editorRegistry.ts`: CodeMirror `EditorView` references and extensions.

**Downstream Dependencies (What breaks if this group is incomplete):**
* Panel apps invoking `window.CNTXT.editor.*` with advanced actions.
* External CLI automation scripts expecting REST endpoints on port 9876.

---

#### 3. MOCK REGISTRY IMPACT (PHYSICAL CLEARING PLAN)
| Mock ID | Physical File (`mocks/`) | Real Native Target | Clearing Action |
| :--- | :--- | :--- | :--- |
| MOCK-RPC-01 | None (Zero mocks in active codebase) | `src-tauri/src/commands/gateway.rs` | Fully native Rust HTTP listener. |

**Remaining Quarantined Mocks (Surviving this session):**
* Zero mocks survive. Production remains at 0 mocks.

---

#### 4. BACKGROUND PROCESSES & EXPERIMENTAL SETTINGS GATING
| Process Name | Purpose & Interval | Settings Toggle Path | Default State |
| :--- | :--- | :--- | :--- |
| `LocalRestGatewayServer` | Background Rust TCP/HTTP listener handling incoming CLI agent RPC requests | Settings -> Experimental -> `enableRestGateway` | OFF (Must be explicitly enabled by user) |

---

#### 5. UI/UX, DESIGN SYSTEM & SURFACE PRIMITIVES
* **Surface Primitives:**
  - Experimental Settings Card: Dedicated panel with status indicator (Green pulse for Listening, Gray for Inactive).
  - Token Mask / Copy Widget: Cyberpunk input with reveal/hide eye icon and 1-click clipboard copy.
  - Editor Diagnostic Highlights: Sleek inline markers styled to theme tokens (Red for error, Amber for warning, Cyan for info).
* **Theme Tokens:** Derived strictly from `src/theme/index.js` (`#141417`, `#00f0ff`, `#ef4444`, `#f59e0b`).
* **Presenter Purity:** UI views (`RestGatewaySettingsCard.tsx`) are 100% pure UI driven strictly by typed props. Configuration mutations flow through Zustand stores.

---

#### 6. VALIDATION, ERROR HANDLING & USER NOTIFICATIONS
* **Input Validation:**
  - Zod schemas for all incoming HTTP payloads before internal routing.
  - Constant-time verification of `X-CNTXT-Token`.
  - HTTP 400 Bad Request on schema violation, 401 Unauthorized on missing/invalid token, 403 Forbidden on path traversal attempts outside workspace root.
* **Notification Strategy:**
  - Dispatches visible notifications on server start/stop (`REST Gateway listening on 127.0.0.1:9876`).
  - Diagnostic markers visibly decorate CodeMirror without interrupting editor typing.
* **Zero Silent Failures:**
  - Comprehensive HTTP error response bodies with standard JSON format (`{ success: false, error: { code, message } }`).
* **Visual Error Boundaries (FIND-PLAN-20-04):**
  - Wrap `RestGatewaySettingsCard.tsx` in a React `<ErrorBoundary>` so that rendering or clipboard token copy issues are quarantined within the settings tab.
* **Crash Resilience:**
  - Rust HTTP listener runs in an isolated Tokio task; panics or dropped client connections cannot crash the Tauri main event loop.

---

#### 7. ACCEPTANCE CRITERIA
- [ ] `contracts/data_shapes.ts` and `contracts/boundarySchemas.ts` updated with advanced editor actions and REST gateway shapes
- [ ] `editorRegistry.ts` and `hostCommandBus.ts` support multi-selection, folding, diagnostics, and range operations
- [ ] Rust HTTP REST gateway implemented in `src-tauri` with `127.0.0.1` binding, `X-CNTXT-Token` validation, and correlation-id request-response bridge
- [ ] `GET /api/v1/health` verified minimal liveness only; workspace metadata verified authenticated under `GET /api/v1/workspace`
- [ ] Settings panel includes user toggle, port configuration, and token management with Error Boundary protection
- [ ] Automated unit tests in `tests/hostCommandBus.test.ts` verifying all new RPC actions
- [ ] Automated Rust integration tests verifying HTTP endpoints, auth enforcement, and timeout resilience
- [ ] Pass 1 Independent Blind Audit completed and reconciled
- [ ] Zero lint errors, 100% test passing

---

#### 8. RISK, FRICTION & SECURITY ASSESSMENT
* **Anticipated Friction:** Port conflict if another developer service is using port 9876.
  - Mitigation: Automatic port availability check; if 9876 is occupied, attempts next 5 ports or falls back to an ephemeral OS-assigned port and broadcasts the active port to frontend settings.
* **Security & Sandboxing:**
  - Strict loopback binding (`127.0.0.1`) prevents LAN exposure.
  - Enforced `X-CNTXT-Token` header prevents unauthorized web browser scripts from making cross-origin requests to local gateway (CORS blocks `*` credentials).
  - Path whitelisting: `workspace.readFile` and `workspace.writeFile` strictly confined to `activeWorkspacePath`.
