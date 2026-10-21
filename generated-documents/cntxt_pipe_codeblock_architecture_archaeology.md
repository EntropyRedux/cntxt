# CNTXT Pipe (`|`) Code Block Architecture — Historical Specification & Design Archaeology

**Status:** Discussion Brief (Read-Only Archaeology — Zero Code Changes)  
**Discovered Sources:**
- `contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/05-parser-architecture.md`
- `contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/06-parser-production-code.ts`
- `contextpad_replica_ai-studio/new_ai_studio_build/src/parser/pseudoAppParser.ts`
- `contextpad_replica_ai-studio/new_ai_studio_build/src/constants/pseudoAppTemplates.ts`
- `contextpad_replica_ai-studio/new_ai_studio_build/src/components/Builder/BlockConfigurator.tsx`
- Git Commit `bc7976ff5b` (*"feat(ui): syntax highlighting granularity switcher, codeblock overhaul & tri-platform sync"*, Oct 9, 2026)

---

## 1. The Core Rule You Designed: What `|` Means in CNTXT

In [05-parser-architecture.md](file:///C:/Projects/LocalActive/Repo/Active/cntxt/contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/05-parser-architecture.md#L23-L31), your exact specification states:

> ### The `|` Separator
> - **Everything before `|`** = standard info string (safe for outside tools / standard Markdown syntax highlighters)
> - **Everything after `|`** = **CNTXT governance layer**
> - **Presence of `|`** = **parser claims the block (`isCNTXT: true`)**
> - Block type determines rendering capability
> - Unregistered behavior → falls back to plain display

In other words:
- A normal fence like ```` ```markdown ```` is just a passive Markdown code block (`isCNTXT: false`).
- Adding a pipe (`|`) — e.g., ```` ```markdown | id=research-brief tags=context locked=user ```` — **marks the code block as a CNTXT-owned Stateful Block (`isCNTXT: true`)** while keeping standard Markdown tools compatible with the language token before the pipe!

---

## 2. The 6 Universal Governance Parameters

Your specification in [05-parser-architecture.md](file:///C:/Projects/LocalActive/Repo/Active/cntxt/contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/05-parser-architecture.md#L32-L43) and [06-parser-production-code.ts](file:///C:/Projects/LocalActive/Repo/Active/cntxt/contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/06-parser-production-code.ts#L14-L22) defines **6 first-class governance keys** after the pipe `|`:

| Governance Key | Type | Role in CNTXT | Example |
| :--- | :--- | :--- | :--- |
| **`id=`** | `string` | Unique block address within the document (`byId` graph index) for targeted updates, RPC mutations, or linking | `id=agy-plan-fg21` |
| **`tags=`** | `string[]` (comma-separated) | Grouping and semantic retrieval (`byTag` graph index) | `tags=deliverable,plan,agy` |
| **`locked=`** | `'agent' \| 'user'` | Ownership/mutation lock (`locked=agent` means Agent-owned/writable; `locked=user` means User-locked so agents cannot overwrite; omitted = unlocked) | `locked=agent` |
| **`status=`** | `string` | Lifecycle state of the block | `status=active`, `status=ready`, `status=approved` |
| **`link=`** | `string[]` (comma-separated) | Bidirectional same-document block relationships (`links` / `linkedFrom` graph) | `link=agent-conversation` |
| **`source=`** | `string` | External content pointer — file path or URL that backs or syncs with this block | `source=./docs/spec.md` |
| **`*` (Renderer Params)** | `Record<string, unknown>` | Any other `key=value` pair after `\|` is automatically collected into `params.rendererParams` and passed to the block widget/renderer | `agent="@agy" title="FG-21 Plan"` |

---

## 3. What Was Already Built in the Archive vs. What Made It into Production Desktop

### A. In `contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/06-parser-production-code.ts` (354 lines)
You actually had a **complete, pure, zero-dependency production parser & writer** already written in `06-parser-production-code.ts`! It includes:
1. **`parse(raw: string): ParsedDocument`**
   - Parses the document into a hybrid AST (`nodes: (Block | RawSegment)[]` with exact `{ start, end }` character offsets).
   - Sets `isCNTXT = infoRemainder.includes('|')`.
   - Extracts the 6 governance keys (`id`, `tags`, `locked`, `status`, `link`, `source`) plus `rendererParams` (supporting quoted strings `key="value with spaces"`).
2. **`buildGraph(blocks: Block[]): RelationshipGraph`**
   - Builds `byId`, `byTag`, `links`, and reverse `linkedFrom` lookup tables.
   - Emits non-crashing warnings on duplicate parameters or dangling `link=` references.
3. **Surgical Block Writer API (Splice-based without corrupting surrounding Markdown):**
   - `updateBlockParams(doc, blockId, newParams)` — updates the `| key=value` header in place!
   - `updateBlockContent(doc, blockId, newContent)` — replaces only the body of `id=<blockId>` in place!
   - `insertBlock(doc, block, afterBlockId?)` — inserts a new CNTXT block after a specific `blockId`!
   - `removeBlock(doc, blockId)` — removes a specific block by `blockId`!
4. **Linked Config & Behavior Resolution (`resolveBlockBehavior`, `resolveBlockConfig`):**
   - Allows a `yaml | id=... link=<targetId>` block to attach interactive behaviors (`conversation`, `input`, `actions`) to any block.

### B. What Was Ported into the Main Desktop Repo (`Repo/Active/cntxt`)
When Panel Apps were pivoted in `panel_apps_vision_v0.2.md` (Oct 9, 2026 — commit `bc7976ff5b`) from Markdown Pseudo-Apps to isolated HTML Iframe Panel Apps:
- Only the visual header badge slice (`this.language.split('|')` -> `extraParam`) was ported into `src/extensions/liveMarkdown/widgets/codeBlockWidget.ts` and `languageMeta.ts`.
- The full `06-parser-production-code.ts` (`parse`, `RelationshipGraph`, `updateBlockContent`, `updateBlockParams`, `insertBlock`, `removeBlock`) was left behind in `contextpad_replica_ai-studio/new_ai_studio_build/generated-documents/pseudo-app/06-parser-production-code.ts`!

---

## 4. Why This Is a Massive Unlock for AI/Agent Deliverables

Because we just standardized on wrapping all AI/Agent deliverables inside fenced code blocks with `|`, bringing `06-parser-production-code.ts` (updated to support variable-length fences ```` ``` ```` and `~~~`) into the main CNTXT desktop app means:

1. **Addressable Deliverable Blocks (`id=`):**
   - Instead of Antigravity overwriting a whole file or blindly appending at the bottom, Antigravity can push:
     ````markdown
     ~~~markdown | id=fg21-plan tags=deliverable,plan locked=agent status=draft source=antigravity
     # FG-21 Implementation Plan
     ...
     ~~~
     ````
   - Later, when you say *"update the FG-21 plan status to approved and revise section 2"*, Antigravity can call `updateBlockContent(doc, 'fg21-plan', ...)` or `updateBlockParams(doc, 'fg21-plan', { status: 'approved' })` to surgically update **just that block** inside a multi-block document!
2. **User Lock vs. Agent Lock (`locked=user` vs `locked=agent`):**
   - If you change a block header to `locked=user`, CNTXT's RPC/REST gateway can **enforce at the host boundary** that no AI agent is allowed to mutate or overwrite that block!
3. **Rich Header Pills in `CodeBlockHeaderWidget`:**
   - Instead of rendering the text after `|` as a single raw string, `CodeBlockHeaderWidget` can use `parseParams()` to render structured pills in the code block header bar:
     - **ID badge** (`#fg21-plan`)
     - **Lock pill** (`🔒 user` or `🤖 agent`)
     - **Status badge** (`● active` / `✓ approved`)
     - **Tag chips** (`deliverable`, `plan`)
     - **Interactive controls** (`Collapse`, `Copy`, `Clear`, `Lock/Unlock`)
4. **Outline Panel & MCP Querying by `id=` or `tags=`:**
   - The CNTXT Outline Panel and the MCP Server (`cntxt-mcp-server.mjs`) can list, filter, and read individual blocks in a document by `id=` or `tags=deliverable` without reading the entire file!
