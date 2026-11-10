import { Extension, RangeSetBuilder, StateField, EditorState, Facet, StateEffect } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet } from '@codemirror/view';
import { isDarkTheme, getDocumentTheme } from '../adapters';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { useActionStore } from '../store/actionStore';
import {
  codeBlockCollapseField,
  toggleCodeBlockCollapseEffect,
  setCodeBlockCollapseEffect,
  clearAllCodeBlockCollapseEffect
} from './liveMarkdown/collapseState';
export {
  codeBlockCollapseField,
  toggleCodeBlockCollapseEffect,
  setCodeBlockCollapseEffect,
  clearAllCodeBlockCollapseEffect
} from './liveMarkdown/collapseState';

export const refreshLiveMarkdownEffect = StateEffect.define<void>();

export const liveThemeFacet = Facet.define<string, string>({
  combine: (values) => values[values.length - 1] || 'contextpad-dark'
});

export { setLiveMarkdownBridge } from './liveMarkdown/index';
export * from './liveMarkdown/widgets';
import {
  findCntxtContainers,
  findCodeBlocks,
  findMathBlocks,
  findTables,
  MermaidBlockWidget,
  DisplayMathWidget,
  InlineMathWidget,
  TableBlockWidget,
  CodeBlockHeaderWidget,
  CodeBlockFooterWidget,
  TaskCheckboxWidget,
  BulletWidget,
  HrWidget,
  LinkWidget,
  ActionButtonWidget,
  ImageWidget,
  setLiveMarkdownBridge
} from './liveMarkdown/index';
import { cntxtBlockOverlayPlugin } from './liveMarkdown/cntxtBlockOverlay';
import { codeBlockLockFilter } from './codeBlockLockFilter';
import { parseBlockInfoString } from '../services/editor/cntxtBlockParser';

interface RangeDecoItem {
  from: number;
  to: number;
  deco: Decoration;
}

// =========================================================================
// Decoration Builder
// =========================================================================

function buildDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;

    // Detect whether current app theme is dark and get current theme name
    const facetTheme = state.facet(liveThemeFacet);
    const currentTheme = facetTheme || getDocumentTheme();
    const isDark = currentTheme === 'google-material-3' || currentTheme === 'parchment' || currentTheme === 'github-light' ? false : isDarkTheme();

    const collapsedBlocks = state.field(codeBlockCollapseField, false) || new Set<number>();

    // 1. Scan document structures (Two-Tier: Outer CNTXT Rich Containers + Inner Code/Math/Tables)
    const cntxtContainersByLine = findCntxtContainers(doc);
    const codeBlocksByLine = findCodeBlocks(doc, cntxtContainersByLine);
    const mathBlocksByLine = findMathBlocks(doc, codeBlocksByLine, cntxtContainersByLine);
    const tableBlocksByLine = findTables(doc, codeBlocksByLine, mathBlocksByLine, cntxtContainersByLine);

    // 2. Determine active lines where the cursor / selection currently sits
    const activeLines = new Set<number>();
    const isSelectionActive = !state.selection.main.empty;
    // When the user is actively selecting text across ranges, do not mark lines as raw-editing
    // to prevent jarring layout shifts under the cursor while dragging
    if (!isSelectionActive) {
      for (const range of state.selection.ranges) {
        if (range.empty) {
          activeLines.add(doc.lineAt(range.head).number);
        }
      }
    }

    let pos = 0;
    const docLen = doc.length;
    while (pos <= docLen) {
      const line = doc.lineAt(pos);
      const isLineActive = activeLines.has(line.number);

      // =====================================================================
      // 0. Outer CNTXT Rich Container (`~~~markdown | ...`, ` ```cntxt | ...`)
      // =====================================================================
      const containerEntry = cntxtContainersByLine.get(line.number);
      let containerMidClass = '';

      if (containerEntry) {
        const { role: cRole, container } = containerEntry;
        const innerLineCount = Math.max(0, container.endLine - container.startLine - 1);
        const isContainerCollapsed = collapsedBlocks.has(container.startLine);

        // Check if cursor or active selection is on the opening/closing fence or inside when collapsed
        let isContainerActive = false;
        for (let l = container.startLine; l <= container.endLine; l++) {
          if (activeLines.has(l)) {
            isContainerActive = true;
            break;
          }
        }
        if (!isContainerActive) {
          const mainSel = state.selection.main;
          const selStartLine = doc.lineAt(mainSel.from).number;
          const selEndLine = doc.lineAt(mainSel.to).number;
          if (selStartLine <= container.endLine && selEndLine >= container.startLine) {
            isContainerActive = true;
          }
        }

        if (cRole === 'start' || cRole === 'single') {
          if (isContainerCollapsed) {
            builder.add(
              line.from,
              line.from,
              Decoration.line({ class: 'cm-live-codeblock-start cm-cntxt-container-start cm-live-codeblock-collapsed' })
            );
            builder.add(
              line.from,
              line.to,
              Decoration.replace({
                widget: new CodeBlockHeaderWidget(
                  container.language,
                  container.codeContent,
                  line.from,
                  container.startLine,
                  container.endLine,
                  true,
                  innerLineCount,
                  true
                )
              })
            );
            if (container.endLine > container.startLine) {
              const endLineObj = doc.line(container.endLine);
              builder.add(
                line.to,
                endLineObj.to,
                Decoration.replace({ block: true })
              );
            }
            pos = doc.line(container.endLine).to + 1;
            continue;
          }

          if (isLineActive) {
            builder.add(
              line.from,
              line.from,
              Decoration.line({ class: 'cm-live-codeblock-start cm-cntxt-container-start cm-live-active-row' })
            );
            pos = line.to + 1;
            continue;
          }

          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-start cm-cntxt-container-start' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(
                container.language,
                container.codeContent,
                line.from,
                container.startLine,
                container.endLine,
                false,
                innerLineCount,
                true
              )
            })
          );
          pos = line.to + 1;
          continue;
        } else if (cRole === 'end') {
          if (isLineActive) {
            builder.add(
              line.from,
              line.from,
              Decoration.line({ class: 'cm-live-codeblock-end cm-cntxt-container-end cm-live-active-row' })
            );
            pos = line.to + 1;
            continue;
          }

          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: 'cm-live-codeblock-end cm-cntxt-container-end' })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockFooterWidget(true, container.language)
            })
          );
          pos = line.to + 1;
          continue;
        } else if (cRole === 'mid') {
          // Pass-through! Middle lines of a CNTXT Rich Container fall right through
          // to render Mermaid diagrams, Markdown tables, Math, Headings, and Rich Text!
          const lockCls = container.params.locked === 'user'
            ? ' cm-cntxt-locked-user'
            : container.params.locked === 'agent'
              ? ' cm-cntxt-locked-agent'
              : '';
          containerMidClass = ` cm-cntxt-container-mid${lockCls}`;
        }
      }

      // =====================================================================
      // A. Fenced Code Block Container (Mermaid, LaTeX, or standard Code)
      // =====================================================================
      const codeBlockEntry = codeBlocksByLine.get(line.number);
      if (codeBlockEntry) {
        const { role, block } = codeBlockEntry;
        const parsedBlockInfo = parseBlockInfoString(block.language);
        const lang = parsedBlockInfo.type;

        // Check if cursor or active search selection is anywhere inside this code block
        let isBlockActive = false;
        for (let l = block.startLine; l <= block.endLine; l++) {
          if (activeLines.has(l)) {
            isBlockActive = true;
            break;
          }
        }
        if (!isBlockActive) {
          const mainSel = state.selection.main;
          const selStartLine = doc.lineAt(mainSel.from).number;
          const selEndLine = doc.lineAt(mainSel.to).number;
          if (selStartLine <= block.endLine && selEndLine >= block.startLine) {
            isBlockActive = true;
          }
        }

        // --- Mermaid Diagram Full Replacement Widget ---
        if (lang === 'mermaid' && !isBlockActive && block.isClosed) {
          if (line.number === block.startLine) {
            const startLineObj = doc.line(block.startLine);
            const endLineObj = doc.line(block.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new MermaidBlockWidget(block.codeContent, startLineObj.from, currentTheme, isDark),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        }

        // --- LaTeX Math Code Block Full Replacement Widget ---
        const MATH_LANGS = new Set(['latex', 'math', 'katex', 'mathjax', 'tex', 'amsmath']);
        if (MATH_LANGS.has(lang) && !isBlockActive && block.isClosed) {
          if (line.number === block.startLine) {
            const startLineObj = doc.line(block.startLine);
            const endLineObj = doc.line(block.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new DisplayMathWidget(block.codeContent, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        }

        // --- Standard Code Block Rendering ---
        // Governed code blocks (e.g. ```python | locked=user) retain full code block card styling (background, border, padding)
        // rather than inheriting transparent Rich Container styling (.cm-cntxt-container-*).
        const isGoverned = parsedBlockInfo.isCNTXT && !parsedBlockInfo.isRichContainer;
        const lockCls = parsedBlockInfo.params.locked === 'user'
          ? ' cm-codeblock-locked-user'
          : parsedBlockInfo.params.locked === 'agent'
            ? ' cm-codeblock-locked-agent'
            : '';
        const governedBlockClass = isGoverned ? ` cm-live-codeblock-governed${lockCls}` : '';
        const isCollapsed = collapsedBlocks.has(block.startLine);
        const innerLineCount = Math.max(0, block.endLine - block.startLine - 1);

        if (isCollapsed && (role === 'start' || role === 'single')) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-start${governedBlockClass} cm-live-codeblock-collapsed${containerMidClass}` })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(
                block.language,
                block.codeContent,
                line.from,
                block.startLine,
                block.endLine,
                true,
                innerLineCount,
                parsedBlockInfo.isRichContainer
              )
            })
          );
          if (block.endLine > block.startLine) {
            const endLineObj = doc.line(block.endLine);
            builder.add(
              line.to,
              endLineObj.to,
              Decoration.replace({ block: true })
            );
          }
          pos = doc.line(block.endLine).to + 1;
          continue;
        }

        if (isLineActive) {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-${role}${governedBlockClass} cm-live-active-row${containerMidClass}` })
          );
          pos = line.to + 1;
          continue;
        }

        if (role === 'start') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-start${governedBlockClass}${containerMidClass}` })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockHeaderWidget(
                block.language,
                block.codeContent,
                line.from,
                block.startLine,
                block.endLine,
                false,
                innerLineCount,
                parsedBlockInfo.isRichContainer
              )
            })
          );
        } else if (role === 'mid') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-mid${governedBlockClass}${containerMidClass}` })
          );
        } else if (role === 'end') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-end${governedBlockClass}${containerMidClass}` })
          );
          builder.add(
            line.from,
            line.to,
            Decoration.replace({
              widget: new CodeBlockFooterWidget(parsedBlockInfo.isRichContainer, block.language)
            })
          );
        } else if (role === 'single') {
          builder.add(
            line.from,
            line.from,
            Decoration.line({ class: `cm-live-codeblock-single${governedBlockClass}${containerMidClass}` })
          );
        }

        pos = line.to + 1;
        continue;
      }

      // =====================================================================
      // B. Display LaTeX Math Block ($$ ... $$)
      // =====================================================================
      const mathBlock = mathBlocksByLine.get(line.number);
      if (mathBlock) {
        let isBlockActive = false;
        for (let l = mathBlock.startLine; l <= mathBlock.endLine; l++) {
          if (activeLines.has(l)) {
            isBlockActive = true;
            break;
          }
        }
        if (!isBlockActive) {
          const mainSel = state.selection.main;
          const selStartLine = doc.lineAt(mainSel.from).number;
          const selEndLine = doc.lineAt(mainSel.to).number;
          if (selStartLine <= mathBlock.endLine && selEndLine >= mathBlock.startLine) {
            isBlockActive = true;
          }
        }

        if (!isBlockActive) {
          if (line.number === mathBlock.startLine) {
            const startLineObj = doc.line(mathBlock.startLine);
            const endLineObj = doc.line(mathBlock.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new DisplayMathWidget(mathBlock.latex, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        } else {
          // Block is being edited - show raw markdown for focused lines
          builder.add(line.from, line.from, Decoration.line({ class: `cm-live-active-row${containerMidClass}` }));
          pos = line.to + 1;
          continue;
        }
      }

      // =====================================================================
      // C. Markdown Table Block
      // =====================================================================
      const tableBlock = tableBlocksByLine.get(line.number);
      if (tableBlock) {
        let isTableActive = false;
        for (let l = tableBlock.startLine; l <= tableBlock.endLine; l++) {
          if (activeLines.has(l)) {
            isTableActive = true;
            break;
          }
        }
        if (!isTableActive) {
          const mainSel = state.selection.main;
          const selStartLine = doc.lineAt(mainSel.from).number;
          const selEndLine = doc.lineAt(mainSel.to).number;
          if (selStartLine <= tableBlock.endLine && selEndLine >= tableBlock.startLine) {
            isTableActive = true;
          }
        }

        if (!isTableActive) {
          if (line.number === tableBlock.startLine) {
            const startLineObj = doc.line(tableBlock.startLine);
            const endLineObj = doc.line(tableBlock.endLine);
            builder.add(
              startLineObj.from,
              endLineObj.to,
              Decoration.replace({
                widget: new TableBlockWidget(tableBlock.table, startLineObj.from),
                block: true
              })
            );
            pos = endLineObj.to + 1;
            continue;
          } else {
            pos = line.to + 1;
            continue;
          }
        } else {
          // Table row is being edited
          builder.add(line.from, line.from, Decoration.line({ class: `cm-live-active-row${containerMidClass}` }));
          pos = line.to + 1;
          continue;
        }
      }

      // =====================================================================
      // D. Regular Markdown Row
      // =====================================================================

      let lineDeco: Decoration | null =
        isLineActive || containerMidClass
          ? Decoration.line({
              class: `${isLineActive ? 'cm-live-active-row' : ''}${containerMidClass}`.trim()
            })
          : null;
      const rangeDecos: RangeDecoItem[] = [];
      const lineText = line.text;

      // 1. Headings (# H1, ## H2, ### H3, etc.)
      const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const markerLen = headingMatch[1].length + 1;
        lineDeco = Decoration.line({ 
          class: `cm-live-heading cm-live-h${level}${isLineActive ? ' cm-live-active-row' : ''}${containerMidClass}` 
        });
        if (isLineActive) {
          rangeDecos.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.mark({ class: 'cm-live-heading-marker' })
          });
        } else {
          rangeDecos.push({
            from: line.from,
            to: line.from + markerLen,
            deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
          });
        }
      }

      // 2. Blockquotes (> quote)
      const quoteMatch = lineText.match(/^>\s*(.*)$/);
      if (quoteMatch && !headingMatch) {
        lineDeco = Decoration.line({ 
          class: `cm-live-blockquote${isLineActive ? ' cm-live-active-row' : ''}${containerMidClass}` 
        });
        const prefixLen = lineText.startsWith('> ') ? 2 : 1;
        if (isLineActive) {
          rangeDecos.push({
            from: line.from,
            to: Math.min(line.from + prefixLen, line.to),
            deco: Decoration.mark({ class: 'cm-live-heading-marker' })
          });
        } else {
          rangeDecos.push({
            from: line.from,
            to: Math.min(line.from + prefixLen, line.to),
            deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
          });
        }
      }

      // 3. Task checkboxes (- [ ] / - [x])
      const taskMatch = lineText.match(/^(\s*[-*+]\s*\[)([ xX])(\])\s*(.*)$/);
      if (taskMatch) {
        const isChecked = taskMatch[2].toLowerCase() === 'x';
        const prefixLen = taskMatch[1].length + 2;
        lineDeco = Decoration.line({ 
          class: (isChecked ? 'cm-live-task-done' : 'cm-live-task-item') + (isLineActive ? ' cm-live-active-row' : '') + containerMidClass
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
      if (hrMatch && !isLineActive) {
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
        if (!isLineActive) {
          rangeDecos.push({
            from: markerPos,
            to: markerPos + 2,
            deco: Decoration.replace({ widget: new BulletWidget() })
          });
        }
      }

      // 6. Inline Formatting (LaTeX Math, Links, Code, Bold, Italic, Strikethrough, Tags)
      if (!hrMatch) {
        let match: RegExpExecArray | null;

        // Inline LaTeX Math: $formula$ (must not be $)
        const inlineMathRegex = /(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g;
        while ((match = inlineMathRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new InlineMathWidget(match[1])
            })
          });
        }

        // Inline LaTeX Math: \( formula \)
        const latexParenRegex = /\\\((.+?)\\\)/g;
        while ((match = latexParenRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new InlineMathWidget(match[1])
            })
          });
        }

        // Images: ![alt](url "optional title")
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        while ((match = imageRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          const alt = match[1];
          let rawTarget = match[2].trim();
          let src = rawTarget;
          let title = '';

          const titleMatch = rawTarget.match(/^(\S+)\s+["'](.*)["']$/);
          if (titleMatch) {
            src = titleMatch[1];
            title = titleMatch[2];
          }

          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new ImageWidget(alt, src, title, start, end)
            })
          });
        }

        // Action Buttons: [[action:actionId]] or [[action:actionId|Label]]
        const actionButtonRegex = /\[\[action:([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
        while ((match = actionButtonRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          const actionId = match[1].trim();
          const customLabel = match[2]?.trim();
          const action = useActionStore.getState().actions.find(a => a.id === actionId);

          // Prevent bracket-closing race: if cursor is actively inside the token, show syntax highlight instead of replacing with widget
          const isEditingAction = state.selection.ranges.some(r => r.head > start && r.head < end);
          if (isEditingAction) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-action-token text-[var(--accent-primary)] font-mono text-xs bg-[var(--card-hover-bg)] px-1 rounded' })
            });
            continue;
          }

          rangeDecos.push({
            from: start,
            to: end,
            deco: Decoration.replace({
              widget: new ActionButtonWidget(
                match[0],
                actionId,
                customLabel,
                action?.name || actionId,
                action?.codeType,
                start,
                end
              )
            })
          });
        }

        // Links: [text](url) - negative lookbehind prevents matching ![alt](url)
        const linkRegex = /(?<!\!)\[([^\]]+)\]\(([^)]+)\)/g;
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
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-code-pill font-mono' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-code-pill' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Bold + Italic: ***bold+italic*** or ___bold+italic___
        const boldItalicRegex = /(\*\*\*|___)(?!\s)(.+?)(?<!\s)\1/g;
        while ((match = boldItalicRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-bold-italic' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 3,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 3,
              to: end - 3,
              deco: Decoration.mark({ class: 'cm-live-bold-italic' })
            });
            rangeDecos.push({
              from: end - 3,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Bold: **bold** or __bold__ (not matching ***)
        const boldRegex = /(?<!\*)(\*\*|__)(?!\s)(.+?)(?<!\s)\1(?!\*)/g;
        while ((match = boldRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-bold' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 2,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'cm-live-bold' })
            });
            rangeDecos.push({
              from: end - 2,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Italic: *italic* or _italic_ (enforce CommonMark whitespace boundaries)
        const italicRegex = /(?<!\*)\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)|(?<!_)_(?!\s)([^_\n]+?)(?<!\s)_(?!_)/g;
        while ((match = italicRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-italic' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-italic' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Strikethrough: ~~strike~~
        const strikeRegex = /~~(?!\s)([^~\n]+?)(?<!\s)~~/g;
        while ((match = strikeRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-strikethrough' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 2,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'cm-live-strikethrough' })
            });
            rangeDecos.push({
              from: end - 2,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Highlight: ==highlight==
        const highlightRegex = /==(?!\s)([^=\n]+?)(?<!\s)==/g;
        while ((match = highlightRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-highlight' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 2,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'cm-live-highlight' })
            });
            rangeDecos.push({
              from: end - 2,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Subscript: ~sub~ (must not match ~~)
        const subRegex = /(?<!~)~([^~\s\n]+?)~(?!~)/g;
        while ((match = subRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-sub' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-sub' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
        }

        // Superscript: ^sup^
        const supRegex = /\^([^\^\s\n]+?)\^/g;
        while ((match = supRegex.exec(lineText)) !== null) {
          const start = line.from + match.index;
          const end = start + match[0].length;
          if (isLineActive) {
            rangeDecos.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-sup' })
            });
          } else {
            rangeDecos.push({
              from: start,
              to: start + 1,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
            rangeDecos.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'cm-live-sup' })
            });
            rangeDecos.push({
              from: end - 1,
              to: end,
              deco: Decoration.mark({ class: 'cm-live-hidden-delimiter' })
            });
          }
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

      if (lineDeco) {
        builder.add(line.from, line.from, lineDeco);
      }

      rangeDecos.sort((a, b) => 
        a.from - b.from || 
        (a.deco.startSide ?? 0) - (b.deco.startSide ?? 0) || 
        a.to - b.to
      );

      let lastReplaceEnd = -1;
      for (const item of rangeDecos) {
        const isReplace = !item.deco.spec.class;
        if (isReplace) {
          if (item.from < lastReplaceEnd) continue;
          lastReplaceEnd = item.to;
        } else {
          // If a mark falls inside an active replaced widget range, skip it to prevent overlapping collisions
          if (item.from < lastReplaceEnd) continue;
        }
        if (item.from <= item.to && item.from >= line.from && item.to <= line.to) {
          builder.add(item.from, item.to, item.deco);
        }
      }

      pos = line.to + 1;
    }

    return builder.finish();
  } catch (err) {
    console.warn('Live markdown decoration error:', err);
    try {
      window.dispatchEvent(new CustomEvent('live-markdown-render-error', { detail: { error: err } }));
    } catch {
      // fallback if window is unavailable
    }
    return Decoration.none;
  }
}

// =========================================================================
// CodeMirror StateField for Live Rendered Markdown Mode
// =========================================================================

export const liveMarkdownField = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state);
  },
  update(decorations, tr) {
    const prevTheme = tr.startState.facet(liveThemeFacet);
    const nextTheme = tr.state.facet(liveThemeFacet);

    if (
      tr.docChanged || 
      prevTheme !== nextTheme || 
      tr.effects.some(e => 
        e.is(refreshLiveMarkdownEffect) || 
        e.is(toggleCodeBlockCollapseEffect) || 
        e.is(setCodeBlockCollapseEffect) || 
        e.is(clearAllCodeBlockCollapseEffect)
      )
    ) {
      return buildDecorations(tr.state);
    }

    if (tr.selection) {
      // Performance optimization: if cursor navigation stayed within the same line, reuse existing decorations
      try {
        const prevLine = tr.startState.doc.lineAt(tr.startState.selection.main.head).number;
        const nextLine = tr.state.doc.lineAt(tr.state.selection.main.head).number;
        if (prevLine === nextLine) {
          return decorations;
        }
      } catch {
        // If line resolution fails, rebuild safely
      }
      return buildDecorations(tr.state);
    }

    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f)
});

export function liveMarkdownExtension(
  enabled: boolean, 
  bridge?: IRuntimeBridge, 
  themeName: string = 'contextpad-dark'
): Extension {
  if (bridge) {
    setLiveMarkdownBridge(bridge);
  }
  if (!enabled) return [];
  return [
    liveThemeFacet.of(themeName),
    codeBlockCollapseField,
    liveMarkdownField,
    cntxtBlockOverlayPlugin,
    codeBlockLockFilter,
  ];
}
