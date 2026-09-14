import { EditorView } from '@codemirror/view';
import { undo, redo, selectAll } from '@codemirror/commands';
import { processTemplateVariables } from './templateVariableService';

class EditorRegistry {
  private views = new Map<string, EditorView>();

  register(tabId: string, view: EditorView) {
    this.views.set(tabId, view);
  }

  unregister(tabId: string) {
    this.views.delete(tabId);
  }

  getView(tabId: string): EditorView | undefined {
    return this.views.get(tabId);
  }

  getSelectedText(tabId: string): string {
    const view = this.views.get(tabId);
    if (view) {
      const { from, to } = view.state.selection.main;
      if (from !== to) {
        return view.state.doc.sliceString(from, to);
      }
    }
    return '';
  }

  insertTextAtCursor(tabId: string, text: string, replaceSelection = false): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const { from, to } = view.state.selection.main;
      const targetFrom = replaceSelection ? from : to;
      view.dispatch({
        changes: { from: targetFrom, to: replaceSelection ? to : targetFrom, insert: text },
        selection: { anchor: targetFrom + text.length },
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }

  replaceSelection(tabId: string, text: string): boolean {
    return this.insertTextAtCursor(tabId, text, true);
  }

  wrapSelection(tabId: string, prefix: string, suffix: string = prefix): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const { from, to } = view.state.selection.main;
      const selected = view.state.doc.sliceString(from, to);
      const wrapped = `${prefix}${selected}${suffix}`;
      view.dispatch({
        changes: { from, to, insert: wrapped },
        selection: {
          anchor: from,
          head: from + wrapped.length
        },
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }

  insertTemplateAtCursor(tabId: string, templateContent: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const { from, to } = view.state.selection.main;
      const selectedText = view.state.doc.sliceString(from, to);
      const processed = processTemplateVariables(templateContent, selectedText);
      const anchor = processed.cursorOffset !== null
        ? from + processed.cursorOffset
        : from + processed.content.length;

      view.dispatch({
        changes: { from, to, insert: processed.content },
        selection: { anchor },
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }

  undo(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const result = undo(view);
      view.focus();
      return result;
    }
    return false;
  }

  redo(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const result = redo(view);
      view.focus();
      return result;
    }
    return false;
  }

  selectAll(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const result = selectAll(view);
      view.focus();
      return result;
    }
    return false;
  }

  openSearch(_tabId?: string, mode: 'find' | 'replace' = 'find'): boolean {
    window.dispatchEvent(new CustomEvent('open-search', { detail: { mode } }));
    return true;
  }
}

export const editorRegistry = new EditorRegistry();

