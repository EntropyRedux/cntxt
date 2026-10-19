import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { 
  liveMarkdownField, 
  codeBlockCollapseField, 
  toggleCodeBlockCollapseEffect 
} from '../src/extensions/liveMarkdown';

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

  it('renders LaTeX inline math using \\( formula \\) delimiters', () => {
    const doc = 'Given mass \\( m \\) and velocity \\( v \\), energy is conserved.';
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [codeBlockCollapseField, liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let inlineMathCount = 0;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'InlineMathWidget') {
        inlineMathCount++;
      }
    });
    expect(inlineMathCount).toBe(2);
  });

  it('renders display math for mathjax, tex, and amsmath code block languages', () => {
    const doc = '```mathjax\n\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}\n```\n';
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [codeBlockCollapseField, liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let hasDisplayMathWidget = false;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'DisplayMathWidget') {
        hasDisplayMathWidget = true;
      }
    });
    expect(hasDisplayMathWidget).toBe(true);
  });

  it('collapses code block into header and hides body lines when toggleCodeBlockCollapseEffect is dispatched', () => {
    const doc = '```python\ndef calculate():\n    x = 10\n    y = 20\n    return x + y\n```\n';
    let state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [codeBlockCollapseField, liveMarkdownField]
    });

    // Initially expanded
    let collapsedSet = state.field(codeBlockCollapseField);
    expect(collapsedSet.has(1)).toBe(false);

    // Toggle collapse on line 1
    const tr = state.update({
      effects: [toggleCodeBlockCollapseEffect.of(1)]
    });
    state = tr.state;

    collapsedSet = state.field(codeBlockCollapseField);
    expect(collapsedSet.has(1)).toBe(true);

    const decos = state.field(liveMarkdownField);
    let hasCollapsedHeader = false;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'CodeBlockHeaderWidget') {
        if ((value.spec.widget as any).isCollapsed === true) {
          hasCollapsedHeader = true;
          expect((value.spec.widget as any).lineCount).toBe(4);
        }
      }
    });
    expect(hasCollapsedHeader).toBe(true);

    // Toggle expand on line 1
    const trExpand = state.update({
      effects: [toggleCodeBlockCollapseEffect.of(1)]
    });
    const expandedState = trExpand.state;
    expect(expandedState.field(codeBlockCollapseField).has(1)).toBe(false);
  });
});
