/**
 * Dynamic fence picker to avoid backtick collisions in markdown code blocks.
 * Finds the longest run of backticks in html and picks a fence at least 3 chars
 * and strictly longer than the longest run.
 */
export function pickFence(html: string): string {
  const runs = html.match(/`+/g);
  let longest = 0;
  if (runs) {
    for (const r of runs) {
      if (r.length > longest) longest = r.length;
    }
  }
  return '`'.repeat(Math.max(3, longest + 1));
}
