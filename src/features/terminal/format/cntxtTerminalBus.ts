/**
 * .cntxt Terminal Bus Document Parser & Serializer (FG-17)
 * 
 * Formats multi-session terminal states, channel manifests, and transcripts
 * into persistent .cntxt documents.
 */

import {
  TerminalSessionManifest,
  TerminalChannelConfig,
  TerminalChunkEntry,
} from '../../../contracts/data_shapes';

export interface TerminalBusStateData {
  version: number;
  activeChannel?: string;
  transcripts: Record<string, TerminalChunkEntry[]>;
}

export type ParseTerminalBusResult =
  | {
      ok: true;
      manifest: TerminalSessionManifest;
      state?: TerminalBusStateData;
    }
  | {
      ok: false;
      error: string;
    };

export function buildCntxtTerminalBus(
  manifest: TerminalSessionManifest,
  state?: TerminalBusStateData
): string {
  const frontmatterLines = [
    '---',
    `name: ${JSON.stringify(manifest.name)}`,
    `type: ${JSON.stringify(manifest.type)}`,
    `version: ${JSON.stringify(manifest.version)}`,
    `channels: ${JSON.stringify(manifest.channels)}`,
    '---',
    '',
    `# ${manifest.name}`,
    '',
    'Multi-session terminal bus document managed by CNTXT.',
    '',
  ];

  let out = frontmatterLines.join('\n');

  if (state) {
    const serializedState = JSON.stringify(state, null, 2);
    out += `\`\`\`state\n${serializedState}\n\`\`\`\n`;
  }

  return out;
}

export function parseCntxtTerminalBus(text: string): ParseTerminalBusResult {
  const src = text.replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) {
    return { ok: false, error: 'Missing frontmatter in terminal bus document' };
  }

  const end = src.indexOf('\n---\n', 4);
  if (end === -1) {
    return { ok: false, error: 'Unterminated frontmatter in terminal bus document' };
  }

  const raw: Record<string, unknown> = {};
  for (const line of src.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    const valStr = line.slice(i + 1).trim();
    try {
      raw[key] = JSON.parse(valStr);
    } catch {
      raw[key] = valStr;
    }
  }

  if (raw.type !== 'terminal-bus') {
    return { ok: false, error: "Document type must be 'terminal-bus'" };
  }

  const name = typeof raw.name === 'string' ? raw.name : 'Terminal Bus';
  const version = typeof raw.version === 'string' ? raw.version : '1.0.0';
  const channels: TerminalChannelConfig[] = Array.isArray(raw.channels)
    ? (raw.channels as TerminalChannelConfig[])
    : [];

  const manifest: TerminalSessionManifest = {
    name,
    type: 'terminal-bus',
    version,
    channels,
  };

  // Parse ```state code block
  const lines = src.slice(end + 5).split('\n');
  const stateOpen = lines.findIndex((l) => /^`{3,}state[ \t]*$/.test(l));
  let parsedState: TerminalBusStateData | undefined;

  if (stateOpen !== -1) {
    const sFenceLen = lines[stateOpen].match(/^`+/)![0].length;
    const sCloseRe = new RegExp('^`{' + sFenceLen + ',}[ \\t]*$');
    const sClose = lines.findIndex((l, i) => i > stateOpen && sCloseRe.test(l));
    if (sClose !== -1) {
      const stateStr = lines.slice(stateOpen + 1, sClose).join('\n');
      try {
        parsedState = JSON.parse(stateStr) as TerminalBusStateData;
      } catch {
        // Corrupt or empty state block
      }
    }
  }

  return {
    ok: true,
    manifest,
    state: parsedState,
  };
}
