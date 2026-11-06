# Issues
1. Activating a .cntxt document as active thread, no diference vs. it not activated *(Deferred for Conversation Mode rework)*
2. Conversation mode is still unstable, will preform more tests3 *(Deferred for Conversation Mode rework)*
3. ~~Code block issues, when in ordinary code blocks, click accuracy is reduced~~ — **[RESOLVED v0.7.6]** Stabilized code block click accuracy: eliminated CSS margins on `.cm-line` elements (`margin-top: 0`, `margin-bottom: 0`), transferring vertical breathing room into the measured widget bounding boxes (`h-2` footer) to prevent CodeMirror HeightMap margin-collapsing dead-zones and gutter line number desynchronization. Verified with `CodeBlockHeaderWidget.eq()` stable DOM recycling.
4. ~~When in a cntxt special block, selecting a section and adding a response/comment, typing text into the input field then scrolls on the mouse, the typed text resets, it appears scrlling also resets the input field, not a major issue but if fixing is trivial, fix~~ — **[RESOLVED v0.7.5]** Preserved draft text buffer across virtual scroll sync passes.
5. ~~adding a response on a section > after entering, the viewport moves to the added response moving me away from the current section I am viewing~~ — **[RESOLVED v0.7.5]** Scroll DOM offset locked and CodeMirror `scrollIntoView: false` applied on submit.

# Improvements
1. Special table code block to create notion-like tables
2. ~~When connecting via REST API, the connected agent/program must receive a response on what available controls and how to use it must be sent so the agent knows how to the feature~~ — **[RESOLVED v0.7.8]** Implemented dynamic `GET /api/v1/capabilities` and `GET /api/v1/directives` endpoints, Host Command Bus `'directives'` domain, and complete capabilities manifest detailing all REST endpoints, RPC domains, and MCP tools. Added 1-click "Copy Agent Prompt" in Settings for instant agent bootstrapping.
3. Conversation mode: user responses hidden in document by default, only appears if exported as .cntxt file(to follow) *(Deferred for Conversation Mode rework)*
4. ~~When cntxt is connected to an agent, cntxt also sends a directive to the agent on how to use cntxt~~ — **[RESOLVED v0.7.8]** Authoritative CNTXT Agent Directives service (`agentDirectivesService.ts`) delivered via REST (`/api/v1/directives`), Host Command Bus (`directives.get`), MCP stdio handshake (`initialize.instructions`), MCP resources (`cntxt://directives/agent-guide`), and MCP tool (`cntxt_get_directives`). Enforces mandatory Rich Container encapsulation (`~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="..."`), human guardrails (`locked=user`), surgical updates (`blocks.upsert`), and active thread citations (`[[#^block-id]]`).
5. ~~gatway security, should REST api be converted to MCP?~~ — **[RESOLVED v0.7.8]** Formalized Dual-Tier Security Architecture: Process-isolated stdio MCP (`scripts/mcp/cntxt-mcp-server.mjs`) is standard for local desktop AI assistants (zero TCP network attack surface), while Loopback/LAN REST Gateway (`src-tauri/src/commands/gateway.rs`) is retained and hardened for multi-device companion workflows (e.g., Android tablets running Odin Reviewer) with constant-time `X-CNTXT-Token` verification and RFC 1918 private subnet filtering.
6. ~~UNdo close current tab or closed tab history~~ — **[RESOLVED v0.7.5]** Implemented `reopenClosedTab()` with 10-item FIFO ring buffer, `Ctrl+Shift+T` hotkey, File menu item, tab context menu item, and 19 unit tests.
7. ~~Ribbon bar can save files as saved bookmark(loads the file from file explorer as long as it is still in there - return error if not)~~ — **[RESOLVED v0.7.6]** Modular ribbon supports pinning active open tabs (`type: 'tab'`) and disk files (`type: 'file'`). Context menu "Pin to Ribbon" added to TabBar tab context menu and FileExplorer file context menu. Ribbon Customizer modal includes 1-click Pin for open tabs, active workspace file picker, and recent files list. Horizontal mouse-wheel scroll enabled; extreme-left expand chevron removed.
8. ~~Add a view mode for templates and actions panel: can view like cards grids or detailed list(current)~~ — **[RESOLVED v0.7.6]** Notion-style Card Grid view mode toggle (`list` | `grid`) added to both Templates and Actions panels with category badges, 2-line preview, dynamic variables indicator, formula badge, and quick run/insert hover controls. Persisted via `settingsStore.templateViewMode` & `actionViewMode`.
9. ~~Title bar, menu bar, ribbon bar, side rail -> remove dividing lines/outlines so it looks more seamless and make them look like in one continuos container~~ — **[RESOLVED v0.7.5]** Removed interior dividing borders between Title Bar, Menu Bar, and Modular Ribbon. Subtle tokens applied to Activity Bar.
10. ~~Size adjustable markdown formatting toolbar so no need for single row and multi rows switchers...~~ — **[RESOLVED v0.7.6]** Implemented interactive top drag-to-resize handle on `MobileAccessoryBar.tsx` with smooth vertical mouse and touch resizing, natural `flex-wrap` multi-row wrapping, height persistence (`contextpad_formatting_toolbar_height`), and double-click compact/expanded toggle. Excised legacy `ChevronUp`/`ChevronDown` "Single Row" switchers from both the toolbar and `FormattingCustomizerModal.tsx`.
11. ~~Multi-window event isolation for single-instance file opening~~ — **[RESOLVED v0.7.8]** Updated `src-tauri/src/lib.rs` to route single-instance CLI and file-association drops strictly to the `"main"` window via `app.emit_to("main", "open-files", ...)` and added `getCurrentWindow().label === 'main'` guards in `tauriRuntimeAdapter.ts`, preventing secondary popout webviews from opening duplicate tabs.
12. ~~Code block header visual alignment and vertical breathing room~~ — **[RESOLVED v0.7.8]** Upgraded `CodeBlockHeaderWidget` padding from `px-3 py-1.5` to `px-3.5 py-2` (perfectly aligning horizontal margins with `.cm-live-codeblock-mid` 14px padding and providing balanced 8px vertical breathing room) and added `.cm-live-codeblock-start + .cm-live-codeblock-mid { padding-top: 6px !important; }` in `src/index.css` for first-line code separation without margin-collapsing HeightMap drift.

