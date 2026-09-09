import { Extension, RangeSetBuilder, Text } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';

// =========================================================================
// Language Meta Helper for Code Block Badges
// =========================================================================

function getLanguageMeta(rawLang: string): { name: string; color: string; bg: string } {
  const lang = rawLang.toLowerCase().trim();
  switch (lang) {
    case 'ts':
    case 'typescript':
      return { name: 'TypeScript', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'js':
    case 'javascript':
    case 'jsx':
      return { name: 'JavaScript', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'tsx':
      return { name: 'TSX', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    case 'py':
    case 'python':
      return { name: 'Python', color: '#34D399', bg: 'rgba(52, 211, 153, 0.15)' };
    case 'json':
      return { name: 'JSON', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    case 'html':
      return { name: 'HTML', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'css':
    case 'scss':
    case 'sass':
      return { name: 'CSS', color: '#818CF8', bg: 'rgba(129, 140, 248, 0.15)' };
    case 'sql':
      return { name: 'SQL', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' };
    case 'sh':
    case 'bash':
    case 'shell':
    case 'zsh':
      return { name: 'Bash', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    case 'md':
    case 'markdown':
      return { name: 'Markdown', color: '#F472B6', bg: 'rgba(244, 114, 182, 0.15)' };
    case 'rs':
    case 'rust':
      return { name: 'Rust', color: '#FB923C', bg: 'rgba(251, 146, 60, 0.15)' };
    case 'go':
    case 'golang':
      return { name: 'Go', color: '#22D3EE', bg: 'rgba(34, 211, 238, 0.15)' };
    case 'cpp':
    case 'c++':
    case 'c':
      return { name: 'C / C++', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)' };
    case 'yaml':
    case 'yml':
      return { name: 'YAML', color: '#F87171', bg: 'rgba(248, 113, 113, 0.15)' };
    case 'xml':
      return { name: 'XML', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' };
    case 'dockerfile':
    case 'docker':
      return { name: 'Docker', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    default:
      return { 
        name: rawLang ? rawLang.toUpperCase() : 'Code', 
        color: '#A1A1AA', 
        bg: 'rgba(161, 161, 170, 0.15)' 
      };
  }
}

// =========================================================================
// Custom Widgets for Live Rendered Markdown Mode
// =========================================================================

class CodeBlockHeaderWidget extends WidgetType {
  constructor(
    readonly language: string,
    readonly codeContent: string,
    readonly linePos: number
  ) {
    super();
  }

  eq(other: CodeBlockHeaderWidget): boolean {
    return (
      this.language === other.language &&
      this.codeContent === other.codeContent &&
      this.linePos === other.linePos
    );
  }

  toDOM(): HTMLElement {
    const meta = getLanguageMeta(this.language);

    const header = document.createElement('div');
    header.className = 'cm-live-codeblock-header select-none flex items-center justify-between px-3 py-1.5 border-b border-[#2E2E38] bg-[#16161B] text-[#A1A1AA] rounded-t-[7px] w-full';

    // Left: Language badge & icon dot
    const left = document.createElement('div');
    left.className = 'flex items-center gap-2';

    const dot = document.createElement('span');
    dot.className = 'w-2 h-2 rounded-full inline-block shrink-0';
    dot.style.backgroundColor = meta.color;
    left.appendChild(dot);

    const badge = document.createElement('span');
    badge.className = 'px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider uppercase';
    badge.style.color = meta.color;
    badge.style.backgroundColor = meta.bg;
    badge.textContent = meta.name;
    left.appendChild(badge);

    header.appendChild(left);

    // Right: Copy code button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'cm-live-copy-code-btn flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#A1A1AA] hover:text-white hover:bg-[#27272F] transition-all cursor-pointer';
    copyBtn.title = 'Copy code snippet';
    copyBtn.setAttribute('aria-label', `Copy ${meta.name} code snippet`);

    const copyIcon = document.createElement('span');
    copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
    copyBtn.appendChild(copyIcon);

    const copyLabel = document.createElement('span');
    copyLabel.textContent = 'Copy';
    copyBtn.appendChild(copyLabel);

    copyBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(this.codeContent);
        copyLabel.textContent = 'Copied!';
        copyBtn.classList.add('text-[#10B981]');
        copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        setTimeout(() => {
          copyLabel.textContent = 'Copy';
          copyBtn.classList.remove('text-[#10B981]');
          copyIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code snippet', err);
      }
    });

    header.appendChild(copyBtn);
    return header;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class CodeBlockFooterWidget extends WidgetType {
  toDOM(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'cm-live-codeblock-footer select-none h-1.5 w-full';
    return footer;
  }
  eq(): boolean {
    return true;
  }
}

class TaskCheckboxWidget extends WidgetType {
  constructor(
    readonly isChecked: boolean,
    readonly linePos: number
  ) {
    super();
  }

  eq(other: TaskCheckboxWidget): boolean {
    return this.isChecked === other.isChecked && this.linePos === other.linePos;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-live-task-wrap inline-flex items-center mr-2 align-middle select-none';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.isChecked;
    input.className = 'cm-live-checkbox cursor-pointer w-4 h-4 rounded border border-[#52525B] bg-[#27272F] accent-[#007ACC] transition-transform hover:scale-110';
    input.setAttribute('aria-label', this.isChecked ? 'Completed task item' : 'Incomplete task item');

    input.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const line = view.state.doc.lineAt(this.linePos);
      const match = line.text.match(/^(\s*[-*+]\s*\[)([ xX])(\])/);
      if (match) {
        const checkPos = line.from + match[1].length;
        const newChar = this.isChecked ? ' ' : 'x';
        view.dispatch({
          changes: { from: checkPos, to: checkPos + 1, insert: newChar }
        });
      }
    });

    wrap.appendChild(input);
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

class BulletWidget extends WidgetType {
  toDOM(): HTMLElement {
    const dot = document.createElement('span');
    dot.className = 'cm-live-bullet-dot text-[#007ACC] font-bold mr-2 select-none inline-block text-base leading-none';
    dot.textContent = '•';
    return dot;
  }
  eq(): boolean {
    return true;
  }
}

class HrWidget extends WidgetType {
  toDOM(): HTMLElement {
    const hrContainer = document.createElement('div');
    hrContainer.className = 'cm-live-hr-wrap py-3 my-2 select-none w-full';
    const hr = document.createElement('hr');
    hr.className = 'border-t border-[#3F3F46] my-0 w-full';
    hrContainer.appendChild(hr);
    return hrContainer;
  }
  eq(): boolean {
    return true;
  }
}

class LinkWidget extends WidgetType {
  constructor(readonly text: string, readonly url: string) {
    super();
  }

  eq(other: LinkWidget): boolean {
    return this.text === other.text && this.url === other.url;
  }

  toDOM(): HTMLElement {
    const a = document.createElement('a');
    a.className = 'cm-live-link text-[#38BDF8] underline underline-offset-2 hover:text-[#7DD3FC] cursor-pointer inline-flex items-center gap-1 font-medium bg-[#38BDF8]/10 px-1.5 py-0.5 rounded text-[0.95em] transition-colors';
    a.href = this.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = `Open link: ${this.url}`;
    a.textContent = this.text || this.url;
    
    // Add external icon indicator
    const icon = document.createElement('span');
    icon.className = 'text-[0.75em] opacity-70';
    icon.textContent = '↗';
    a.appendChild(icon);

    a.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    return a;
  }
}

// =========================================================================
// Fenced Code Block Scanning & Structure
// =========================================================================

interface CodeBlockInfo {
  startLine: number;
  endLine: number;
  language: string;
  isClosed: boolean;
  codeContent: string;
}

interface CodeBlockLineEntry {
  block: CodeBlockInfo;
  role: 'start' | 'mid' | 'end' | 'single';
}

function findCodeBlocks(doc: Text): Map<number, CodeBlockLineEntry> {
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
        currentFence = fenceMatch[2].slice(0, 3); // '```' or '~~~'
        currentLang = fenceMatch[3].trim();
        codeLines = [];
      }
    } else {
      // Check if this line closes the current code block
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

  // Handle unclosed code block reaching document end
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
// Range Deco Item Interface
// =========================================================================
interface RangeDecoItem {
  from: number;
  to: number;
  deco: Decoration;
}

// =========================================================================
// Decoration Builder
// =========================================================================

function buildDecorations(view: EditorView, enabled: boolean): DecorationSet {
  if (!enabled) {
    return Decoration.none;
  }

  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  // Scan all fenced code blocks in the document
  const codeBlocksByLine = findCodeBlocks(doc);

  // Determine active lines where the cursor / selection currently sits
  const activeLines = new Set<number>();
  for (const range of view.state.selection.ranges) {
    const startLine = doc.lineAt(range.from).number;
    const endLine = doc.lineAt(range.to).number;
    for (let l = startLine; l <= endLine; l++) {
      activeLines.add(l);
    }
  }

  // Iterate visible ranges
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      const isLineActive = activeLines.has(line.number);
      const codeBlockEntry = codeBlocksByLine.get(line.number);

      // =====================================================================
      // A. Line is inside a Fenced Code Block Container
      // =====================================================================
      if (codeBlockEntry) {
        const { role, block } = codeBlockEntry;

        if (isLineActive) {
          // Line has focus: show raw text for editing, but retain container box styling
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-${role} cm-live-active-row` })
          );
          pos = line.to + 1;
          continue;
        }

        // Line is rendered inside code block container
        if (role === 'start') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-start' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(block.language, block.codeContent, line.from)
            })
          );
        } else if (role === 'mid') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-mid' })
          );
        } else if (role === 'end') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-end' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockFooterWidget()
            })
          );
        } else if (role === 'single') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-single' })
          );
        }

        pos = line.to + 1;
        continue;
      }

      // =====================================================================
      // B. Line is a regular Markdown line
      // =====================================================================

      // If the cursor is on this row:
      // Leave it in raw markdown mode so the user can easily edit with zero jitter
      if (isLineActive) {
        builder.add(line.from, line.from, Decoration.line({ class: 'cm-live-active-row' }));
        pos = line.to + 1;
        continue;
      }

      // Cursor is on another line -> render this row visually!
      let lineDeco: Decoration | null = null;
      const rangeDecos: RangeDecoItem[] = [];
      const lineText = line.text;

      // 1. Headings (# H1, ## H2, ### H3, etc.)
      const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const markerLen = headingMatch[1].length + 1; // includes trailing space
        lineDeco = Decoration.line({ class: `cm-live-heading cm-live-h${level}` });
        rangeDecos.push({
          from: line.from,
          to: line.from + markerLen,
          deco: Decoration.replace({}) // Hide the '#' prefix when rendered
        });
      }

      // 2. Blockquotes (> quote)
      const quoteMatch = lineText.match(/^>\s*(.*)$/);
      if (quoteMatch && !headingMatch) {
        lineDeco = Decoration.line({ class: 'cm-live-blockquote' });
        const prefixLen = lineText.startsWith('> ') ? 2 : 1;
        rangeDecos.push({
          from: line.from,
          to: Math.min(line.from + prefixLen, line.to),
          deco: Decoration.replace({}) // Hide '> '
        });
      }

      // 3. Task checkboxes (- [ ] / - [x])
      const taskMatch = lineText.match(/^(\s*[-*+]\s*\[)([ xX])(\])\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const prefixLen = taskMatch[1].length + 2; // e.g. "- [ ] "
        lineDeco = Decoration.line({ 
          class: isChecked ? 'cm-live-task-done' : 'cm-live-task-item' 
        });
        rangeDecos.push({
          from: line.from,
          to: line.from + prefixLen,
          deco: Decoration.replace({
            widget: new TaskCheckboxWidget(isChecked, line.from)
          })
        });
      }

      // 4. Horizontal Rules (---, ***, ___)
      const hrMatch = lineText.match(/^(\-{3,}|\*{3,}|_{3,})\s*$/);
      if (hrMatch) {
        rangeDecos.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({ widget: new HrWidget() })
        });
      }

      // 5. Bullet Lists (- list, * list, + list)
      const bulletMatch = lineText.match(/^(\s*)([-*+])\s+(.*)$/);
      if (bulletMatch && !taskMatch && !hrMatch) {
        const indent = bulletMatch[1].length;
        const markerPos = line.from + indent;
        rangeDecos.push({
          from: markerPos,
          to: markerPos + 2,
          deco: Decoration.replace({ widget: new BulletWidget() })
        });
      }

      // 6. Inline Formatting (Links, Code, Bold, Italic, Strikethrough, Tags)
      if (!hrMatch) {
        let match: RegExpExecArray | null;

        // Links: [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        while ((match = linkRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new LinkWidget(match[1], match[2])
            })
          });
        }

        // Inline Code: `code`
        const codeRegex = /`([^`\n]+)`/g;
        while ((match = codeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // Hide opening backtick
          rangeDecos.push({
            from: start,
            to: start + 1,
            deco: Decoration.replace({})
          });
          // Mark code body
          rangeDecos.push({
            from: start + 1,
            to: end - 1,
            deco: Decoration.mark({ class: 'cm-live-code-pill' })
          });
          // Hide closing backtick
          rangeDecos.push({
            from: end - 1,
            to: end,
            deco: Decoration.replace({})
          });
        }

        // Bold: **bold** or __bold__
        const boldRegex = /(\*\*|__)(?!\s)(.+?)(?<!\s)\1/g;
        while ((match = boldRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // Hide start **
          rangeDecos.push({
            from: start,
            to: start + 2,
            deco: Decoration.replace({})
          });
          // Mark bold text
          rangeDecos.push({
            from: start + 2,
            to: end - 2,
            deco: Decoration.mark({ class: 'cm-live-bold' })
          });
          // Hide end **
          rangeDecos.push({
            from: end - 2,
            to: end,
            deco: Decoration.replace({})
          });
        }

        // Italic: *italic* or _italic_ (not inside bold)
        const italicRegex = /(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g;
        while ((match = italicRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // Hide start *
          rangeDecos.push({
            from: start,
            to: start + 1,
            deco: Decoration.replace({})
          });
          // Mark italic text
          rangeDecos.push({
            from: start + 1,
            to: end - 1,
            deco: Decoration.mark({ class: 'cm-live-italic' })
          });
          // Hide end *
          rangeDecos.push({
            from: end - 1,
            to: end,
            deco: Decoration.replace({})
          });
        }

        // Strikethrough: ~~strike~~
        const strikeRegex = /~~([^~\n]+)~~/g;
        while ((match = strikeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          // Hide start ~~
          rangeDecos.push({
            from: start,
            to: start + 2,
            deco: Decoration.replace({})
          });
          // Mark strikethrough text
          rangeDecos.push({
            from: start + 2,
            to: end - 2,
            deco: Decoration.mark({ class: 'cm-live-strikethrough' })
          });
          // Hide end ~~
          rangeDecos.push({
            from: end - 2,
            to: end,
            deco: Decoration.replace({})
          });
        }

        // Tags: #tag
        const tagRegex = /(?<=\s|^)#([a-zA-Z0-9_\-]+)/g;
        while ((match = tagRegex.exec(lineText)) !== null) {
          if (!headingMatch || match.index > 0) {
            const start = line.from + match.index;
            const end = start + match[0].length;
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-tag' })
            });
          }
        }
      }

      // Add line decoration if any
      if (lineDeco) {
        builder.add(line.from, line.from, lineDeco);
      }

      // Sort range decorations by position and eliminate conflicting replace ranges
      rangeDecos.sort((a, b) => a.from - b.from || a.to - b.to);

      let lastReplaceEnd = -1;
      for (const item of rangeDecos) {
        // If this is a replace decoration and overlaps with a previous replace, skip
        const isReplace = !item.deco.spec.class;
        if (isReplace) {
          if (item.from < lastReplaceEnd) continue;
          lastReplaceEnd = item.to;
        }
        if (item.from <= item.to && item.from >= line.from && item.to <= line.to) {
          builder.add(item.from, item.to, item.deco);
        }
      }

      pos = line.to + 1;
    }
  }

  return builder.finish();
}

// =========================================================================
// CodeMirror ViewPlugin for Live Rendered Markdown Mode
// =========================================================================

export function liveMarkdownExtension(enabled: boolean): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, enabled);
      }

      update(update: ViewUpdate) {
        if (
          update.docChanged || 
          update.viewportChanged || 
          update.selectionSet
        ) {
          this.decorations = buildDecorations(update.view, enabled);
        }
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}

