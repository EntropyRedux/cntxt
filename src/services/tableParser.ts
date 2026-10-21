import { renderLatex } from './mathRenderer';
import { sanitizePreviewHtml } from '../adapters';

export interface ParsedTable {
  headers: string[];
  alignments: ('left' | 'center' | 'right')[];
  rows: string[][];
  rawMarkdown: string;
}

export function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes('-')) return false;
  
  // Strip optional outer pipes
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const parts = inner.split('|');
  if (parts.length === 0) return false;

  return parts.every(part => /^\s*:?-+:?\s*$/.test(part));
}

export function parseTableSeparator(line: string): ('left' | 'center' | 'right')[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const parts = inner.split('|');
  return parts.map(part => {
    const trimmed = part.trim();
    const startColon = trimmed.startsWith(':');
    const endColon = trimmed.endsWith(':');
    if (startColon && endColon) return 'center';
    if (endColon) return 'right';
    return 'left';
  });
}

export function splitTableRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/).map(c => c.replace(/\\\|/g, '|').trim());
}

export function parseMarkdownTableLines(lines: string[]): ParsedTable | null {
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const separatorLine = lines[1];

  if (!isTableSeparatorLine(separatorLine)) return null;

  const headers = splitTableRow(headerLine);
  const alignments = parseTableSeparator(separatorLine);

  // Normalize column counts
  const colCount = Math.max(headers.length, alignments.length);
  while (headers.length < colCount) headers.push('');
  while (alignments.length < colCount) alignments.push('left');

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine || !rowLine.includes('|')) break;
    const rowCells = splitTableRow(rowLine);
    while (rowCells.length < colCount) rowCells.push('');
    rows.push(rowCells.slice(0, colCount));
  }

  return {
    headers: headers.slice(0, colCount),
    alignments: alignments.slice(0, colCount),
    rows,
    rawMarkdown: lines.join('\n')
  };
}

/**
 * Format inline text within a table cell (e.g. bold, code, inline math)
 * Preserves KaTeX math expressions without double-escaping while immunizing against HTML/CSS injection.
 */
export function formatTableCellHtml(text: string): string {
  if (!text) return '&nbsp;';

  // 1. Extract inline math into placeholders with a per-run random nonce
  const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const mathPlaceholders = new Map<string, string>();

  const tokenized = text.replace(/(?<!\$)\$(?!\$)((?:\\\$|[^\$\n])+?)(?<!\$)\$(?!\$)/g, (_, formula) => {
    const key = `@@CNTXT_MATH_${nonce}_${mathPlaceholders.size}@@`;
    const res = renderLatex(formula, false);
    mathPlaceholders.set(key, `<span class="cm-table-math inline-flex align-middle" data-cntxt-math="${nonce}">${res.html}</span>`);
    return key;
  });

  // 2. Pre-sanitize non-math text to strip dangerous tags (<style>, <script>, <iframe>)
  const cleanText = sanitizePreviewHtml(tokenized);

  // 3. Escape raw HTML entities on non-math text segments (avoid double-escaping entities from sanitizePreviewHtml)
  let safeText = cleanText
    .replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 4. Process inline code: `code`
  safeText = safeText.replace(/`([^`\n]+)`/g, '<code class="cm-live-code-pill font-mono">$1</code>');

  // 5. Process bold: **bold**
  safeText = safeText.replace(/\*\*([^*]+)\*\*/g, '<strong class="cm-live-bold font-bold">$1</strong>');

  // 6. Process italic: *italic*
  safeText = safeText.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="cm-live-italic italic">$1</em>');

  // 7. Process links: [text](url)
  safeText = safeText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--accent-primary)] underline hover:opacity-80 transition-opacity">$1</a>');

  // 8. Re-inject rendered math placeholders using a replacer function (disabling $&, $', $` special replacement patterns)
  mathPlaceholders.forEach((html, key) => {
    safeText = safeText.replaceAll(key, () => html);
  });

  // 9. Final gate through sanitizePreviewHtml to preserve KaTeX layout styles while eliminating injection
  return sanitizePreviewHtml(safeText);
}
