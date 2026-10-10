# FEATURE GROUP DEFINITION — FG-16
> Date: 2026-10-10  
> Feature Group: FG-16 — Host Command Bus & Mini Panel App RPC Bridge  
> Target Platform & Stack: Desktop (Tauri v2 + React 19 + TypeScript + Zustand 5) & Web (Vercel + React 19 + TypeScript + Zustand 5)  
> Active Plan File: `generated-documents/plans/feature_group_FG16_host_command_bus_2026-10-10.md`  
> Authoritative References: `generated-documents/context/vision_multi_agent_terminal_bus_2026-10-10.md`, `generated-documents/context/living_context.md`, `contracts/data_shapes.ts`  

---

## 1. Executive Summary & Intent

In FG-13, FG-14, and FG-15, CNTXT established the sandboxed **Panel Mini-Apps Subsystem**: single-file HTML applications bundled inside `.cntxt` files, loaded in sandboxed iframes (`AppFrameHost`), backed by persistent disk state (` ```state ` blocks), and synchronized with CNTXT's 14-token theme engine.

However, currently mini-apps are restricted to isolated local state and storage shims. They cannot read or interact with the active document, query open tabs, create new editor tabs, read files in the active workspace, apply prompt templates, or notify the user.

**FG-16 (Host Command Bus & Mini Panel App RPC Bridge)** bridges this gap by transforming panel apps into active **co-processors**:
1. **Headless Command Bus Dispatcher**: Implements an asynchronous, domain-isolated RPC engine (`window.CNTXT` client SDK talking over typed `postMessage` to `AppPanelPlaceholder` / `AppFrameHost`).
2. **First-Class Domain Capabilities**:
   - **Editor Domain**: Inspect selection, insert or replace text in CodeMirror, and read active document metadata.
   - **Tab Domain**: Enumerate open tabs, create new editor tabs with prefilled content, and switch tab focus.
   - **Workspace Domain**: Securely query project file tree, read files, and write files within the active workspace root.
   - **Templates & Actions Domain**: Query the prompt engineering template catalog, expand variables, and execute sandboxed actions.
   - **Notification Domain**: Dispatch observable toasts to the user via `useNotificationStore`.
3. **Rigorous Security & Invariant Enforcement**:
   - **Strict Canonical Path Boundary**: Enforces canonicalization against the active workspace root. Rejects any `..` directory traversal, absolute escapes, and sensitive files (`.env`, `.ssh`, `.git`, system roots).
   - **Dirty Tab Overwrite Protection**: If a mini-app writes to a file that is currently dirty in an open editor tab, the update is mediated via `tabStore` to prevent clobbering unsaved in-flight user edits.
   - **Runtime Schema Validation**: All incoming RPC requests and payloads are validated through Zod boundary schemas before executing.
4. **Prompt Archetype Evolution**:
   - Updates `promptBuilder.ts` so LLMs generating apps under the `build` and `adapt` archetypes are aware of the `window.CNTXT` host SDK and generate collaborative tools (scratchpads that push to editor, task runners that create tabs, workspace explorers, etc.).

---

## 2. Feature Group Boundaries & Scope

### In Scope
1. **Canonical Contracts & Boundary Schemas**:
   - Define `ICntxtCommandBus`, `CntxtRpcRequest`, `CntxtRpcResponse`, `CntxtRpcError`, and domain payload shapes in `contracts/data_shapes.ts`.
   - Implement Zod runtime validators in `src/contracts/boundarySchemas.ts` for all RPC requests.
2. **Headless Host Command Bus Service (`src/features/commandBus/`)**:
   - `hostCommandBus.ts`: Pure service coordinating execution across `tabStore`, `actionStore`, `templateStore`, `notificationStore`, and `useRuntimeBridge()`.
   - Domain handlers:
     - `editor.getSelection`: Returns selected text from active editor.
     - `editor.insert`: Inserts/replaces/appends text at cursor or selection.
     - `editor.getActiveDocument`: Returns title, content, language, and file path.
     - `tabs.list`: Lists open tabs with dirtiness and path metadata.
     - `tabs.create`: Creates a new editor tab (e.g. `[Output] Analysis.md`).
     - `tabs.focus`: Switches active tab.
     - `workspace.getInfo`: Returns workspace root path and project title.
     - `workspace.listFiles`: Returns relative files with optional glob filter.
     - `workspace.readFile`: Reads workspace file content with path sandbox check.
     - `workspace.writeFile`: Writes workspace file with path sandbox check and dirty tab mediation.
     - `templates.list` & `templates.apply`: Template catalog access and variable substitution.
     - `actions.list` & `actions.execute`: Sandboxed action execution.
     - `notify`: Dispatches user toast (`info`, `success`, `warning`, `error`).
3. **In-Iframe Host SDK Injection (`src/features/panelApps/rpc/`)**:
   - Injected client SDK providing typed `window.CNTXT` methods returning Promises:
     ```javascript
     const text = await window.CNTXT.editor.getSelection();
     await window.CNTXT.editor.insert({ text: '# Generated Heading\n', mode: 'cursor' });
     await window.CNTXT.tabs.create({ title: 'Report.md', content: '...', language: 'markdown' });
     await window.CNTXT.notify({ type: 'success', title: 'Done', message: 'Analysis complete!' });
     ```
   - Request-response correlation via unique request IDs (`req_${nonce}_${timestamp}`) and timeout handling (5000ms default).
4. **Security & Sandbox Interlocks**:
   - Relative path canonicalization preventing directory traversal (`..`) outside workspace root.
   - Denylist for sensitive file patterns (`.env*`, `.git/*`, `id_rsa*`, `*secrets*`, `*credentials*`).
   - Dirty tab protection ensuring background writes do not silently discard unsaved user editor work.
   - Origin verification ensuring postMessage calls correlate with mounted app IDs.
5. **Prompt Archetype Updates (`src/features/panelApps/blueprint/promptBuilder.ts`)**:
   - Add a dedicated "Host SDK Capabilities (`window.CNTXT`)" section in system prompts.
   - Provide concrete examples of host integration for AI models scaffolding new panel apps.
6. **Testing & Dual-Repo Parity**:
   - Unit tests covering RPC dispatching, error handling, security rejections, and schema boundary parsing.
   - Mirroring of contracts to `cntxt-web` with 100% synchronization verification.

### Explicitly Excluded (Deferred to FG-17)
- Native PTY process spawning (`portable-pty`, `std::process`, `spawn_pty`, `write_pty`) — strictly reserved for FG-17.
- `.cntxt` multi-session terminal transcript recording (`type: terminal-bus`) — reserved for FG-17.
- Localhost TCP REST gateway for external CLI agent processes — reserved for FG-17.

---

## 3. Canonical Data Shapes & Contracts

### 3.1 Contract Definitions (`contracts/data_shapes.ts`)
```typescript
// RPC Wire Protocol Shapes
export interface CntxtRpcRequest<T = unknown> {
  id: string;
  domain: 'editor' | 'tabs' | 'workspace' | 'templates' | 'actions' | 'notify';
  action: string;
  appId: string;
  payload?: T;
}

export interface CntxtRpcResponse<T = unknown> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR' | 'EXECUTION_ERROR' | 'TIMEOUT' | 'PATH_TRAVERSAL';
    message: string;
  };
}

// Domain Payloads
export interface EditorInsertPayload {
  text: string;
  mode?: 'cursor' | 'replace' | 'append';
}

export interface EditorActiveDocumentResult {
  title: string;
  content: string;
  language: string;
  filePath?: string;
  isDirty: boolean;
}

export interface TabCreatePayload {
  title: string;
  content: string;
  language?: string;
  filePath?: string;
}

export interface TabSummaryResult {
  id: string;
  title: string;
  filePath?: string;
  isDirty: boolean;
  language: string;
}

export interface WorkspaceInfoResult {
  rootPath: string;
  projectName: string;
  fileCount: number;
}

export interface WorkspaceReadFilePayload {
  relativePath: string;
}

export interface WorkspaceWriteFilePayload {
  relativePath: string;
  content: string;
}

export interface TemplateApplyPayload {
  templateId: string;
  variables: Record<string, string>;
}

export interface ActionExecutePayload {
  actionId: string;
  input?: string;
}

export interface NotifyPayload {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}
```

### 3.2 Runtime Boundary Validation (`src/contracts/boundarySchemas.ts`)
Each incoming payload is validated using Zod:
- `EditorInsertSchema = z.object({ text: z.string(), mode: z.enum(['cursor', 'replace', 'append']).optional() })`
- `TabCreateSchema = z.object({ title: z.string().min(1).max(100), content: z.string(), language: z.string().optional() })`
- `WorkspaceReadSchema = z.object({ relativePath: z.string().min(1).refine(p => !p.includes('..'), 'Path traversal rejected') })`
- `WorkspaceWriteSchema = z.object({ relativePath: z.string().min(1).refine(p => !p.includes('..'), 'Path traversal rejected'), content: z.string().max(2 * 1024 * 1024) })`
- `NotifySchema = z.object({ type: z.enum(['info', 'success', 'warning', 'error']), message: z.string().min(1).max(500), title: z.string().optional() })`

---

## 4. Architecture & Decoupled Domain Handlers

```
┌────────────────────────────────────────────────────────┐
│               SANDBOXED IFRAME RUNTIME                 │
│                                                        │
│  window.CNTXT.editor.insert({ text: '...' })           │
│  window.CNTXT.workspace.readFile({ relativePath: '...' })
│                                                        │
│  └── window.parent.postMessage({                       │
│        type: 'CNTXT_RPC_REQUEST',                      │
│        request: { id, domain, action, payload }        │
│      }, '*')                                           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            AppPanelPlaceholder (Host Boundary)         │
│                                                        │
│  - Origin & appId validation                           │
│  - Schema validation via boundarySchemas.ts            │
│  - Dispatch to HostCommandBus                          │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 HOST COMMAND BUS SERVICE               │
│                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │      Editor Domain      │  │     Tabs Domain     │  │
│  │   (Active CodeMirror    │  │   (useTabStore      │  │
│  │    View & tab buffer)   │  │    mutations)       │  │
│  └─────────────────────────┘  └─────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────┐  │
│  │    Workspace Domain     │  │ Templates & Actions │  │
│  │  (IRuntimeBridge.fs +   │  │ (useTemplateStore,  │  │
│  │   security sandbox)     │  │  actionExecutor)    │  │
│  └─────────────────────────┘  └─────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Notification                     │  │
│  │             (useNotificationStore)               │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 5. Security Invariants & Attack Surface Protections

1. **Path Traversal & Sandboxing (Pillar 8)**:
   - All `workspace.readFile` and `workspace.writeFile` operations are resolved relative to the active workspace root.
   - Any path resolving outside root, or containing `..`, or accessing `.env`, `.git`, `.ssh`, `node_modules`, or Windows system directories (`C:\Windows`, `C:\Program Files`) is blocked with `PATH_TRAVERSAL` error.
2. **Dirty Tab Write Mediation (Pillar 9)**:
   - When writing a file through `workspace.writeFile`, the host inspects `useTabStore.getState().tabs`.
   - If the file is open and marked dirty (`isDirty === true`):
     - The write updates the editor tab buffer directly (or prompts with a non-blocking toast) rather than overwriting the disk file behind the user's back.
3. **Payload Size Hardening**:
   - `workspace.writeFile` enforces a 2 MB hard cap per write to prevent denial-of-service / memory exhaustion.
   - Input strings are validated and bounded by Zod schemas.
4. **RPC Timeout & Cleanup**:
   - Iframe client SDK promises time out after 5000ms with a clear rejection if the host does not respond.
   - Inactive or unmounted app iframes cannot receive or intercept responses meant for other apps.

---

## 6. Mock Registry Impact (Physical Clearing)

- **Active Mocks Impacted**: None. All existing mocks (`MOCK-001` through `MOCK-007`) are already physically quarantined in `mocks/index.ts` and disconnected from production stores.
- **New Mocks**: ZERO mock data or synthetic stubs will be introduced. All RPC handlers bind directly to real Zustand stores (`tabStore`, `notificationStore`, `templateStore`, `actionStore`) and the real `IRuntimeBridge` filesystem adapter.

---

## 7. Background Processes & User-Facing Toggles

- **Does FG-16 introduce background processes?**: No. All RPC commands are reactive and event-driven, initiated on-demand by the panel app iframe in response to user interaction or state change.
- **Future Hook**: Any optional background watchers or terminal PTY pollers belong strictly to FG-17 and will be gated behind Settings &rarr; Experimental.

---

## 8. Acceptance Criteria & Verification Gates

- [ ] Canonical contracts (`ICntxtCommandBus`, `CntxtRpcRequest`, `CntxtRpcResponse`, domain payloads) defined in `contracts/data_shapes.ts` and mirrored byte-identical in `context/contracts/data_shapes.ts`.
- [ ] Zod boundary schemas for all RPC actions implemented in `src/contracts/boundarySchemas.ts`.
- [ ] Headless `hostCommandBus.ts` service implemented with full handler coverage for `editor`, `tabs`, `workspace`, `templates`, `actions`, and `notify`.
- [ ] Client SDK polyfill injected into sandboxed iframes via `AppPanelPlaceholder.tsx`, exposing asynchronous `window.CNTXT` domain methods.
- [ ] Security validator rigorously blocks path traversal (`..`), sensitive files (`.env`), and writes to dirty open tabs.
- [ ] `promptBuilder.ts` updated with `window.CNTXT` host SDK documentation and sample patterns for LLM app generation.
- [ ] Unit test suite (`tests/hostCommandBus.test.ts`) written and 100% passing (Vitest).
- [ ] Zero platform leaks outside authorized adapters (`node scripts/check-platform-leaks.mjs` clean).
- [ ] TypeScript strict mode (`tsc --noEmit`) passes with 0 errors across both `CNTXT` and `cntxt-web`.
- [ ] `living_context.md` updated and committed.

---

## 9. Phased Implementation Sequence

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Canonical Contracts & Zod Boundary Schemas    │
│ (contracts/data_shapes.ts & boundarySchemas.ts)        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Headless Host Command Bus Engine              │
│ (src/features/panelApps/rpc/hostCommandBus.ts)         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Client SDK Injection & PostMessage Router     │
│ (src/features/panelApps/rpc/clientSdk.ts &             │
│  AppPanelPlaceholder.tsx integration)                  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Blueprint Archetypes System Prompt Update     │
│ (src/features/panelApps/blueprint/promptBuilder.ts)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 5: Vitest Test Suite & Security Verification     │
│ (tests/hostCommandBus.test.ts)                         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ Phase 6: Dual-Repo Synchronization & Final Gates       │
│ (Mirror to cntxt-web, lint, leak scan, contract sync)  │
└────────────────────────────────────────────────────────┘
```

---

## 10. Risk Assessment & Mitigations

| Risk | Impact | Mitigation Strategy |
|:---|:---|:---|
| **Path Traversal Attack**: Malicious or buggy panel app requests `workspace.readFile({ relativePath: '../../../../Windows/System32/drivers/etc/hosts' })` | High | Strict path canonicalization using path normalization; unconditionally reject any path resolving outside workspace root or containing `..`. |
| **Dirty Editor Tab Clobbering**: Panel app writes to a file open in CodeMirror while the user is actively typing | High | Host checks open tabs in `tabStore`. If target file has an active tab with `isDirty`, update the tab document buffer directly or notify the user rather than silently overwriting disk. |
| **Iframe postMessage Flooding**: Rogue app sends unbounded burst of RPC messages | Medium | Implement rate-limiting throttle on incoming messages per appId and reject payloads exceeding 2 MB. |
| **Cross-Iframe Message Leaks**: Inactive or unmounted app receives responses meant for another app | Medium | Every RPC request is tagged with `appId` and `reqId`. Host validates source window against mounted iframe element ref before replying. |
