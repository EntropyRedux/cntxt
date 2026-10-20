/**
 * Virtual Buffer Coordinator (chunkBufferService.ts)
 * 
 * Non-destructive disk splicing and memory virtualization for large markdown documents.
 * Enables editing focused Table of Contents sections without loading multi-megabyte files
 * into CodeMirror memory, while ensuring saving safely splices edits back into the
 * full master file on disk with zero data loss.
 */

import {
  ChunkSectionRange,
  ChunkSessionMetadata,
  ChunkSpliceResult,
} from '../../contracts/data_shapes';
import { validateChunkSplicePayload } from '../contracts/boundarySchemas';

/**
 * Calculates a fast, deterministic 32-bit FNV-1a checksum for content integrity.
 */
export function calculateChecksum(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    // Multiply by 32-bit FNV prime 16777619 with 32-bit overflow
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * Normalizes content for fuzzy hashing by trimming leading/trailing whitespace.
 */
export function computeContentHash(text: string): string {
  return calculateChecksum(text.trim());
}

/**
 * Calculates Levenshtein edit distance between two strings for fuzzy heading matching.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const d: number[][] = [];
  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

export interface HeadingItem {
  level: number;
  text: string;
  lineNumber: number; // 1-indexed line number in full doc
}

/**
 * Initializes a chunked session from full document content and user-selected TOC heading indices.
 */
export function initializeChunkSession(
  fullContent: string,
  selectedHeadingIndices: number[],
  headings: HeadingItem[]
): { session: ChunkSessionMetadata; chunkContent: string } {
  const fullLines = fullContent.split('\n');
  const sortedIndices = [...selectedHeadingIndices].sort((a, b) => a - b);
  const sections: ChunkSectionRange[] = [];
  const chunkParts: string[] = [];

  sortedIndices.forEach((hIdx) => {
    const heading = headings[hIdx];
    const startLine = Math.max(0, heading.lineNumber - 1);
    
    // Determine end line: start of next heading in full document, or EOF
    let endLine = fullLines.length;
    if (hIdx + 1 < headings.length) {
      endLine = Math.max(startLine, headings[hIdx + 1].lineNumber - 1);
    }

    const sectionLines = fullLines.slice(startLine, endLine);
    const sectionText = sectionLines.join('\n');
    const sectionId = `sec-${hIdx}-${startLine}`;
    const marker = `<!-- cntxt-chunk:${sectionId} -->`;

    const sectionRange: ChunkSectionRange = {
      id: sectionId,
      headingText: heading.text,
      level: heading.level,
      originalStartLine: startLine,
      originalEndLine: endLine,
      originalContent: sectionText,
      contentHash: computeContentHash(sectionText),
    };

    sections.push(sectionRange);

    // Format section for chunked editor view with non-rendered anchor comment
    chunkParts.push(`${marker}\n${sectionText}`);
  });

  const chunkContent = chunkParts.join('\n\n');

  const session: ChunkSessionMetadata = {
    isChunked: true,
    originalFullContent: fullContent,
    originalChecksum: calculateChecksum(fullContent),
    sections,
    headerNoticeLines: 0,
    totalDocumentHeadings: headings.length,
  };

  return { session, chunkContent };
}

/**
 * Extracts the user-edited content for a specific section from the active editor text.
 * Applies a 3-tier boundary resolution heuristic:
 * 1. Exact comment anchor tag match: <!-- cntxt-chunk:sectionId -->
 * 2. Exact heading text match: #... Heading
 * 3. Fuzzy heading match (Levenshtein distance <= 3)
 * 4. Single-section fallback: entire editor content belongs to this section
 */
export function extractEditedSectionContent(
  editedChunkText: string,
  section: ChunkSectionRange,
  allSections: ChunkSectionRange[]
): string | null {
  const marker = `<!-- cntxt-chunk:${section.id} -->`;
  const markerIndex = editedChunkText.indexOf(marker);

  if (markerIndex !== -1) {
    // Content starts immediately after the marker comment
    const contentStart = markerIndex + marker.length;
    // Find next marker or EOF
    const remainingText = editedChunkText.slice(contentStart);
    const nextMarkerMatch = remainingText.search(/<!-- cntxt-chunk:sec-[^>]+-->/);

    if (nextMarkerMatch !== -1) {
      return remainingText.slice(0, nextMarkerMatch).trim();
    }
    return remainingText.trim();
  }

  // Fallback 1: Match heading line exactly
  const headingPrefix = '#'.repeat(section.level);
  const headingRegex = new RegExp(`^${headingPrefix}\\s+${escapeRegex(section.headingText)}\\s*$`, 'm');
  const headingMatch = headingRegex.exec(editedChunkText);

  if (headingMatch && headingMatch.index !== -1) {
    const contentStart = headingMatch.index;
    const remainingText = editedChunkText.slice(contentStart);

    // Search for next heading of any level or next comment
    const nextSectionRegex = /\n(?=#{1,6}\s+|<!-- cntxt-chunk:)/g;
    const nextMatch = nextSectionRegex.exec(remainingText.slice(1));

    if (nextMatch) {
      return remainingText.slice(0, nextMatch.index + 1).trim();
    }
    return remainingText.trim();
  }

  // Fallback 2: If this is the only section in the chunk session, use entire editor text
  if (allSections.length === 1) {
    // Strip any stray comment markers and return clean text
    return editedChunkText.replace(/<!-- cntxt-chunk:[^>]+-->/g, '').trim();
  }

  // Fallback 3: Fuzzy heading match
  const lines = editedChunkText.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (match && match[1].length === section.level) {
      const dist = levenshteinDistance(match[2].trim(), section.headingText.trim());
      if (dist <= 3) {
        // Found fuzzy match heading at line i
        const startIdx = lines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
        const remaining = editedChunkText.slice(startIdx);
        const nextHeadingMatch = remaining.slice(1).search(/\n(?=#{1,6}\s+|<!-- cntxt-chunk:)/);
        if (nextHeadingMatch !== -1) {
          return remaining.slice(0, nextHeadingMatch + 1).trim();
        }
        return remaining.trim();
      }
    }
  }

  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splices edited chunk content non-destructively back into the master document buffer.
 * Processes sections from bottom to top (highest line numbers first) so line shifts
 * in one section never alter or invalidate the target ranges of preceding sections.
 */
export function spliceChunkIntoFullContent(
  originalFullContent: string,
  editedChunkContent: string,
  session: ChunkSessionMetadata
): ChunkSpliceResult {
  const parseResult = validateChunkSplicePayload({
    originalFullContent,
    editedChunkContent,
    session,
  });

  if (!parseResult.success) {
    return {
      success: false,
      updatedFullContent: originalFullContent,
      error: `Chunk splice validation failed: ${parseResult.error.message}`,
    };
  }

  let fullLines = originalFullContent.split('\n');

  // Sort sections descending by originalStartLine (bottom-to-top replacement)
  const sortedSections = [...session.sections].sort(
    (a, b) => b.originalStartLine - a.originalStartLine
  );

  const updatedSectionsMap = new Map<string, ChunkSectionRange>();
  let hasFailedSection = false;

  for (const section of sortedSections) {
    const editedText = extractEditedSectionContent(
      editedChunkContent,
      section,
      session.sections
    );

    if (editedText === null) {
      hasFailedSection = true;
      continue;
    }

    const editedLines = editedText.split('\n');
    const startLine = section.originalStartLine;
    const endLine = section.originalEndLine;

    // Safety clamp line indices
    const clampedStart = Math.min(Math.max(0, startLine), fullLines.length);
    const clampedEnd = Math.min(Math.max(clampedStart, endLine), fullLines.length);

    // Replace the slice with newly edited lines
    fullLines.splice(clampedStart, clampedEnd - clampedStart, ...editedLines);

    const lineDelta = editedLines.length - (clampedEnd - clampedStart);

    updatedSectionsMap.set(section.id, {
      ...section,
      originalEndLine: clampedEnd + lineDelta,
      originalContent: editedText,
      contentHash: computeContentHash(editedText),
    });
  }

  if (hasFailedSection && session.sections.length > 1) {
    return {
      success: false,
      updatedFullContent: originalFullContent,
      error: 'Could not deterministically identify section boundaries for all chunks.',
      fallbackFilePath: 'edited-chunk-recovery.md',
    };
  }

  const updatedFullContent = fullLines.join('\n');
  const updatedChecksum = calculateChecksum(updatedFullContent);

  // Recalculate start and end line ranges in ascending order for the new session state
  const newFullLines = updatedFullContent.split('\n');
  const ascendingSections = [...session.sections].sort(
    (a, b) => a.originalStartLine - b.originalStartLine
  );

  const finalSections: ChunkSectionRange[] = [];
  let currentOffset = 0;

  ascendingSections.forEach((s) => {
    const updated = updatedSectionsMap.get(s.id) || s;
    const initialLineSpan = s.originalEndLine - s.originalStartLine;
    const newLineSpan = updated.originalEndLine - updated.originalStartLine;
    const newStartLine = Math.min(s.originalStartLine + currentOffset, newFullLines.length);
    const newEndLine = Math.min(newStartLine + newLineSpan, newFullLines.length);

    finalSections.push({
      ...updated,
      originalStartLine: newStartLine,
      originalEndLine: newEndLine,
    });

    currentOffset += (newLineSpan - initialLineSpan);
  });

  const updatedSession: ChunkSessionMetadata = {
    ...session,
    originalFullContent: updatedFullContent,
    originalChecksum: updatedChecksum,
    sections: finalSections,
  };

  return {
    success: true,
    updatedFullContent,
    updatedSession,
  };
}

/**
 * Detects whether the file on disk was modified externally since the chunk session was opened.
 */
export function detectExternalModification(
  currentDiskContent: string,
  sessionOrChecksum: ChunkSessionMetadata | string
): boolean {
  const originalChecksum = typeof sessionOrChecksum === 'string'
    ? sessionOrChecksum
    : sessionOrChecksum?.originalChecksum;
  if (!originalChecksum) return false;
  const currentChecksum = calculateChecksum(currentDiskContent);
  return currentChecksum !== originalChecksum;
}
