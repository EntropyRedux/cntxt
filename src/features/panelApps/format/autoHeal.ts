/**
 * HTML Panel App Auto-Healer
 *
 * Automatically repairs known pervasive LLM generation hallucinations
 * (e.g. malformed markdown checklist regexes, unescaped backticks in template literals)
 * to ensure apps mount cleanly and event listeners never fail to attach.
 */

export function autoHealHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  let out = rawHtml;

  // 1. Auto-heal pervasive LLM markdown checklist regex typo:
  // e.g. lines[lineIndex].replace(/^([\s]*-\s*[)[ xX](])/, ...)
  out = out.replace(/(\^?\(\[\\s\]\*-\\s\*)\[\)\s*\[\s*xX\s*\]\s*\(\]/g, '$1\\[([ xX])\\]');
  out = out.replace(/\[\)\s*\[\s*xX\s*\]\s*\(\]/g, '\\[([ xX])\\]');

  // 2. Auto-heal unescaped triple backticks inside HTML template literals / elements:
  // e.g. <button ...>``` Code</button> or <span>```</span> or title="```"
  out = out.replace(/>\s*```\s*([^<]*)</g, (_, inner) => {
    const trimmed = inner.trim();
    return trimmed ? `>&#96;&#96;&#96; ${trimmed}<` : `>&#96;&#96;&#96;<`;
  });
  out = out.replace(/(title|aria-label)=(["'])```\s*([^"']*)\2/g, '$1=$2&#96;&#96;&#96; $3$2');

  return out;
}
