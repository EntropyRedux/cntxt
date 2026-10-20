import { describe, it, expect } from 'vitest';
import {
  calculateChecksum,
  computeContentHash,
  levenshteinDistance,
  initializeChunkSession,
  extractEditedSectionContent,
  spliceChunkIntoFullContent,
  detectExternalModification,
  HeadingItem,
} from '../src/services/chunkBufferService';

describe('chunkBufferService (FG-19 Large Document Virtualization)', () => {
  const sampleMarkdown = `# Document Title
Introductory text before any subheadings.
Spans multiple lines.

## Section 1: Overview
Content for section 1.
First paragraph of section 1.

## Section 2: Architecture
Content for section 2.
Details about system components.

### Subsection 2.1: Rust Core
Sub details here.

## Section 3: Conclusion
Final wrap up.`;

  const headings: HeadingItem[] = [
    { level: 1, text: 'Document Title', lineNumber: 1 },
    { level: 2, text: 'Section 1: Overview', lineNumber: 5 },
    { level: 2, text: 'Section 2: Architecture', lineNumber: 9 },
    { level: 3, text: 'Subsection 2.1: Rust Core', lineNumber: 13 },
    { level: 2, text: 'Section 3: Conclusion', lineNumber: 16 },
  ];

  describe('calculateChecksum & computeContentHash', () => {
    it('generates consistent deterministic checksums', () => {
      const c1 = calculateChecksum('Hello World');
      const c2 = calculateChecksum('Hello World');
      expect(c1).toBe(c2);
      expect(c1).toMatch(/^fnv1a-[0-9a-f]{8}$/);
    });

    it('produces distinct checksums for different text', () => {
      const c1 = calculateChecksum('Hello World');
      const c2 = calculateChecksum('Hello World!');
      expect(c1).not.toBe(c2);
    });

    it('computes content hash ignoring leading and trailing whitespace', () => {
      const h1 = computeContentHash('  some text  \n');
      const h2 = computeContentHash('some text');
      expect(h1).toBe(h2);
    });
  });

  describe('levenshteinDistance', () => {
    it('calculates zero for identical strings', () => {
      expect(levenshteinDistance('Section 1', 'Section 1')).toBe(0);
    });

    it('calculates accurate edit distance', () => {
      expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(levenshteinDistance('Section 1: Overview', 'Section 1: Overviews')).toBe(1);
    });
  });

  describe('initializeChunkSession', () => {
    it('correctly initializes chunk session for selected sections', () => {
      // Select Section 1 (index 1) and Section 3 (index 4)
      const selected = [1, 4];
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, selected, headings);

      expect(session.isChunked).toBe(true);
      expect(session.sections.length).toBe(2);
      expect(session.originalFullContent).toBe(sampleMarkdown);
      expect(session.originalChecksum).toBe(calculateChecksum(sampleMarkdown));

      expect(session.sections[0].headingText).toBe('Section 1: Overview');
      expect(session.sections[0].originalStartLine).toBe(4); // 0-indexed line 4 is line 5
      expect(session.sections[0].originalEndLine).toBe(8);   // up to line 9 (index 8)

      expect(session.sections[1].headingText).toBe('Section 3: Conclusion');
      expect(session.sections[1].originalStartLine).toBe(15);

      // Verify non-rendered HTML comment anchors exist in chunkContent
      expect(chunkContent).toContain('<!-- cntxt-chunk:sec-1-4 -->');
      expect(chunkContent).toContain('<!-- cntxt-chunk:sec-4-15 -->');
      expect(chunkContent).toContain('## Section 1: Overview');
      expect(chunkContent).toContain('## Section 3: Conclusion');
      // Verify unselected Section 2 is NOT in chunkContent
      expect(chunkContent).not.toContain('## Section 2: Architecture');
    });
  });

  describe('extractEditedSectionContent', () => {
    it('extracts section text by comment marker', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      const section = session.sections[0];

      const editedChunk = chunkContent.replace(
        'Content for section 1.',
        'Updated content for section 1 with new insights.'
      );

      const extracted = extractEditedSectionContent(editedChunk, section, session.sections);
      expect(extracted).not.toBeNull();
      expect(extracted).toContain('Updated content for section 1 with new insights.');
    });

    it('falls back to exact heading line match if comment anchor was deleted', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      const section = session.sections[0];

      // Remove the comment anchor
      const editedChunkWithoutMarker = chunkContent
        .replace(/<!-- cntxt-chunk:[^>]+-->\n?/, '')
        .replace('Content for section 1.', 'Modified text here.');

      const extracted = extractEditedSectionContent(
        editedChunkWithoutMarker,
        section,
        session.sections
      );
      expect(extracted).not.toBeNull();
      expect(extracted).toContain('## Section 1: Overview');
      expect(extracted).toContain('Modified text here.');
    });

    it('falls back to fuzzy heading match if user made minor edits to heading line', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      const section = session.sections[0];

      // Remove comment anchor and slightly modify heading (Levenshtein dist 2)
      const editedChunk = chunkContent
        .replace(/<!-- cntxt-chunk:[^>]+-->\n?/, '')
        .replace('## Section 1: Overview', '## Section 1: Overview!');

      const extracted = extractEditedSectionContent(editedChunk, section, session.sections);
      expect(extracted).not.toBeNull();
      expect(extracted).toContain('## Section 1: Overview!');
    });
  });

  describe('spliceChunkIntoFullContent', () => {
    it('splices a single edited section non-destructively back into master document', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      const editedChunk = chunkContent.replace(
        'Content for section 1.',
        'Content for section 1 (REVISED).'
      );

      const result = spliceChunkIntoFullContent(sampleMarkdown, editedChunk, session);

      expect(result.success).toBe(true);
      expect(result.updatedFullContent).toContain('Content for section 1 (REVISED).');
      // Crucial: verify other unselected sections remain completely intact!
      expect(result.updatedFullContent).toContain('# Document Title');
      expect(result.updatedFullContent).toContain('## Section 2: Architecture');
      expect(result.updatedFullContent).toContain('### Subsection 2.1: Rust Core');
      expect(result.updatedFullContent).toContain('## Section 3: Conclusion');

      // Verify updated session checksum and metadata
      expect(result.updatedSession).toBeDefined();
      expect(result.updatedSession?.originalChecksum).toBe(calculateChecksum(result.updatedFullContent));
    });

    it('splices multiple edited sections across different locations with line expansions', () => {
      // Select Section 1 and Section 3
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1, 4], headings);

      // Add 3 new lines to Section 1, and edit Section 3
      let editedChunk = chunkContent.replace(
        'Content for section 1.',
        'Line A\nLine B\nLine C\nContent for section 1.'
      );
      editedChunk = editedChunk.replace(
        'Final wrap up.',
        'Final wrap up with conclusion details.'
      );

      const result = spliceChunkIntoFullContent(sampleMarkdown, editedChunk, session);

      expect(result.success).toBe(true);
      expect(result.updatedFullContent).toContain('Line A\nLine B\nLine C');
      expect(result.updatedFullContent).toContain('Final wrap up with conclusion details.');
      // Middle Section 2 must be untouched
      expect(result.updatedFullContent).toContain('## Section 2: Architecture');
      expect(result.updatedFullContent).toContain('Details about system components.');
    });

    it('safely handles shrinking a section with line deletions', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      // Delete second paragraph of section 1
      const editedChunk = chunkContent.replace('\nFirst paragraph of section 1.', '');

      const result = spliceChunkIntoFullContent(sampleMarkdown, editedChunk, session);
      expect(result.success).toBe(true);
      expect(result.updatedFullContent).not.toContain('First paragraph of section 1.');
      expect(result.updatedFullContent).toContain('## Section 2: Architecture');
    });
  });

  describe('detectExternalModification', () => {
    it('returns false when disk content has matching checksum', () => {
      const { session } = initializeChunkSession(sampleMarkdown, [1], headings);
      const isModified = detectExternalModification(sampleMarkdown, session);
      expect(isModified).toBe(false);
    });

    it('returns true when disk content was altered by an external editor', () => {
      const { session } = initializeChunkSession(sampleMarkdown, [1], headings);
      const externalDiskEdit = sampleMarkdown + '\n<!-- externally edited -->';
      const isModified = detectExternalModification(externalDiskEdit, session);
      expect(isModified).toBe(true);
    });

    it('recovers section boundaries when HTML comment anchors are deleted', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      // Remove anchor tag completely
      const strippedChunk = chunkContent.replace(/<!-- cntxt-chunk:.*? -->\n/g, '');
      const edited = strippedChunk.replace('First paragraph of section 1.', 'Anchor-less edited paragraph.');
      
      const result = spliceChunkIntoFullContent(sampleMarkdown, edited, session);
      expect(result.success).toBe(true);
      expect(result.updatedFullContent).toContain('Anchor-less edited paragraph.');
    });

    it('handles heading rename within active section without crashing', () => {
      const { session, chunkContent } = initializeChunkSession(sampleMarkdown, [1], headings);
      const renamed = chunkContent.replace('## Section 1: Introduction', '## Section 1: Overview');
      
      const result = spliceChunkIntoFullContent(sampleMarkdown, renamed, session);
      expect(result.success).toBe(true);
      expect(result.updatedFullContent).toContain('## Section 1: Overview');
    });

    it('returns failure result and fallback recovery path when multi-section boundaries collapse', () => {
      // 2 sections loaded
      const { session } = initializeChunkSession(sampleMarkdown, [1, 2], headings);
      // Corrupt chunk buffer completely removing all headers and anchors
      const completelyCorruptChunk = 'Corrupted content with no markers or headings whatsoever';

      const result = spliceChunkIntoFullContent(sampleMarkdown, completelyCorruptChunk, session);
      expect(result.success).toBe(false);
      expect(result.fallbackFilePath).toBe('edited-chunk-recovery.md');
      expect(result.error).toContain('Could not deterministically identify section boundaries');
    });
  });
});
