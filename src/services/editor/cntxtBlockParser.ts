/**
 * CNTXT Block Parser & Surgical Writer Engine (FG-22)
 *
 * Pure, stateless parser and splice-based writer for CNTXT-owned (`|`) fenced blocks.
 * Implements the 6 universal governance primitives (`id`, `tags`, `locked`, `status`, `link`, `source`),
 * hybrid AST (`CntxtParsedBlock | CntxtRawSegment`), bidirectional `CntxtRelationshipGraph`,
 * variable-length collision-safe fences (`~~~` / ```` ``` ````), and surgical block mutations.
 */

import {
  CntxtLockValue,
  CntxtBlockParams,
  CntxtParsedBlock,
  CntxtRawSegment,
  CntxtDocumentNode,
  CntxtRelationshipGraph,
  CntxtParsedDocument,
} from '../../../contracts/data_shapes';

const GOVERNANCE_KEYS = new Set([
  'id',
  'tags',
  'locked',
  'status',
  'link',
  'source',
  'ts',
]);

const RICH_CONTAINER_TYPES = new Set([
  'markdown',
  'md',
  'cntxt',
  'deliverable',
  'agent',
  'text',
  '',
]);

/**
 * Determines whether a fenced block should be rendered as a CNTXT Rich Container
 * (allowing rich Markdown, live tables, Mermaid graphs, and LaTeX math inside).
 */
export function isRichContainerType(type: string, isCNTXT: boolean): boolean {
  if (!isCNTXT) return false;
  return RICH_CONTAINER_TYPES.has(type.trim().toLowerCase());
}

/**
 * Computes a collision-free fence string (at least 3 chars) that will not prematurely
 * close on any inner fence lines inside `content`.
 */
