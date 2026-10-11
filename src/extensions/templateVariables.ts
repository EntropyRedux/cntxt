import { Extension, RangeSetBuilder, EditorSelection } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, KeyBinding } from '@codemirror/view';

// Typography-first styling for placeholders without colored background boxes or button borders
const standardVariableMark = Decoration.mark({
  class: 'cm-template-variable text-amber-600 dark:text-amber-400 font-medium italic underline decoration-dotted decoration-amber-500/50 underline-offset-2 select-text'
});

const requiredVariableMark = Decoration.mark({
  class: 'cm-template-variable cm-template-variable-required text-rose-600 dark:text-rose-400 font-semibold italic underline decoration-wavy decoration-rose-500/60 underline-offset-2 select-text'
});

import { parseVariableToken, type ParsedVariableToken } from '../services/editor/templateVariableService';
export { parseVariableToken, type ParsedVariableToken };

function buildVariableDecorations(view: EditorView, _isRendered: boolean): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const docText = doc.toString();

  const varRegex = /\{\{([^}]+)\}\}/g;
  let match: RegExpExecArray | null;

  while ((match = varRegex.exec(docText)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const parsed = parseVariableToken(match[1]);

    builder.add(
      from,
      to,
      parsed.isRequired ? requiredVariableMark : standardVariableMark
    );
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
    matches.push({ from: m.index, to: m.index + m[0].length });
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
      lastRendered: boolean;
      constructor(view: EditorView) {
        this.lastRendered = isRendered;
        this.decorations = buildVariableDecorations(view, isRendered);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || this.lastRendered !== isRendered) {
          this.lastRendered = isRendered;
          this.decorations = buildVariableDecorations(update.view, isRendered);
        }
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}