---

# Master Strategic Roadmap (Future Updates)

### 1. CNTXT Library (Personal & Community)
* **Objective:** Expand CNTXT from a local document tool into an extensible, interconnected knowledge and tooling ecosystem.
* **Architecture:**
  * **Personal Library:** Encrypted private cloud (Supabase) or Git-synced (GitHub/GitLab) repository syncing user templates, prompt actions, custom code block presets, custom themes, and personal workflows across Desktop, Mobile, and Web.
  * **Community Library:** Public, curated hub for discovering, sharing, and 1-click installing community-authored workflows, prompt templates, interactive code block widgets, and agent directives.
  * **Management:** Versioning, 1-click import/export, dependency resolution, and seamless workspace installation.

### 2. Workflow Builder (Universal Workflow Engine)
* **Objective:** Transform the existing panel "App Builder" into a generalized, multi-stage **Workflow Engine** where App Building is just one specialized workflow recipe.
* **Architecture:**
  * **Universal Engine:** Declarative pipeline orchestrator chaining triggers, prompt templates, script sandboxes, user inputs, external MCP/REST tools, and editor mutations.
  * **App Builder as a Sub-Workflow:** Building an interactive panel app becomes a standard workflow preset (*Schema Definition → UI Generation → State Binding → Panel App Registration*).
  * **Diverse Workflow Presets:**
    * Document Review & Proofreading workflows (automated multi-model linting and inline annotations).
    * Task Ideation & Quality Control workflows (Project Odin review stages, deliverable extraction).
    * Data Transformation workflows (table parsing, CSV/JSON extraction, SQL formatting).
  * **Execution Surfaces:** Triggerable via Activity Bar, Modular Ribbon bookmarks, Slash Commands (`/run-workflow`), Hotkeys, or external agent MCP calls.

### 3. Code Blocks Builder (First-Class Primitives & Conversation/Audit Optimizations)
* **Objective:** Promote code blocks into first-class, interactive CNTXT primitives managed via a dedicated visual rail studio, while overhauling Conversation and Audit modes.
* **Architecture:**
  * **Code Block Builder Rail Panel:** Dedicated Activity Bar panel (`block-builder`) featuring a primitive picker, visual parameter inspector (`id`, `title`, `locked`, `status`, `tags`), live interactive preview canvas, and 1-click document insertion.
  * **Flagship Primitive — Notion-Like Interactive Tables:** Dynamic table widget featuring drag-to-resize columns, context-menu row/column insertion & deletion, keyboard cell editing (`Tab`/`Shift+Tab`/`Enter`), column sorting, and 100% bidirectional synchronization with raw GFM Markdown table syntax.
  * **Conversation & Audit Mode Usability Overhaul:**
    * **Active Thread Visual Identity:** Distinct visual styling, banner, and active pulse for `.cntxt` collaborative threads.
    * **Smart Comment Visibility:** User responses and reviewer comments collapsed/hidden in the main document view by default, surfacing cleanly inside a conversational side-rail or margin timeline.
    * **Chronological & Cited-Line Weaved Export:** 1-click `.cntxt` → `.md` export engine sorting deliverables by ISO-8601 timestamps and weaving user comments directly beneath their cited line numbers (`link=<blockId>#L<start>-L<end>`).
    * **Audit Mode Optimizations:** Specialized review blocks with structured checklist tables, pass/fail/flag criteria, and fast-action copy buttons for external QA portals (e.g., Mercor Studio).

