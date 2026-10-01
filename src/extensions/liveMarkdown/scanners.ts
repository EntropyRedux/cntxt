import { Text } from '@codemirror/state';
import { 
  parseMarkdownTableLines, 
  isTableSeparatorLine, 
  ParsedTable 
} from '../../services/tableParser';

// =========================================================================
// Fenced Code Block Scanning & Structure
// =========================================================================

export interface CodeBlockInfo {
  startLine: number;
  endLine: number;
  language: string;
  isClosed: boolean;
  codeContent: string;
}

export interface CodeBlockLineEntry {
  block: CodeBlockInfo;
  role: 'start' | 'mid' | 'end' | 'single';
}

export function findCodeBlocks(doc: Text): Map<number, CodeBlockLineEntry> {
  const codeBlocksByLine = new Map<number, CodeBlockLineEntry>();
  let currentStartLine = -1;
  let currentFence = '';
  let currentLang = '';
  let codeLines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const lineText = line.text;
    const fenceMatch = lineText.match(/^(\s*)(```+|~~~+)(.*)$/);

    if (currentStartLine === -1) {
      if (fenceMatch) {
        currentStartLine = lineNum;
        currentFence = fenceMatch[2].slice(0, 3);
        currentLang = fenceMatch[3].trim();
        codeLines = [];
      }
    } else {
      if (fenceMatch && fenceMatch[2].startsWith(currentFence)) {
        const block: CodeBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          language: currentLang,
          isClosed: true,
          codeContent: codeLines.join('\n')
        };

        if (currentStartLine === lineNum) {
          codeBlocksByLine.set(lineNum, { block, role: 'single' });
        } else {
          codeBlocksByLine.set(currentStartLine, { block, role: 'start' });
          for (let mid = currentStartLine + 1; mid < lineNum; mid++) {
            codeBlocksByLine.set(mid, { block, role: 'mid' });
          }
          codeBlocksByLine.set(lineNum, { block, role: 'end' });
        }

        currentStartLine = -1;
        currentFence = '';
        currentLang = '';
        codeLines = [];
      } else {
        codeLines.push(lineText);
      }
    }
  }

  if (currentStartLine !== -1) {
    const block: CodeBlockInfo = {
      startLine: currentStartLine,
      endLine: doc.lines,
      language: currentLang,
      isClosed: false,
      codeContent: codeLines.join('\n')
    };
    codeBlocksByLine.set(currentStartLine, { block, role: 'start' });
    for (let mid = currentStartLine + 1; mid <= doc.lines; mid++) {
      codeBlocksByLine.set(mid, { block, role: 'mid' });
    }
  }

  return codeBlocksByLine;
}

// =========================================================================
// LaTeX Math Blocks ($$ ... $$) Scanner
// =========================================================================

export interface MathBlockInfo {
  startLine: number;
  endLine: number;
  latex: string;
}

export function findMathBlocks(
  doc: Text,
  codeBlocksByLine: Map<number, CodeBlockLineEntry>
): Map<number, MathBlockInfo> {
  const mathBlocks = new Map<number, MathBlockInfo>();
  let currentStartLine = -1;
  let lines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    if (codeBlocksByLine.has(lineNum)) continue;

    const line = doc.line(lineNum);
    const trimmed = line.text.trim();

    // Single-line display math: $$ formula $$
    if (currentStartLine === -1 && trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length >= 4) {
      const latex = trimmed.slice(2, -2).trim();
      const info: MathBlockInfo = { startLine: lineNum, endLine: lineNum, latex };
      mathBlocks.set(lineNum, info);
      continue;
    }

    // Multi-line display math starting with $$
    if (currentStartLine === -1) {
      if (trimmed.startsWith('$$')) {
        currentStartLine = lineNum;
        lines = [trimmed.replace(/^\$\$/, '')];
      }
    } else {
      if (trimmed.endsWith('$$') || trimmed === '$$') {
        lines.push(trimmed.replace(/\$\$$/, ''));
        const info: MathBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          latex: lines.join('\n').trim()
        };
        for (let l = currentStartLine; l <= lineNum; l++) {
          mathBlocks.set(l, info);
        }
        currentStartLine = -1;
        lines = [];
      } else {
        lines.push(line.text);
      }
    }
  }

  return mathBlocks;
}

// =========================================================================
// Markdown Table Scanner
// =========================================================================

export interface TableBlockInfo {
  startLine: number;
  endLine: number;
  table: ParsedTable;
}

export function findTables(
  doc: Text,
  codeBlocksByLine: Map<number, CodeBlockLineEntry>,
  mathBlocksByLine: Map<number, MathBlockInfo>
): Map<number, TableBlockInfo> {
  const tables = new Map<number, TableBlockInfo>();
  let lineNum = 1;

  while (lineNum <= doc.lines) {
    if (codeBlocksByLine.has(lineNum) || mathBlocksByLine.has(lineNum)) {
      lineNum++;
      continue;
    }

    const line = doc.line(lineNum);
    const lineText = line.text;

    // A table header must contain '|' and be immediately followed by a separator row
    if (lineText.includes('|') && lineNum < doc.lines) {
      if (!codeBlocksByLine.has(lineNum + 1) && !mathBlocksByLine.has(lineNum + 1)) {
        const nextLine = doc.line(lineNum + 1).text;
        if (isTableSeparatorLine(nextLine)) {
          const tableLines = [lineText, nextLine];
          let endLine = lineNum + 1;
          for (let l = lineNum + 2; l <= doc.lines; l++) {
            if (codeBlocksByLine.has(l) || mathBlocksByLine.has(l)) break;
            const currText = doc.line(l).text;
            if (!currText.trim() || !currText.includes('|')) break;
            tableLines.push(currText);
            endLine = l;
          }

          const parsed = parseMarkdownTableLines(tableLines);
          if (parsed) {
            const info: TableBlockInfo = {
              startLine: lineNum,
              endLine,
              table: parsed
            };
            for (let l = lineNum; l <= endLine; l++) {
              tables.set(l, info);
            }
            lineNum = endLine + 1;
            continue;
          }
        }
      }
    }
    lineNum++;
  }

  return tables;
}
