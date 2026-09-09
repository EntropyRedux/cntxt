import { EditorView } from '@codemirror/view';

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

  insertTextAtCursor(tabId: string, text: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }
}

export const editorRegistry = new EditorRegistry();