export function computeSafeFence(content: string, preferredFence = '~~~'): string {
  const fenceChar = preferredFence.startsWith('~') ? '~' : '`';
  let minLen = Math.max(3, preferredFence.length);

  if (content) {
    const lines = content.split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*(`{3,}|~{3,})/);
      if (m && m[1][0] === fenceChar && m[1].length >= minLen) {
        minLen = m[1].length + 1;
      }
    }
  }

  return fenceChar.repeat(minLen);
}

/**
 * Parses a fenced code block's info string (`language | key=value ...` or `language | shorthand label`).
 */
export function parseBlockInfoString(infoString: string): {
  type: string;
  isCNTXT: boolean;
  isRichContainer: boolean;
  params: CntxtBlockParams;
  warnings: string[];
} {
  const trimmed = (infoString || '').trim();
  const pipeIndex = trimmed.indexOf('|');

  if (pipeIndex === -1) {
    const type = trimmed.toLowerCase();
    return {
      type,
      isCNTXT: false,
      isRichContainer: false,
      params: {},
      warnings: [],
    };
  }

  const type = trimmed.slice(0, pipeIndex).trim().toLowerCase();
  const rawAfterPipe = trimmed.slice(pipeIndex + 1).trim();
  const isRich = isRichContainerType(type, true);

  if (!rawAfterPipe) {
    return {
      type,
      isCNTXT: true,
      isRichContainer: isRich,
      params: {},
      warnings: [],
    };
  }

  const params: CntxtBlockParams = {};
  const rendererParams: Record<string, string> = {};
  const warnings: string[] = [];
  const seen = new Set<string>();

  // Extract all key="quoted", key='quoted', or key=unquoted tokens
  const kvRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
  const matchedRanges: Array<[number, number]> = [];
  let match: RegExpExecArray | null;

  while ((match = kvRegex.exec(rawAfterPipe)) !== null) {
    matchedRanges.push([match.index, match.index + match[0].length]);
    const key = match[1].trim();
    const value = (match[2] ?? match[3] ?? match[4] ?? '').trim();

    if (seen.has(key)) {
      warnings.push(`Duplicate param "${key}" — last value wins`);
    }
    seen.add(key);

    if (GOVERNANCE_KEYS.has(key)) {
      switch (key) {
        case 'id':
          params.id = value;
          break;
        case 'tags':
          params.tags = value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
          break;
        case 'locked':
          if (value === 'agent' || value === 'user') {
            params.locked = value as CntxtLockValue;
          } else if (value === 'none' || value === 'unlocked' || value === '') {
            delete params.locked;
          } else {
            warnings.push(`Invalid locked value "${value}" (expected "agent" or "user")`);
          }
          break;
        case 'status':
          params.status = value;
          break;
        case 'link':
          params.link = value
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
          break;
        case 'source':
          params.source = value;
          break;
        case 'ts':
          params.ts = value;
          break;
      }
    } else {
      rendererParams[key] = value;
    }
  }

  if (Object.keys(rendererParams).length > 0) {
    params.rendererParams = rendererParams;
    if (rendererParams.title) {
      params.label = rendererParams.title;
    }
  }

  // Reconstruct any unkeyed freeform text after `|` (e.g., `@agy · FG-21 Plan (04:30)`)
  if (matchedRanges.length === 0) {
    params.label = rawAfterPipe;
    const handleMatch = rawAfterPipe.match(/^(@[a-zA-Z0-9_-]+)\s*(?:·|-|:)?\s*(.*)$/);
    if (handleMatch) {
      if (!params.source) {
        params.source = handleMatch[1];
      }
      if (handleMatch[2]?.trim()) {
        params.label = handleMatch[2].trim();
      }
    }
  } else if (!params.label) {
    let cursor = 0;
    const leftoverParts: string[] = [];
    for (const [rStart, rEnd] of matchedRanges) {
      if (rStart > cursor) {
        const piece = rawAfterPipe.slice(cursor, rStart).trim();
        if (piece) leftoverParts.push(piece);
      }
      cursor = rEnd;
    }
    if (cursor < rawAfterPipe.length) {
      const tail = rawAfterPipe.slice(cursor).trim();
      if (tail) leftoverParts.push(tail);
    }
    const leftover = leftoverParts.join(' ').trim();
    if (leftover) {
      params.label = leftover;
    }
  }

  return {
    type,
    isCNTXT: true,
    isRichContainer: isRich,
    params,
    warnings,
  };
}

/**
 * Serializes block type and `CntxtBlockParams` back into a canonical CNTXT info string.
 */
export function serializeBlockInfoString(
  type: string,
  params: CntxtBlockParams,
  isCNTXT = true
): string {
  const cleanType = (type || 'markdown').trim();
  if (!isCNTXT) {
    return cleanType;
  }

  const formatVal = (val: string) =>
    /\s/.test(val) ? `"${val.replace(/"/g, '\\"')}"` : val;

  const parts: string[] = [];
  if (params.id) parts.push(`id=${formatVal(params.id)}`);
  if (params.tags && params.tags.length > 0) {
    parts.push(`tags=${params.tags.join(',')}`);
  }
  if (params.locked) parts.push(`locked=${params.locked}`);
  if (params.status) parts.push(`status=${formatVal(params.status)}`);
  if (params.link && params.link.length > 0) {
    parts.push(`link=${params.link.join(',')}`);
  }
  if (params.source) parts.push(`source=${formatVal(params.source)}`);
  if (params.ts) parts.push(`ts=${formatVal(params.ts)}`);

  const rendererEntries = { ...(params.rendererParams || {}) };
  if (params.label && !rendererEntries.title) {
    rendererEntries.title = params.label;
  }

  for (const [k, v] of Object.entries(rendererEntries)) {
    if (v !== undefined && v !== '') {
      parts.push(`${k}=${formatVal(String(v))}`);
    }
  }

  return parts.length > 0 ? `${cleanType} | ${parts.join(' ')}` : `${cleanType} |`;
}

/**
 * Parses a raw Markdown / `.cntxt` document into a `CntxtParsedDocument` AST
 * with exact character positions, 1-based line numbers, and `CntxtRelationshipGraph`.
 */
