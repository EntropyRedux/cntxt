import { editorRegistry } from './editorRegistry';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useImageModalStore } from '../../store/imageModalStore';
import { undo, redo, indentMore, indentLess } from '@codemirror/commands';
import { MarkdownFormatButton } from '../../types';

/**
 * Executes a markdown formatting operation on the current active editor tab.
 * Handles CodeMirror text selection wrapping, multi-line blocks, line prefixes,
 * and command dispatches with proper cursor placement.
 */
export const executeFormatting = (button: MarkdownFormatButton, targetTabId?: string): void => {
  const activeTabId = targetTabId || useTabStore.getState().activeTabId;
  if (!activeTabId) return;

  const view = editorRegistry.getView(activeTabId);

  // 1. Handle Command Types (Undo, Redo, Indent, Outdent, Variable Modal, etc.)
  if (button.type === 'command') {
    switch (button.commandId) {
      case 'undo':
        if (view) {
          undo(view);
          view.focus();
        }
        return;
      case 'redo':
        if (view) {
          redo(view);
          view.focus();
        }
        return;
      case 'indent':
        if (view) {
          indentMore(view);
          view.focus();
        } else {
          useTabStore.getState().insertTextAtCursor(activeTabId, '  ');
        }
        return;
      case 'outdent':
        if (view) {
          indentLess(view);
          view.focus();
        }
        return;
      case 'variable-modal':
        useTemplateStore.getState().openVariableModal();
        return;
      case 'slash-command':
        insertOrWrap(activeTabId, view, '/', '');
        return;
      case 'formula':
        insertOrWrap(activeTabId, view, '{=', '}');
        return;
      default:
        break;
    }
  }

  // Open Image Modal when Image format button is triggered
  if (button.id === 'fmt_image') {
    useImageModalStore.getState().openImageModal();
    return;
  }

  // 2. Handle Text Insertions / Wraps / Line Prefixes / Blocks
  const prefix = button.prefix || '';
  const suffix = button.suffix || '';

  if (button.type === 'line-prefix') {
    applyLinePrefix(activeTabId, view, prefix);
    return;
  }

  if (button.type === 'block') {
    applyBlock(activeTabId, view, prefix, suffix);
    return;
  }

  // Wrap or standard insert
  insertOrWrap(activeTabId, view, prefix, suffix);
};

function insertOrWrap(tabId: string, view: ReturnType<typeof editorRegistry.getView>, prefix: string, suffix: string = '') {
  if (view) {
    const selection = view.state.selection.main;
    const selectedText = view.state.sliceDoc(selection.from, selection.to);
    const replacement = `${prefix}${selectedText || ''}${suffix}`;

    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: replacement
      },
      selection: {
        // If text was selected, place cursor at the end of replacement.
        // If no text was selected, place cursor between prefix and suffix so user can type immediately!
        anchor: selectedText ? selection.from + replacement.length : selection.from + prefix.length
      },
      scrollIntoView: true
    });
    view.focus();
  } else {
    useTabStore.getState().insertTextAtCursor(tabId, `${prefix}${suffix}`);
  }
}

function applyLinePrefix(tabId: string, view: ReturnType<typeof editorRegistry.getView>, prefix: string) {
  if (!view) {
    useTabStore.getState().insertTextAtCursor(tabId, prefix);
    return;
  }

  const { state } = view;
  const selection = state.selection.main;
  const fromLine = state.doc.lineAt(selection.from);
  const toLine = state.doc.lineAt(selection.to);

  // If multi-line selection, prefix all selected lines
  if (fromLine.number !== toLine.number) {
    const changes: { from: number; insert: string }[] = [];
    for (let lineNum = fromLine.number; lineNum <= toLine.number; lineNum++) {
      const line = state.doc.line(lineNum);
      changes.push({ from: line.from, insert: prefix });
    }
    view.dispatch({
      changes,
      scrollIntoView: true
    });
    view.focus();
    return;
  }

  // Single line: insert at line start or replace existing heading/prefix if applicable
  const currentLine = fromLine;
  const lineText = currentLine.text;

  // If the line already starts with this prefix, we can let user toggle it off or append
  if (lineText.startsWith(prefix)) {
    // Remove the prefix (toggle off)
    view.dispatch({
      changes: {
        from: currentLine.from,
        to: currentLine.from + prefix.length,
        insert: ''
      },
      selection: { anchor: Math.max(currentLine.from, selection.from - prefix.length) },
      scrollIntoView: true
    });
  } else {
    // Insert at beginning of current line
    view.dispatch({
      changes: {
        from: currentLine.from,
        to: currentLine.from,
        insert: prefix
      },
      selection: { anchor: selection.from + prefix.length },
      scrollIntoView: true
    });
  }
  view.focus();
}

function applyBlock(tabId: string, view: ReturnType<typeof editorRegistry.getView>, prefix: string, suffix: string) {
  if (!view) {
    useTabStore.getState().insertTextAtCursor(tabId, `${prefix}\n${suffix}`);
    return;
  }

  const selection = view.state.selection.main;
  const selectedText = view.state.sliceDoc(selection.from, selection.to);

  const blockText = selectedText 
    ? `${prefix}${selectedText}${suffix}`
    : `${prefix}\n${suffix}`;

  view.dispatch({
    changes: {
      from: selection.from,
      to: selection.to,
      insert: blockText
    },
    selection: {
      anchor: selectedText ? selection.from + blockText.length : selection.from + prefix.length
    },
    scrollIntoView: true
  });
  view.focus();
}
