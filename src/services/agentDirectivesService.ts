import packageJson from '../../package.json';
/**
 * Agent Directives & Capabilities Discovery Service (FG-25 / Improvements 2, 4, 5)
 *
 * Authoritative single source of truth for CNTXT AI Agent directives, Rich Container
 * governance rules, and dynamic capabilities manifest.
 */

import {
  CntxtAgentDirective,
  CntxtCapabilitiesManifest,
  CntxtEndpointDefinition,
  CntxtRpcDomainDefinition,
  CntxtMcpToolDefinition,
} from '../contracts/data_shapes';

export const CNTXT_PROTOCOL_VERSION = '1.0.0';
export const CNTXT_APP_VERSION = packageJson.version || '0.7.8';

export const CNTXT_AGENT_DIRECTIVE: CntxtAgentDirective = {
  version: CNTXT_PROTOCOL_VERSION,
  systemDirective:
    'You are an AI Agent connected to CNTXT. All deliverables, plans, briefs, and audit reports MUST be formatted inside CNTXT Rich Containers (~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="<Title>"). Respect user-locked blocks (locked=user), perform surgical block upserts (blocks.upsert) instead of destructive full-document rewrites, and resolve active thread citations ([[#^block-id]]).',
  richContainerSyntax: {
    fence: '~~~',
    headerFormat: '~~~markdown | id=<slug> tags=<tags> locked=agent status=<status> source=@agent title="<Title>"',
    governanceParams: {
      id: 'Unique alphanumeric kebab-case slug (e.g. audit-review-task-72)',
      tags: 'Comma-separated semantic tags (e.g. deliverable, plan, audit, feedback)',
      locked: 'agent',
      status: 'ready',
      source: 'Agent identifier handle (e.g. @agy, @claude, @cursor, @odin)',
      title: 'Human-readable title displayed in the container header bar',
    },
    example: [
      '~~~markdown | id=arch-plan-1 tags=deliverable,plan locked=agent status=ready source=@agent title="System Architecture Plan"',
      '# System Architecture Plan',
      'This document is rendered with interactive governance controls, copy/export buttons, and accent rail.',
      '~~~',
    ].join('\n'),
  },
  citationSyntax: {
    blockCitation: '[[#^block-id]] or ^block-id',
    inboxId: 'user-inbox',
    description:
      'In .cntxt active threads, user responses reference prior sections using block citations [[#^block-id]]. Incoming agent deliverables automatically prepend below id=user-inbox.',
  },
  bestPractices: [
    'Wrap all deliverables in Rich Containers so CNTXT renders collapsible headers, status badges, and governance controls.',
    'Never overwrite or delete blocks marked locked=user. If a human user locks a block, treat it as immutable human intent.',
    'Use surgical block operations (blocks.upsert, blocks.updateParams) to update individual deliverables without disturbing surrounding notes or resetting editor scroll position.',
    'Project audit findings and code review warnings directly into the editor using editor.setDiagnostics squigglies (error, warning, info, hint).',
    'Use tabs.create to open new tabs and notify.show to display actionable user toasts when tasks complete.',
  ],
};

export const REST_ENDPOINTS: CntxtEndpointDefinition[] = [
  {
    path: '/api/v1/health',
    method: 'GET',
    description: 'Liveness check and capabilities pointer (unauthenticated)',
    requiresAuth: false,
  },
  {
    path: '/api/v1/capabilities',
    method: 'GET',
    description: 'Complete machine-readable capabilities catalog and agent directives',
    requiresAuth: true,
  },
  {
    path: '/api/v1/directives',
    method: 'GET',
    description: 'Authoritative agent directive guide in JSON or Markdown (Accept: text/markdown)',
    requiresAuth: true,
  },
  {
    path: '/api/v1/workspace',
    method: 'GET',
    description: 'Workspace root path, active project name, and total file count',
    requiresAuth: true,
  },
  {
    path: '/api/v1/tabs/open',
    method: 'POST',
    description: 'Open or focus an editor tab with specified title, content, language, and file path',
    requiresAuth: true,
  },
  {
    path: '/api/v1/editor/insert',
    method: 'POST',
    description: 'Insert, append, or replace text in the currently active editor tab',
    requiresAuth: true,
  },
  {
    path: '/api/v1/rpc',
    method: 'POST',
    description: 'Dispatch any Host Command Bus RPC action across editor, tabs, blocks, workspace, etc.',
    requiresAuth: true,
  },
];

