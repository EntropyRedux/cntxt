# ARCHITECTURAL VISION: MULTI-AGENT TERMINAL BUS & APP INTEGRATION
Version: v1.0
Date: 2026-10-10
Author: CNTXT Architecture Working Group
Target Platforms: Desktop (Tauri v2 + Rust std::process/PTY), Web (Simulated Stream / WebSocket Relay)

---

## 1. Executive Summary & Vision Statement

CNTXT is evolving from an intelligent, tri-platform technical drafting and markdown editor into an **Agent Operating Canvas**.

Rather than treating terminal processes as ephemeral, throwaway subshells that vanish once closed, CNTXT establishes a unified paradigm where:
1. **The Terminal is a Document (`.cntxt` Terminal Bus)**: Terminal shell sessions (stdout, stderr, ANSI logs, tool invocations, and interactive PTY inputs) stream into and persist within a `.cntxt` structured document.
2. **Multi-CLI Agent Orchestration**: A single `.cntxt` document acts as a multiplexed session bus hosting multiple concurrent CLI processes (e.g. Agent 1: Code Generator, Agent 2: Linter/Test Runner, Agent 3: Build Watcher).
3. **Mini Panel Apps as Co-Processors**: Mini apps running in the side panel are not isolated toy widgets; they communicate directly with CNTXT host stores (`editor`, `workspace`, `tabs`, `templates`, and `terminal`) via an asynchronous RPC Command Bus, functioning as real-time dashboards, auto-steering interfaces, and prompt injection controllers.

---

## 2. High-Level Architecture Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLI AGENT POOL                                      │
│   ┌────────────────────┐    ┌────────────────────┐    ┌────────────────────────────┐   │
│   │ CLI Agent 1 (Code) │    │ CLI Agent 2 (Test) │    │ CLI Agent 3 (Review/Watch) │   │
│   └─────────┬──────────┘    └─────────┬──────────┘    └─────────────┬──────────────┘   │
└─────────────┼─────────────────────────┼─────────────────────────────┼──────────────────┘
              │ Stream stdout/stderr    │ Stream stdout/stderr        │ Stream stdout/stderr
              ▼                         ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           CNTXT RUST PTY & PROCESS ENGINE                              │
│                      (portable-pty / tokio::process in src-tauri)                      │
│                                                                                        │
│   - Multiplexed channel allocation (`channel_id`: string)                              │
│   - Two-way stdio / stdin pipe routing                                                 │
│   - Rate-limited chunk streaming to frontend via Tauri IPC events                      │
└───────────────────────────────────────┬────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        THE .cntxt MULTI-SESSION TERMINAL BUS                           │
│                      `workspace/agent_orchestration.cntxt`                             │
│                                                                                        │
│   --- (YAML Manifest)                                                                  │
│   title: Multi-Agent Dev Session                                                       │
│   type: terminal-bus                                                                   │
│   channels:                                                                            │
│     - id: agent-coder, name: "Code Generator", cwd: "./src"                            │
│     - id: agent-tester, name: "Vitest Runner", cwd: "."                                │
│   ---                                                                                  │
│   ```state (Serialized Transcript & Session History)                                   │
│   [ { "channel": "agent-coder", "ts": 1728560100, "type": "stdout", "text": "..." } ] │
│   ```                                                                                  │
└───────────────────┬────────────────────────────────────────────────┬───────────────────┘
                    │                                                │
                    ▼                                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│        EDITOR TAB PRESENTER          │  │          SIDE PANEL MINI APPS                │
│       (`*TerminalView.tsx`)          │  │        (`AppFrameHost` / sandboxed)          │
│                                      │  │                                              │
│ - Interactive PTY terminal emulator  │  │ - Multi-Agent Health & Progress Cards        │
│ - ANSI color rendering               │  │ - Context Injector (Active tab -> stdin)     │
│ - Channel switcher (tabs / split)    │  │ - Auto-steering / Pause / Retry buttons      │
│ - Keyboard-first interactive stdin   │  │ - Communication via `window.CNTXT` Host SDK  │
└──────────────────────────────────────┘  └──────────────────────────────────────────────┘
```

---

## 3. The `.cntxt` Multi-Session Terminal Bus Specification

### 3.1 Document Anatomy
A terminal session `.cntxt` file follows the strict multi-part dynamic fence architecture of CNTXT:

1. **YAML Frontmatter (Session Metadata)**:
   ```yaml
   ---
   name: Fullstack Agent Orchestrator
   type: terminal-bus
   version: 1.0.0
   channels:
     - id: coder
       name: Claude Code Agent
       command: agy coder --autonomy
     - id: tester
       name: Background Vitest
       command: npm test -- --watch
     - id: security
       name: Security Auditor
       command: cargo test --package cntxt-security
   ---
   ```

2. **Embedded HTML / Presenter Shell (````html ... ````)**:
   Optional embedded terminal presenter for standalone inspection in standard browsers.

3. **Session Transcript & State Block (````state ... ````)**:
   JSON-serialized chronological log buffer with chunk compression:
   ```json
   {
     "version": 1,
     "activeChannel": "coder",
     "transcripts": {
       "coder": [
         { "t": 1728560001, "stream": "stdout", "data": "Spawning workspace analyzer...\r\n" }
       ],
       "tester": [
         { "t": 1728560005, "stream": "stdout", "data": "✓ 449 tests passing\r\n" }
       ]
     }
   }
   ```

### 3.2 Key Architectural Benefits
- **Persistent Reasoning & Execution Trace**: Unlike standard terminal emulators whose output vanishes upon tab close, the entire interaction is preserved on disk.
- **Git Trackability**: Teams can commit orchestration transcripts directly into repositories for auditing, bug reproduction, or retrospective documentation.
- **Offline / Resume Capability**: Re-opening an `.cntxt` file immediately rehydrates the terminal history, allowing subsequent agents to inspect past failures and continue execution.

---

## 4. The Unified CNTXT Host Command Bus (`window.CNTXT`)

To support both **Mini Panel Apps** today and **Terminal CLI Agents** tomorrow, CNTXT implements a headless, domain-isolated **Command Bus**:

```typescript
// Proposed Host Bridge RPC Interface
export interface ICntxtCommandBus {
  // 1. Editor Domain
  'editor.getSelection'(): Promise<string>;
  'editor.insert'(payload: { text: string; mode?: 'cursor' | 'replace' | 'append' }): Promise<void>;
  'editor.getActiveDocument'(): Promise<{ title: string; content: string; language: string; filePath?: string }>;

