import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { liveMarkdownField, TableBlockWidget } from '../src/extensions/liveMarkdown';

describe('Table and Block Search Unveil', () => {
  const markdownWithTable = [
    '# Heading 1',
    '',
    '| Feature | Status | Notes |',
    '| :--- | :---: | ---: |',
    '| Alpha | Active | Primary |',
    '| Beta | Pending | Review |',
    '',
    'Footer text here.'
  ].join('\n');

  it('renders table replacement widget when selection is outside table', () => {
    // Selection at line 1 (outside table)
    const state = EditorState.create({
      doc: markdownWithTable,
      selection: EditorSelection.single(0),
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let hasTableWidget = false;
    decos.between(0, state.doc.length, (_from, _to, value) => {
      if (value.spec.widget instanceof TableBlockWidget) {
        hasTableWidget = true;
      }
    });

    expect(hasTableWidget).toBe(true);
  });

  it('unveils table (no table widget) when search selection intersects table cell', () => {
    // Find offset of "Alpha" inside the table
    const targetOffset = markdownWithTable.indexOf('Alpha');
    expect(targetOffset).toBeGreaterThan(0);

    // Selection on "Alpha" inside table row 3
    const state = EditorState.create({
      doc: markdownWithTable,
      selection: EditorSelection.single(targetOffset, targetOffset + 5),
      extensions: [liveMarkdownField]
    });

    const decos = state.field(liveMarkdownField);
    let hasTableWidget = false;
    decos.between(0, state.doc.length, (_from, _to, value) => {
      if (value.spec.widget instanceof TableBlockWidget) {
        hasTableWidget = true;
      }
    });

    // When selection intersects the table, it must be unveiled so search highlights/scrolls to it
    expect(hasTableWidget).toBe(false);
  });
});
