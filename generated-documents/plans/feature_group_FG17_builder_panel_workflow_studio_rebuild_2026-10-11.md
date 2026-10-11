# FEATURE GROUP DEFINITION — FG-17
> Date: 2026-10-11  
> Feature Group: FG-17 — Builder Panel Rebuild & General-Purpose Workflow Studio  
> Target Platform & Stack: Desktop (Tauri v2 + React 19 + TypeScript + Zustand 5) & Web (Vercel + React 19 + TypeScript)  
> Active Plan File: `generated-documents/plans/feature_group_FG17_builder_panel_workflow_studio_rebuild_2026-10-11.md`  

---

## 1. Executive Summary & Intent

This feature group executes an architectural rebuild and repurposing of the CNTXT **App Builder Panel** (`AppBuilderPanel.tsx` / `BlueprintSourceView.tsx`).

Rather than treating the panel as a hardcoded "Tauri Mini-App Creator", FG-17 generalizes the system into a **Universal Prompt & Workflow Studio**:
1. **Building Apps is Just One Workflow**: Mini-app generation becomes a default, declarative data-driven workflow rather than hardcoded panel logic.
2. **Two Primary Workspaces**:
   - **`Create`**: Workflows for producing tangible output artifacts (e.g., Panel Apps, Documents, Code, Schemas). Contains a `+ Create Workflow` action, a workflow selector, and the default **Build App** workflow (*Build New App* and *Adapt Existing App* options).
   - **`Brainstorm`**: Workflows for ideation, concept formulation, and problem exploration (default workflow: *Brainstorm App Ideas from Raw Concept*).
3. **Complete Removal of `[[{{...}}]]` from the Codebase**: The clunky in-editor inline input widgets are permanently eradicated. CodeMirror renders clean typography marks for `{{variables}}`, while all interactive form inputs live cleanly in the panel. Action Buttons (`[[action:action_id]]`) are preserved and leveraged.
4. **Immutable Template Variable Indexing & Reactive Interpolation**: Source prompt templates are never mutated during typing. An AST scanner indexes all `{{variables}}`, rendering resilient, permanent input fields in the panel bound to a reactive state map (`values: Record<string, string>`).
5. **Single-Writer Editor Tab Lock & Synchronization Protocol**: Opening a template in a CodeMirror tab freezes editing in the panel to prevent edit collisions. The user can inspect the prompt, tweak variables via frontmatter/comments, and click "Sync from Editor" to update the panel.
6. **Flexible Input Ergonomics**: Multi-line auto-resizing textareas that wrap text and smoothly scale up to configurable max-heights, accommodating everything from short titles to multi-kilobyte code blocks (`{{application_code}}`).
7. **Action Button & RPC Output Pipeline**: The output of the Build App workflow is compiled into a `.cntxt` document opened in a new tab, equipped with context menu actions and an embedded CNTXT Action Button (`[[action:convert_to_panel_app]]`) to install directly to the native App Rail.

---

## 2. Friction Points & Architectural Invariants

### 2.1 Eradicating `[[{{...}}]]` vs. Preserving `[[action:...]]`
- **The Problem**: CNTXT's experimental `[[{{varName:default|current}}]]` syntax forced an unmanaged HTML `<input>` inside CodeMirror lines via `VariableInputWidget`. This created cursor traps, broke multiline wrapping, corrupted `Ctrl+Z` history, and leaked verbose brackets into raw markdown.
- **The Solution**:
  - Completely purge `[[{{...}}]]` from `src/extensions/templateVariables.ts`, `src/extensions/liveMarkdown.ts`, and `src/extensions/slashCommands.ts`.
  - Retain typography-first styling for standard `{{variable}}` tokens (dotted amber underline).
  - Explicitly retain and reinforce `[[action:action_id]]` (Action Buttons), which are first-class interactive widgets used for triggering workflows, scripts, and RPC operations.

### 2.2 Permanent Input Fields via Immutable Source Separation
- **The Problem**: In plain-text interpolation, substituting `{{appName}}` with `"Pomodoro"` destroys the token in the text. Once destroyed, the software cannot tell what was originally a variable vs. template instructions, preventing users from changing values later.
- **The Solution**:
  - The workflow template string is **immutable**.
  - A scanner extracts all `{{variables}}` with keys, default values, and validation flags.
  - The panel renders permanent input cards from this token registry. Typing in the panel updates a reactive key-value dictionary `values: Record<string, string>`, leaving the underlying template intact.
  - The compiled prompt is a purely derived view: `compilePrompt(templateSource, values)`.

