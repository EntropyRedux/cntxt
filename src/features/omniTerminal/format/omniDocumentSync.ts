/**
 * Omni Terminal Document Sync Engine
 * 
 * Manages dual .cntxt document bus:
 * 1. [session]_raw.cntxt: Complete chronological black box stream (prompts, tool traces, <thought>, stdout)
 * 2. [session]_output.cntxt: Clean synthesized executive report (deliverables, exit statuses, annotated/pinned blocks)
 */

import { OmniChatMessage, OmniSession } from '../../../contracts/data_shapes';

/**
 * Strips all ANSI terminal escape codes, VT100 control sequences,
 * OSC window title sequences, and terminal cursor control codes.
 */
export function stripAnsi(text: string): string {
  if (!text) return '';

  return text
    // 1. Strip OSC sequences (e.g. \x1b]0;Title\x07 or \x1b]0;Title\x1b\)
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    // 2. Strip DCS, PM, APC sequences
    .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '')
    // 3. Strip CSI sequences including private modes (e.g. \x1b[?25h, \x1b[?1004h, \x1b[1;42H, \x1b[2J, \x1b[31X)
    .replace(/\x1b\[[0-9;?><=]*[A-Za-z]/g, '')
    // 4. Strip character set and keypad switches
    .replace(/\x1b[()][AB012]/g, '')
    .replace(/\x1b[=>M78c]/g, '')
    // 5. Strip any isolated ESC control characters
    .replace(/\x1b/g, '')
    // 6. Strip non-printable ASCII control characters (keeping \t, \n, \r)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    // 7. Normalize Windows CRLF line breaks
    .replace(/\r\n/g, '\n');
}

/**
 * Resolves terminal carriage returns (\r) where cursor rewrites previous text
 */
export function resolveCarriageReturns(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  return lines
    .map((line) => {
      if (!line.includes('\r')) return line;
      const parts = line.split('\r');
      return parts[parts.length - 1];
    })
    .join('\n');
}

/**
 * Strips <thought>...</thought> reasoning blocks from agent text
 */
export function stripThoughtBlocks(text: string): string {
  return text
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Filters out interactive TUI redraw artifacts, ASCII logos/banners,
 * status bars, divider lines, and terminal menu shortcut lines.
 */
export function filterTuiChrome(text: string): string {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;

    // 1. Heavy block drawing characters (ASCII logos, banners, progress bars)
    // e.g. . ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ▄▄ ...
    const blockCharCount = (trimmed.match(/[▄▀█▌▐■]/g) || []).length;
    if (blockCharCount >= 3) return false;

    // 2. Pure decorative rules / divider lines
    if (/^[─━═\-_=~]{3,}$/.test(trimmed)) return false;

    // 3. Known TUI headers, status bars, and shortcut bars
    // OpenCode footers & shortcut lines
    if (/Build\s*(?:auto)?\s*[•·*]\s*Big Pickle/i.test(trimmed)) return false;
    if (/esc\s+interrupt/i.test(trimmed)) return false;
    if (/ctrl\+p\s+commands/i.test(trimmed)) return false;
    if (/Tab\s+agents\s+ctrl\+p/i.test(trimmed)) return false;
    if (/Tip:?\s*Run \/connect/i.test(trimmed)) return false;
    if (/^\/update to upgrade to OpenCode/i.test(trimmed)) return false;
    if (/OpenCode\s+Zen/i.test(trimmed)) return false;
    if (/^\d+[\.\d]*[KkMm]?\s*\(\d+%\)\s*ctrl\+p/i.test(trimmed)) return false;
    if (/\|\s*(?:test|\w+)?\s*\|\s*\.+/i.test(trimmed)) return false;

    // Antigravity CLI footers, headers & spinners
    if (/^\?\s*for\s*shortcuts/i.test(trimmed)) return false;
    if (/Generating(?:\.\.\.|\s*>)?/i.test(trimmed)) return false;
    if (/Gemini\s+[\d\.]+\s+(?:Flash|Pro)/i.test(trimmed)) return false;
    if (/Antigravity\s+CLI\s+[\d\.]+/i.test(trimmed)) return false;

    // Intermediate tool call spinner/thought traces
    if (/^\+\s*Thought:\s*\d+ms/i.test(trimmed)) return false;
    if (/^Click\s+to\s+expand/i.test(trimmed)) return false;
    if (/^\*\s*(?:Glob|Read|Search)\s+/i.test(trimmed)) return false;
    if (/^->\s*Read\s+/i.test(trimmed)) return false;

    return true;
  });

  return filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Cleans terminal streams for human-readable chat bubbles and documents
 */
