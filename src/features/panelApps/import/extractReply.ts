/**
 * Pure text parser that extracts monolithic HTML from pasted AI responses.
 * Scans markdown code blocks and raw HTML snippets without ever executing or evaluating code.
 */

export interface ExtractedHtmlResult {
  html: string;
  isTruncated: boolean;
  sourceType: 'fence' | 'raw_doctype' | 'raw_html';
}

/**
 * Extracts the primary monolithic HTML payload from an AI chat response.
 * Handles:
 * - ```html ... ``` code fences
 * - Unterminated code fences (when AI output stream gets truncated)
 * - Multiple code blocks (picks the largest HTML candidate)
 * - Raw HTML without code blocks (<!DOCTYPE html> ... </html>)
 * - CRLF line ending normalization
 */
export function extractHtmlFromReply(text: string): ExtractedHtmlResult | null {
  if (!text || typeof text !== 'string') return null;

  const normalized = text.replace(/\r\n/g, '\n');

  // Strategy 1: Find all markdown code blocks
  // Regex looks for ```[optional language tag] followed by content, optionally closed by ```
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)(?:```|$)/g;
  let match: RegExpExecArray | null;
  const candidates: Array<{ code: string; isTruncated: boolean; score: number }> = [];

  while ((match = fenceRegex.exec(normalized)) !== null) {
    const lang = (match[1] || '').toLowerCase().trim();
    const content = match[2].trim();
    const matchedFull = match[0];
    const isClosed = matchedFull.endsWith('```') && matchedFull.length > 3;

    // Check if block contains HTML
    const looksLikeHtml =
      lang === 'html' ||
      lang === 'htm' ||
      lang === 'xml' ||
      /<(!doctype\s+html|html|head|body|script|style)/i.test(content);

    if (looksLikeHtml && content.length > 0) {
      let score = content.length;
      if (lang === 'html') score += 10000;
      if (/<html/i.test(content)) score += 5000;
      if (/<!doctype\s+html/i.test(content)) score += 5000;

      candidates.push({
        code: content,
        isTruncated: !isClosed,
        score,
      });
    }
  }

  if (candidates.length > 0) {
    // Sort by score descending, pick best candidate
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    return {
      html: best.code,
      isTruncated: best.isTruncated,
      sourceType: 'fence',
    };
  }

  // Strategy 2: Raw HTML with <!DOCTYPE html> ... </html>
  const doctypeMatch = normalized.match(/<!doctype\s+html[\s\S]*?(?:<\/html>|$)/i);
  if (doctypeMatch) {
    const raw = doctypeMatch[0].trim();
    const isTruncated = !/<\/html>\s*$/i.test(raw);
    return {
      html: raw,
      isTruncated,
      sourceType: 'raw_doctype',
    };
  }

  // Strategy 3: Raw HTML with <html ... </html>
  const htmlTagMatch = normalized.match(/<html[\s\S]*?(?:<\/html>|$)/i);
  if (htmlTagMatch) {
    const raw = htmlTagMatch[0].trim();
    const isTruncated = !/<\/html>\s*$/i.test(raw);
    return {
      html: raw,
      isTruncated,
      sourceType: 'raw_html',
    };
  }

  return null;
}
