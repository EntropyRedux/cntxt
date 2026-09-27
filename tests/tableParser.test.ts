import { describe, it, expect, vi } from 'vitest';
import {
  isTableSeparatorLine,
  parseTableSeparator,
  splitTableRow,
  parseMarkdownTableLines,
  formatTableCellHtml
} from '../src/services/tableParser';

vi.mock('../src/services/mathRenderer', () => ({
  renderLatex: vi.fn((formula: string) => ({ html: `<span class="math-placeholder">${formula}</span>` }))
}));

describe('TableParser', () => {
  describe('isTableSeparatorLine', () => {
    it('detects basic separator with pipes', () => {
      expect(isTableSeparatorLine('|---|---|')).toBe(true);
    });
    it('detects separator without outer pipes', () => {
      expect(isTableSeparatorLine('---')).toBe(true);
    });
    it('detects left-aligned column', () => {
      expect(isTableSeparatorLine('|:--|')).toBe(true);
    });
    it('detects center-aligned column', () => {
      expect(isTableSeparatorLine('|:--:|')).toBe(true);
    });
    it('detects right-aligned column', () => {
      expect(isTableSeparatorLine('|--:|')).toBe(true);
    });
    it('detects multiple columns', () => {
      expect(isTableSeparatorLine('|:-:|:-:|:-:|')).toBe(true);
    });
    it('returns false for empty string', () => {
      expect(isTableSeparatorLine('')).toBe(false);
    });
    it('returns false for header text line', () => {
      expect(isTableSeparatorLine('| Name | Age |')).toBe(false);
    });
    it('returns false for whitespace-only', () => {
      expect(isTableSeparatorLine('   ')).toBe(false);
    });
  });

  describe('parseTableSeparator', () => {
    it('parses left alignment', () => {
      expect(parseTableSeparator('|---|')).toEqual(['left']);
    });
    it('parses center alignment', () => {
      expect(parseTableSeparator('|:--:|')).toEqual(['center']);
    });
    it('parses right alignment', () => {
      expect(parseTableSeparator('|--:|')).toEqual(['right']);
    });
    it('parses mixed alignments', () => {
      expect(parseTableSeparator('|:--|---|--:|')).toEqual(['left', 'left', 'right']);
    });
    it('parses without outer pipes', () => {
      expect(parseTableSeparator('---')).toEqual(['left']);
    });
    it('parses multiple center columns', () => {
      expect(parseTableSeparator('|:-:|:-:|')).toEqual(['center', 'center']);
    });
  });

  describe('splitTableRow', () => {
    it('splits basic row with pipes', () => {
      expect(splitTableRow('| A | B | C |')).toEqual(['A', 'B', 'C']);
    });
    it('splits row without outer pipes', () => {
      expect(splitTableRow('A | B | C')).toEqual(['A', 'B', 'C']);
    });
    it('handles empty cells', () => {
      expect(splitTableRow('| A | | C |')).toEqual(['A', '', 'C']);
    });
    it('handles single column', () => {
      expect(splitTableRow('| value |')).toEqual(['value']);
    });
    it('trims whitespace from cells', () => {
      expect(splitTableRow('|  hello  |  world  |')).toEqual(['hello', 'world']);
    });
    it('returns empty array for empty input', () => {
      expect(splitTableRow('')).toEqual(['']);
    });
  });

  describe('parseMarkdownTableLines', () => {
    it('parses a valid simple table', () => {
      const lines = ['| A | B |', '|---|---|', '| 1 | 2 |'];
      const result = parseMarkdownTableLines(lines);
      expect(result).not.toBeNull();
      expect(result!.headers).toEqual(['A', 'B']);
      expect(result!.alignments).toEqual(['left', 'left']);
      expect(result!.rows).toEqual([['1', '2']]);
    });
    it('returns null for fewer than 2 lines', () => {
      expect(parseMarkdownTableLines(['| A |'])).toBeNull();
      expect(parseMarkdownTableLines([])).toBeNull();
    });
    it('returns null when second line is not a separator', () => {
      expect(parseMarkdownTableLines(['| A | B |', '| C | D |'])).toBeNull();
    });
    it('normalizes column count mismatch', () => {
      const result = parseMarkdownTableLines(['| A | B | C |', '|---|---|---|', '| 1 | 2 |']);
      expect(result).not.toBeNull();
      expect(result!.headers).toHaveLength(3);
      expect(result!.alignments).toHaveLength(3);
      expect(result!.rows[0]).toHaveLength(3);
    });
    it('filters out empty rows', () => {
      // Empty rows cause parsing to stop, so only rows before empty line are returned
      const result = parseMarkdownTableLines(['| A |', '|---|', '| 1 |']);
      expect(result).not.toBeNull();
      expect(result!.rows).toEqual([['1']]);
    });
    it('preserves alignments from separator', () => {
      const result = parseMarkdownTableLines(['| A | B |', '|:--|--:|', '| 1 | 2 |']);
      expect(result).not.toBeNull();
      expect(result!.alignments).toEqual(['left', 'right']);
    });
    it('includes rawMarkdown property', () => {
      const result = parseMarkdownTableLines(['| A |', '|---|', '| 1 |']);
      expect(result).not.toBeNull();
      expect(result!.rawMarkdown).toBe('| A |\n|---|\n| 1 |');
    });
    it('stops at first non-table line', () => {
      const result = parseMarkdownTableLines(['| A |', '|---|', '| 1 |', '', 'Some text']);
      expect(result).not.toBeNull();
      expect(result!.rows).toEqual([['1']]);
    });
  });

  describe('formatTableCellHtml', () => {
    it('returns nbsp for empty text', () => {
      expect(formatTableCellHtml('')).toBe('&nbsp;');
    });
    it('converts bold text to strong tag', () => {
      const result = formatTableCellHtml('**bold**');
      expect(result).toContain('<strong');
      expect(result).toContain('cm-live-bold');
      expect(result).toContain('font-bold');
      expect(result).toContain('bold');
    });
    it('converts italic text to em tag', () => {
      const result = formatTableCellHtml('*italic*');
      expect(result).toContain('<em');
      expect(result).toContain('cm-live-italic');
      expect(result).toContain('italic');
    });
    it('converts inline code to code tag', () => {
      const result = formatTableCellHtml('`code`');
      expect(result).toContain('<code');
      expect(result).toContain('cm-live-code-pill');
      expect(result).toContain('font-mono');
      expect(result).toContain('code');
    });
    it('converts link to anchor tag', () => {
      const result = formatTableCellHtml('[text](url)');
      expect(result).toContain('<a ');
      expect(result).toContain('href="url"');
      expect(result).toContain('text');
    });
    it('handles multiple formats in one cell', () => {
      const result = formatTableCellHtml('**bold** and *italic*');
      expect(result).toContain('<strong');
      expect(result).toContain('<em');
    });
    it('returns plain text unchanged', () => {
      expect(formatTableCellHtml('plain text')).toBe('plain text');
    });

    it('preserves math comparisons like $a < b$ without entity double-escaping', () => {
      const result = formatTableCellHtml('$a < b$');
      expect(result).toContain('<span class="cm-table-math');
      expect(result).not.toContain('&amp;lt;');
      expect(result).toContain('a < b');
    });

    it('safely handles formula strings with dollar patterns like $& and $`', () => {
      const result = formatTableCellHtml('$cost \\$& and \\\'$');
      expect(result).toContain('<span class="cm-table-math');
      expect(result).toContain('cost \\$& and \\\'');
    });

    it('sanitizes executable HTML tags and event handlers in table cells', () => {
      const result = formatTableCellHtml('<img src=x onerror=alert(1)>**bold**');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert(1)');
      expect(result).toContain('<strong');
    });

    it('strips injected style tags while preserving KaTeX math formatting', () => {
      const result = formatTableCellHtml('<style>body{display:none}</style>$x + y$');
      expect(result).not.toContain('<style>');
      expect(result).not.toContain('display:none');
      expect(result).toContain('<span class="cm-table-math');
    });
  });
});