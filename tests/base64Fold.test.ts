import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import { base64FoldExtension, base64FoldService } from '../src/extensions/base64FoldExtension';

describe('Base64 Fold Extension', () => {
  it('returns empty extension when isRawMode is false', () => {
    const ext = base64FoldExtension(false);
    expect(Array.isArray(ext)).toBe(true);
    expect((ext as any[]).length).toBe(0);
  });

  it('returns fold service, decorator, and theme when isRawMode is true', () => {
    const ext = base64FoldExtension(true);
    expect(Array.isArray(ext)).toBe(true);
    expect((ext as any[]).length).toBe(3);
  });

  it('identifies foldable range for base64 markdown images', () => {
    const sampleDoc = [
      '# Document Title',
      'Normal paragraph text here.',
      '![regular](https://example.com/photo.png)',
      '![embedded](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==)',
      'Trailing line'
    ].join('\n');

    const state = EditorState.create({
      doc: sampleDoc,
      extensions: [base64FoldService]
    });

    const line3 = state.doc.line(3);
    const line4 = state.doc.line(4);

    const line3Text = state.doc.sliceString(line3.from, line3.to);
    expect(line3Text.includes('data:image/')).toBe(false);

    const line4Text = state.doc.sliceString(line4.from, line4.to);
    expect(line4Text.includes('data:image/png;base64,')).toBe(true);

    const openParen = line4Text.indexOf('(');
    const closeParen = line4Text.lastIndexOf(')');
    expect(openParen).toBeGreaterThan(0);
    expect(closeParen).toBeGreaterThan(openParen);
  });
});
