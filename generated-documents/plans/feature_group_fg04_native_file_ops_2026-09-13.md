# FEATURE GROUP DEFINITION
## Feature Group: FG-04: Native File System & Top Menu Operations
Version: 1.0  
Date: 2026-09-13  
Status: [x] Draft  [ ] Approved  [ ] Implemented  [ ] Audited  
Document Location: `/generated-documents/plans/feature_group_fg04_native_file_ops_2026-09-13.md`  

---

### 1. Context & Authority
This specification is authored under **PROMPT 13 — Feature Group Definition Prompt** of the *Solo Dev AI-Assisted Workflow (Platform-Agnostic Edition v2.0)*. It establishes the architectural scope, boundary constraints, canonical data contracts, mock unlinking plan, and acceptance criteria for **FG-04**.

**Attached Authority & Reference Context:**
- Primary Workspace Operating Manual: `C:\Projects\LocalActive\AGENTS.md`
- Master Prompt Index: `C:\Projects\LocalActive\KnowledgeBase\development-workflow\00_master_prompt_index.md`
- Living Context Document: `/generated-documents/context/living_context.md`
- Project Brief: `/generated-documents/context/project_brief_v1.0.md`
- Canonical Data Shapes: `contracts/data_shapes.ts`
- Physical Mock Quarantine: `mocks/index.ts`

---

### 2. Feature Group Definition
- **Group Name**: `FG-04: Native File System & Top Menu Operations`
- **Target Platform & Tech Stack**: Tauri v2 (Rust desktop layer), React 19, TypeScript, Vite 6, Zustand 5, CodeMirror 6, Tailwind CSS v4.

#### Features Included:
1. **Native File Save Pipeline (`File -> Save Document`, `Ctrl+S`)**:
   - When active tab has a valid `filePath`, invoke `bridge.fs.saveFile(tab.filePath, tab.content)` to write directly to the local disk.
   - Update tab state: clear `isDirty`, update `lastModifiedTime`, dispatch visual success notification.
   - When active tab has no `filePath` (untitled document), automatically forward to `onSaveAs` to prompt user for native OS destination path.
2. **Native Save As Pipeline (`File -> Save As...`, `Ctrl+Shift+S`)**:
   - Eliminate browser `prompt('Enter new document name:')` mock dialog.
   - Route through `bridge.fs.saveFileAs(activeTab.title, activeTab.content)` triggering native OS save dialog (`save_file_dialog` Rust command).
   - Upon path selection, write file content, update tab `title` to filename, set `filePath`, clear `isDirty`, and record in `fileHistoryStore`.
3. **Native Folder & Workspace Ingestion (`File -> Open Folder...`, `Ctrl+K Ctrl+O`)**:
   - Add **Open Folder...** to the `File` menu dropdown and register `Ctrl+K Ctrl+O` in global keyboard listeners.
   - Remediate adapter contract mismatch in `tauriRuntimeAdapter.ts`: transform Rust `FileNode` items (`is_dir: bool`) into typed `BridgeDirectoryEntry` shapes (`type: is_dir ? 'folder' : 'file'`).
   - Populate `FileExplorer` with the real directory tree upon selection.
4. **Lazy / On-Demand File Content Ingestion**:
   - When a user selects a file from the workspace explorer that only contains metadata (`path`, `name`) and unfetched content, load file content on-demand via `bridge.fs.readFile(path)` or native bridge before opening or switching the tab.
5. **Standard Desktop Edit Menu Operations (`Edit` Menu)**:
   - Wire **Undo** (`Ctrl+Z`) and **Redo** (`Ctrl+Y`) directly to active CodeMirror view via `editorRegistry` (`@codemirror/commands: undo, redo`).
   - Wire **Cut** (`Ctrl+X`), **Copy** (`Ctrl+C`), and **Paste** (`Ctrl+V`) through `bridge.clipboard` and `navigator.clipboard`.
   - Wire **Select All** (`Ctrl+A`) to active CodeMirror view (`@codemirror/commands: selectAll`).
   - Wire **Find / Replace** (`Ctrl+F`) to active CodeMirror search panel (`@codemirror/search: openSearchPanel`).
6. **View Menu Enhancements**:
   - Add **Toggle Right Sidebar** (`Ctrl+Shift+B`) to `View` menu to easily show/hide the entire right tools panel.

#### Features Explicitly Excluded (Out of Scope):
- **FG-02**: Sandboxed JavaScript Actions migration to detached Web Worker realm (scheduled for FG-02).
- Cloud storage integration, remote Git sync, or multi-user collaboration.

---

