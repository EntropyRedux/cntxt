# FEATURE GROUP DEFINITION — FG-15
> Date: 2026-10-10  
> Feature Group: FG-15 — Blueprint Prompt Archetypes & Editor Tab Bidirectional Sync  
> Target Platform & Stack: Desktop (Tauri v2 + React 19 + TypeScript + Zustand 5) & Web (Vercel + React 19 + TypeScript)  
> Active Plan File: `generated-documents/plans/feature_group_FG15_blueprint_archetypes_and_tab_sync_2026-10-10.md`  

---

## 1. Executive Summary & Intent

This feature group restructures the CNTXT App Builder Blueprint system from hardcoded "starter toy apps" (`starterHtml.ts`) into a pure **Prompt Orchestrator & Sandboxed Runtime**:
1. **Templates as Archetypes**: Replace specific app presets (calculator, scratchpad, timer) with 3 foundational prompt archetypes:
   - **Build**: Create a new panel app from scratch conforming to the 14 CNTXT theme tokens, file-backed state protocol, and sandbox limits.
   - **Brainstorm**: Interactive ideation prompt for an LLM to propose 3 sidebar app concepts suited for a 320–480px width constraint.
   - **Adapt / Update**: Adapter prompt taking existing HTML/JS/CSS code and refactoring it into CNTXT architecture (state sync, theme tokens, CSP hygiene).
2. **"Adapt from Current Active Tab"**: One-click detection and ingestion of HTML content from the currently active editor tab in CNTXT.
3. **Editor Tab Integration & Approach B Bidirectional Sync**:
   - Allows opening the formulated prompt as a live Markdown tab in the CodeMirror editor (`[Prompt] <Archetype> - <App>.md`).
   - **Builder → Tab**: Updating inputs in the Builder wizard dynamically updates the editor tab buffer without losing focus.
   - **Tab → Builder**: Editing prompt instructions directly in the CodeMirror tab and clicking **"Resync from Tab"** in the Builder adopts the editor tab's text as the active prompt override without lossy reverse-regex parsing.
   - **Dirty Overwrite Guard**: Prevents accidental overwrites of manual editor edits when re-pushing from the Builder form.
4. **Starter App Deprecation**: Permanently retire `starterHtml.ts` (1,063 lines of embedded string literals) to slim bundle size and enforce LLM-driven development purity.

---

## 2. Feature Boundaries & Scope

### In Scope
- **Retire `starterHtml.ts`**: Completely delete `starterHtml.ts` and remove all "Use Starter App" buttons from `BlueprintSourceView.tsx`.
- **Archetype Catalog (`templates.ts`)**:
  - `build`: Scaffolds a new application prompt from structured answers (`appName`, `purpose`, `inputsOutputs`, `persistence`, `layout`, `themeMode`).
  - `brainstorm`: Scaffolds an ideation prompt from problem space topic, target users, and workflow constraints.
  - `adapt`: Scaffolds an adaptation prompt from existing HTML code, state goals, and theme conformance requirements.
- **Active Tab Ingestion (`adapt` archetype)**:
  - Detect if the current active tab in `tabStore` has HTML content.
  - Render an "Import from Active Tab: <Title>" button that immediately populates the existing HTML source.
- **Prompt Editor Tab (`tabStore` Integration)**:
  - Add action: "Open Prompt in Editor Tab".
  - Opens/reuses a tab named `[Prompt] <Archetype> - <AppName>.md` with language `'markdown'`.
  - Stores `activePromptTabId` in builder state.
- **Approach B Bidirectional Synchronization**:
  - `pushToTab()`: Serializes current builder prompt and dispatches `updateTabContent(tabId, prompt, true)`.
  - `resyncFromTab()`: Reads current tab buffer from `tabStore.tabs`, sets `customPrompt = tabContent`, `isPromptEdited = true`, and badges "Edited in Editor Tab".
  - Confirmation guard when re-pushing form state if the tab has unsaved manual changes.
- **Test Suite Updates**:
  - Update `tests/panelAppsFlowB.test.ts` to test all 3 archetypes, prompt builders, tab sync helpers, and schema parsing.
- **Dual-Repository Parity**:
  - Synchronize identically across `CNTXT` (desktop) and `cntxt-web` (web).

### Out of Scope
- External AI API calling directly inside CNTXT (user copies prompt to Claude/ChatGPT/Gemini/Local LLM or uses existing Action Engine).
- Multi-file project scaffolding (panel apps remain strictly single-file self-contained `.cntxt` bundles).

---

## 3. Data Shapes & Contracts

- Canonical contracts (`contracts/data_shapes.ts`):
  ```typescript
  export type BlueprintArchetype = 'build' | 'brainstorm' | 'adapt';
  ```
- No breaking changes to `PanelAppManifest` or `PanelAppRecord`.
- Runtime boundary schema validation:
  - `BlueprintAnswersSchema` updated to support optional `existingHtml` and `brainstormTopic`.

---

## 4. Acceptance Criteria

- [ ] `starterHtml.ts` is deleted from both repositories.
- [ ] 3 archetypes (`build`, `brainstorm`, `adapt`) cleanly selectable in `BlueprintSourceView.tsx`.
- [ ] "Adapt from Active Tab" successfully populates existing HTML from the open document.
- [ ] "Open Prompt in Editor Tab" creates a Markdown tab in CodeMirror.
- [ ] "Resync from Tab" adopts manual editor edits as active prompt override with visual badge.
- [ ] Overwrite guard protects manual editor changes from unintended form clobbering.
- [ ] 100% of unit tests pass in `CNTXT` (vitest) and `cntxt-web`.
- [ ] `npm run lint` clean (0 errors, 0 platform leaks outside `src/adapters/`).
- [ ] `node scripts/check-contract-sync.mjs` passes with 100% contract parity.

---

## 5. Risk Assessment & Mitigations

1. **Risk**: User closes the prompt tab while the builder is open, leaving a stale `promptTabId`.
   * **Mitigation**: Before reading or pushing to the tab, verify `tabStore.getState().tabs.some(t => t.id === promptTabId)`. If not found, recreate the tab cleanly.
2. **Risk**: Re-pushing form answers overwrites user's custom system prompt instructions typed in the editor.
   * **Mitigation**: Check if `tab.content !== lastGeneratedPrompt`. If different, prompt the user with an explicit confirmation dialog before overwriting.
3. **Risk**: Large existing HTML payloads (e.g. 500KB) pasted into the "Adapt" prompt.
   * **Mitigation**: Existing preflight size scanner warns if existing HTML exceeds the 512KB soft limit.
