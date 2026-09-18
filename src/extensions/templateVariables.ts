import { Extension, RangeSetBuilder, EditorSelection } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType, KeyBinding } from '@codemirror/view';
import { createElement } from '../adapters';

// Typography-first styling for placeholders without colored background boxes or button borders
const standardVariableMark = Decoration.mark({
  class: 'cm-template-variable text-amber-600 dark:text-amber-400 font-medium italic underline decoration-dotted decoration-amber-500/50 underline-offset-2 select-text'
});

const requiredVariableMark = Decoration.mark({
  class: 'cm-template-variable cm-template-variable-required text-rose-600 dark:text-rose-400 font-semibold italic underline decoration-wavy decoration-rose-500/60 underline-offset-2 select-text'
});

const rawInputSyntaxMark = Decoration.mark({
  class: 'cm-template-input-syntax text-amber-600/90 dark:text-amber-400/90 font-mono text-xs select-text'
});

function updateVariableToken(view: EditorView, from: number, to: number, newSyntax: string) {
  const currentSlice = view.state.sliceDoc(from, to);
  if (currentSlice.startsWith('[[{{') && currentSlice.endsWith('}}]]')) {
    view.dispatch({
      changes: { from, to, insert: newSyntax }
    });
    return;
  }
  // Fallback: search closest matching [[{{ around from
  const docText = view.state.doc.toString();
  const searchStart = Math.max(0, from - 20);
  const index = docText.indexOf('[[{{', searchStart);
  if (index !== -1) {
    const endIndex = docText.indexOf('}}]]', index);
    if (endIndex !== -1) {
      view.dispatch({
        changes: { from: index, to: endIndex + 4, insert: newSyntax }
      });
    }
  }
}

function resetVariableToken(view: EditorView, from: number, to: number, varName: string, defaultValue: string) {
  const defaultSyntax = defaultValue ? `[[{{${varName}:${defaultValue}}}]]` : `[[{{${varName}}}]]`;
  updateVariableToken(view, from, to, defaultSyntax);
}

class VariableInputWidget extends WidgetType {
  constructor(
    readonly varName: string,
    readonly defaultValue: string,
    readonly currentValue: string,
    readonly from: number,
    readonly to: number
  ) {
    super();
  }

  eq(other: VariableInputWidget): boolean {
    return (
      this.varName === other.varName &&
      this.defaultValue === other.defaultValue &&
      this.currentValue === other.currentValue &&
      this.from === other.from &&
      this.to === other.to
    );
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createElement('span', {
      className: 'cm-variable-input-wrap inline-flex items-center gap-1 mx-1 my-0.5 align-middle select-none'
    });

    const isModified = this.currentValue !== this.defaultValue;

    const input = createElement('input', {
      type: 'text',
      className: 'cm-variable-input text-xs px-2 py-0.5 rounded border border-[var(--border-primary,#444)] bg-[var(--card-bg,#222)] text-[var(--text-primary,#eee)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all shadow-xs font-sans',
      value: this.currentValue,
      placeholder: this.defaultValue || this.varName,
      title: `Variable: ${this.varName}${this.defaultValue ? ` (Default: ${this.defaultValue})` : ''}\nPress Esc or click ↺ to reset to default`
    }) as HTMLInputElement;

    // Approximate sizing
    const displayLen = Math.max(this.currentValue.length, (this.defaultValue || this.varName).length, 4);
    input.style.width = `${Math.min(Math.max(displayLen * 8 + 24, 70), 260)}px`;

    const handleCommit = () => {
      const val = input.value.trim();
      const isNowDefault = val === this.defaultValue || (val === '' && !this.defaultValue);
      const newSyntax = isNowDefault
        ? (this.defaultValue ? `[[{{${this.varName}:${this.defaultValue}}}]]` : `[[{{${this.varName}}}]]`)
        : (this.defaultValue ? `[[{{${this.varName}:${this.defaultValue}|${val}}}]]` : `[[{{${this.varName}|${val}}}]]`);
      updateVariableToken(view, this.from, this.to, newSyntax);
    };

    const handleReset = () => {
      input.value = this.defaultValue;
      resetVariableToken(view, this.from, this.to, this.varName, this.defaultValue);
    };

    input.addEventListener('input', () => {
      const currentLen = Math.max(input.value.length, (this.defaultValue || this.varName).length, 4);
      input.style.width = `${Math.min(Math.max(currentLen * 8 + 24, 70), 260)}px`;
    });

    input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleReset();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleCommit();
        input.blur();
      }
    });

    input.addEventListener('blur', handleCommit);
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());

    container.appendChild(input);

    // Efficient Reset: ↺ button visible whenever value is modified from default
    if (isModified) {
      const resetBtn = createElement('button', {
        type: 'button',
        className: 'inline-flex items-center justify-center w-4 h-4 rounded text-[var(--text-muted,#888)] hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors p-0.5',
        title: 'Reset to default placeholder (Esc)'
      });
      resetBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleReset();
      });
      resetBtn.addEventListener('mousedown', (e) => e.stopPropagation());
      container.appendChild(resetBtn);
    }

    return container;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