### 3. Data Shapes & Dependency Mapping
- **Canonical Data Shapes (`contracts/data_shapes.ts`)**:
  - `VirtualFile` / `FileItem`: Represents nodes in the directory tree (`id`, `name`, `path`, `type: 'file' | 'folder'`, `children`).
  - `BridgeFileResult`: Result from native file picker (`name`, `path`, `content`, `language`).
  - `BridgeFolderResult`: Result from native folder picker (`name`, `path`, `entries: BridgeDirectoryEntry[]`).
  - `BridgeDirectoryEntry`: Recursive tree representation (`id`, `name`, `type: 'file' | 'folder'`, `path`, `children`).
  - `Tab`: Tab state model (`id`, `title`, `content`, `filePath`, `folderPath`, `isDirty`, `language`, `lastModifiedTime`).
- **Dependencies**:
  - Rust Tauri commands in `src-tauri/src/commands/file.rs`: `read_file`, `write_file`, `open_file_dialog`, `save_file_dialog`, `open_folder_dialog`, `read_directory`.
  - Service Registry: `src/services/editor/editorRegistry.ts`.
- **Dependents (Downstream components that rely on FG-04)**:
  - `tabStore.ts`: Save, dirty state, tab closing verification.
  - `FileExplorer.tsx`: Workspace tree display, pinning, file opening.
  - `ShellTitleBar.tsx` / `ShellFrame.tsx`: Menu bar actions and global keybindings.

---

### 4. Mock Registry Impact (Physical Clearing)
- **Mocks to be permanently cleared**:
  - `MOCK-005` (`INITIAL_PROJECT_FILES` in `mocks/index.ts`):
    - File: `mocks/index.ts:74`
    - Target: Completely disconnected from `FileExplorer.tsx` production code path.
    - Behavior: When no folder is opened and no virtual files are saved, `FileExplorer` initializes with a clean empty state (`[]`), displaying an empty state prompt with action buttons (`Open Folder`, `Create File`).
    - Mock Quarantine Compliance: Zero inline fake file fixtures in production components.

---

### 5. Background Processes
- **New background processes introduced**: NONE.
- **Existing background processes involved**:
  - `Document Autosave Loop`: Uses existing `debouncedContentSave` persisting to KV storage.
  - The autosave toggle already exists in `SettingsPanel.tsx` under Experimental Settings (`enableExperimentalSettings` master toggle).

---

### 6. Acceptance Criteria
Define what "done" means for FG-04:
- [ ] **Native Save**: Pressing `Ctrl+S` or selecting `File -> Save Document` writes directly to disk via `bridge.fs.saveFile` when `tab.filePath` exists; marks tab clean (`isDirty: false`); displays success toast.
- [ ] **Save As Flow**: Untitled files (`tab.filePath === null`) prompt native OS save dialog on `Ctrl+S` or `Ctrl+Shift+S`; writes file to disk; assigns `filePath` and updates tab title.
- [ ] **Open Folder Flow**: `File -> Open Folder...` opens native OS directory picker, parses tree into compliant `BridgeDirectoryEntry[]`, and populates `FileExplorer`.
- [ ] **File Explorer Ingestion**: Clicking a file node in `FileExplorer` loads contents from disk and opens/activates tab.
- [ ] **Mock Quarantined**: `INITIAL_PROJECT_FILES` physically unlinked from production `FileExplorer.tsx`.
- [ ] **Edit Menu Operational**: `Undo`, `Redo`, `Select All`, and `Find` trigger active CodeMirror commands.
- [ ] **Universal Presenter Purity**: Visual components (`ShellTitleBar`, `FileExplorer`, `TabBar`) maintain zero direct Tauri or Node API calls; 100% routed through `useRuntimeBridge()`.
- [ ] **Platform Leaks**: 0 platform leaks detected (`npm run lint`).
- [ ] **Unit Tests**: Full test suite passing via Prompt 14b covering save, save as, directory normalization, and empty states.

---

### 7. Risk Assessment
1. **Path Normalization & Security**:
   - *Risk*: Windows backslashes (`\`) vs Unix slashes (`/`) in path manipulation and path traversal.
   - *Mitigation*: Rust backend already enforces `validate_path()` canonicalization and blocks system root targets. Frontend adapter will use standard normalized path separators.
2. **Empty State UX**:
   - *Risk*: If `INITIAL_PROJECT_FILES` is cleared, new users on desktop see a blank panel.
   - *Mitigation*: Design an inviting empty-state presenter in `FileExplorer.tsx` with clear call-to-action buttons ("Open Folder", "Open File", "New Document").
3. **Editor Registry Availability**:
   - *Risk*: Edit commands dispatched when no editor view is focused/mounted (e.g. rendered mode).
   - *Mitigation*: Check `editorRegistry.getView(activeTabId)` before dispatching; provide graceful feedback or fallback.
