import { Text } from '@codemirror/state';
import {
  parseMarkdownTableLines,
  isTableSeparatorLine,
  ParsedTable,
} from '../../services/tableParser';
import { CntxtBlockParams } from '../../../contracts/data_shapes';
import { parseBlockInfoString } from '../../services/editor/cntxtBlockParser';

// =========================================================================
// CNTXT Rich Container Scanning (Outer `markdown | ...` Blocks)
// =========================================================================

export interface CntxtContainerInfo {
  startLine: number;
  endLine: number;
  fence: string;
  language: string;
  params: CntxtBlockParams;
  isClosed: boolean;
  codeContent: string;
}

export interface CntxtContainerLineEntry {
  container: CntxtContainerInfo;
  role: 'start' | 'mid' | 'end' | 'single';
}

export function findCntxtContainers(doc: Text): Map<number, CntxtContainerLineEntry> {
  const containersByLine = new Map<number, CntxtContainerLineEntry>();
  let currentStartLine = -1;
  let currentFence = '';
  let currentLang = '';
  let currentParams: CntxtBlockParams = {};
  let innerLines: string[] = [];

  // Also track non-rich standard code blocks so an inner `~~~markdown | ...` inside a literal code block isn't misclassified
  let inLiteralCodeFence = '';

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const lineText = line.text;
    const fenceMatch = lineText.match(/^(\s*)(```+|~~~+)(.*)$/);

    if (inLiteralCodeFence) {
      if (
        fenceMatch &&
        fenceMatch[2][0] === inLiteralCodeFence[0] &&
        fenceMatch[2].length >= inLiteralCodeFence.length &&
        fenceMatch[3].trim() === ''
      ) {
        inLiteralCodeFence = '';
      }
      continue;
    }

    if (currentStartLine === -1) {
      if (fenceMatch) {
        const fence = fenceMatch[2];
        const info = fenceMatch[3].trim();
        const parsed = parseBlockInfoString(info);
        if (parsed.isRichContainer) {
          currentStartLine = lineNum;
          currentFence = fence;
          currentLang = info;
          currentParams = parsed.params;
          innerLines = [];
        } else {
          inLiteralCodeFence = fence;
        }
      }
    } else {
      if (
        fenceMatch &&
        fenceMatch[2][0] === currentFence[0] &&
        fenceMatch[2].length >= currentFence.length &&
        fenceMatch[3].trim() === ''
      ) {
        const container: CntxtContainerInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          fence: currentFence,
          language: currentLang,
          params: currentParams,
          isClosed: true,
          codeContent: innerLines.join('\n'),
        };

        if (currentStartLine === lineNum) {
          containersByLine.set(lineNum, { container, role: 'single' });
        } else {
          containersByLine.set(currentStartLine, { container, role: 'start' });
          for (let mid = currentStartLine + 1; mid < lineNum; mid++) {
            containersByLine.set(mid, { container, role: 'mid' });
          }
          containersByLine.set(lineNum, { container, role: 'end' });
        }

        currentStartLine = -1;
        currentFence = '';
        currentLang = '';
        currentParams = {};
        innerLines = [];
      } else {
        innerLines.push(lineText);
      }
    }
  }

  if (currentStartLine !== -1) {
    const container: CntxtContainerInfo = {
      startLine: currentStartLine,
      endLine: doc.lines,
      fence: currentFence,
      language: currentLang,
      params: currentParams,
      isClosed: false,
      codeContent: innerLines.join('\n'),
    };
    containersByLine.set(currentStartLine, { container, role: 'start' });
    for (let mid = currentStartLine + 1; mid <= doc.lines; mid++) {
      containersByLine.set(mid, { container, role: 'mid' });
    }
  }

  return containersByLine;
}

// =========================================================================
// Fenced Code Block Scanning & Structure (Standard & Nested Code Blocks)
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

export function findCodeBlocks(
  doc: Text,
  cntxtContainersByLine?: Map<number, CntxtContainerLineEntry>
): Map<number, CodeBlockLineEntry> {
  const containers = cntxtContainersByLine ?? findCntxtContainers(doc);
  const codeBlocksByLine = new Map<number, CodeBlockLineEntry>();
  let currentStartLine = -1;
  let currentFence = '';
  let currentLang = '';
  let codeLines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const containerEntry = containers.get(lineNum);
    // Skip outer CNTXT Rich Container fence lines so inner blocks are scanned normally!
    if (
      containerEntry &&
      (containerEntry.role === 'start' ||
        containerEntry.role === 'end' ||
        containerEntry.role === 'single')
    ) {
      // If an unclosed inner code block reached the end of the outer container, close it at lineNum - 1
      if (currentStartLine !== -1 && containerEntry.role === 'end') {
        const endL = Math.max(currentStartLine, lineNum - 1);
        const block: CodeBlockInfo = {
          startLine: currentStartLine,
          endLine: endL,
          language: currentLang,
          isClosed: false,
          codeContent: codeLines.join('\n'),
        };
        codeBlocksByLine.set(currentStartLine, { block, role: 'start' });
        for (let mid = currentStartLine + 1; mid <= endL; mid++) {
          codeBlocksByLine.set(mid, { block, role: 'mid' });
        }
        currentStartLine = -1;
        currentFence = '';
        currentLang = '';
        codeLines = [];
      }
      continue;
    }

    const line = doc.line(lineNum);
    const lineText = line.text;
    const fenceMatch = lineText.match(/^(\s*)(```+|~~~+)(.*)$/);

    if (currentStartLine === -1) {
      if (fenceMatch) {
        currentStartLine = lineNum;
        currentFence = fenceMatch[2];
        currentLang = fenceMatch[3].trim();
        codeLines = [];
      }
    } else {
      if (
        fenceMatch &&
        fenceMatch[2][0] === currentFence[0] &&
        fenceMatch[2].length >= currentFence.length &&
        fenceMatch[3].trim() === ''
      ) {
        const block: CodeBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          language: currentLang,
          isClosed: true,
          codeContent: codeLines.join('\n'),
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
      codeContent: codeLines.join('\n'),
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
  codeBlocksByLine: Map<number, CodeBlockLineEntry>,
  cntxtContainersByLine?: Map<number, CntxtContainerLineEntry>
): Map<number, MathBlockInfo> {
  const mathBlocks = new Map<number, MathBlockInfo>();
  let currentStartLine = -1;
  let delimiterType: 'dollar' | 'bracket' = 'dollar';
  let lines: string[] = [];

  for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    if (codeBlocksByLine.has(lineNum)) continue;
    const containerEntry = cntxtContainersByLine?.get(lineNum);
    if (
      containerEntry &&
      (containerEntry.role === 'start' ||
        containerEntry.role === 'end' ||
        containerEntry.role === 'single')
    ) {
      continue;
    }

    const line = doc.line(lineNum);
    const trimmed = line.text.trim();

    // Single-line display math: $ formula $
    if (
      currentStartLine === -1 &&
      trimmed.startsWith('$') &&
      trimmed.endsWith('$') &&
      trimmed.length >= 4
    ) {
      const latex = trimmed.slice(2, -2).trim();
      const info: MathBlockInfo = { startLine: lineNum, endLine: lineNum, latex };
      mathBlocks.set(lineNum, info);
      continue;
    }

    // Single-line display math: \[ formula \]
    if (
      currentStartLine === -1 &&
      trimmed.startsWith('\\[') &&
      trimmed.endsWith('\\]') &&
      trimmed.length >= 4
    ) {
      const latex = trimmed.slice(2, -2).trim();
      const info: MathBlockInfo = { startLine: lineNum, endLine: lineNum, latex };
      mathBlocks.set(lineNum, info);
      continue;
    }

    // Multi-line display math starting with $ or \[
    if (currentStartLine === -1) {
      if (trimmed.startsWith('$')) {
        currentStartLine = lineNum;
        delimiterType = 'dollar';
        lines = [trimmed.replace(/^\$\$/, '')];
      } else if (trimmed.startsWith('\\[')) {
        currentStartLine = lineNum;
        delimiterType = 'bracket';
        lines = [trimmed.replace(/^\\\[/, '')];
      }
    } else {
      const isEnd =
        delimiterType === 'dollar'
          ? trimmed.endsWith('$') || trimmed === '$'
          : trimmed.endsWith('\\]') || trimmed === '\\]';

      if (isEnd) {
        const cleaned =
          delimiterType === 'dollar'
            ? trimmed.replace(/\$\$/, '')
            : trimmed.replace(/\\\]$/, '');
        lines.push(cleaned);
        const info: MathBlockInfo = {
          startLine: currentStartLine,
          endLine: lineNum,
          latex: lines.join('\n').trim(),
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
  mathBlocksByLine: Map<number, MathBlockInfo>,
  cntxtContainersByLine?: Map<number, CntxtContainerLineEntry>
): Map<number, TableBlockInfo> {
  const tables = new Map<number, TableBlockInfo>();
  let lineNum = 1;

  const isFenceBoundary = (l: number) => {
    const c = cntxtContainersByLine?.get(l);
    return Boolean(c && (c.role === 'start' || c.role === 'end' || c.role === 'single'));
  };

  while (lineNum <= doc.lines) {
    if (
      codeBlocksByLine.has(lineNum) ||
      mathBlocksByLine.has(lineNum) ||
      isFenceBoundary(lineNum)
    ) {
      lineNum++;
      continue;
    }

    const line = doc.line(lineNum);
    const lineText = line.text;

    // A table header must contain '|' and be immediately followed by a separator row
    if (lineText.includes('|') && lineNum < doc.lines) {
      if (
        !codeBlocksByLine.has(lineNum + 1) &&
        !mathBlocksByLine.has(lineNum + 1) &&
        !isFenceBoundary(lineNum + 1)
      ) {
        const nextLine = doc.line(lineNum + 1).text;
        if (isTableSeparatorLine(nextLine)) {
          const tableLines = [lineText, nextLine];
          let endLine = lineNum + 1;
          for (let l = lineNum + 2; l <= doc.lines; l++) {
            if (
              codeBlocksByLine.has(l) ||
              mathBlocksByLine.has(l) ||
              isFenceBoundary(l)
            ) {
              break;
            }
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
              table: parsed,
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
