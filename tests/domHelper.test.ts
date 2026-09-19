import { describe, it, expect, beforeEach } from 'vitest';
import { escapeHtml, sanitizePreviewHtml } from '../src/adapters/domHelper';

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
  });
});

