# FEATURE GROUP DEFINITION & IMPLEMENTATION PLAN: FG-18 OMNI TERMINAL (FILE-DRIVEN REDESIGN)
**Subsystem:** File-Driven Multi-Agent Chat Canvas, Script Templates, Color-Coded Terminal Roster & Contextual Attention Engine  
**Version:** v2.0 (File-Driven Bus Architecture)  
**Date:** 2026-10-12  
**Author:** Pass 1 Independent Auditor / Review Agent  
**Target Platform(s):** Desktop (Tauri v2 + Rust portable-pty / Windows Terminal) + Web / Mobile  
**Status:** [x] Strategic Planning & Architectural Specification  

---

## 1. Executive Vision & The File-Driven Paradigm Shift

### Why Scraping Terminal Screen Buffers Failed
Real-time CLI agents (such as `agy`, `cline`, `opencode`, and `kilo`) utilize curses/VT100 terminal interfaces with full-screen cursor repositioning (`\x1b[1;42H`, `\x1b[2J`), in-place redraw loops, progress spinners, and raw character echoes. Attempting to scrape and reconstruct clean conversational chat turns from raw, high-frequency terminal stdout chunks proved fragile, producing garbled ASCII artifacts and ambiguous turn boundaries.

### The File-Driven Architecture Solution
We decouple **terminal execution** from **chat presentation**:
1. **Background / Native Terminal Execution**: Terminals and agents execute with their working directory set to CNTXT's **Active Workspace Folder** (from File Explorer). Stdin can be targeted via direct programmatic injection.
2. **File-Driven Dual `.cntxt` Document Bus**:
   - `[session]_output.cntxt`: Clean, structured markdown deliverables and user prompts. CNTXT actively watches and tails this document, instantiating new chat bubbles whenever fresh markdown blocks are appended.
   - `[session]_raw.cntxt`: Flight recorder capturing full stdout, stderr, `<thought>` reasoning trajectories, and command logs.
   - **Path Rule**: The session documents live in the user-selected `targetFolder`, while terminal shells execute in the CNTXT `workspacePath`.
3. **Scripts as CNTXT Templates**: Scripts are primitive CNTXT **Templates** categorized as `'SCRIPTS'`. Users can launch pre-configured CLI agents (`agy`, `cline`, `opencode`, `kilo`) or custom shell pipelines with 1 click.
4. **Color-Coded Terminal Roster**: Each running terminal is tracked with an assigned accent color badge, live status indicator, and quick actions (`[ 📺 Show in Terminal ]` and `[ 🪟 External Window ]`).
5. **Rich Markdown Chat Interface**: Chat bubbles support GitHub-flavored markdown (headers, bold, italics, tables, syntax-highlighted code blocks, Mermaid diagrams), equipped with **`[ 📋 Copy ]`** and **`[ 📝 Open in Editor ]`** buttons.
6. **Smart Text Injector & Contextual Attention Center**:
   - Text input injects commands directly to `@handle` or broadcasts to all active agents (excluding plain shells by default).
   - Dynamic Attention Controls render contextual action pills (`[ Allow ]`, `[ Allow Always ]`, `[ Reject / Deny ]`) styled with the requesting agent's accent color.
   - Micro keypad (`↑`, `↓`, `↵ Enter`, `␣ Space`, `Y`, `N`, `^C`) and autocomplete for `@` handles and `/` commands.

---

## 2. Deep Architectural Discussion & Option Comparison

### 2.1 Hidden Background PTY vs. Native External Windows

| Architectural Vector | Option A: Native External Windows (`wt.exe` / `powershell.exe`) | Option B: Hidden Background PTY (`portable-pty`) | Option C: Hybrid Architecture (RECOMMENDED) |
|:---|:---|:---|:---|
| **Terminal UX & Rendering** | 🟢 **100% Native**: Full Windows Terminal speed, 24-bit color, native scrollback, zero webview lag. | 🟡 Rendered via in-app `TerminalView` (XTerm). Good, but subject to webview frame budgets. | 🟢 **Best of Both**: Headless PTY by default, with 1-click in-app terminal tab OR external window launch. |
| **Input Injection Reliability** | 🔴 **Difficult**: Detached Windows processes isolate stdin; injecting text from Tauri requires win32 API hooks. | 🟢 **Direct & Immediate**: Tauri Rust bridge writes directly to PTY stdin via `portable_pty::MasterPty::write`. | 🟢 **Seamless**: Headless PTY enables programmatic text injection, keypad buttons, and attention pills. |
| **Output Capture & Logging** | 🟡 Requires agent scripts to redirect output or explicitly write to `.cntxt` files. | 🟢 **Automatic**: Tauri bridge receives every stdout/stderr chunk and writes directly to `_raw.cntxt`. | 🟢 **Guaranteed**: Background PTY logs raw stream, while file tailer renders clean output. |
| **Window Clutter** | 🔴 Multiple desktop windows floating across the screen. | 🟢 Integrated inside CNTXT sidebar or floating overlay. | 🟢 Clean single-window workspace, with option to pop out if desired. |