export function parseCntxtDocument(raw: string): CntxtParsedDocument {
  const nodes: CntxtDocumentNode[] = [];
  const blocks: CntxtParsedBlock[] = [];
  const warnings: string[] = [];

  if (!raw) {
    return {
      nodes,
      blocks,
      relationshipGraph: { byId: {}, byTag: {}, links: {}, linkedFrom: {} },
      raw: '',
      warnings,
    };
  }

  // Compute line start/end offsets so line numbers and char offsets are 100% exact
  const lineInfos: Array<{
    lineNum: number;
    from: number;
    to: number;
    nextPos: number;
    text: string;
  }> = [];

  let pos = 0;
  let lineNum = 1;
  while (pos <= raw.length) {
    const nlIdx = raw.indexOf('\n', pos);
    if (nlIdx === -1) {
      const text = raw.slice(pos);
      lineInfos.push({
        lineNum,
        from: pos,
        to: raw.length,
        nextPos: raw.length + 1,
        text: text.endsWith('\r') ? text.slice(0, -1) : text,
      });
      break;
    } else {
      const text = raw.slice(pos, nlIdx);
      lineInfos.push({
        lineNum,
        from: pos,
        to: nlIdx,
        nextPos: nlIdx + 1,
        text: text.endsWith('\r') ? text.slice(0, -1) : text,
      });
      pos = nlIdx + 1;
      lineNum++;
    }
  }

  let openFence = '';
  let openInfo = '';
  let openStartOffset = -1;
  let openStartLine = -1;
  let contentStartOffset = -1;
  let lastSegmentOffset = 0;

  for (let i = 0; i < lineInfos.length; i++) {
    const line = lineInfos[i];
    const fenceMatch = line.text.match(/^(\s*)(```+|~~~+)(.*)$/);

    if (!openFence) {
      if (fenceMatch) {
        if (line.from > lastSegmentOffset) {
          nodes.push({
            type: 'markdown',
            content: raw.slice(lastSegmentOffset, line.from),
            position: { start: lastSegmentOffset, end: line.from },
          });
        }
        openFence = fenceMatch[2];
        openInfo = fenceMatch[3].trim();
        openStartOffset = line.from;
        openStartLine = line.lineNum;
        contentStartOffset = line.nextPos <= raw.length ? line.nextPos : line.to;
      }
    } else {
      if (
        fenceMatch &&
        fenceMatch[2][0] === openFence[0] &&
        fenceMatch[2].length >= openFence.length &&
        fenceMatch[3].trim() === ''
      ) {
        const blockEndOffset = line.to;
        const rawInner =
          line.from > contentStartOffset
            ? raw.slice(contentStartOffset, line.from).replace(/\r?\n$/, '')
            : '';

        const parsedInfo = parseBlockInfoString(openInfo);
        for (const w of parsedInfo.warnings) {
          warnings.push(`Block "${parsedInfo.type || 'markdown'}" at line ${openStartLine}: ${w}`);
        }

        const block: CntxtParsedBlock = {
          type: parsedInfo.type,
          fence: openFence,
          params: parsedInfo.params,
          content: rawInner,
          position: {
            start: openStartOffset,
            end: blockEndOffset,
            startLine: openStartLine,
            endLine: line.lineNum,
          },
          isCNTXT: parsedInfo.isCNTXT,
          isRichContainer: parsedInfo.isRichContainer,
        };

        nodes.push(block);
        blocks.push(block);

        openFence = '';
        openInfo = '';
        openStartOffset = -1;
        openStartLine = -1;
        contentStartOffset = -1;
        lastSegmentOffset = blockEndOffset;
      }
    }
  }

  // Handle unclosed fence at EOF gracefully (streaming tolerance)
  if (openFence && openStartOffset !== -1) {
    const parsedInfo = parseBlockInfoString(openInfo);
    const rawInner =
      contentStartOffset <= raw.length ? raw.slice(contentStartOffset) : '';
    const block: CntxtParsedBlock = {
      type: parsedInfo.type,
      fence: openFence,
      params: parsedInfo.params,
      content: rawInner,
      position: {
        start: openStartOffset,
        end: raw.length,
        startLine: openStartLine,
        endLine: lineInfos.length,
      },
      isCNTXT: parsedInfo.isCNTXT,
      isRichContainer: parsedInfo.isRichContainer,
    };
    nodes.push(block);
    blocks.push(block);
    lastSegmentOffset = raw.length;
  }

  if (lastSegmentOffset < raw.length) {
    nodes.push({
      type: 'markdown',
      content: raw.slice(lastSegmentOffset),
      position: { start: lastSegmentOffset, end: raw.length },
    });
  }

  const { graph, graphWarnings } = buildGraph(blocks);
  warnings.push(...graphWarnings);

  return {
    nodes,
    blocks,
    relationshipGraph: graph,
    raw,
    warnings,
  };
}

/**
 * Builds the `CntxtRelationshipGraph` (`byId`, `byTag`, `links`, `linkedFrom`).
 */
export function buildGraph(blocks: CntxtParsedBlock[]): {
  graph: CntxtRelationshipGraph;
  graphWarnings: string[];
} {
  const graphWarnings: string[] = [];
  const byId: Record<string, CntxtParsedBlock> = {};
  const byTag: Record<string, CntxtParsedBlock[]> = {};
  const links: Record<string, string[]> = {};
  const linkedFrom: Record<string, string[]> = {};

  for (const block of blocks) {
    if (block.params.id) {
      if (byId[block.params.id]) {
        graphWarnings.push(
          `Duplicate block id="${block.params.id}" at line ${block.position.startLine} — last block wins`
        );
      }
      byId[block.params.id] = block;
      links[block.params.id] = block.params.link ?? [];
      if (!linkedFrom[block.params.id]) {
        linkedFrom[block.params.id] = [];
      }
    }

    for (const tag of block.params.tags ?? []) {
      if (!byTag[tag]) byTag[tag] = [];
      byTag[tag].push(block);
    }
  }

  for (const [sourceId, targetIds] of Object.entries(links)) {
    for (const rawTarget of targetIds) {
      const targetId = rawTarget.split('#')[0].trim();
      if (byId[targetId]) {
        if (!linkedFrom[targetId]) linkedFrom[targetId] = [];
        if (!linkedFrom[targetId].includes(sourceId)) {
          linkedFrom[targetId].push(sourceId);
        }
      } else {
        graphWarnings.push(
          `Block "${sourceId}" links to "${targetId}" which does not exist in this document`
        );
      }
    }
  }

  return {
    graph: { byId, byTag, links, linkedFrom },
    graphWarnings,
  };
}

function splice(raw: string, start: number, end: number, replacement: string): string {
  return raw.slice(0, start) + replacement + raw.slice(end);
}

/**
 * Surgically updates governance/renderer parameters on a block by `blockId`.
 */
export function updateBlockParams(
  doc: CntxtParsedDocument,
  blockId: string,
  newParams: Partial<CntxtBlockParams>
): string {
  const block = doc.blocks.find((b) => b.params.id === blockId);
  if (!block) return doc.raw;

  const mergedParams: CntxtBlockParams = {
    ...block.params,
    ...newParams,
    rendererParams: {
      ...(block.params.rendererParams || {}),
      ...(newParams.rendererParams || {}),
    },
  };

  if (newParams.locked === undefined && 'locked' in newParams) {
    delete mergedParams.locked;
  }

  const fence = computeSafeFence(block.content, block.fence || '~~~');
  const infoString = serializeBlockInfoString(block.type, mergedParams, true);
  const serialized = `${fence}${infoString}\n${block.content}\n${fence}`;

  return splice(doc.raw, block.position.start, block.position.end, serialized);
}

/**
 * Surgically updates the body content of a block by `blockId`, automatically
 * computing a collision-safe fence if `newContent` contains inner code blocks.
 */
export function updateBlockContent(
  doc: CntxtParsedDocument,
  blockId: string,
  newContent: string
): string {
  const block = doc.blocks.find((b) => b.params.id === blockId);
  if (!block) return doc.raw;

  const cleanContent = newContent.replace(/\r?\n$/, '');
  const fence = computeSafeFence(cleanContent, block.fence || '~~~');
  const infoString = serializeBlockInfoString(block.type, block.params, block.isCNTXT);
  const serialized = `${fence}${infoString}\n${cleanContent}\n${fence}`;

  return splice(doc.raw, block.position.start, block.position.end, serialized);
}

/**
 * Inserts a new CNTXT block at the end of the document or immediately after `afterBlockId`.
 */
export function insertBlock(
  doc: CntxtParsedDocument,
  block: {
    type?: string;
    params: CntxtBlockParams;
    content: string;
    fence?: string;
  },
  afterBlockId?: string
): string {
  const cleanContent = (block.content || '').replace(/\r?\n$/, '');
  const fence = computeSafeFence(cleanContent, block.fence || '~~~');
  const infoString = serializeBlockInfoString(block.type || 'markdown', block.params, true);
  const serialized = `${fence}${infoString}\n${cleanContent}\n${fence}`;

  if (afterBlockId) {
    const target = doc.blocks.find((b) => b.params.id === afterBlockId);
    if (target) {
      return splice(doc.raw, target.position.end, target.position.end, `\n\n${serialized}`);
    }
  }

  if (!doc.raw.trim()) {
    return `${serialized}\n`;
  }

  const separator = doc.raw.endsWith('\n\n') ? '' : doc.raw.endsWith('\n') ? '\n' : '\n\n';
  return `${doc.raw}${separator}${serialized}\n`;
}

/**
 * Surgically removes a block by `blockId` from the parsed buffer.
 */
export function removeBlock(doc: CntxtParsedDocument, blockId: string): string {
  const block = doc.blocks.find((b) => b.params.id === blockId);
  if (!block) return doc.raw;

  let endPos = block.position.end;
  if (doc.raw[endPos] === '\r' && doc.raw[endPos + 1] === '\n') {
    endPos += 2;
  } else if (doc.raw[endPos] === '\n') {
    endPos += 1;
  }

  return splice(doc.raw, block.position.start, endPos, '');
}

/**
 * Upserts a CNTXT block by `block.id` (updates in place if `id` exists, otherwise inserts).
 */
export function upsertBlock(
  doc: CntxtParsedDocument,
  block: {
    id: string;
    type?: string;
    params?: Partial<CntxtBlockParams>;
    content: string;
    fence?: string;
  },
  afterBlockId?: string
): { raw: string; action: 'inserted' | 'updated'; blockId: string } {
  const existing = doc.blocks.find((b) => b.params.id === block.id);
  if (existing) {
    const cleanContent = (block.content || '').replace(/\r?\n$/, '');
    const mergedParams: CntxtBlockParams = {
      ...existing.params,
      ...(block.params || {}),
      id: block.id,
      rendererParams: {
        ...(existing.params.rendererParams || {}),
        ...(block.params?.rendererParams || {}),
      },
    };
    const fence = computeSafeFence(cleanContent, block.fence || existing.fence || '~~~');
    const infoString = serializeBlockInfoString(
      block.type || existing.type || 'markdown',
      mergedParams,
      true
    );
    const serialized = `${fence}${infoString}\n${cleanContent}\n${fence}`;
    return {
      raw: splice(doc.raw, existing.position.start, existing.position.end, serialized),
      action: 'updated',
      blockId: block.id,
    };
  }

  const fullParams: CntxtBlockParams = {
    ...(block.params || {}),
    id: block.id,
  };
  return {
    raw: insertBlock(
      doc,
      {
        type: block.type || 'markdown',
        params: fullParams,
        content: block.content,
        fence: block.fence || '~~~',
      },
      afterBlockId
    ),
    action: 'inserted',
    blockId: block.id,
  };
}

/**
 * Fast check whether a document string contains at least one CNTXT pipe (`|`) fenced block.
 */
export function hasCntxtPipeBlock(content: string): boolean {
  if (!content) return false;
  return /^[ \t]*(?:`{3,}|~{3,})[^\n|]*\|/m.test(content);
}

/**
 * Promotes a filename or path to the `.cntxt` extension (preserving built-in guide names).
 */
export function promoteToCntxtExtension(nameOrPath: string): string {
  if (!nameOrPath) return 'Untitled.cntxt';
  const trimmed = nameOrPath.trim();
  if (/^(Welcome|Markdown-Guide|Power-User-Guide)\.md$/i.test(trimmed)) {
    return trimmed;
  }
  if (/\.cntxt$/i.test(trimmed)) {
    return trimmed;
  }
  if (/\.(md|markdown|txt)$/i.test(trimmed)) {
    return trimmed.replace(/\.(md|markdown|txt)$/i, '.cntxt');
  }
  return `${trimmed}.cntxt`;
}

export interface UserInboxCitationEntry {
  blockId?: string;
  startLine: number;
  endLine: number;
  quotedText?: string;
  comment: string;
  timestamp?: string;
}

/**
 * Appends a timestamped, line-cited user response entry into the single user-owned
 * `id=user-inbox` block pinned at the top of the document (creating it at Line 1 if absent).
 */
export function appendUserInboxEntry(
  rawDoc: string,
  entry: UserInboxCitationEntry
): string {
  const ts = entry.timestamp || new Date().toISOString();
  const lineRange =
    entry.endLine > entry.startLine
      ? `L${entry.startLine}-L${entry.endLine}`
      : `L${entry.startLine}`;
  const linkRef = entry.blockId ? `${entry.blockId}#${lineRange}` : lineRange;
  const cleanQuote = (entry.quotedText || '')
    .trim()
    .replace(/\r?\n/g, ' ')
    .slice(0, 180);

  const lines: string[] = [];
  lines.push(`- **[${ts}]** \`link=${linkRef}\``);
  if (cleanQuote) {
    lines.push(`  > "${cleanQuote}"`);
  }
  lines.push(`  **@USER:** ${entry.comment.trim()}`);
  const formattedEntry = lines.join('\n');

  const parsed = parseCntxtDocument(rawDoc);
  const existingInbox = parsed.blocks.find((b) => b.params.id === 'user-inbox');

  if (existingInbox) {
    const existingBody = existingInbox.content.trim();
    const nextBody = existingBody
      ? `${existingBody}\n\n${formattedEntry}`
      : formattedEntry;
    const nextLinks = Array.from(
      new Set([...(existingInbox.params.link || []), linkRef])
    );
    const updatedParamsDoc = parseCntxtDocument(
      updateBlockParams(parsed, 'user-inbox', {
        status: 'open',
        ts,
        link: nextLinks,
      })
    );
    return updateBlockContent(updatedParamsDoc, 'user-inbox', nextBody);
  }

  // Create `id=user-inbox` pinned at the very top of the document (Line 1)
  const inboxParams: CntxtBlockParams = {
    id: 'user-inbox',
    source: '@USER',
    tags: ['user-response', 'comment'],
    locked: 'user',
    status: 'open',
    link: [linkRef],
    ts,
    label: 'User Responses & Citations',
  };
  const fence = computeSafeFence(formattedEntry, '~~~');
  const info = serializeBlockInfoString('markdown', inboxParams, true);
  const serializedInbox = `${fence}${info}\n${formattedEntry}\n${fence}`;

  if (!rawDoc.trim()) {
    return `${serializedInbox}\n`;
  }
  return `${serializedInbox}\n\n${rawDoc.replace(/^\r?\n+/, '')}`;
}

/**
 * Prepends an incoming agent deliverable block at the top of an Active Thread document
 * (immediately below `id=user-inbox` if present at the top, or at Line 1 otherwise).
 */
export function prependDeliverableToThread(
  rawDoc: string,
  incomingContent: string
): string {
  const trimmedIncoming = incomingContent.trim();
  if (!trimmedIncoming) return rawDoc;

  const parsedIncoming = parseCntxtDocument(trimmedIncoming);
  const parsedExisting = parseCntxtDocument(rawDoc);

  // If the incoming deliverable has a single block ID that already exists in the thread, update it in place (unless locked=user)
  if (parsedIncoming.blocks.length === 1 && parsedIncoming.blocks[0].params.id) {
    const incBlock = parsedIncoming.blocks[0];
    const existingBlock = parsedExisting.blocks.find(
      (b) => b.params.id === incBlock.params.id
    );
    if (existingBlock && existingBlock.params.locked !== 'user') {
      return upsertBlock(parsedExisting, {
        id: incBlock.params.id!,
        type: incBlock.type,
        params: {
          ...incBlock.params,
          ts: incBlock.params.ts || new Date().toISOString(),
        },
        content: incBlock.content,
        fence: incBlock.fence,
      }).raw;
    }
  }

  // If `id=user-inbox` exists, insert the new deliverable immediately after `id=user-inbox`
  const userInbox = parsedExisting.blocks.find((b) => b.params.id === 'user-inbox');
  if (userInbox) {
    return splice(
      rawDoc,
      userInbox.position.end,
      userInbox.position.end,
      `\n\n${trimmedIncoming}`
    );
  }

  if (!rawDoc.trim()) {
    return `${trimmedIncoming}\n`;
  }
  return `${trimmedIncoming}\n\n${rawDoc.replace(/^\r?\n+/, '')}`;
}
