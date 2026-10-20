# FEATURE GROUP DEFINITION: FG-19 Large Document Virtualization & Non-Destructive Buffer Coordinator
* **Date:** 2026-10-19
* **Status:** Planned (Adjusted by Prod Agent post-Plan Audit)
* **Target Platform & Stack:** Desktop (Windows, macOS, Linux via Tauri v2 + Rust) + Web (Vercel) + Mobile (Android)
* **Document Path:** generated-documents/plans/feature_group_FG19_large_doc_virtualization_2026-10-19.md
* **Authoritative Reference:** generated-documents/plans/feature_group_large_doc_chunk_buffer_plan_2026-10-09.md
* **Audit Reconciliation:** Reconciled against FIND-PLAN-19-01, FIND-PLAN-19-02, FIND-PLAN-19-03

---

#### 1. SCOPE & BOUNDARIES
**Features Included:**
* **Virtual Buffer Coordinator (`chunkBufferService.ts`)**: Decoupled headless manager tracking full document buffers in memory/swap, calculating section offset line ranges, and maintaining checksums.
* **Non-Destructive Disk Splicing on Save**: Intercepts `Ctrl+S`, `File > Save`, and auto-save events when a document tab is in chunked/truncated mode. Instead of overwriting the file on disk with truncated markdown, extracts the edited slice, calculates line delta shifts, and splices the changes cleanly back into the full original text buffer before flushing to storage.
* **Fuzzy Anchor & Content-Hash Boundary Recovery (FIND-PLAN-19-02)**: Splicing coordinates sections by line offsets, unique AST heading signatures, and content hashes. If the user edits, renames, or indents a heading inside the chunk view, the splice coordinator applies a 3-tier boundary resolution heuristic:
  1. Exact identifier comment tag match (e.g. `<!-- cntxt-chunk:section-id -->`).
  2. Fuzzy regex heading match with Levenshtein distance <= 3.
  3. Non-destructive safety append fallback: if boundaries cannot be deterministically resolved, the full file is preserved untouched, changes are saved to `${filename}.edited-chunk.md`, and an actionable modal alerts the user, guaranteeing zero data destruction.
* **Checksum & External Modification Collision Detection**: Fast checksum (djb2 / CRC32 / SHA-256) of the original full content recorded at chunk load time. If the file on disk is modified by an external program before save, prompts user with a 3-way diff / conflict resolution modal (Overwrite Disk, Reload External, Save As New File) to prevent silent data loss.
* **Dynamic Table of Contents Paging & Chunk Loader UI (`LargeDocModal.tsx`)**: Upgraded modal with section size indicators, estimated token counts, "Select All", "Clear All", and 1-click presets ("First 50KB", "Middle Sections", "Append-Only Tail").
* **Truncated View Header Banner & Line Counter**: Renders a dedicated non-editable CodeMirror banner widget or status notification (`Viewing sections X-Y of Z lines · Non-destructive splice active`) with a 1-click "Mount Full Document" override button.

**Features Explicitly Excluded (Non-Goals for this Group):**
* **Arbitrary Binary or Non-Markdown AST Splicing**: Non-destructive chunk splicing is strictly scoped to UTF-8 text and markdown documents delineated by headings or byte offsets. Excludes binary files or AST-parsed structural formats like SQLite databases.
* **Collaborative Real-Time CRDT Multi-Cursor Synchronization**: This feature coordinates local tab buffers and file storage; real-time operational transformation / CRDT sync with remote users is deferred.
* **Infinite Virtual Scroll Canvas for 500MB Files**: Documents > 100MB are recommended for external CLI streaming; the virtual coordinator is optimized for technical documentation, RFCs, and prompt transcripts between 500KB and 50MB.

---

#### 2. CANONICAL DATA SHAPES & DEPENDENCY MAPPING
**Target Data Shapes to Add to `contracts/data_shapes.ts` (FIND-PLAN-19-01):**
* `ChunkSectionRange`:
  ```typescript
  export interface ChunkSectionRange {
    id: string;
    headingText: string;
    level: number;
    originalStartLine: number;
    originalEndLine: number;
    originalContent: string;
    contentHash: string; // SHA-256 / djb2 of initial section text for fuzzy reconciliation
  }
  ```
* `ChunkSessionMetadata`:
  ```typescript
  export interface ChunkSessionMetadata {
    isChunked: boolean;
    originalFullContent: string;
    originalChecksum: string;
    sections: ChunkSectionRange[];
    headerNoticeLines: number;
  }
  ```
* Extended `Tab`:
  ```typescript
  export interface Tab {
    // ... existing fields ...
    chunkSession?: ChunkSessionMetadata;
    isLargeDoc?: boolean;
    totalOriginalBytes?: number;
  }
  ```

**Prerequisites (Upstream dependencies):**
* `contracts/data_shapes.ts`: Add `ChunkSessionMetadata` and `ChunkSectionRange` in Step 1.
* `contracts/boundarySchemas.ts`: Add `validateChunkSplicePayload` Zod schema.
* `src/store/tabStore.ts`: Tab state persistence and active tab save pipeline.
* `src/services/eventDispatcher.ts`: Keybinding dispatch for `CMD_SAVE` and `CMD_SAVE_AS`.
* `src/ui-contract/bridgeContract.ts`: Native filesystem read/write (`readFile`, `writeFile`).

