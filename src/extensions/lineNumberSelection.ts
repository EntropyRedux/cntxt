import { Extension } from '@codemirror/state';
import { lineNumbers, EditorView, BlockInfo } from '@codemirror/view';

/**
 * Creates an enhanced lineNumbers extension for CodeMirror 6 that supports:
 * - Single-line selection on click (includes trailing newline)
 * - Multi-line selection by clicking and dragging across line numbers
 * - Range expansion with Shift+Click
 */
export function lineCounterSelectionExtension(): Extension {
  return [
    lineNumbers({
      domEventHandlers: {
        mousedown(view: EditorView, line: BlockInfo, event: MouseEvent) {
          // Only handle left mouse button
          if (event.button !== 0) return false;

          event.preventDefault();
          const doc = view.state.doc;
          const startLine = doc.lineAt(line.from);

          // Shift+Click: Extend existing selection
          if (event.shiftKey) {
            const currentSel = view.state.selection.main;
            const currentAnchor = currentSel.anchor;
            let anchor = currentAnchor;
            let head: number;

            if (startLine.from < currentAnchor) {
              head = startLine.from;
            } else {
              head = startLine.to < doc.length ? startLine.to + 1 : startLine.to;
            }

            view.dispatch({
              selection: { anchor, head },
              scrollIntoView: true,
              userEvent: 'select.line'
            });
            view.focus();
            return true;
          }

          // Initial single line selection
          const startAnchor = startLine.from;
          const startHead = startLine.to < doc.length ? startLine.to + 1 : startLine.to;

          view.dispatch({
            selection: { anchor: startAnchor, head: startHead },
            scrollIntoView: false,
            userEvent: 'select.line'
          });
          view.focus();

          // Drag selection across multiple line numbers
          const onMouseMove = (moveEvent: MouseEvent) => {
            const pos = view.posAtCoords({ x: moveEvent.clientX, y: moveEvent.clientY });
            if (pos === null) return;

            const currentDoc = view.state.doc;
            const clampedPos = Math.max(0, Math.min(pos, currentDoc.length));
            const currentLine = currentDoc.lineAt(clampedPos);

            let dragAnchor: number;
            let dragHead: number;

            if (currentLine.number >= startLine.number) {
              dragAnchor = startLine.from;
              dragHead = currentLine.to < currentDoc.length ? currentLine.to + 1 : currentLine.to;
            } else {
              dragAnchor = startLine.to < currentDoc.length ? startLine.to + 1 : startLine.to;
              dragHead = currentLine.from;
            }

            view.dispatch({
              selection: { anchor: dragAnchor, head: dragHead },
              scrollIntoView: true,
              userEvent: 'select.line'
            });
          };

          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);

          return true;
        }
      }
    }),

    // Styling to indicate selectable line numbers and smooth cursor
    EditorView.theme({
      '.cm-lineNumbers .cm-gutterElement': {
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'color 0.15s ease, background-color 0.15s ease',
        '&:hover': {
          color: 'var(--accent-primary, #3b82f6) !important',
          backgroundColor: 'rgba(59, 130, 246, 0.08)'
        }
      }
    })
  ];
}
