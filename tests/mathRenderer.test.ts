import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderLatex,
  getKatex,
  isKatexLoaded,
  type MathRenderResult,
} from '../src/services/mathRenderer';

describe('mathRenderer', () => {
  beforeEach(() => {
    // Render behavior is deterministic in both loaded and unloaded katex states.
    // These tests exercise the UNLOADED (placeholder) path, which is the mode
    // every Vitest run uses; the loaded path is proven by e2e/preview.spec.ts.
  });

  describe('module surface', () => {
    it('exposes the renderer contract used by tableParser and the preview layer', () => {
      expect(typeof renderLatex).toBe('function');
      expect(typeof getKatex).toBe('function');
      expect(typeof isKatexLoaded).toBe('function');
    });

    it('exposes isPending in the MathRenderResult shape contract', () => {
      const res: MathRenderResult = renderLatex('x', false);
      expect(res).toHaveProperty('html');
      expect(res).toHaveProperty('isError');
      expect(res).toHaveProperty('isPending');
    });
  });

  describe('unloaded placeholder path (Vitest default mode)', () => {
    it('marks empty input as non-error with empty html', () => {
      const res = renderLatex('   ', false);
      expect(res.isError).toBe(false);
      expect(res.html).toBe('');
    });

    it('marks the result as pending when katex is not loaded', () => {
      if (isKatexLoaded()) return; // loaded environments skip the pending path
      const res = renderLatex('E = mc^2', false);
      expect(res.isPending).toBe(true);
      expect(res.isError).toBe(false);
    });

    it('HTML-escapes the raw formula inside the placeholder (XSS-safe)', () => {
      if (isKatexLoaded()) return;
      const res = renderLatex('<script>alert(1)</script>', false);
      expect(res.isPending).toBe(true);
      expect(res.html).not.toContain('<script>');
      expect(res.html).toContain('&lt;script&gt;');
    });

    it('wraps display-mode placeholders in a block element and inline in a span', () => {
      if (isKatexLoaded()) return;
      const inline = renderLatex('a+b', false);
      const display = renderLatex('a+b', true);
      expect(inline.html.startsWith('<span')).toBe(true);
      expect(display.html.startsWith('<div')).toBe(true);
    });

    it('never throws for pathological input', () => {
      expect(() => renderLatex('\\\\frac{', false)).not.toThrow();
      expect(() => renderLatex('\\invalid\\command', true)).not.toThrow();
      expect(() => renderLatex('$${{}}', false)).not.toThrow();
      expect(() => renderLatex('a'.repeat(10_000), false)).not.toThrow();
    });

    it('error-shaped results always carry isError=true with a message', () => {
      // Contract for consumers: isError=true implies a human-readable error string.
      const res = renderLatex('\\\\begin{unknown-env}', false);
      if (res.isError) {
        expect(typeof res.error).toBe('string');
        expect((res.error as string).length).toBeGreaterThan(0);
      } else {
        expect(res.html.length).toBeGreaterThan(0);
      }
    });
  });
});