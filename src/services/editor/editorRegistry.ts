import { EditorSelection } from '@codemirror/state';
import { foldCode, unfoldCode, foldAll, unfoldAll } from '@codemirror/language';
import { setDiagnostics as cmSetDiagnostics, Diagnostic } from '@codemirror/lint';
import { EditorSelectionRange, EditorDiagnosticItem } from '../../../contracts/data_shapes';
import type { EditorView } from '@codemirror/view';
import { processTemplateVariables } from './templateVariableService';
import { editorStateCache } from './editorStateCache';

export type EditorCommandFn = (view: EditorView) => boolean;

export interface EditorCommands {
  undo: EditorCommandFn;
  redo: EditorCommandFn;
  selectAll: EditorCommandFn;
  indentMore: EditorCommandFn;
  indentLess: EditorCommandFn;
}

class EditorRegistry {
  private views = new Map<string, EditorView>();
  private commands: EditorCommands | null = null;

  registerCommands(commands: EditorCommands) {
    this.commands = commands;
  }

  register(tabId: string, view: EditorView) {
    this.views.set(tabId, view);
  }

  unregister(tabId: string) {
    this.views.delete(tabId);
  }

  getView(tabId: string): EditorView | undefined {
    return this.views.get(tabId);
  }

  setContent(tabId: string, newContent: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== newContent) {
        const currentSel = view.state.selection.main;
        const clampedAnchor = Math.min(currentSel.anchor, newContent.length);
        const clampedHead = Math.min(currentSel.head, newContent.length);
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: newContent },
          selection: { anchor: clampedAnchor, head: clampedHead }
        });
      }
      return true;
    }
    if (editorStateCache.hasTabState(tabId)) {
      const cached = editorStateCache.getTabState(tabId)!;
      const currentDoc = cached.state.doc.toString();
      if (currentDoc !== newContent) {
        const tr = cached.state.update({
          changes: { from: 0, to: currentDoc.length, insert: newContent }
        });
        editorStateCache.saveTabState(tabId, tr.state, cached.scrollTop, cached.scrollLeft, cached.language);
      }
      return true;
    }
    return false;
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
    if (view && this.commands?.undo) {
      const result = this.commands.undo(view);
      view.focus();
      return result;
    }
    return false;
  }

  redo(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view && this.commands?.redo) {
      const result = this.commands.redo(view);
      view.focus();
      return result;
    }
    return false;
  }

  selectAll(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view && this.commands?.selectAll) {
      const result = this.commands.selectAll(view);
      view.focus();
      return result;
    }
    return false;
  }

  indentMore(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view && this.commands?.indentMore) {
      const result = this.commands.indentMore(view);
      view.focus();
      return result;
    }
    return false;
  }

  indentLess(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view && this.commands?.indentLess) {
      const result = this.commands.indentLess(view);
      view.focus();
      return result;
    }
    return false;
  }

  openSearch(_tabId?: string, mode: 'find' | 'replace' = 'find'): boolean {
    window.dispatchEvent(new CustomEvent('open-search', { detail: { mode } }));
    return true;
  }

  selectAndScrollToNextVariable(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (!view) return false;
    const docText = view.state.doc.toString();
    const regex = /\{\{([^}]+)\}\}/g;
    const currentPos = view.state.selection.main.to;

    let match: RegExpExecArray | null = null;
    let nextMatch: { from: number; to: number } | null = null;
    let firstMatch: { from: number; to: number } | null = null;

    while ((match = regex.exec(docText)) !== null) {
      const from = match.index;
      const to = from + match[0].length;
      if (!firstMatch) {
        firstMatch = { from, to };
      }
      if (from >= currentPos && !nextMatch) {
        nextMatch = { from, to };
        break;
      }
    }

    const target = nextMatch || firstMatch;
    if (target) {
      view.dispatch({
        selection: { anchor: target.from, head: target.to },
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }
  setSelections(tabId: string, selections: EditorSelectionRange[], mainIndex = 0): boolean {
    const view = this.views.get(tabId);
    if (view && selections.length > 0) {
      const docLength = view.state.doc.length;
      const ranges = selections.map(s =>
        EditorSelection.range(
          Math.min(Math.max(0, s.anchor), docLength),
          Math.min(Math.max(0, s.head), docLength)
        )
      );
      const validMain = Math.min(Math.max(0, mainIndex), ranges.length - 1);
      view.dispatch({
        selection: EditorSelection.create(ranges, validMain),
        scrollIntoView: true
      });
      view.focus();
      return true;
    }
    return false;
  }

  getSelections(tabId: string): EditorSelectionRange[] {
    const view = this.views.get(tabId);
    if (view) {
      return view.state.selection.ranges.map(r => ({
        anchor: r.anchor,
        head: r.head
      }));
    }
    return [];
  }

  fold(tabId: string, options: { line?: number; all?: boolean; unfold?: boolean }): boolean {
    const view = this.views.get(tabId);
    if (!view) return false;

    if (options.all) {
      if (options.unfold) {
        unfoldAll(view);
      } else {
        foldAll(view);
      }
      return true;
    }

    if (options.line !== undefined) {
      const lineNum = Math.min(Math.max(1, options.line), view.state.doc.lines);
      const line = view.state.doc.line(lineNum);
      view.dispatch({ selection: { anchor: line.from } });
      if (options.unfold) {
        return unfoldCode(view);
      } else {
        return foldCode(view);
      }
    }

    return false;
  }

  setDiagnostics(tabId: string, diagnostics: EditorDiagnosticItem[]): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const docLength = view.state.doc.length;
      const cmDiagnostics: Diagnostic[] = diagnostics.map(d => ({
        from: Math.min(Math.max(0, d.from), docLength),
        to: Math.min(Math.max(0, d.to), docLength),
        severity: d.severity,
        message: d.message,
        source: d.source || 'CNTXT-RPC',
      }));
      view.dispatch(cmSetDiagnostics(view.state, cmDiagnostics));
      return true;
    }
    return false;
  }

  clearDiagnostics(tabId: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      view.dispatch(cmSetDiagnostics(view.state, []));
      return true;
    }
    return false;
  }

  replaceRange(tabId: string, from: number, to: number, insert: string): boolean {
    const view = this.views.get(tabId);
    if (view) {
      const docLength = view.state.doc.length;
      const clampedFrom = Math.min(Math.max(0, from), docLength);
      const clampedTo = Math.min(Math.max(clampedFrom, to), docLength);
      view.dispatch({
        changes: { from: clampedFrom, to: clampedTo, insert },
        scrollIntoView: true
      });
      return true;
    }
    return false;
  }
}

export const editorRegistry = new EditorRegistry();

