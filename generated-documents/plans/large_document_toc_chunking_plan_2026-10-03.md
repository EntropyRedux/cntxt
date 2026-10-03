# Architecture Plan: Large Document Truncation & TOC-Driven Chunk Loading

- **Date:** 2026-10-03
- **Targets:** Android Mobile (High Priority) & Desktop (Power User)
- **Status:** Approved Architecture Plan

---

## 1. Problem Statement & Context
On mobile hardware (Android via Tauri Mobile) and lower-powered devices, loading entire large markdown files (>100KB to 2MB+) causes:
1. High memory footprint and DOM thrashing in WebView.
2. Syntax highlighting and parser lag in CodeMirror 6.
3. Slow initial load and scrolling frame drops.

While desktop hardware can comfortably open 10MB+ files, opening massive documents still benefits from structured section navigation.

---

## 2. Threshold Detection Architecture
- **Desktop Default Threshold:** `1,048,576` bytes (1.0 MB) or `10,000` lines.
- **Mobile (Android) Default Threshold:** `102,400` bytes (100 KB) or `1,500` lines.
- **Settings Gate:** Configurable under **Settings -> Editor -> Large Document Threshold** with options:
  - 100 KB (Recommended for mobile)
  - 500 KB
  - 1 MB
  - Always Prompt / Never Prompt

---

## 3. User Flow & Interaction
1. **File Open Event**:
   - The runtime bridge reads file metadata (size and line count).
   - If size > threshold, opening pauses and surfaces the **Selective Chunk Loader Modal**:
     > *"Large Document Detected (~1.4 MB). Would you like to open the entire file or load specific sections?"*
2. **Interactive Outline Tree Selection**:
   - A fast regex stream parser extracts heading structure (`#`, `##`, `###`) without rendering full markdown.
   - The modal renders a checkable Table of Contents tree.
   - User checks desired sections/chapters (or taps "Open Entire Document").
3. **Chunked Editor View**:
   - Only the selected section byte-ranges are mounted into the active CodeMirror document.
   - A sticky canvas banner indicates:
     `Viewing Sections: 2.1 - 2.4 (Chunked View) | [Load Next Section] | [Load All]`
4. **Non-Destructive Save Guarantee**:
   - The file on disk retains the full byte representation.
   - A virtual buffer coordinator (`chunkBufferService.ts`) stitches modified chunks back into their exact byte offset ranges upon saving.
