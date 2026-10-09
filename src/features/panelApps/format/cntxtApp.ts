/**
 * Format serializer and deserializer for .cntxt panel app files.
 * Single source of truth: frontmatter manifest + dynamic-fenced HTML.
 */
import { PanelAppManifest } from '../../../contracts/data_shapes';
import { PanelAppManifestSchema } from '../../../contracts/boundarySchemas';
import { pickFence } from './fence';

const KEY_ORDER = [
  'schemaVersion',
  'id',
  'name',
  'icon',
  'description',
  'runtime',
  'network',
  'panelWidth',
  'createdFrom',
] as const;

export function buildCntxtApp(manifest: PanelAppManifest, html: string): string {
  const m = PanelAppManifestSchema.parse(manifest);
  const front = KEY_ORDER.map((k) => `${k}: ${JSON.stringify(m[k])}`).join('\n');
  const fence = pickFence(html);
  const body = html.endsWith('\n') ? html : html + '\n';
  return `---\n${front}\n---\n\n# ${m.name}\n\n${fence}html\n${body}${fence}\n`;
}

export type ParseResult =
  | { ok: true; manifest: PanelAppManifest; html: string }
  | { ok: false; error: string };

export function parseCntxtApp(text: string): ParseResult {
  const src = text.replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) return { ok: false, error: 'Missing frontmatter' };
  const end = src.indexOf('\n---\n', 4);
  if (end === -1) return { ok: false, error: 'Unterminated frontmatter' };

  const raw: Record<string, unknown> = {};
  for (const line of src.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i === -1) return { ok: false, error: `Bad frontmatter line: ${line}` };
    try {
      raw[line.slice(0, i).trim()] = JSON.parse(line.slice(i + 1).trim());
    } catch {
      return { ok: false, error: `Invalid value for "${line.slice(0, i).trim()}"` };
    }
  }
  const parsed = PanelAppManifestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid manifest' };
  }

  // first html fence in the body; the closing fence must be at least as long as the opener
  const lines = src.slice(end + 5).split('\n');
  const open = lines.findIndex((l) => /^`{3,}html[ \t]*$/.test(l));
  if (open === -1) return { ok: false, error: 'No html code block found' };
  const fenceLen = lines[open].match(/^`+/)![0].length;
  const closeRe = new RegExp('^`{' + fenceLen + ',}[ \\t]*$');
  const close = lines.findIndex((l, i) => i > open && closeRe.test(l));
  if (close === -1) return { ok: false, error: 'Unterminated html code block' };

  return {
    ok: true,
    manifest: parsed.data,
    html: lines.slice(open + 1, close).join('\n'),
  };
}
