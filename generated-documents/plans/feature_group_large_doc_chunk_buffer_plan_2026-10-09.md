# Implementation Plan: Virtual Buffer Coordinator (`chunkBufferService.ts`)
**Target:** Non-Destructive Disk Splicing for Truncated Large Document Editing  
**Date:** 2026-10-09  
**Status:** PROPOSED ARCHITECTURAL SPECIFICATION  
**Scope:** `CNTXT` Desktop & Mobile  

---

## 1. Executive Summary & Problem Context

Currently, `CNTXT` includes a functional threshold-based selective chunk loader (`LargeDocModal.tsx` + `largeDocHelper.ts`). When a document exceeds the configured threshold (e.g., 500 KB on Desktop, 150 KB on Mobile), the user can check specific sections in the Table of Contents outline to mount into the editor.

### The Critical Vulnerability in Current State
When sections are loaded into the editor, the active tab's content is replaced with:
```markdown
# [Truncated View] <filename>
> ℹ️ Viewing X of Y sections...

<selected section 1>
---
<selected section 2>
```
If the user presses **Ctrl + S** or triggers **File > Save Document**, `eventDispatcher.ts` writes `activeTab.content` directly to `activeTab.filePath`. **This permanently overwrites the original file on disk with the truncated preview, permanently deleting all unselected sections.**

The Virtual Buffer Coordinator (`chunkBufferService.ts`) is designed to eliminate this hazard by keeping the original full document buffer intact in memory, tracking section boundary offsets, and non-destructively splicing edited chunks back into their exact ranges in the full file upon saving.

---

## 2. Core Architecture & Data Models

### 2.1 Tab State Extension (`contracts/data_shapes.ts`)
Extend the canonical `Tab` contract to track chunking state:

```typescript
export interface ChunkSectionRange {
  id: string;
  headingText: string;
  level: number;
  originalStartLine: number; // 0-indexed line in original full file
  originalEndLine: number;   // 0-indexed line where next section starts
  originalContent: string;   // exact raw text of this section when loaded
}

export interface ChunkSessionMetadata {
  isChunked: boolean;
  originalFullContent: string;
  originalChecksum: string;   // fast SHA-256 or CRC32 to detect external modification
  sections: ChunkSectionRange[];
  headerNoticeLines: number;  // lines consumed by '# [Truncated View] ...'
}

// Added to Tab:
export interface Tab {
  // ... existing fields ...
  chunkSession?: ChunkSessionMetadata;
}
```

---

## 3. Component Design (`src/services/chunkBufferService.ts`)

`chunkBufferService.ts` will provide a pure, decoupled coordinator module:

### 3.1 Session Initialization
```typescript
export function initializeChunkSession(
  fullContent: string,
  selectedHeadingIndices: number[],
  headings: Array<{ level: number; text: string; lineNumber: number }>
): {
  editorContent: string;
  session: ChunkSessionMetadata;
}
```
- Inserts unique, parseable delimiter markers around mounted sections (e.g. `<!-- cntxt:section:start id="..." -->` and `<!-- cntxt:section:end id="..." -->`).
- Records the original full document text and calculates initial checksum.

### 3.2 Splicing & Reconstitution Engine
```typescript
export function stitchBuffer(
  session: ChunkSessionMetadata,
  currentEditorContent: string
): {
  success: boolean;
  stitchedContent?: string;
  error?: string;
}
```
- **Delimiter Parsing**: Scans `currentEditorContent` for section start/end delimiters.
- **Content Extraction**: Extracts the user's modifications for each selected section.
- **Offset-Independent Reconstruction**:
  - Iterates through the original document line-by-line or section-by-section.
  - Leaves unselected sections 100% byte-for-byte identical.
  - Replaces selected section spans with the new edited text.
- **Integrity Validation**: Verifies that all expected section delimiters exist and match the session schema. If a user deleted a delimiter marker, fails safe without touching the disk.

### 3.3 Disk Save Safety Interlocks
Before writing the stitched content to disk:
1. **Safety Backup**: Create `${filePath}.cntxt_bak` immediately before writing.
2. **Atomic Write**: Write stitched content to disk.
3. **Session Update**: Update `session.originalFullContent` and `session.originalChecksum` with the newly written file state so subsequent saves continue seamlessly.

---

## 4. Save Pipeline Interception

Update `eventDispatcher.ts` and `tauriRuntimeAdapter.ts`:

```typescript
// Inside handleSaveDocument:
if (activeTab.chunkSession?.isChunked) {
  const stitchResult = stitchBuffer(activeTab.chunkSession, activeTab.content);
  if (!stitchResult.success) {
    addNotification(
      'Save Interrupted',
      stitchResult.error || 'Section markers corrupted. Please use Save As or Open Full Document.',
      'error'
    );
    return;
  }
  contentToSave = stitchResult.stitchedContent;
}
```

---

## 5. Phased Implementation Roadmap

- **Phase 1: Contract & Service Core**
  - Update `contracts/data_shapes.ts` with `ChunkSessionMetadata`.
  - Implement `src/services/chunkBufferService.ts` with 100% test coverage for:
    - Clean single-section edit and splice.
    - Multi-section edit with line expansion and contraction.
    - Corrupt/missing delimiter detection and fail-closed handling.
- **Phase 2: Modal & Store Integration**
  - Update `LargeDocModal.tsx` to initialize `chunkSession` on the created tab instead of writing plain truncated text.
  - Ensure `tabSessionCache.ts` serializes/deserializes chunk sessions safely.
- **Phase 3: Save Interceptors & Backups**
  - Wire `stitchBuffer` into `eventDispatcher.ts` (`handleSaveDocument` / `handleSaveAsDocument`).
  - Disable `enableAutosave` on chunked tabs to prevent background race conditions.
- **Phase 4: UI Status Indicators**
  - Add a persistent status pill in `ShellTitleBar.tsx` / `MobileAccessoryBar`:
    `[⚡ Chunked View: 3/12 Sections | Open Full Document]`