export const RPC_DOMAINS: CntxtRpcDomainDefinition[] = [
  {
    domain: 'directives',
    description: 'Query CNTXT capabilities manifest, agent directives, and Rich Container formatting rules',
    actions: [
      {
        action: 'get',
        description: 'Get full capabilities manifest and structured agent directives',
        payloadSchemaSummary: '{ format?: "json" | "markdown" }',
      },
      {
        action: 'getGuide',
        description: 'Get raw Markdown agent integration and governance guide',
        payloadSchemaSummary: '{}',
      },
    ],
  },
  {
    domain: 'blocks',
    description: 'Surgical manipulation and graph inspection of CNTXT Rich Containers and pipe blocks',
    actions: [
      {
        action: 'list',
        description: 'List all CNTXT blocks in the active or target tab with tag/status filters',
        payloadSchemaSummary: '{ tabId?: string, tag?: string, status?: string, onlyCntxt?: boolean }',
      },
      {
        action: 'get',
        description: 'Retrieve a single block by id along with forward linksTo and reverse linkedFrom edges',
        payloadSchemaSummary: '{ id: string, tabId?: string }',
      },
      {
        action: 'upsert',
        description: 'Surgically insert or update a block by id (respects locked=user guardrail)',
        payloadSchemaSummary: '{ id: string, type?: string, content: string, params?: object, afterBlockId?: string, tabId?: string }',
      },
      {
        action: 'updateParams',
        description: 'Update governance parameters (status, tags, link, title) without retransmitting body',
        payloadSchemaSummary: '{ id: string, params: object, tabId?: string }',
      },
      {
        action: 'remove',
        description: 'Remove a block by id from the target tab (respects locked=user guardrail)',
        payloadSchemaSummary: '{ id: string, tabId?: string }',
      },
    ],
  },
  {
    domain: 'editor',
    description: 'Direct inspection and manipulation of active editor document, selections, and diagnostics',
    actions: [
      { action: 'getActiveDocument', description: 'Read title, live document content, language, filePath, isDirty', payloadSchemaSummary: '{}' },
      { action: 'getSelection', description: 'Read currently highlighted editor text selection', payloadSchemaSummary: '{}' },
      { action: 'insert', description: 'Insert text at cursor, append to end, or replace selection', payloadSchemaSummary: '{ text: string, mode?: "cursor" | "append" | "replace" }' },
      { action: 'setDiagnostics', description: 'Display inline squiggly underlines (error, warning, info, hint)', payloadSchemaSummary: '{ diagnostics: Array<{ from: number, to: number, severity: string, message: string }> }' },
      { action: 'clearDiagnostics', description: 'Clear all active inline diagnostic squigglies', payloadSchemaSummary: '{}' },
      { action: 'setSelections', description: 'Set multiple editor selections', payloadSchemaSummary: '{ selections: Array<{ anchor: number, head?: number }>, mainIndex?: number }' },
      { action: 'getSelections', description: 'Get all active editor selections', payloadSchemaSummary: '{}' },
      { action: 'fold', description: 'Fold or unfold code blocks by line range or all', payloadSchemaSummary: '{ line?: number, unfold?: boolean, all?: boolean }' },
      { action: 'replaceRange', description: 'Replace exact character range in editor document', payloadSchemaSummary: '{ from: number, to: number, insert: string }' },
    ],
  },
  {
    domain: 'tabs',
    description: 'Document tab management and navigation',
    actions: [
      { action: 'list', description: 'List all open tabs with id, title, filePath, language, isDirty', payloadSchemaSummary: '{}' },
      { action: 'create', description: 'Create and focus a new document tab', payloadSchemaSummary: '{ title: string, content: string, language?: string, filePath?: string }' },
      { action: 'focus', description: 'Switch active view focus to target tabId', payloadSchemaSummary: '{ tabId: string }' },
      { action: 'close', description: 'Close target tabId', payloadSchemaSummary: '{ tabId: string }' },
      { action: 'getContent', description: 'Read full content of target tabId', payloadSchemaSummary: '{ tabId: string }' },
      { action: 'setContent', description: 'Overwrite full content of target tabId', payloadSchemaSummary: '{ tabId: string, content: string }' },
    ],
  },
  {
    domain: 'workspace',
    description: 'Path-sandboxed workspace inspection and file operations',
    actions: [
      { action: 'getInfo', description: 'Get workspace root path, project name, file count', payloadSchemaSummary: '{}' },
      { action: 'listFiles', description: 'List files matching optional glob pattern', payloadSchemaSummary: '{ pattern?: string }' },
      { action: 'readFile', description: 'Read text file relative to workspace root (path traversal guarded)', payloadSchemaSummary: '{ relativePath: string }' },
      { action: 'writeFile', description: 'Write text file relative to workspace root (path traversal guarded)', payloadSchemaSummary: '{ relativePath: string, content: string }' },
    ],
  },
  {
    domain: 'templates',
    description: 'CNTXT dynamic templates catalog and variable interpolation',
    actions: [
      { action: 'list', description: 'List all available templates', payloadSchemaSummary: '{}' },
      { action: 'apply', description: 'Evaluate template variables and insert into target tab', payloadSchemaSummary: '{ templateId: string, targetTabId?: string }' },
    ],
  },
  {
    domain: 'actions',
    description: 'Execute CNTXT sandboxed actions and JavaScript formulas',
    actions: [
      { action: 'list', description: 'List registered user and community actions', payloadSchemaSummary: '{}' },
      { action: 'execute', description: 'Execute action by id with input arguments', payloadSchemaSummary: '{ actionId: string, args?: object }' },
    ],
  },
  {
    domain: 'notify',
    description: 'Surface actionable user toast notifications',
    actions: [
      { action: 'show', description: 'Display toast (info, success, warning, error)', payloadSchemaSummary: '{ title: string, message: string, type?: "info" | "success" | "warning" | "error" }' },
    ],
  },
  {
    domain: 'terminal',
    description: 'Manage integrated terminal processes',
    actions: [
      { action: 'spawn', description: 'Spawn a terminal process (PTY)', payloadSchemaSummary: '{ command?: string, args?: string[] }' },
      { action: 'sendInput', description: 'Send input text to terminal process', payloadSchemaSummary: '{ sessionId: string, data: string }' },
      { action: 'kill', description: 'Terminate terminal process', payloadSchemaSummary: '{ sessionId: string }' },
      { action: 'resize', description: 'Resize terminal rows and columns', payloadSchemaSummary: '{ sessionId: string, cols: number, rows: number }' },
    ],
  },
];