import { parseVariableToken, type ParsedVariableToken } from '../services/editor/templateVariableService';
export { parseVariableToken, type ParsedVariableToken };


function parseVariableContent(content: string): { varName: string; defaultValue: string; currentValue: string } {
  let defPart = content.trim();
  let currentValue = '';

  if (defPart.includes('|')) {
    const splitIndex = defPart.indexOf('|');
    currentValue = defPart.slice(splitIndex + 1).trim();
    defPart = defPart.slice(0, splitIndex).trim();
  }

  let varName = defPart;
  let defaultValue = '';
  if (defPart.includes(':')) {
    const colonIndex = defPart.indexOf(':');
    varName = defPart.slice(0, colonIndex).trim();
    defaultValue = defPart.slice(colonIndex + 1).trim();
  }

  if (!currentValue) {
    currentValue = defaultValue;
  }

  return { varName, defaultValue, currentValue };
}

function buildVariableDecorations(view: EditorView, isRendered: boolean): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const docText = doc.toString();

  interface Item {
    from: number;
    to: number;
    deco: Decoration;
  }
  const items: Item[] = [];

  // 1. First scan for [[{{ ... }}]] interactive input syntax
  const inputRegex = /\[\[\{\{([^}]+)\}\}\]\]/g;
  let match: RegExpExecArray | null;
  const inputRanges: { from: number; to: number }[] = [];

  while ((match = inputRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    inputRanges.push({ from, to });

    if (isRendered) {
      const parsed = parseVariableContent(match[1]);
      items.push({
        from,
        to,
        deco: Decoration.replace({
          widget: new VariableInputWidget(
            parsed.varName,
            parsed.defaultValue,
            parsed.currentValue,
            from,
            to
          )
        })
      });
    } else {
      // In raw mode: clean monospace mark without colored boxes
      items.push({
        from,
        to,
        deco: rawInputSyntaxMark
      });
    }
  }

  // 2. Scan for regular {{variable}} placeholders (skip those that are inside [[{{...}}]])
  const varRegex = /\{\{([^}]+)\}\}/g;
  while ((match = varRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;

    // Check if inside any [[{{...}}]]
    const isInsideInput = inputRanges.some(r => from >= r.from && to <= r.to);
    if (isInsideInput) continue;

    const parsed = parseVariableToken(match[1]);

    items.push({
      from,
      to,
      deco: parsed.isRequired ? requiredVariableMark : standardVariableMark
    });
  }

  items.sort((a, b) => a.from - b.from || a.to - b.to);
  for (const item of items) {
    builder.add(item.from, item.to, item.deco);
  }

  return builder.finish();
}

/**
 * Tab navigation command for {{variables}} placeholders.
 * When Tab is pressed, it navigates to the next placeholder and selects it,
 * allowing instant replacement by typing.
 */
export function navigateVariable(view: EditorView, reverse: boolean): boolean {
  const docText = view.state.doc.toString();
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: { from: number; to: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(docText)) !== null) {
    // Only target standard {{...}} placeholders for keyboard navigation
    const isInsideInput = docText.slice(Math.max(0, m.index - 2), m.index) === '[[' &&
                         docText.slice(m.index + m[0].length, m.index + m[0].length + 2) === ']]';
    if (!isInsideInput) {
      matches.push({ from: m.index, to: m.index + m[0].length });
    }
  }

  if (matches.length === 0) return false;

  const selFrom = Math.min(view.state.selection.main.anchor, view.state.selection.main.head);
  const selTo = Math.max(view.state.selection.main.anchor, view.state.selection.main.head);

  if (!reverse) {
    // Forward search: find next variable strictly after the current selection
    let next = matches.find(item => item.from >= selTo);
    if (!next) {
      // Loop back to the first placeholder
      next = matches[0];
      // If we are already selecting the only placeholder, exit so user can indent or leave
      if (matches.length === 1 && selFrom === next.from && selTo === next.to) {
        return false;
      }
    }

    view.dispatch({
      selection: EditorSelection.single(next.from, next.to),
      effects: [
        EditorView.scrollIntoView(next.from, {
          y: 'center',
          yMargin: 80,
          x: 'nearest'
        })
      ]
    });
    return true;
  } else {
    // Backward search
    const rev = [...matches].reverse();
    let prev = rev.find(item => item.to <= selFrom);
    if (!prev) {
      prev = rev[0];
      if (matches.length === 1 && selFrom === prev.from && selTo === prev.to) {
        return false;
      }
    }

    view.dispatch({
      selection: EditorSelection.single(prev.from, prev.to),
      effects: [
        EditorView.scrollIntoView(prev.from, {
          y: 'center',
          yMargin: 80,
          x: 'nearest'
        })
      ]
    });
    return true;
  }
}

export function variableTabKeymap(): KeyBinding[] {
  return [
    {
      key: 'Tab',
      run: (view: EditorView) => navigateVariable(view, false)
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => navigateVariable(view, true)
    }
  ];
}

export function templateVariablesExtension(isRendered = false): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildVariableDecorations(view, isRendered);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildVariableDecorations(update.view, isRendered);
        }
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}
