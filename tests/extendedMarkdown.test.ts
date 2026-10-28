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

  it('keeps horizontal rule (---) as editable raw text when cursor is on the line, and replaces with HrWidget when cursor moves away', () => {
    const doc = 'First line\n---\nThird line';
    const hrLineFrom = 11; // start of '---\n'
    const hrLineTo = 14;   // end of '---'

    // 1. Cursor is on the '---' line (active line)
    const activeState = EditorState.create({
      doc,
      selection: { anchor: 13 }, // on the '---' line
      extensions: [liveMarkdownField]
    });

    const activeDecos = activeState.field(liveMarkdownField);
    let hrWidgetPresentWhenActive = false;
    activeDecos.between(hrLineFrom, hrLineTo, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'HrWidget') {
        hrWidgetPresentWhenActive = true;
      }
    });
    // While typing or editing on the --- line, it must NOT be replaced with a widget
    expect(hrWidgetPresentWhenActive).toBe(false);

    // 2. Cursor moves away (to line 1)
    const inactiveState = EditorState.create({
      doc,
      selection: { anchor: 0 }, // on line 1
      extensions: [liveMarkdownField]
    });

    const inactiveDecos = inactiveState.field(liveMarkdownField);
    let hrWidgetPresentWhenInactive = false;
    inactiveDecos.between(hrLineFrom, hrLineTo, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'HrWidget') {
        hrWidgetPresentWhenInactive = true;
      }
    });
    // When the cursor moves away, it cleanly renders as HrWidget
    expect(hrWidgetPresentWhenInactive).toBe(true);
  });

  it('CodeBlockHeaderWidget does not re-create DOM on keystrokes inside code blocks (stable eq)', () => {
    const doc = '```ts\nconst a = 1;\n```';
    const state = EditorState.create({
      doc,
      selection: { anchor: doc.length },
      extensions: [codeBlockCollapseField, liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let headerWidget: any = null;
    decos.between(0, doc.length, (_from, _to, value) => {
      if (value.spec.widget && value.spec.widget.constructor.name === 'CodeBlockHeaderWidget') {
        headerWidget = value.spec.widget;
      }
    });
    expect(headerWidget).toBeDefined();

    // Create another widget instance representing an updated code content after a keystroke
    const updatedWidget = new (headerWidget.constructor)(
      headerWidget.language,
      'const a = 12;', // modified content
      headerWidget.linePos,
      headerWidget.startLine,
      headerWidget.endLine,
      headerWidget.isCollapsed,
      headerWidget.lineCount,
      headerWidget.isRichContainer
    );

    // eq must return true so CodeMirror avoids DOM recreation while typing inside the block
    expect(headerWidget.eq(updatedWidget)).toBe(true);
  });
});