export const MCP_TOOLS: CntxtMcpToolDefinition[] = [
  { name: 'cntxt_open_deliverable', description: 'Open or update a tab displaying an AI deliverable inside a CNTXT Rich Container', inputSchemaSummary: { title: 'string', content: 'string', agentHandle: 'string?', blockId: 'string?', status: 'string?', tags: 'string?' } },
  { name: 'cntxt_append_deliverable', description: 'Append a CNTXT Rich Container deliverable turn into the active tab', inputSchemaSummary: { title: 'string', content: 'string', agentHandle: 'string?', blockId: 'string?', status: 'string?', tags: 'string?' } },
  { name: 'cntxt_list_blocks', description: 'List all CNTXT Rich Containers in active or target tab', inputSchemaSummary: { tabId: 'string?', tag: 'string?', status: 'string?' } },
  { name: 'cntxt_get_block', description: 'Retrieve a single CNTXT block by id with linksTo/linkedFrom edges', inputSchemaSummary: { id: 'string', tabId: 'string?' } },
  { name: 'cntxt_upsert_block', description: 'Surgically insert or update a CNTXT block by id (respects locked=user)', inputSchemaSummary: { id: 'string', content: 'string', type: 'string?', params: 'object?', afterBlockId: 'string?' } },
  { name: 'cntxt_update_block_params', description: 'Surgically update governance parameters (status, tags, title) by id', inputSchemaSummary: { id: 'string', params: 'object', tabId: 'string?' } },
  { name: 'cntxt_get_active_context', description: 'Read active document title, content, filePath, and highlighted selection', inputSchemaSummary: {} },
  { name: 'cntxt_list_tabs', description: 'List all currently open document tabs in CNTXT', inputSchemaSummary: {} },
  { name: 'cntxt_focus_tab', description: 'Focus a specific open tab by tabId', inputSchemaSummary: { tabId: 'string' } },
  { name: 'cntxt_set_diagnostics', description: 'Render inline squiggly diagnostic underlines in active editor tab', inputSchemaSummary: { diagnostics: 'Array<{ from: number, to: number, severity: string, message: string }>' } },
  { name: 'cntxt_clear_diagnostics', description: 'Clear all active inline diagnostic squigglies', inputSchemaSummary: {} },
  { name: 'cntxt_apply_template', description: 'Apply a CNTXT template into active or target editor tab', inputSchemaSummary: { templateId: 'string', tabId: 'string?' } },
  { name: 'cntxt_notify', description: 'Surface a user-facing toast notification inside CNTXT', inputSchemaSummary: { title: 'string', message: 'string', type: 'string?' } },
  { name: 'cntxt_get_directives', description: 'Retrieve authoritative CNTXT directives, Rich Container syntax rules, and supported capabilities', inputSchemaSummary: { format: 'string?' } },
];

