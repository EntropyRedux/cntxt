import {
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
  EditorView
} from '@codemirror/view';
import { Extension, RangeSetBuilder } from '@codemirror/state';
import { getSearchQuery, setSearchQuery, SearchQuery } from '@codemirror/search';

const matchMark = Decoration.mark({ class: 'cm-searchMatch' });
const selectedMatchMark = Decoration.mark({ class: 'cm-searchMatch cm-searchMatch-selected' });

/**
 * Custom CodeMirror ViewPlugin that ensures search matches and the currently active match
 * are highlighted reliably with .cm-searchMatch and .cm-searchMatch-selected decorations,
 * even when using an external floating UI portal.
 */
export const searchHighlighterPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      const hasSearchEffect = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(setSearchQuery))
      );

      if (hasSearchEffect || update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      let query: SearchQuery | null = null;
      try {
        query = getSearchQuery(view.state);
      } catch {
        return Decoration.none;
      }

      if (!query || !query.valid || !query.search) {
        return Decoration.none;
      }

      const builder = new RangeSetBuilder<Decoration>();
      const sel = view.state.selection.main;
      let lastTo = -1;

      for (const range of view.visibleRanges) {
        // Expand bounds slightly to include matches starting slightly outside visible range
        const fromBound = Math.max(0, range.from - 250);
        const toBound = Math.min(view.state.doc.length, range.to + 250);
        if (fromBound >= toBound) continue;

        try {
          const cursor = query.getCursor(view.state, fromBound, toBound);
          let item = cursor.next();

          while (!item.done) {
            const { from, to } = item.value;
            // Mark decorations require from < to, and RangeSetBuilder requires monotonic order
            if (from < to && from >= lastTo) {
              const isSelected =
                (from === sel.from && to === sel.to) ||
                (!sel.empty && sel.from >= from && sel.to <= to) ||
                (sel.empty && sel.from >= from && sel.from <= to);

              builder.add(from, to, isSelected ? selectedMatchMark : matchMark);
              lastTo = to;
            }
            item = cursor.next();
          }
        } catch {
          // Guard against invalid regex or cursor exceptions
          break;
        }
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

export function searchHighlighterExtension(): Extension {
  return searchHighlighterPlugin;
}
