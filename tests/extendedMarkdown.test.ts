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

  it('renders nested bullet list with adjacent italic formatting without RangeSetBuilder error', () => {
    const doc = '    *   *Process 1:* [Name & Purpose] $\\rightarrow$ *Requires Settings Toggle?* [Yes/No]';
    const state = EditorState.create({
      doc,
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    expect(decos).toBeDefined();
    expect(decos.size).toBeGreaterThan(0);
  });

  it('does not treat indentation spaces between bullet marker and text as italic', () => {
    const doc = '*   *Target*';
    const state = EditorState.create({
      doc,
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let italicText = '';
    decos.between(0, doc.length, (from, to, value) => {
      if (value.spec.class?.includes('cm-live-italic')) {
        italicText = doc.slice(from, to);
      }
    });
    expect(italicText.replace(/\*/g, '')).toBe('Target');
  });
});