**Downstream Dependencies (What breaks if this group is incomplete):**
* `src/components/Editor/Editor.tsx`: Must recognize chunk metadata to display non-destructive indicator.
* `src/components/Modals/LargeDocModal.tsx`: Must initialize `ChunkSessionMetadata` and dispatch to `tabStore`.
* File system integrity: Critical safety boundary preventing truncated text from destroying disk data.

---

#### 3. MOCK REGISTRY IMPACT (PHYSICAL CLEARING PLAN)
| Mock ID | Physical File (`mocks/`) | Real Native Target | Clearing Action |
| :--- | :--- | :--- | :--- |
| MOCK-CHUNK-01 | None (Zero existing mocks in production) | `src/services/chunkBufferService.ts` | Fully native implementation from day one. |

**Remaining Quarantined Mocks (Surviving this session):**
* Zero mocks survive. Production remains at 0 mocks.

---

#### 4. BACKGROUND PROCESSES & EXPERIMENTAL SETTINGS GATING
| Process Name | Purpose & Interval | Settings Toggle Path | Default State |
| :--- | :--- | :--- | :--- |
| `LargeDocDiskWatcher` | Periodic checksum check of underlying file on disk for chunked tabs (every 5000ms while tab active) | Settings -> Experimental -> `enableLargeDocExternalWatch` | OFF (Manual check on save is always active) |

---

#### 5. UI/UX, DESIGN SYSTEM & SURFACE PRIMITIVES
* **Surface Primitives:**
  - `LargeDocModal`: Enhanced Obsidian Glass dialog with section checkbox hierarchy and token approximations.
  - `ChunkNoticeBanner`: Subdued amber/cyan Cyberpunk HUD banner at line 1 of CodeMirror indicating active chunk slice and total line budget.
  - `ConflictDialog`: Three-way reconciliation modal when external file timestamps mismatch.
* **Theme Tokens:** Visual values derived strictly from `src/theme/index.js` (Obsidian Glass `#141417`, Cyber Cyan `#00f0ff`, Amber Warning `#f59e0b`).
* **Responsive Ergonomics:** Touch-friendly 44px hit targets on mobile/tablet outline checkboxes; automatic chunk threshold adjustment (Desktop: 500KB, Mobile: 150KB).
* **Presenter Purity:** UI components (`LargeDocModal.tsx`, `ChunkNoticeBanner.tsx`) are 100% pure UI driven strictly by typed props. Zero direct Tauri IPC or storage calls inside views.

---

#### 6. VALIDATION, ERROR HANDLING & USER NOTIFICATIONS
* **Input Validation:** Zod schemas in `contracts/boundarySchemas.ts` for all chunk splice ranges (`validateChunkSplicePayload`).
* **Notification Strategy:** Visible toasts on chunk mounting (`Mounted 3 sections (14.2 KB) from 4.8 MB document`), save success (`Spliced and saved into original 4.8 MB file`), and conflict warnings (`External file change detected`).
* **Zero Silent Failures:** If splicing fails due to corrupted boundary markers or regex mismatch, save is aborted, original file is left untouched, and an actionable error toast prompts the user to save as a new document.
* **Visual Error Boundaries (FIND-PLAN-19-03):** Wrap `LargeDocModal.tsx` and `ChunkNoticeBanner.tsx` in React `<ErrorBoundary fallback={<ChunkFallbackBanner />}>` to isolate rendering errors without tearing down the shell editor.
* **Crash Resilience:** Splicing calculations occur in memory; a backup copy (`.cntxt.bak`) is written to temp storage prior to disk overwrite.

---

#### 7. ACCEPTANCE CRITERIA
- [ ] `contracts/data_shapes.ts` updated with `ChunkSectionRange` and `ChunkSessionMetadata`
- [ ] `chunkBufferService.ts` implemented with 100% pure slicing, splicing, and fuzzy fallback logic
- [ ] Unit tests for `chunkBufferService.ts` covering multi-section edits, deletions, insertions, heading renames, and checksum conflicts
- [ ] Saving a truncated document preserves all unselected sections byte-for-byte on disk
- [ ] `LargeDocModal.tsx` integrates with `chunkBufferService.ts` and is wrapped in an Error Boundary
- [ ] Pass 1 Independent Blind Audit completed and reconciled
- [ ] Zero lint errors (`npm run lint`), all tests passing (`npm run test`)

---

#### 8. RISK, FRICTION & SECURITY ASSESSMENT
* **Anticipated Friction:** Line numbers and section boundary positions shifting as the user types, adds newlines, or deletes paragraphs inside the active chunk.
  - *Mitigation*: Triple-tier boundary resolution (HTML comment anchors -> fuzzy regex -> safety fallback append file).
* **Security & Sandboxing:** Ensure temporary backup files reside strictly in canonical app cache directories with restricted user permissions.
