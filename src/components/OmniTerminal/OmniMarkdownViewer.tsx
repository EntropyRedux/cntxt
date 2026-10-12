import React, { useState, useEffect, useMemo } from 'react';
import { Copy, Check, BarChart2 } from 'lucide-react';
import { renderMermaidDiagram } from '../../services/mermaidRenderer';
import { parseMarkdownTableLines, isTableSeparatorLine } from '../../services/tableParser';
import { sanitizePreviewHtml, useRuntimeBridge } from '../../adapters';

interface OmniMarkdownViewerProps {
  content: string;
}

export const OmniMarkdownViewer: React.FC<OmniMarkdownViewerProps> = ({ content }) => {
  const blocks = useMemo(() => parseMarkdownBlocks(content), [content]);

  return (
    <div className="flex flex-col gap-2 w-full text-xs leading-relaxed select-text font-sans">
      {blocks.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </div>
  );
};

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; lines: string[] }
  | { type: 'quote'; text: string }
  | { type: 'list'; items: { isTask?: boolean; isChecked?: boolean; text: string }[] }
  | { type: 'paragraph'; text: string };

function parseMarkdownBlocks(rawText: string): MarkdownBlock[] {
  if (!rawText) return [];

  const lines = rawText.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced Code Block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push({
        type: 'code',
        language: lang,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 2. Heading
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          type: 'heading',
          level: match[1].length,
          text: match[2],
        });
        i++;
        continue;
      }
    }

    // 3. Blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [trimmed.replace(/^>\s?/, '')];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({
        type: 'quote',
        text: quoteLines.join('\n'),
      });
      continue;
    }

    // 4. Table (at least 2 lines, second line is separator)
    if (line.includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
      const tableLines: string[] = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().length > 0) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'table',
        lines: tableLines,
      });
      continue;
    }

    // 5. List items
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      const listItems: { isTask?: boolean; isChecked?: boolean; text: string }[] = [];
      while (i < lines.length && (/^[-*]\s+/.test(lines[i].trim()) || /^\d+\.\s+/.test(lines[i].trim()))) {
        const itemLine = lines[i].trim();
        const taskMatch = itemLine.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          listItems.push({
            isTask: true,
            isChecked: taskMatch[1].toLowerCase() === 'x',
            text: taskMatch[2],
          });
        } else {
          const text = itemLine.replace(/^([-*]|\d+\.)\s+/, '');
          listItems.push({ text });
        }
        i++;
      }
      blocks.push({
        type: 'list',
        items: listItems,
      });
      continue;
    }

    // 6. Regular Paragraph
    if (trimmed.length > 0) {
      const paragraphLines: string[] = [line];
      i++;
      while (
        i < lines.length &&
        lines[i].trim().length > 0 &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('>') &&
        !/^[-*]\s+/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i].trim()) &&
        !(lines[i].includes('|') && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1]))
      ) {
        paragraphLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'paragraph',
        text: paragraphLines.join('\n'),
      });
      continue;
    }

    i++;
  }

  return blocks;
}

const BlockRenderer: React.FC<{ block: MarkdownBlock }> = ({ block }) => {
  switch (block.type) {
    case 'heading': {
      if (block.level === 1) {
        return (
          <h1 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 mt-2 mb-1">
            <InlineText text={block.text} />
          </h1>
        );
      }
      if (block.level === 2) {
        return (
          <h2 className="text-xs font-bold text-[var(--text-primary)] mt-1.5 mb-0.5">
            <InlineText text={block.text} />
          </h2>
        );
      }
      return (
        <h3 className="text-xs font-semibold text-[var(--accent-primary)] mt-1 mb-0.5">
          <InlineText text={block.text} />
        </h3>
      );
    }

    case 'code':
      return <CodeBlockRenderer language={block.language} code={block.code} />;

    case 'table':
      return <TableBlockRenderer lines={block.lines} />;

    case 'quote':
      return (
        <blockquote className="border-l-2 border-[var(--accent-primary)] pl-2.5 py-0.5 my-1 text-[var(--text-secondary)] italic bg-[var(--app-bg)]/40 rounded-r">
          <InlineText text={block.text} />
        </blockquote>
      );

    case 'list':
      return (
        <ul className="flex flex-col gap-0.5 pl-3 list-none my-1">
          {block.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              {item.isTask ? (
                <input
                  type="checkbox"
                  readOnly
                  checked={item.isChecked}
                  className="mt-0.5 rounded border border-[var(--border-subtle)] accent-[var(--accent-primary)] cursor-default"
                />
              ) : (
                <span className="text-[var(--accent-primary)] font-bold text-[10px] leading-tight select-none">•</span>
              )}
              <span className={item.isChecked ? 'line-through opacity-70' : ''}>
                <InlineText text={item.text} />
              </span>
            </li>
          ))}
        </ul>
      );

    case 'paragraph':
      return (
        <p className="whitespace-pre-wrap break-words text-[var(--text-primary)] leading-relaxed">
          <InlineText text={block.text} />
        </p>
      );

    default:
      return null;
  }
};

