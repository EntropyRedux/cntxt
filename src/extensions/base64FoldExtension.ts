import { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from '@codemirror/view';
import { foldService } from '@codemirror/language';

/**
 * Matches markdown image syntax containing a base64 data URI:
 * ![alt](data:image/png;base64,...)
 */
const BASE64_IMAGE_REGEX = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/;

/**
 * Custom fold service: provides a foldable range for the base64 data URL inside ![alt](data:image/...)
 * This causes CodeMirror's fold gutter to show a fold chevron (▸/▾) on the line.
 */
export const base64FoldService = foldService.of((state, lineStart, lineEnd) => {
  const lineText = state.doc.sliceString(lineStart, lineEnd);
  const match = BASE64_IMAGE_REGEX.exec(lineText);
  if (!match) return null;

  // We fold starting right after the '(' up to right before the ')'
  const openParenIndex = lineText.indexOf('(', match.index);
  const closeParenIndex = lineText.indexOf(')', openParenIndex);
  if (openParenIndex === -1 || closeParenIndex === -1) return null;

  return {
    from: lineStart + openParenIndex + 1,
    to: lineStart + closeParenIndex
  };
});

/**
 * Line decorator plugin: flags lines containing base64 images with `.cm-raw-image-line`
 * to enforce single-row height regardless of whether word wrap or continuous mode is on.
 */
const base64LineDecorator = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    private buildDecorations(view: EditorView): DecorationSet {
      const builder: any[] = [];
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          if (line.text.includes('data:image/') && BASE64_IMAGE_REGEX.test(line.text)) {
            builder.push(
              Decoration.line({ class: 'cm-raw-image-line' }).range(line.from)
            );
          }
          pos = line.to + 1;
        }
      }
      return Decoration.set(builder, true);
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

/**
 * Theme styling for .cm-raw-image-line:
 * Ensures the raw line is strictly truncated to 1 visual row, preventing 100k character wrapping.
 */
const base64Theme = EditorView.theme({
  '.cm-raw-image-line': {
    whiteSpace: 'nowrap !important',
    overflow: 'hidden !important',
    textOverflow: 'ellipsis !important',
    maxHeight: '1.6em !important',
    display: 'block !important'
  }
});

export function base64FoldExtension(isRawMode: boolean): Extension {
  if (!isRawMode) return [];
  return [base64FoldService, base64LineDecorator, base64Theme];
}
