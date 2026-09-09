import { renderLatex } from './mathRenderer';

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
  return inner.split('|').map(c => c.trim());
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
 */
export function formatTableCellHtml(text: string): string {
  if (!text) return '&nbsp;';

  // 1. Process inline math: $formula$
  let formatted = text.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (_, formula) => {
    const res = renderLatex(formula, false);
    return `<span class="cm-table-math inline-flex align-middle">${res.html}</span>`;
  });

  // 2. Process inline code: `code`
  formatted = formatted.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[#27272F] text-[#38BDF8] border border-[#3F3F46]">$1</code>');

  // 3. Process bold: **bold**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Process italic: *italic*
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 5. Process links: [text](url)
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#38BDF8] underline hover:text-[#7DD3FC]">$1</a>');

  return formatted;
}
