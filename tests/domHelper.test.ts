import { describe, it, expect, beforeEach } from 'vitest';
import { escapeHtml, sanitizePreviewHtml, sanitizeSvgHtml } from '../src/adapters/domHelper';

describe('domHelper Security Functions', () => {
  describe('escapeHtml', () => {
    it('escapes ampersands', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B');
    });
    it('escapes less-than signs', () => {
      expect(escapeHtml('A < B')).toBe('A &lt; B');
    });
    it('escapes greater-than signs', () => {
      expect(escapeHtml('A > B')).toBe('A &gt; B');
    });
    it('escapes double quotes', () => {
      expect(escapeHtml('A "B" C')).toBe('A &quot;B&quot; C');
    });
    it('escapes single quotes', () => {
      expect(escapeHtml("A 'B' C")).toBe('A &#39;B&#39; C');
    });
    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });
    it('handles null/undefined', () => {
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });
  });

  describe('sanitizePreviewHtml', () => {
    it('sanitizes script tags', () => {
      const dirty = '<div>Hello</div><script>alert("xss")</script><p>World</p>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).not.toContain('<script>');
    });
    it('sanitizes iframe tags', () => {
      const dirty = '<iframe src="evil.com"></iframe><p>Safe</p>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).not.toContain('<iframe>');
    });
    it('sanitizes event handlers', () => {
      const dirty = '<div onclick="alert(1)">Content</div>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).not.toContain('onclick');
    });
    it('sanitizes javascript: hrefs', () => {
      const dirty = '<a href="javascript:alert(1)">Click</a>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).toContain('href="#"');
    });
    it('sanitizes file: hrefs', () => {
      const dirty = '<a href="file:///etc/passwd">Link</a>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).toContain('href="#"');
    });
    it('handles empty input', () => {
      expect(sanitizePreviewHtml('')).toBe('');
      expect(sanitizePreviewHtml(null as any)).toBe('');
    });
    it('preserves safe content', () => {
      const dirty = '<div><p>Safe</p><a href="https://example.com">Link</a></div>';
      const clean = sanitizePreviewHtml(dirty);
      expect(clean).toContain('Safe');
      expect(clean).toContain('https://example.com');
    });

    it('preserves KaTeX layout positioning styles while stripping fixed/sticky and z-index', () => {
      const katexHtml = '<span class="katex" data-cntxt-math="true"><span style="top: -2.5em; height: 1.2em; position: relative; z-index: 9999; position: fixed;">x^2</span></span>';
      const clean = sanitizePreviewHtml(katexHtml);
      expect(clean).toContain('top: -2.5em');
      expect(clean).toContain('height: 1.2em');
      expect(clean).toContain('position: relative');
      expect(clean).not.toContain('fixed');
      expect(clean).not.toContain('z-index');
    });
  });

  describe('sanitizeSvgHtml', () => {
    it('preserves safe SVG geometry, classes, and internal style blocks', () => {
      const svg = '<svg id="mermaid-1" class="mermaid" viewBox="0 0 100 100"><style>#mermaid-1 .node { fill: #38bdf8; stroke: #0284c7; }</style><g class="node"><rect width="80" height="40"></rect><text>Flow</text></g></svg>';
      const clean = sanitizeSvgHtml(svg);
      expect(clean).toContain('<svg');
      expect(clean).toContain('<style>');
      expect(clean).toContain('fill: #38bdf8');
      expect(clean).toContain('<rect');
      expect(clean).toContain('<text>Flow</text>');
    });

    it('strips script tags and inline event handlers from SVG', () => {
      const dangerousSvg = '<svg><script>alert(1)</script><circle onclick="alert(2)" cx="10" cy="10" r="5"></circle></svg>';
      const clean = sanitizeSvgHtml(dangerousSvg);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('<circle');
    });

    it('strips dangerous @import or javascript in SVG style tags', () => {
      const maliciousStyleSvg = '<svg><style>@import url("evil.css"); .a { color: red; }</style></svg>';
      const clean = sanitizeSvgHtml(maliciousStyleSvg);
      expect(clean).not.toContain('@import');
    });

    it('sanitizes javascript hrefs in SVG elements', () => {
      const linkSvg = '<svg><a href="javascript:alert(1)"><text>Click</text></a></svg>';
      const clean = sanitizeSvgHtml(linkSvg);
      expect(clean).not.toContain('javascript:alert(1)');
      expect(clean).toContain('href="#"');
    });
  });
});

