import { Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { FormulaEngine } from '../services/formulaParser';

const formulaEngine = new FormulaEngine();

const formulaMark = Decoration.mark({
  class: 'cm-inline-formula bg-cyan-500/15 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-cyan-500/40 text-xs inline-block mx-0.5 shadow-xs'
});

function buildFormulaDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  const regex = /\{=[^}]+\}/g;

  for (let { from, to } of view.visibleRanges) {
    const text = doc.sliceString(from, to);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + match[0].length;
      builder.add(start, end, formulaMark);
    }
  }

  return builder.finish();
}

export function inlineFormulasExtension(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildFormulaDecorations(view);
      }
      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildFormulaDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations
    }
  );
}