export function cleanTerminalStream(rawText: string): string {
  if (!rawText) return '';
  const withoutAnsi = stripAnsi(rawText);
  const resolved = resolveCarriageReturns(withoutAnsi);
  const withoutThoughts = stripThoughtBlocks(resolved);
  const withoutTui = filterTuiChrome(withoutThoughts);
  return withoutTui
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts explicitly annotated output from markdown content
 */
export function extractAnnotatedOutput(text: string): string | null {
  const match = text.match(/<!--\s*cntxt:output:start\s*-->([\s\S]*?)<!--\s*cntxt:output:end\s*-->/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return null;
}

/**
 * Generates initial file headers and YAML frontmatter for a new session
 */
export function buildInitialSessionFiles(session: OmniSession): { rawContent: string; outputContent: string } {
  const agentListYaml = session.pinnedAgents
    .map(
      (a) => `    - id: "${a.id}"
      name: "${a.name}"
      handle: "${a.handle}"
      role: "${a.role}"
      command: "${a.command}"
      spawnMode: "${a.spawnMode}"`
    )
    .join('\n');

  const rawHeader = `---
sessionId: "${session.id}"
title: "${session.title}"
createdAt: "${session.createdAt}"
updatedAt: "${session.updatedAt}"
targetFolder: "${session.targetFolder}"
busType: "omni-terminal-raw"
version: "1.0"
agents:
${agentListYaml || '    []'}
---

# Omni Terminal Flight Recorder: ${session.title}
*Target Folder:* \`${session.targetFolder}\`  
*Session Started:* ${session.createdAt}  

> [!NOTE]
> This document preserves the full, unfiltered flight recorder stream for session \`${session.id}\`.
> All prompts, shell outputs, tool traces, and reasoning trajectories are captured below.

---
`;

  const outputHeader = `---
sessionId: "${session.id}"
title: "${session.title}"
createdAt: "${session.createdAt}"
updatedAt: "${session.updatedAt}"
targetFolder: "${session.targetFolder}"
busType: "omni-terminal-output"
version: "1.0"
agents:
${agentListYaml || '    []'}
---

# Omni Terminal Clean Output & Deliverables: ${session.title}
*Target Folder:* \`${session.targetFolder}\`  
*Session Started:* ${session.createdAt}  

> [!TIP]
> This document contains only distilled milestones, final outputs, and pinned deliverables.
> Intermediate tool traces, internal thinking steps, and terminal progress indicators are filtered out.

---
`;

  return { rawContent: rawHeader, outputContent: outputHeader };
}

/**
 * Serializes a single conversation turn into the raw session stream format
 */
export function serializeRawTurn(turn: OmniChatMessage): string {
  const targetTag = turn.targetHandle ? ` target="@${turn.targetHandle}"` : '';
  let out = `\n<!-- cntxt:turn:start id="${turn.id}" sender="${turn.senderId}"${targetTag} time="${turn.timestamp}" -->\n`;
  out += `### ${turn.senderId === 'user' ? '👤 User' : `🤖 @${turn.senderName}`} (${turn.timestamp})\n`;
  
  if (turn.targetHandle && turn.senderId === 'user') {
    out += `*Targeted to:* \`@${turn.targetHandle}\`\n\n`;
  }

  if (turn.content) {
    out += `${turn.content}\n\n`;
  }

  if (turn.thought) {
    out += `<thought>\n${turn.thought.trim()}\n</thought>\n\n`;
  }

  if (turn.rawTerminalOutput) {
    out += `\`\`\`terminal\n${stripAnsi(turn.rawTerminalOutput).trim()}\n\`\`\`\n\n`;
  }

  if (turn.annotatedOutput) {
    out += `<!-- cntxt:output:start -->\n${turn.annotatedOutput.trim()}\n<!-- cntxt:output:end -->\n\n`;
  }

  if (turn.exitCode !== undefined && turn.exitCode !== null) {
    out += `*Process Exit Code:* \`${turn.exitCode}\`\n\n`;
  }

  out += `<!-- cntxt:turn:end -->\n`;
  return out;
}

/**
 * Extracts distilled clean output from an agent message
 * Returns null if the turn contains no significant output or is purely internal thinking
 */
export function extractCleanDeliverable(turn: OmniChatMessage): string | null {
  // 1. Explicit annotated block
  if (turn.annotatedOutput) {
    const cleanAnnotated = cleanTerminalStream(turn.annotatedOutput);
    return `### [${turn.timestamp}] @${turn.senderName}\n${cleanAnnotated.trim()}\n`;
  }

  const explicitTag = extractAnnotatedOutput(turn.content);
  if (explicitTag) {
    const cleanExplicit = cleanTerminalStream(explicitTag);
    return `### [${turn.timestamp}] @${turn.senderName}\n${cleanExplicit.trim()}\n`;
  }

  // 2. Explicitly pinned by user
  if (turn.isPinnedToOutput) {
    const cleanContent = cleanTerminalStream(turn.content);
    return `### [${turn.timestamp}] 📌 @${turn.senderName} (Pinned)\n${cleanContent || turn.content}\n`;
  }

  // 3. User messages are not included in output document
  if (turn.senderId === 'user') {
    return null;
  }

  // 4. Clean stream and inspect residual content
  const residual = cleanTerminalStream(turn.content);
  if (!residual || residual.length < 5) {
    // Check if exit status with output is useful
    if (turn.exitCode !== undefined && turn.exitCode !== 0) {
      return `### [${turn.timestamp}] ⚠️ @${turn.senderName} Process Terminated\nExit Code: \`${turn.exitCode}\`\n`;
    }
    return null;
  }

  // Clean deliverable formatting
  return `### [${turn.timestamp}] @${turn.senderName}\n${residual}\n`;
}

/**
 * Parses a shell command string into executable and argument tokens, respecting quotes.
 */
export function parseCommandLine(cmdString: string): { command: string; args: string[] } {
  if (!cmdString || !cmdString.trim()) {
    return { command: 'powershell.exe', args: [] };
  }

  const match = cmdString.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  if (match.length === 0) {
    return { command: 'powershell.exe', args: [] };
  }

  const command = match[0].replace(/^["']|["']$/g, '');
  const args = match.slice(1).map((arg) => arg.replace(/^["']|["']$/g, ''));
  return { command, args };
}

/**
 * Serializes a conversation turn (user prompt or agent deliverable)
 * into the structured format stored in session_output.cntxt.
 */
export function serializeOutputTurn(turn: OmniChatMessage): string {
  const targetTag = turn.targetHandle ? ` target="@${turn.targetHandle}"` : '';
  const colorTag = turn.color ? ` color="${turn.color}"` : '';
  const handleTag = turn.senderId !== 'user' ? ` handle="${turn.senderName}"` : '';

  let out = `\n<!-- cntxt:turn:start id="${turn.id}" sender="${turn.senderId}"${handleTag}${targetTag}${colorTag} time="${turn.timestamp}" -->\n`;
  const timeFormatted = turn.timestamp.includes('T') ? turn.timestamp.split('T')[1].slice(0, 5) : '';
  out += `### ${turn.senderId === 'user' ? '👤 User' : `🤖 @${turn.senderName}`} (${timeFormatted || turn.timestamp})\n\n`;

  if (turn.targetHandle && turn.senderId === 'user') {
    out += `*Targeted to:* \`@${turn.targetHandle}\`\n\n`;
  }

  out += `${cleanTerminalStream(turn.content)}\n\n`;
  out += `<!-- cntxt:turn:end -->\n`;
  return out;
}

/**
 * Parses an entire session_output.cntxt file content into OmniChatMessage[] objects.
 */
export function parseOutputDocumentTurns(content: string, sessionId: string): OmniChatMessage[] {
  if (!content || !content.trim()) return [];

  const turns: OmniChatMessage[] = [];
  const turnRegex = /<!--\s*cntxt:turn:start\s+([^>]+)-->([\s\S]*?)<!--\s*cntxt:turn:end\s*-->/g;
  let match: RegExpExecArray | null;

  while ((match = turnRegex.exec(content)) !== null) {
    const rawAttrs = match[1];
    const rawBody = match[2];

    const idMatch = rawAttrs.match(/id="([^"]+)"/);
    const senderMatch = rawAttrs.match(/sender="([^"]+)"/);
    const handleMatch = rawAttrs.match(/handle="([^"]+)"/);
    const targetMatch = rawAttrs.match(/target="@?([^"]+)"/);
    const colorMatch = rawAttrs.match(/color="([^"]+)"/);
    const timeMatch = rawAttrs.match(/time="([^"]+)"/);

    const senderId = senderMatch ? senderMatch[1] : 'user';
    const senderName = handleMatch ? handleMatch[1] : senderId === 'user' ? 'User' : 'agent';
    const turnId = idMatch ? idMatch[1] : `turn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = timeMatch ? timeMatch[1] : new Date().toISOString();
    const targetHandle = targetMatch ? targetMatch[1] : undefined;
    const color = colorMatch ? colorMatch[1] : undefined;

    // Strip header lines (e.g. "### 👤 User (12:00)" or "*Targeted to:* `@handle`")
    let cleanBody = rawBody
      .replace(/^[\s\n]*###\s+[^\n]*\n+/i, '')
      .replace(/^\*Targeted to:\*\s*`@[^`]+`\s*\n+/i, '')
      .trim();

    cleanBody = cleanTerminalStream(cleanBody);

    turns.push({
      id: turnId,
      sessionId,
      senderId,
      senderName,
      targetHandle,
      content: cleanBody,
      timestamp,
      isPinnedToOutput: false,
      color,
    });
  }

  return turns;
}

