# Feature Group FG-23 Implementation Plan: Active Thread Routing, User Citation Inbox & Deliverable Target Settings

**Project:** CNTXT (`C:\Projects\LocalActive\Repo\Active\cntxt`)  
**Feature Group:** FG-23 — Active Thread Routing, User Citation Inbox (`id=user-inbox`), Respond/Comment Inline Composer & Deliverable Workspace Settings  
**Date:** 2026-10-21  
**Status:** Completed & Reconciled  

---

## 1. Objective & Architectural Problem Statement

In human-agent pair programming and document generation workflows, agent deliverables often spawn uncontrollably across multiple arbitrary document tabs or overwrite user notes without context. Furthermore, when users wish to reply, annotate, or critique specific lines inside an agent deliverable, inline comments lack structured citation metadata, causing agents to lose track of what the user feedback is responding to.

FG-23 solves these core workflow issues through three tightly integrated capabilities:

1. **Active Thread Tab Protocol (`isActiveThread: boolean`):**
   - Users can right-click any tab header to toggle "Set as Active Thread" / "Clear Active Thread".
   - Exactly one tab in the workspace can hold `isActiveThread = true`.
   - When active, incoming agent deliverables (`tabs.create` RPC / MCP `cntxt_open_deliverable`) are automatically prepended directly into the active thread tab (under the user inbox) instead of creating endless disconnected new tabs.
   - When a tab is toggled as an active thread, its extension is automatically promoted to `.cntxt` with user-visible notification feedback.

2. **User Citation Inbox (`id=user-inbox` / `locked=user`):**
   - Highlighting text within an agent deliverable reveals a context "Respond / Comment" action button.
   - User replies are formatted with precise line-range citations:
     ```markdown
     ~~~markdown | id=user-inbox tags=inbox,user locked=user title="User Comments & Feedback"
     > [L14-L22] "Highlighted agent proposal quote"
     User comment text here...
     ~~~
     ```
   - This block is pinned at the top of the document so AI agents immediately ingest user feedback upon reading the document context.
   - `locked=user` strictly prevents any AI agent or external tool from overwriting, mutating, or deleting human instructions.

3. **Deliverable Save Location Settings:**
   - Under Settings -> Advanced / Deliverables:
     - `deliverableSaveLocation: 'workspace' | 'custom-folder'`
     - `deliverableWorkspaceSubfolder: string` (e.g. `deliverables/` or `.cntxt/`)
     - `deliverableCustomFolderPath: string` (custom filesystem directory for agent outputs)

---

## 2. Canonical Contracts & Domain Models

From `contracts/data_shapes.ts`:

```typescript
// Tab definition
export interface Tab {
  id: string;
  title: string;
  content: string;
  filePath: string | null;
  isActiveThread?: boolean;
  // ...
}

// Deliverable Settings in ViewSettings
export interface ViewSettings {
  // ...
  deliverableSaveLocation?: 'workspace' | 'custom-folder';
  deliverableWorkspaceSubfolder?: string;
  deliverableCustomFolderPath?: string;
}
```

---

## 3. Core Architectural Invariants

1. **Single-Thread Invariant:** At most one open tab can be designated `isActiveThread: true`. Setting any tab as the active thread automatically clears `isActiveThread` on all other open tabs.
2. **Inbox Pinning Invariant:** When `prependDeliverableToThread()` prepends new agent deliverables to a thread, the `id=user-inbox` block remains strictly anchored at the top of the file, ahead of all chronological deliverables.
3. **No Silent Disk Retargeting Invariant (FIND-05):** Ordinary typing or editing of a `.md` file containing a `|` block never silently renames `tab.filePath` on disk. Extension promotion to `.cntxt` only occurs for unsaved untitled tabs (`!filePath`) or through explicit user invocation of `toggleActiveThread(tabId)`.
4. **Locked=User Guardrail Invariant (FIND-01):** The user citation inbox (`id=user-inbox`) is created with `locked=user`. External RPC callers (REST Gateway, MCP clients) cannot mutate or delete it, even if they self-assert `actor: 'user'`. Only internal UI operations (`appId === 'internal'`) can write to user-locked blocks.

---

## 4. Verification & Testing Matrix

- `tests/cntxtBlockParserAndRichContainers.test.ts`:
  - `appendUserInboxEntry`: Verifies creation of `id=user-inbox` block, citation formatting, and deduplication.
  - `prependDeliverableToThread`: Verifies proper placement below `id=user-inbox` and above existing deliverables.
  - `toggleActiveThread`: Verifies single active thread invariant across tabs.
  - Extension promotion logic: `promoteToCntxtExtension` unit tests.
- UI Presenter tests:
  - `TabBar.tsx`: Context menu entry "Toggle as Active Thread" with checkmark indicator and visual accent dot.
  - `SettingsPanel.tsx`: Deliverable Save Location selection and folder path inputs.
