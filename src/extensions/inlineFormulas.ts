import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { FormulaEngine } from '../services/formulaParser';
import { createElement } from '../adapters';

const formulaEngine = new FormulaEngine();

// Typography-first styling for raw mode - clean font color, NO colored background boxes or button borders
const formulaMark = Decoration.mark({
  class: 'cm-inline-formula text-cyan-600 dark:text-cyan-400 font-mono font-medium select-text'
});

export function executeFormulaAt(
  view: EditorView,
  rawToken: string,
  from: number,
  to: number,
  isOneShot: boolean
): { success: boolean; value?: string; error?: string } {
  const doc = view.state.doc;
  const sel = view.state.selection.main;
  const hasSelection = !sel.empty;
  const selectedText = hasSelection ? view.state.sliceDoc(sel.from, sel.to) : '';

  // Prepare execution context
  const pos = sel.head;
  const line = doc.lineAt(pos);
  const context = {
    line: line.number,
    column: pos - line.from + 1,
    lineCount: doc.lines,
    charCount: doc.length,
    wordCount: doc.toString().split(/\s+/).filter(Boolean).length,
    selectedText,
    getLine: (n: number) => (n >= 1 && n <= doc.lines ? doc.line(n).text : ''),
    getRange: (startLine: number, endLine: number) => {
      const s = Math.max(1, Math.min(startLine, doc.lines));
      const e = Math.max(1, Math.min(endLine, doc.lines));
      return doc.sliceString(doc.line(s).from, doc.line(e).to);
    }
  };

  formulaEngine.updateContext(context);
  const res = formulaEngine.evaluate(rawToken);

  if (!res.success) {
    console.warn('Formula error:', res.error);
    return { success: false, error: res.error };
  }

  const outputStr = res.value !== undefined ? String(res.value) : '';

  if (hasSelection) {
    // 1. Text is selected: replace selected text with formula evaluation output
    if (isOneShot) {
      // Disappear on execute: replace selection and remove formula token
      if (to <= sel.from) {
        view.dispatch({
          changes: [
            { from: sel.from, to: sel.to, insert: outputStr },
            { from, to, insert: '' }
          ]
        });
      } else if (from >= sel.to) {
        view.dispatch({
          changes: [
            { from, to, insert: '' },
            { from: sel.from, to: sel.to, insert: outputStr }
          ]
        });
      } else {
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: outputStr }
        });
      }
    } else {
      // Retained mode (default): replace selection with evaluated output, keeping formula button
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: outputStr }
      });
    }
  } else {
    // 2. No text selected:
    if (isOneShot) {
      // Disappear on click > replace formula with evaluated result directly
      view.dispatch({
        changes: { from, to, insert: outputStr }
      });
    } else {
      // Retained mode (default): return output so widget displays the live value
      return { success: true, value: outputStr };
    }
  }

  return { success: true, value: outputStr };
}

class FormulaPlayWidget extends WidgetType {
  constructor(
    readonly rawToken: string,
    readonly expr: string,
    readonly isOneShot: boolean,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: FormulaPlayWidget): boolean {
    return (
      this.rawToken === other.rawToken &&
      this.expr === other.expr &&
      this.isOneShot === other.isOneShot &&
      this.from === other.from &&
      this.to === other.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('span', {
      className: 'cm-formula-widget inline-flex items-center gap-1 mx-1 my-0.5 align-middle select-none text-xs font-mono group'
    });

    // Play Button (compact, clean icon button - not an action button block)
    const playBtn = createElement('button', {
      type: 'button',
      className: 'cm-formula-play-btn inline-flex items-center justify-center w-5 h-5 rounded hover:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-all cursor-pointer p-0.5',
      title: `Run formula: ${this.expr}\n• Retained in document by default\n• Select text first to transform selection\n• Shift+Click to execute and replace formula`
    });
    playBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>`;

    // Formula label / Live evaluated result
    const labelSpan = createElement('span', {
      className: 'text-[var(--text-secondary,#aaa)] hover:text-[var(--text-primary,#eee)] transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-[var(--card-hover-bg,#333)]',
      textContent: `{=${this.expr}}`,
      title: `Formula: {=${this.expr}}\nClick to evaluate`
    });

    // Configuration toggle: Retained by default vs. Disappear / Replace on execute
    const toggleBtn = createElement('button', {
      type: 'button',
      className: `cm-formula-mode-toggle inline-flex items-center justify-center text-[10px] px-1 py-0.5 rounded transition-colors opacity-0 group-hover:opacity-100 ${
        this.isOneShot
          ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
          : 'text-[var(--text-muted,#777)] hover:text-cyan-400 hover:bg-cyan-500/10'
      }`,
      title: this.isOneShot
        ? 'Configured: Disappear on click > execute (Click to retain button)'
        : 'Configured: Retain button in document (Click to configure disappear on execute)'
    });
    toggleBtn.textContent = this.isOneShot ? 'One-shot' : 'Retain';

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const newSyntax = this.isOneShot ? `{=${this.expr}}` : `{!=${this.expr}}`;
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: newSyntax }
      });
    });

    const runAction = (forceOneShot = false) => {
      const oneShot = forceOneShot || this.isOneShot;
      const res = executeFormulaAt(view, this.rawToken, this.from, this.to, oneShot);
      if (res && res.success && res.value !== undefined && !oneShot) {
        labelSpan.textContent = res.value || '""';
        labelSpan.className = 'text-cyan-600 dark:text-cyan-400 font-semibold px-1 py-0.5 rounded bg-cyan-500/10 transition-colors';
        labelSpan.title = `Evaluated result: ${res.value} (Formula: {=${this.expr}})`;
      }
    };

    playBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runAction(e.shiftKey || e.altKey);
    });

    labelSpan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      runAction(e.shiftKey || e.altKey);
    });

    playBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    labelSpan.addEventListener('mousedown', (e) => e.stopPropagation());
    toggleBtn.addEventListener('mousedown', (e) => e.stopPropagation());

    container.appendChild(playBtn);
    container.appendChild(labelSpan);
    container.appendChild(toggleBtn);

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildFormulaDecorations(view: EditorView, isRendered: boolean): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const text = doc.toString();

  // Matches formulas:
  // {=expression} -> retained by default
  // {!=expression} or {=!expression} -> configured to disappear on execute
  const regex = /\{(!=|!=|=!|=)([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  interface Item {
    from: number;
    to: number;
    deco: Decoration;
  }
  const items: Item[] = [];

  while ((match = regex.exec(text)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const prefix = match[1];
    const expr = match[2].trim();
    const isOneShot = prefix === '!=' || prefix === '=!';

    if (isRendered) {
      items.push({
        from,
        to,
        deco: Decoration.replace({
          widget: new FormulaPlayWidget(match[0], expr, isOneShot, from, to)
        })
      });
    } else {
      // In raw mode: clean monospace typography without colored boxes
      items.push({
        from,
        to,
        deco: formulaMark
      });
    }
  }

  items.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const item of items) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

export function inlineFormulasExtension(isRendered = false): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      lastRendered: boolean;
      constructor(view: EditorView) {
        this.lastRendered = isRendered;
        this.decorations = buildFormulaDecorations(view, isRendered);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || this.lastRendered !== isRendered) {
          this.lastRendered = isRendered;
          this.decorations = buildFormulaDecorations(update.view, isRendered);
        }
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}