### 2.3 Single-Writer Editor Tab Lock (Mutual Exclusion)
- **The Problem**: If a user opens the template in CodeMirror while simultaneously typing in the panel, edits collide and overwrite each other.
- **The Solution**:
  - When the user clicks **"Open in Editor"**, the panel enters an **Editor-Locked State** (`isEditorLocked = true`).
  - All input fields in the panel become `readOnly` or disabled with an amber lock banner.
  - The editor tab displays the prompt draft along with a clean structured YAML or comment variable header.
  - The panel displays: `🔒 Active in Editor Tab: [Prompt] Build New App.md [ 🔄 Sync to Panel ] [ ✕ Release Lock ]`.
  - Closing the editor tab or clicking "Release Lock" restores full editing in the panel.

### 2.4 Auto-Growing Multiline Inputs & Code Payload Scaling
- **The Problem**: Standard `<input>` fields truncate long text to a single line. Standard `<textarea>` fields either don't auto-expand or expand indefinitely off-screen.
- **The Solution**:
  - Implement `AutoResizingTextarea.tsx` using `useLayoutEffect` and `scrollHeight`.
  - Short variables: clamped between 38px and 120px with smooth internal scrolling.
  - Code / Payload variables (`{{application_code}}`): clamped between 100px and 300px with monospace styling, line counter, and an auto-clean paste button (strips preamble and backticks via `extractHtmlFromReply`).

---

## 3. UI Layout & User Experience

```
┌─────────────────────────────────────────────────────────────┐
│  WORKFLOW & PROMPT STUDIO                                ✕  │
├──────────────────────────────┬──────────────────────────────┤
│        [ 🛠️ CREATE ]         │      [ 💡 BRAINSTORM ]       │
├──────────────────────────────┴──────────────────────────────┤
│  Workflows:                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ● Build App Workflow (Active)                          │ │
│  │   ○ Build New App      ○ Adapt Existing App            │ │
│  └────────────────────────────────────────────────────────┘ │
│  [ ＋ New Workflow ]                                        │
├─────────────────────────────────────────────────────────────┤
│  STEP 1: Formulate & Copy Prompt                            │
│                                                             │
│  App Name *                                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Pomodoro Timer                                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  Purpose & Features *                                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Track 25m focus intervals with desktop chimes and      │ │
│  │ break reminders...                                     │ │
│  │ (auto-expands up to 120px)                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [ 📝 Open in Editor Tab ]      [ 📋 Copy Prompt for AI ]   │
├─────────────────────────────────────────────────────────────┤
│  STEP 2: Ingest Application Code                            │
│                                                             │
│  Generated Application Code * (HTML/JS/CSS)                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <!DOCTYPE html>                                        │ │
│  │ <html lang="en">...                                    │ │
│  │ [Monospace, Line counter, max 280px scrollable]        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  [ 🚀 Open as .cntxt Tab ]   [ 💾 Save as File ]            │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technical Design & Canonical Contracts

### 4.1 Canonical Data Shapes (`contracts/data_shapes.ts`)

```typescript
export type WorkflowCategory = 'create' | 'brainstorm';

export type WorkflowCompletionAction = 
  | 'create-cntxt-tab' 
  | 'create-panel-app' 
  | 'open-editor-tab' 
  | 'save-to-workspace' 
  | 'copy-prompt';

export interface WorkflowVariableField {
  key: string;            // e.g. "appName"
  label: string;          // e.g. "App Name"
  defaultValue?: string;  // e.g. "DocuBridge"
  isRequired: boolean;
  type: 'text' | 'textarea' | 'code' | 'select';
  options?: string[];     // for select fields (e.g. layout, persistence)
  placeholder?: string;
  description?: string;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  template: string;       // Prompt containing {{variables}}
  fields: WorkflowVariableField[];
  outputVariableKey?: string; // e.g. "application_code"
}

