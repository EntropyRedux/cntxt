import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { liveMarkdownField } from '../src/extensions/liveMarkdown';

describe('Extended Markdown Inline Formatting', () => {
  it('decorates ***bold+italic*** with cm-live-bold-italic', () => {
    const doc = 'Normal ***maximum emphasis*** trailing';
    const state = EditorState.create({
      doc,
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let found = false;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.class?.includes('cm-live-bold-italic')) {
        found = true;
      }
    });
    expect(found).toBe(true);
  });

  it('decorates ==highlight== with cm-live-highlight', () => {
    const doc = 'Normal ==glowing mark text== trailing';
    const state = EditorState.create({
      doc,
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let found = false;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.class?.includes('cm-live-highlight')) {
        found = true;
      }
    });
    expect(found).toBe(true);
  });

  it('decorates ~subscript~ and ^superscript^ with respective classes', () => {
    const doc = 'Formula H~2~O and E = mc^2^ here';
    const state = EditorState.create({
      doc,
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let foundSub = false;
    let foundSup = false;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.class?.includes('cm-live-sub')) {
        foundSub = true;
      }
      if (value.spec.class?.includes('cm-live-sup')) {
        foundSup = true;
      }
    });
    expect(foundSub).toBe(true);
    expect(foundSup).toBe(true);
  });
});