  // 2. Tab Domain
  'tabs.list'(): Promise<Array<{ id: string; title: string; filePath?: string; isDirty: boolean }>>;
  'tabs.create'(payload: { title: string; content: string; language: string; filePath?: string }): Promise<string>;
  'tabs.focus'(payload: { tabId: string }): Promise<void>;

  // 3. Workspace Domain (Sandboxed File Access)
  'workspace.getInfo'(): Promise<{ rootPath: string; projectName: string }>;
  'workspace.listFiles'(payload?: { pattern?: string }): Promise<string[]>;
  'workspace.readFile'(payload: { relativePath: string }): Promise<string>;
  'workspace.writeFile'(payload: { relativePath: string; content: string }): Promise<void>;

  // 4. CNTXT Domain Assets
  'templates.list'(): Promise<Array<{ id: string; name: string; category: string; content: string }>>;
  'templates.apply'(payload: { templateId: string; variables: Record<string, string> }): Promise<void>;
  'actions.list'(): Promise<Array<{ id: string; name: string; description: string }>>;
  'actions.execute'(payload: { actionId: string; input?: string }): Promise<{ result: string }>;

  // 5. Terminal & Orchestration Domain
  'terminal.listChannels'(): Promise<Array<{ id: string; name: string; status: 'running' | 'idle' | 'stopped' }>>;
  'terminal.spawn'(payload: { id: string; name: string; command: string; args?: string[]; cwd?: string }): Promise<void>;
  'terminal.sendInput'(payload: { channelId: string; data: string }): Promise<void>;
  'terminal.kill'(payload: { channelId: string }): Promise<void>;

  // 6. User Feedback
  'notify'(payload: { title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }): Promise<void>;
}
```

### 4.1 Multi-Channel Access Channels
1. **In-Iframe Mini Apps (postMessage)**: Sandboxed panel apps call `window.CNTXT.call(domainAction, payload)` which routes through `window.parent.postMessage`. Zero network overhead, zero open ports, 100% web & desktop parity.
2. **Terminal Agents / External Scripts (Local REST Gateway - Desktop Future)**: An optional lightweight localhost HTTP listener in Rust (`127.0.0.1:port`) authenticating with an ephemeral session token (`X-CNTXT-Token`) maps incoming REST requests directly to the exact same Command Bus actions.

---

## 5. Security Invariants & Edge Case Protections

1. **Path Traversal & Canonical Boundary**:
   - `workspace.readFile` and `workspace.writeFile` strictly canonicalize all paths against the active workspace root. Any path containing `..` escaping the root or pointing to system directories (`Windows/System32`, `Program Files`, `.ssh`, `.env`) is immediately rejected with a typed boundary exception.
2. **Dirty Tab Write Protection**:
   - If an agent or mini app writes to a file currently open and dirty in an editor tab, the write is mediated through `tabStore`. The tab buffer updates with an explicit visual banner rather than performing an un-notified silent disk overwrite.
3. **Execution Quotas & Throttling**:
   - Spawning terminal processes is locked behind an explicit confirmation dialog or manifest permission declaration (`permissions: ['terminal:spawn']`).
   - Rate-limiting prevents rogue scripts from spamming file writes or spawning infinite fork bombs.
4. **Strict Tri-Platform Parity Guard**:
   - All presentation logic remains 100% pure React/TypeScript. Direct native OS calls (`std::process`, `portable-pty`) live strictly inside `src-tauri` behind the `IRuntimeBridge` contract. On `cntxt-web`, terminal sessions gracefully operate via simulated agent replay or WebSocket backend relays.

---

## 6. Phased Implementation Roadmap

- **Phase 1: Mini App Host SDK & Command Bus (FG-16)**:
  - Implement typed `postMessage` RPC router in `AppPanelPlaceholder.tsx`.
  - Expose `window.CNTXT.editor`, `window.CNTXT.tabs`, `window.CNTXT.workspace`, and `window.CNTXT.templates`.
  - Update `promptBuilder.ts` archetypes so generated apps understand host capabilities.
- **Phase 2: Rust Terminal PTY Engine (Desktop Native)**:
  - Add native pseudo-terminal lifecycle commands (`spawn_pty`, `write_pty`, `resize_pty`, `kill_pty`) in `src-tauri`.
  - Stream chunks to the frontend via dedicated Tauri events with flow control.
- **Phase 3: The `.cntxt` Terminal Bus Presenter & Multi-Session Tab**:
  - Build terminal tab presenter in CodeMirror / xterm.
  - Implement multi-channel stream multiplexer writing into `.cntxt` file format.
- **Phase 4: Multi-Agent Orchestration Panel Apps**:
  - Build specialized side panel apps for agent progress tracking, prompt injection, and multi-channel steering.