const CodeBlockRenderer: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const bridge = useRuntimeBridge();
  const [copied, setCopied] = useState(false);
  const [mermaidSvg, setMermaidSvg] = useState<string | null>(null);
  const [mermaidError, setMermaidError] = useState<string | null>(null);

  const isMermaid = language?.toLowerCase() === 'mermaid';

  useEffect(() => {
    if (isMermaid) {
      let isMounted = true;
      renderMermaidDiagram(code, 'contextpad-dark').then((res) => {
        if (!isMounted) return;
        if (res.isError) {
          setMermaidError(res.error || 'Failed to render Mermaid diagram');
        } else {
          setMermaidSvg(res.svg);
          setMermaidError(null);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [isMermaid, code]);

  const handleCopy = () => {
    bridge.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isMermaid && mermaidSvg) {
    return (
      <div className="my-2 rounded border border-[var(--border-subtle)] bg-black/30 overflow-hidden shadow-xs">
        <div className="flex items-center justify-between px-2.5 py-1 bg-[var(--card-bg)] border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
          <span className="flex items-center gap-1 font-semibold text-pink-400">
            <BarChart2 className="w-3 h-3" />
            <span>Mermaid Diagram</span>
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <div
          className="p-3 overflow-x-auto flex justify-center bg-[var(--app-bg)]/80"
          dangerouslySetInnerHTML={{ __html: sanitizePreviewHtml(mermaidSvg) }}
        />
      </div>
    );
  }

  return (
    <div className="my-1.5 rounded-md border border-[var(--border-subtle)] bg-black/60 overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-2.5 py-1 bg-[var(--card-bg)] border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] font-mono">
        <span className="uppercase font-semibold tracking-wider text-[var(--accent-primary)]">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      {mermaidError && isMermaid && (
        <div className="p-2 text-[10px] text-rose-400 bg-rose-950/20 border-b border-rose-900/30 font-mono">
          Mermaid Error: {mermaidError}
        </div>
      )}
      <pre className="p-2.5 overflow-x-auto font-mono text-[11px] leading-relaxed text-[var(--text-primary)] whitespace-pre">
        {code}
      </pre>
    </div>
  );
};

const TableBlockRenderer: React.FC<{ lines: string[] }> = ({ lines }) => {
  const parsedTable = useMemo(() => parseMarkdownTableLines(lines), [lines]);

  if (!parsedTable) {
    return <pre className="font-mono text-[11px]">{lines.join('\n')}</pre>;
  }

  return (
    <div className="my-2 overflow-x-auto rounded border border-[var(--border-subtle)] shadow-xs">
      <table className="w-full text-[11px] border-collapse bg-[var(--card-bg)]">
        <thead>
          <tr className="bg-[var(--app-bg)] border-b border-[var(--border-subtle)]">
            {parsedTable.headers.map((h, idx) => (
              <th
                key={idx}
                style={{ textAlign: parsedTable.alignments[idx] || 'left' }}
                className="px-2.5 py-1.5 font-semibold text-[var(--text-primary)]"
              >
                <InlineText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {parsedTable.rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-[var(--card-hover-bg)] transition-colors">
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  style={{ textAlign: parsedTable.alignments[cIdx] || 'left' }}
                  className="px-2.5 py-1 text-[var(--text-secondary)]"
                >
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InlineText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  // Tokenize bold, italics, inline code, and links
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-[var(--text-secondary)]">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="px-1 py-0.2 rounded bg-black/30 font-mono text-[10.5px] text-[var(--accent-primary)] border border-[var(--border-subtle)]"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent-primary)] hover:underline font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
};