/**
 * Returns structured CNTXT agent directives.
 */
export function getAgentDirectives(): CntxtAgentDirective {
  return CNTXT_AGENT_DIRECTIVE;
}

/**
 * Builds the complete machine-readable capabilities manifest for external agents.
 */
export function getCapabilitiesManifest(version = CNTXT_APP_VERSION): CntxtCapabilitiesManifest {
  return {
    status: 'ok',
    version,
    name: 'CNTXT Localhost & MCP AI Integration Gateway',
    description:
      'Tri-platform contextual editor with native Model Context Protocol (MCP) server, Localhost REST API Gateway, and Rich Container governance engine.',
    securityModel: {
      mcp: 'Process-isolated stdio pipes (zero network attack surface, sandboxed for local AI assistants).',
      restGateway: 'Loopback 127.0.0.1 (or RFC 1918 LAN) protected by constant-time X-CNTXT-Token verification and DNS rebinding host guards.',
      tokenHeader: 'X-CNTXT-Token',
    },
    restEndpoints: REST_ENDPOINTS,
    rpcDomains: RPC_DOMAINS,
    mcpTools: MCP_TOOLS,
    directives: CNTXT_AGENT_DIRECTIVE,
  };
}

/**
 * Generates the authoritative Markdown guide for external agents.
 */
export function getRawMarkdownGuide(version = CNTXT_APP_VERSION): string {
  return [
    `# CNTXT AI Agent Integration & Governance Protocol (v${version})`,
    '',
    `> **System Directive**: ${CNTXT_AGENT_DIRECTIVE.systemDirective}`,
    '',
    '## 1. Mandatory Rich Container Deliverable Wrapping',
    'Whenever generating an audit report, review notes, planning document, or structured deliverable for CNTXT, you MUST wrap it in a CNTXT Rich Container:',
    '',
    '```markdown',
    CNTXT_AGENT_DIRECTIVE.richContainerSyntax.example,
    '```',
    '',
    '### Key Parameters:',
    '- `id=<slug>`: Unique alphanumeric kebab-case slug identifying this deliverable block.',
    '- `tags=<list>`: Comma-separated semantic tags (`deliverable`, `plan`, `audit`, `feedback`, `review`).',
    '- `locked=agent`: Declares agent authorship. External agents **MUST NEVER** overwrite blocks marked `locked=user`.',
    '- `status=draft|review|ready|approved`: Progress state rendered as an interactive status badge.',
    '- `source=@agent`: Attribution handle (e.g., `@agy`, `@claude`, `@cursor`, `@odin`).',
    '- `title="<Title>"`: Clean title displayed prominently in the container card header.',
    '',
    '## 2. Surgical Block Operations Over Document Rewriting',
    'Do NOT rewrite entire documents when modifying deliverables. Instead:',
    '- Call `blocks.upsert` with target `id=` to replace or insert an individual container.',
    '- Call `blocks.updateParams` to update `status="approved"` or append tags without retransmitting body text.',
    '- Call `blocks.list` and `blocks.get` to inspect document AST and graph relationships.',
    '',
    '## 3. Active Thread Citations & User Inbox',
    '- In `.cntxt` active thread documents, incoming deliverables automatically prepend below `id=user-inbox`.',
    '- When users reply, they reference prior sections using block citations `[[#^block-id]]` or `^block-id`. Use these anchors to determine exact context.',
    '',
    '## 4. Diagnostics & Squigglies',
    'Reviewer and auditor agents can project inline squiggly underlines on exact character offsets via `editor.setDiagnostics` (`error`, `warning`, `info`, `hint`), and clear them with `editor.clearDiagnostics`.',
    '',
    '## 5. Security & Authentication',
    '- **Stdio MCP**: For local desktop AI CLIs/IDEs (`scripts/mcp/cntxt-mcp-server.mjs`) with zero network attack surface.',
    '- **REST Gateway**: Send HTTP requests with header `X-CNTXT-Token: <token>`.',
    '',
    '---',
    'End of Directive.',
  ].join('\n');
}

/**
 * Builds the 1-click bootstrap prompt string for users to paste into their AI agent of choice.
 */
export function getAgentBootstrapPrompt(baseUrl = 'http://127.0.0.1:9876', token = '<token>'): string {
  return `You are connected to CNTXT at ${baseUrl} with header X-CNTXT-Token: ${token}. First call GET /api/v1/capabilities to discover all available controls and strictly follow the returned system directives when interacting with CNTXT.`;
}
