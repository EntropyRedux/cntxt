import { StateEffect, StateField } from '@codemirror/state';

export const toggleCodeBlockCollapseEffect = StateEffect.define<number>();
export const setCodeBlockCollapseEffect = StateEffect.define<{ line: number; collapsed: boolean }>();
export const clearAllCodeBlockCollapseEffect = StateEffect.define<void>();

export const codeBlockCollapseField = StateField.define<ReadonlySet<number>>({
  create() {
    return new Set<number>();
  },
  update(collapsedSet, tr) {
    let nextSet = collapsedSet;
    let modified = false;

    // 1. Remap line numbers when document text changes
    if (tr.docChanged && collapsedSet.size > 0) {
      const remapped = new Set<number>();
      for (const lineNum of collapsedSet) {
        if (lineNum <= tr.startState.doc.lines) {
          const oldLine = tr.startState.doc.line(lineNum);
          const newPos = tr.changes.mapPos(oldLine.from);
          if (newPos <= tr.newDoc.length) {
            const newLineNum = tr.newDoc.lineAt(newPos).number;
            remapped.add(newLineNum);
          }
        }
      }
      nextSet = remapped;
      modified = true;
    }

    // 2. Process toggle / set / clear effects
    for (const effect of tr.effects) {
      if (effect.is(toggleCodeBlockCollapseEffect)) {
        const copy = new Set(nextSet);
        if (copy.has(effect.value)) {
          copy.delete(effect.value);
        } else {
          copy.add(effect.value);
        }
        nextSet = copy;
        modified = true;
      } else if (effect.is(setCodeBlockCollapseEffect)) {
        const copy = new Set(nextSet);
        if (effect.value.collapsed) {
          copy.add(effect.value.line);
        } else {
          copy.delete(effect.value.line);
        }
        nextSet = copy;
        modified = true;
      } else if (effect.is(clearAllCodeBlockCollapseEffect)) {
        nextSet = new Set<number>();
        modified = true;
      }
    }

    return modified ? nextSet : collapsedSet;
  }
});