> **Conclusion**:  
> **Option C (Hybrid Architecture)** is the winning approach:
> - By default, agents launch as **Headless PTYs** inside CNTXT. This guarantees that the chat input bar, `@handle` routing, arrow keys, and dynamic Attention Pills (`[ Allow ]` / `[ Deny ]`) can inject text directly into stdin.
> - Clicking **`[ 📺 Show in Terminal ]`** opens an embedded `TerminalView` tab in CNTXT connected directly to that PTY channel.
> - An optional **`[ 🪟 Launch in External Terminal ]`** button launches a native Windows Terminal (`wt.exe`) for power users who want a detached window.

---

### 2.2 Salvage Analysis: Reused vs. Refactored Components

| Existing Component | Status | Role in New File-Driven Architecture |
|:---|:---|:---|
| `omniDocumentSync.ts` | **Salvage & Expand** | Reuses ANSI stripping, quote-preserving `parseCommandLine`, YAML frontmatter builder. Adds `parseOutputDocumentTurns` for file-watcher tailing. |
| `omniPromptDetector.ts` | **Salvage & Reuse** | Detects interactive prompts (`[y/N]`, select options, numbered lists) to trigger dynamic attention pills in the input bar. |
| `src-tauri/src/commands/pty.rs` | **Salvage & Reuse** | Rust backend `spawn_pty`, `write_pty`, `kill_pty`, and `spawn_external_terminal` already verified and passing security gates. |
| `omniTerminalStore.ts` | **Refactor** | Replace real-time ANSI chunk debouncing with **File-Watcher Synchronization** on `_output.cntxt`. Support separate `workspacePath` (CWD) and `targetFolder` (doc storage). |
| `ChatMessageBubble.tsx` | **Refactor & Upgrade** | Replace monospace block with **Rich Markdown Renderer** (headers, bold, tables, code blocks, Mermaid diagrams). Add **`[ 📋 Copy ]`** and **`[ 📝 Open in Editor ]`** buttons. |
| `ChatInputBar.tsx` | **Refactor & Upgrade** | Add Dynamic Attention Pills (`[ Allow ]`, `[ Allow Always ]`, `[ Reject / Deny ]`) colored with the requesting agent's accent color. Add `@` autocomplete. |
| `AgentRosterBar.tsx` | **Refactor & Upgrade** | Display color-coded active terminals list with live status badges, `[ 📺 Show in Terminal ]` tab openers, and script launch shortcuts. |
| `templateStore.ts` & presets | **Enhance** | Seed 4 pre-configured script templates under category `'SCRIPTS'` (`agy`, `cline`, `opencode`, `kilo`). |

---

## 3. Script Templates Specification

In CNTXT, scripts are primitive Templates with `category: 'SCRIPTS'`. They are manageable in the Template Manager, searchable, and executable directly from Omni Terminal:

### 3.1 Pre-Configured Script Definitions
1. **🤖 Antigravity CLI (`agy`)**:
   - **Template Name**: `Antigravity CLI Agent`
   - **Category**: `SCRIPTS`
   - **Handle**: `agy`
   - **Accent Color**: `#10b981` (Emerald)
   - **Role**: `Auditor Agent` (Read-only Pass 1 auditor)
   - **Command**: `powershell.exe -NoLogo -NoExit -Command "agy --dangerously-skip-permissions"`
   - **Description**: Spawns Google Antigravity CLI with automated permission handling in the active workspace.
2. **🚀 Cline CLI (`cline`)**:
   - **Template Name**: `Cline CLI Agent`
   - **Category**: `SCRIPTS`
   - **Handle**: `cline`
   - **Accent Color**: `#6366f1` (Indigo)
   - **Role**: `Prod Agent` (Implementer)
   - **Command**: `powershell.exe -NoLogo -NoExit -Command "cline --auto-approve true"`
   - **Description**: Spawns Cline autonomous coding CLI in act mode with auto-approval in the active workspace.
