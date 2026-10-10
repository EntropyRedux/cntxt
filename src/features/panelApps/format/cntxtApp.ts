/**
 * Format serializer and deserializer for .cntxt panel app files.
 * Single source of truth: frontmatter manifest + dynamic-fenced HTML + optional state block.
 */
import { PanelAppManifest } from '../../../contracts/data_shapes';
import { PanelAppManifestSchema } from '../../../contracts/boundarySchemas';
import { pickFence } from './fence';

export const STATE_MAX_BYTES = 512 * 1024; // 512 KB

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

export function buildCntxtApp(manifest: PanelAppManifest, html: string, state?: unknown): string {
  const m = PanelAppManifestSchema.parse(manifest);
  const front = KEY_ORDER.map((k) => `${k}: ${JSON.stringify(m[k])}`).join('\n');
  const fence = pickFence(html);
  const body = html.endsWith('\n') ? html : html + '\n';
  let out = `---\n${front}\n---\n\n# ${m.name}\n\n${fence}html\n${body}${fence}\n`;

  if (state !== undefined && state !== null) {
    const serializedState =
      typeof state === 'string'
        ? state.trim()
        : JSON.stringify(state, null, 2);
    if (serializedState) {
      out += `\n\`\`\`state\n${serializedState}\n\`\`\`\n`;
    }
  }

  return out;
}

export type ParseResult =
  | { ok: true; manifest: PanelAppManifest; html: string; state?: string }
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

  // check for state code block
  const stateOpen = lines.findIndex((l) => /^`{3,}state[ \t]*$/.test(l));
  let stateStr: string | undefined;
  if (stateOpen !== -1) {
    const sFenceLen = lines[stateOpen].match(/^`+/)![0].length;
    const sCloseRe = new RegExp('^`{' + sFenceLen + ',}[ \\t]*$');
    const sClose = lines.findIndex((l, i) => i > stateOpen && sCloseRe.test(l));
    if (sClose !== -1) {
      stateStr = lines.slice(stateOpen + 1, sClose).join('\n');
    }
  }

  return {
    ok: true,
    manifest: parsed.data,
    html: lines.slice(open + 1, close).join('\n'),
    state: stateStr,
  };
}

export function updateCntxtAppState(text: string, state: unknown): string {
  const serialized =
    typeof state === 'string'
      ? state.trim()
      : JSON.stringify(state, null, 2);

  const byteLength = new TextEncoder().encode(serialized).length;
  if (byteLength > STATE_MAX_BYTES) {
    throw new Error(`State size exceeds ${STATE_MAX_BYTES / 1024} KB limit`);
  }

  const src = text.replace(/\r\n/g, '\n');
  const lines = src.split('\n');
  const stateOpen = lines.findIndex((l) => /^`{3,}state[ \t]*$/.test(l));

  if (stateOpen !== -1) {
    const sFenceLen = lines[stateOpen].match(/^`+/)![0].length;
    const sCloseRe = new RegExp('^`{' + sFenceLen + ',}[ \\t]*$');
    const sClose = lines.findIndex((l, i) => i > stateOpen && sCloseRe.test(l));
    if (sClose !== -1) {
      const before = lines.slice(0, stateOpen + 1);
      const after = lines.slice(sClose);
      return [...before, serialized, ...after].join('\n');
    }
  }

  // Not found: append at end
  const trimmed = src.trimEnd();
  return `${trimmed}\n\n\`\`\`state\n${serialized}\n\`\`\`\n`;
}