export interface WorkflowDefinition {
  id: string;
  category: WorkflowCategory;
  name: string;
  description: string;
  icon: string;
  steps: WorkflowStep[];
  completionAction: WorkflowCompletionAction;
  isBuiltin: boolean;
}
```

### 4.2 Declarative Workflows (`src/features/workflows/builtinWorkflows.ts`)

1. **`build-app` (Create Tab)**:
   - Variant A: `build-new-app` (monolithic HTML/CSS/JS with 14 theme tokens and state block).
   - Variant B: `adapt-existing-app` (ports existing HTML/JS/CSS to CNTXT architecture and theme variables).
   - Fields: `appName`, `purpose`, `persistence`, `layout`, `themeMode`, `application_code`.
   - Output: Compiles into `.cntxt` file buffer, opens in a new tab with `[[action:panel_app_convert_active_tab|🚀 Install to App Rail]]`.

2. **`app-brainstorm` (Brainstorm Tab)**:
   - Step 1: Raw Idea Formulation (`appConcept`, `targetAudience`, `keyPainPoint`).
   - Step 2: Feature & UI Model Scoping (`constraints`, `sidebarWidth`).
   - Output: Generates a structured Markdown concept document in a new tab with a 1-click bridge to "Start Building in Create Tab".

---

## 5. Phased Implementation Roadmap

### Phase 1: Clean Up CodeMirror (`[[{{...}}]]` Eradication)
- Remove `[[{{...}}]]` parsing and `VariableInputWidget` from `src/extensions/templateVariables.ts`.
- Retain clean typography mark for `{{var}}`.
- Update `src/extensions/liveMarkdown.ts` and `src/extensions/slashCommands.ts` to remove references to `[[{{...}}]]` while leaving `[[action:...]]` untouched.
- Verify existing CodeMirror test suites pass.

### Phase 2: Contracts, Parsing Engine & Store
- Add `WorkflowDefinition`, `WorkflowCategory`, `WorkflowStep`, and `WorkflowVariableField` to `contracts/data_shapes.ts` and sync with `context/contracts/data_shapes.ts`.
- Build `src/features/workflows/templateEngine.ts`:
  - `extractTemplateVariables(template: string)`: Parses `{{key}}`, `{{key:default}}`, `{{key*}}`.
  - `compileTemplate(template: string, values: Record<string, string>)`: Produces the interpolated view.
- Create `src/features/workflows/builtinWorkflows.ts` defining `build-app` and `app-brainstorm`.
- Create `src/features/workflows/workflowStudioStore.ts`:
  - Active tab (`'create' | 'brainstorm'`).
  - Active workflow and step index.
  - Reactive `values: Record<string, string>`.
  - Linked editor tab ID & `isEditorLocked` flag.

### Phase 3: Ergonomic UI Components
- Build `src/components/Common/AutoResizingTextarea.tsx` (auto-height, clamped max-height, monospace code mode, text wrapping).
- Build `src/components/workflows/WorkflowFormView.tsx` (dynamic variable cards, lock banner, copy prompt button).
- Build `src/components/workflows/WorkflowCatalogView.tsx` (workflow card switcher, + Create workflow placeholder).

### Phase 4: Tab Synchronization & Single-Writer Lock
- Implement `openInEditorTab(workflow, step)` in `workflowStudioStore`:
  - Opens `[Prompt] <Workflow>.md` in `tabStore`.
  - Generates structured YAML frontmatter for variables + preview prompt.
  - Engages `isEditorLocked = true` in panel.
- Implement `syncFromEditorTab(tabId)`:
  - Parses frontmatter back into `values`.
  - Updates panel fields seamlessly.
- Wire tab close listener to auto-release panel lock.

### Phase 5: Action Button & Output Integration
- Register action `panel_app_convert_active_tab` in `actionRegistry` / `hostCommandBus`.
- When user pastes code into `{{application_code}}` and clicks **"Generate .cntxt Tab"**:
  - Compiles full `.cntxt` file with ` ```html ` and ` ```state ` blocks.
  - Prepends action badge: `[[action:panel_app_convert_active_tab|🚀 Install to App Rail]]`.
  - Opens in a new tab via `tabStore.createTab(...)`.

### Phase 6: AppBuilderPanel Rebuild & Verification
- Rebuild `src/components/panelApps/AppBuilderPanel.tsx` to host the new Workflow Studio with Create and Brainstorm tabs.
- Run full Vitest suite (`npm test`).
- Run TypeScript and platform leak checks (`npm run lint`).
- Validate UI behavior in separate terminal and ensure zero regressions.

---

## 6. Verification Gates

1. **Unit Test Gate**: Add test suite `tests/workflowEngine.test.ts` verifying variable parsing, default value extraction, template compilation, and editor frontmatter round-tripping.
2. **Platform Leak Gate**: 0 unauthorized browser/platform imports (`npm run lint`).
3. **Contract Parity**: 100% byte-synchronization between root and context contracts.
4. **Ergonomic Gate**: Textareas wrap text without horizontal overflow; code pasting up to 50KB handles smoothly without layout breaks.