3. **⚡ OpenCode CLI (`opencode`)**:
   - **Template Name**: `OpenCode CLI Agent`
   - **Category**: `SCRIPTS`
   - **Handle**: `opencode`
   - **Accent Color**: `#f59e0b` (Amber)
   - **Role**: `Prod Agent` (Implementer)
   - **Command**: `powershell.exe -NoLogo -NoExit -Command "opencode --auto"`
   - **Description**: Spawns OpenCode CLI in autonomous execution mode in the active workspace.
4. **🔵 Kilo CLI (`kilo`)**:
   - **Template Name**: `Kilo CLI Agent`
   - **Category**: `SCRIPTS`
   - **Handle**: `kilo`
   - **Accent Color**: `#06b6d4` (Cyan)
   - **Role**: `Prod Agent` (Implementer)
   - **Command**: `powershell.exe -NoLogo -NoExit -Command "kilo"`
   - **Description**: Spawns Kilo CLI agent in the active workspace.
5. **🐚 PowerShell Shell (`pwsh`)**:
   - **Template Name**: `PowerShell Shell`
   - **Category**: `SCRIPTS`
   - **Handle**: `pwsh`
   - **Accent Color**: `#8b5cf6` (Violet)
   - **Role**: `Custom`
   - **Command**: `powershell.exe -NoLogo`
   - **Description**: Native interactive PowerShell console in the active workspace.

---

## 4. Color-Coded Terminal Tracking & Active Roster

Every running terminal is tracked in `OmniSession.pinnedAgents` with an assigned `color` token:

```typescript
export interface OmniAgentProfile {
  id: string;               // e.g. 'agent_agy_1730000000'
  name: string;             // Display name (e.g. 'Antigravity CLI')
  handle: string;           // Mention handle, without @ (e.g. 'agy')
  role: OmniAgentRole;      // 'Auditor Agent' | 'Prod Agent' | 'Tester Agent' | 'Custom'
  color: string;            // Accent color hex (e.g. '#10b981')
  command: string;          // Execution string
  spawnMode: 'headless' | 'external-window';
  channelId?: string;       // Bound PTY session id
  status: 'idle' | 'starting' | 'busy' | 'waiting_permission' | 'stopped' | 'error';
}
```

### Roster Bar Display:
- **Pill Container**: Displays each running agent with its accent color dot, `@handle`, role badge, and status indicator.
- **Actions per Pill**:
  - `[ 📺 Show in Terminal ]`: Opens a new terminal tab in CNTXT (`tabStore.openTerminalTab`) or switches to it.
  - `[ ⏹ Stop ]`: Sends SIGINT / kills the process.
  - `[ ✕ Remove ]`: Removes the terminal from the active session.
- **Top Bar Quick Launch**: Quick buttons for `[ + agy ]`, `[ + cline ]`, `[ + opencode ]`, `[ + kilo ]`, and `[ + Shell ]`.

---

## 5. The File-Driven Dual `.cntxt` Bus Engine

### 5.1 Storage Path vs. Workspace Execution Path
- **Session Document Target Folder (`targetFolder`)**:
  - Selected by the user via directory browser (or defaults to `C:/CNTXT_Sessions`).
  - Stores `<sessionId>_output.cntxt` and `<sessionId>_raw.cntxt`.
- **Active Workspace Directory (`workspacePath`)**:
  - Retrieved from CNTXT's File Explorer (`STORAGE_KEYS.WORKSPACE_PATH` / `bridge.storage`).
  - All spawned processes, PTYs, and scripts execute with `cwd = workspacePath`.

### 5.2 Document 1: `session_output.cntxt` (Deliverables & Prompts)
- **Role**: Single source of truth for the Chat Interface.
- **Format**: Structured, human-readable markdown with turn boundaries:
  ```markdown
  ---
  sessionId: "ses_1730000000"
  title: "Multi-Agent Session"
  targetFolder: "C:/CNTXT_Sessions"
  workspacePath: "C:/Projects/LocalActive/Repo/Active/CNTXT"
  busType: "omni-terminal-output"
  version: "2.0"
  ---

  # Omni Terminal Session: Multi-Agent Session

  <!-- cntxt:turn:start id="msg_1" sender="user" time="2026-10-12T00:00:00Z" -->
  ### 👤 User (00:00)
  @agy Perform full codebase audit against the 9 Pillars.
  <!-- cntxt:turn:end -->

  <!-- cntxt:turn:start id="msg_2" sender="agent_agy" handle="agy" color="#10b981" time="2026-10-12T00:01:00Z" -->
  ### 🤖 @agy (00:01)
  ## Codebase Audit Summary
  - **Pillar 1 (Mock Quarantine)**: All 617 tests pass. Zero inline fallback constants.
  - **Pillar 2 (Presenter Purity)**: Visual components use typed props with zero direct IPC.
  <!-- cntxt:turn:end -->
  ```
