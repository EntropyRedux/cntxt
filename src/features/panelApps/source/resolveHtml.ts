export type ResolvedSource =
  | { ok: true; html: string; via: 'raw' | 'fence'; note?: string }
  | { ok: false; reason: string };

const HTML_HINT = /<\s*(!doctype|html|head|body|script|style|div|main|section)\b/i;

export function resolveHtml(content: string, fileName?: string): ResolvedSource {
  const text = content.replace(/\r\n/g, '\n');

  // 1) markdown / .cntxt containing an html fence -> extract the first one
  const lines = text.split('\n');
  const open = lines.findIndex((l) => /^`{3,}html[ \t]*$/.test(l));
  if (open !== -1) {
    const len = lines[open].match(/^`+/)![0].length;
    const closeRe = new RegExp('^`{' + len + ',}[ \\t]*$');
    const close = lines.findIndex((l, i) => i > open && closeRe.test(l));
    if (close !== -1) {
      return {
        ok: true,
        html: lines.slice(open + 1, close).join('\n'),
        via: 'fence',
        note: 'Extracted first HTML code block from document',
      };
    }
  }

  // 2) raw html file or tab
  const looksHtml = /\.html?$/i.test(fileName ?? '') || HTML_HINT.test(text);
  if (looksHtml && text.trim()) {
    return { ok: true, html: text, via: 'raw' };
  }

  return { ok: false, reason: 'No HTML code block or HTML markup found in document' };
}