- **How CNTXT Synchronizes**:
  - `omniTerminalStore` runs a lightweight polling watcher (600ms) on `session_output.cntxt`.
  - When the file content changes, `parseOutputDocumentTurns(content)` extracts turns.
  - Newly appended turns are parsed into `OmniChatMessage` objects and rendered as chat bubbles.
  - **Agent Prompt Contract**: System prompts / CLI injections instruct agents:
    `"Always output your final deliverable in raw markdown appended to '<targetFolder>/<session>_output.cntxt' between <!-- cntxt:turn:start --> and <!-- cntxt:turn:end --> tags."`

### 5.3 Document 2: `session_raw.cntxt` (Black Box Flight Recorder)
- **Role**: Append-only audit trail and debugging log.
- **Content**:
  - Full unstripped stdout/stderr chunks from all PTY channels.
  - Subprocess execution logs, tool calls, and exit codes.
  - `<thought>...</thought>` reasoning tags and inner monologues.

---

## 6. Rich Markdown Chat Interface

Each chat message bubble is rendered with modern typography and visual polish:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 🤖 @agy (00:01) [Auditor]                        [ 📋 Copy ] [ 📝 Edit ]│
├────────────────────────────────────────────────────────────────────────┤
│ (Border styled with agent accent color: Emerald #10b981)               │
│                                                                        │
│ ## Audit Findings Summary                                              │
│ The codebase was inspected across all 9 architectural pillars:         │
│                                                                        │
│ | Pillar | Status | Finding |                                          │
│ |:---|:---|:---|                                                       │
│ | Pillar 1 | ✅ PASS | Zero inline fallback mocks                       │
│ | Pillar 2 | ✅ PASS | Presenter purity verified                       │
│                                                                        │
│ ```typescript                                                          │
│ export function checkPresenterPurity(): boolean {                      │
│   return true;                                                         │
│ }                                                                      │
│ ```                                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Bubble Features:
1. **GitHub-Flavored Markdown**:
   - Headers (`#`, `##`, `###`), bold (`**`), italics (`*`), lists (`-`, `1.`), blockquotes (`>`).
   - Markdown tables with formatted columns.
   - Code blocks with syntax highlighting and a 1-click code copy button.
   - Mermaid diagram rendering via `src/services/mermaidRenderer.ts`.
2. **Action Buttons**:
   - **`[ 📋 Copy ]`**: Copies the exact raw markdown content to the clipboard with an animated checkmark confirmation (`✓ Copied`).
   - **`[ 📝 Open in Editor ]`**: Calls `tabStore.createTab(title, content, 'markdown')`, instantly opening the message in a new CNTXT editor tab for editing, exporting, or refining.
3. **Color-Coded Accent Borders**:
   - The message bubble is subtly bordered and badged with the sender's accent color (`#10b981` for `@agy`, `#6366f1` for `@cline`, `#f59e0b` for `@opencode`, `#06b6d4` for `@kilo`, `#8b5cf6` for `@pwsh`).
   - User messages appear with right alignment and brand blue accent.

---

## 7. Smart Text Injector & Contextual Attention Center

### 7.1 Text Injector & Routing Rules
The Chat Input Bar acts as an intelligent text injector:
- **`@handle <text>`**: Routes `<text>\n` directly to the specified agent's PTY channel.
- **`<text>` without `@`**: Broadcasts `<text>\n` to all active **AI agents** (`@agy`, `@cline`, `@opencode`, `@kilo`). Non-agent shells (`@pwsh`, `@bash`) are excluded from broadcast unless targeted explicitly.
- **Transcript Appending**: Every user prompt is appended to `session_output.cntxt` as a user turn and immediately rendered in the chat stream.

### 7.2 Dynamic Contextual Attention Controls
When an agent encounters a prompt or decision gate requiring user attention (detected via `detectInteractivePrompt` or status `waiting_permission`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ @agy requires attention: Run command "git status"?                   │
│ [ Allow (y) ]  [ Allow Always (a) ]  [ Reject / Deny (n) ]              │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠️ @cline requires attention: Create file "src/utils.ts"?               │
│ [ Allow (y) ]  [ Allow Always (a) ]  [ Reject / Deny (n) ]              │
└────────────────────────────────────────────────────────────────────────┘
```

- **Color-Coded Attention Ribbons**: Each attention ribbon displays above the textarea with the requesting agent's accent color.
- **Multiple Concurrent Attention Requests**: If multiple agents require attention, ribbons stack neatly, clearly distinguishing each agent.
- **One-Click Actions**:
  - `[ Allow ]`: Injects `y\r` into that agent's PTY.
  - `[ Allow Always ]`: Injects `a\r` into that agent's PTY.
  - `[ Reject / Deny ]`: Injects `n\r` into that agent's PTY.
- **Custom Typed Answers**: If the user types text into the input field while an agent is waiting for attention, pressing Enter sends that custom typed answer to the waiting agent.

### 7.3 Autocomplete & Micro Keypad
- **`@` Mention Autocomplete**: Typing `@` opens a suggestion popover showing all running agents with their colored avatars and handles.
- **`/` Slash Commands**: Typing `/` opens command shortcuts (`/audit`, `/refactor`, `/clear`, `/kill`, `/help`).
- **Micro Keypad**: Inline toolbar buttons for `↑`, `↓`, `↵ Enter`, `␣ Space`, `Y`, `N`, and `^C` (SIGINT) for direct terminal navigation.

---

## 8. Implementation Roadmap & Verification Gates

### Phase 1: Script Templates & Roster Color Coding
- Update `src/constants/defaultPresets.ts` and `src/store/templateStore.ts` to seed the 5 script templates (`agy`, `cline`, `opencode`, `kilo`, `pwsh`) with category `'SCRIPTS'` and accent colors.
- Update `contracts/data_shapes.ts` to include `color` and `workspacePath` in `OmniAgentProfile` and `OmniSession`.
- Update `src/components/OmniTerminal/AgentRosterBar.tsx` with color badges, quick script launch buttons, and `[ 📺 Show in Terminal ]` tab openers.

### Phase 2: File-Driven Chat Sync & Dual `.cntxt` Bus
- Update `src/features/omniTerminal/format/omniDocumentSync.ts`:
  - Add `parseOutputDocumentTurns(content: string): OmniChatMessage[]`.
  - Format output turns with explicit metadata comments (`<!-- cntxt:turn:start id="..." sender="..." color="..." -->`).
- Update `src/store/omniTerminalStore.ts`:
  - Read `workspacePath` from `bridge.storage` (`STORAGE_KEYS.WORKSPACE_PATH`) to ensure terminal processes spawn in the active workspace.
  - Implement file-tailer watcher on `session_output.cntxt` to synchronize newly appended turns into `messages`.
  - Append user prompts to `session_output.cntxt` on send.

### Phase 3: Rich Markdown Chat Bubbles
- Update `src/components/OmniTerminal/ChatMessageBubble.tsx`:
  - Integrate rich markdown rendering (headers, bold, italics, code blocks, tables, Mermaid diagrams).
  - Add **`[ 📋 Copy ]`** button (copies raw markdown to clipboard).
  - Add **`[ 📝 Open in Editor ]`** button (creates new tab in `tabStore` with message content).
  - Apply agent accent color to bubble borders and header badges.

### Phase 4: Smart Text Injector & Dynamic Attention Controls
- Update `src/components/OmniTerminal/ChatInputBar.tsx`:
  - Render dynamic contextual attention ribbons (`[ Allow ]`, `[ Allow Always ]`, `[ Reject / Deny ]`) styled with the requesting agent's color.
  - Implement `@` mention autocomplete popover with colored agent badges.
  - Support slash command autocomplete (`/`).
  - Route text: targeted `@handle` vs. broadcast to AI agents (excluding plain shells).

### Phase 5: Verification & Portable Build Gate
- Execute `npm test` (all 600+ Vitest tests must pass).
- Execute `npm run lint` (zero TypeScript errors, zero platform leaks, contract sync verified).
- Rebuild portable executable (`npm run tauri:build` and `npm run package:sign`).

---

## 9. Verification & Safety Criteria
- **Presenter Purity**: UI components in `src/components/OmniTerminal/` must remain pure presentational components consuming Zustand store state; zero direct Tauri `invoke` calls in presenters.
- **Quarantine**: Scripts are production presets in `src/constants/defaultPresets.ts`; no test mocks in production code paths.
- **Process Safety**: All terminal commands and arguments pass through `parseCommandLine` tokenizer; external terminal launches validate paths against canonical roots.
- **Encoding**: All files saved strictly in **UTF-8 without BOM**.
