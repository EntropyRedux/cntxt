#!/usr/bin/env node
/**
 * CNTXT Native MCP Server (FG-21 / FG-22)
 *
 * Zero-dependency Model Context Protocol (MCP) stdio server bridging external
 * AI agents (Antigravity, Claude Code/Desktop, Cursor, Cline, Windsurf) to
 * CNTXT's Localhost REST API Gateway and Host Command Bus.
 *
 * Enforces the Mandatory AI Deliverable CNTXT Rich Container Invariant: all agent
 * deliverables are encapsulated in CNTXT Rich Containers
 * (`~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="Title"`)
 * so CNTXT renders them with interactive governance controls and full inner Markdown/Mermaid/Table support.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

let mcpPackageVersion = '0.7.9';
try {
  const pkgUrl = new URL('../../package.json', import.meta.url);
  if (fs.existsSync(pkgUrl)) {
    mcpPackageVersion = JSON.parse(fs.readFileSync(pkgUrl, 'utf8')).version || '0.7.9';
  }
} catch {
  // Fallback to static version
}
const CANDIDATE_PORTS = [9876, 9877, 9878, 9879, 9880, 9881];

/**
 * Dynamically resolves candidate file paths for gateway_runtime.json across platforms.
 */
function getCandidateConfigPaths() {
  const paths = [];

  if (process.env.CNTXT_GATEWAY_CONFIG) {
    paths.push(process.env.CNTXT_GATEWAY_CONFIG);
  }

  if (process.env.APPDATA) {
    paths.push(path.join(process.env.APPDATA, 'com.cntxt.desktop', 'gateway_runtime.json'));
  }
  if (process.env.LOCALAPPDATA) {
    paths.push(path.join(process.env.LOCALAPPDATA, 'CNTXT', 'gateway_runtime.json'));
    paths.push(path.join(process.env.LOCALAPPDATA, 'com.cntxt.desktop', 'gateway_runtime.json'));
  }

  if (process.env.XDG_CONFIG_HOME) {
    paths.push(path.join(process.env.XDG_CONFIG_HOME, 'com.cntxt.desktop', 'gateway_runtime.json'));
  }

  if (process.env.USERPROFILE) {
    paths.push(path.join(process.env.USERPROFILE, '.cntxt', 'gateway.json'));
    paths.push(path.join(process.env.USERPROFILE, '.cntxt', 'gateway_runtime.json'));
  }

  if (process.env.HOME) {
    paths.push(path.join(process.env.HOME, '.cntxt', 'gateway.json'));
    paths.push(path.join(process.env.HOME, '.cntxt', 'gateway_runtime.json'));
    paths.push(
      path.join(process.env.HOME, 'Library', 'Application Support', 'com.cntxt.desktop', 'gateway_runtime.json')
    );
    paths.push(path.join(process.env.HOME, '.config', 'com.cntxt.desktop', 'gateway_runtime.json'));
  }

  // Workspace-relative fallback for local development
  paths.push(path.join(process.cwd(), '.localactive', 'cntxt_gateway.json'));
  paths.push(path.join(process.cwd(), 'gateway_runtime.json'));

  return paths;
}

function loadGatewayConfig() {
  const candidatePaths = getCandidateConfigPaths();
  for (const configPath of candidatePaths) {
    try {
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            url: parsed.url || (parsed.port ? `http://127.0.0.1:${parsed.port}` : 'http://127.0.0.1:9876'),
            token: process.env.CNTXT_TOKEN || parsed.token || '',
            running: parsed.running !== false,
          };
        }
      }
    } catch (err) {
      console.error(`[cntxt-mcp-server] Warning: Failed to parse gateway config at "${configPath}":`, err);
    }
  }

  return { url: 'http://127.0.0.1:9876', token: process.env.CNTXT_TOKEN || '', running: true };
}

async function resolveGatewayEndpoint() {
  const cfg = loadGatewayConfig();
  const token = process.env.CNTXT_TOKEN || cfg.token || '';

  // 1. Try configured URL first
  if (cfg.url && cfg.running !== false) {
    try {
      const res = await fetch(`${cfg.url}/api/v1/health`, { method: 'GET' });
      if (res.ok) return { baseUrl: cfg.url, token };
    } catch {
      // Fall through to candidate scan
    }
  }

  // 2. Scan candidate loopback ports (9876..9881)
  for (const port of CANDIDATE_PORTS) {
    const candidateUrl = `http://127.0.0.1:${port}`;
    try {
      const res = await fetch(`${candidateUrl}/api/v1/health`, { method: 'GET' });
      if (res.ok) return { baseUrl: candidateUrl, token };
    } catch {
      // Continue
    }
  }

  return { baseUrl: cfg.url || 'http://127.0.0.1:9876', token };
}

/**
 * Wraps AI/Agent deliverable text inside a CNTXT Rich Container (`~~~markdown | id=...`)
 * unless already encapsulated.
 */
export function wrapDeliverableInCodeBlock(
  rawText,
  title = 'Deliverable',
  agent = '@agy',
  blockId = '',
  status = 'ready',
  tags = 'deliverable'
) {
  const trimmed = (rawText || '').trim();
  if (/^(~~~+|```+)(markdown|deliverable|agent|cntxt)\s*\|/i.test(trimmed)) {
    return rawText;
  }
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const slug =
    blockId ||
    title
      .toLowerCase()
      .replace(/\.md$/i, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 28) ||
    'deliverable';
  const safeTitle = `${title.replace(/"/g, "'")} (${hh}:${mm})`;
  const headerMeta = `id=${slug} tags=${tags} locked=agent status=${status} source=${agent} title="${safeTitle}"`;

  let fence = '~~~';
  while (trimmed.includes(fence)) {
    fence += '~';
  }
  return `${fence}markdown | ${headerMeta}\n${trimmed}\n${fence}\n`;
}

async function callCntxtGateway(pathName, method = 'POST', bodyObj = null) {
  const { baseUrl, token } = await resolveGatewayEndpoint();
  const headers = {
    'X-CNTXT-Token': token,
    'Content-Type': 'application/json; charset=utf-8',
  };
  const res = await fetch(`${baseUrl}${pathName}`, {
    method,
    headers,
    body: bodyObj ? JSON.stringify(bodyObj) : undefined,
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: res.ok, status: res.status, raw: text };
  }
}

// ==========================================
// Dynamic MCP Tool Registry (Pillar 4 Modularity)
// ==========================================

const toolRegistry = new Map();

export function registerTool(name, definition, handler) {
  toolRegistry.set(name, {
    definition: {
      name,
      description: definition.description,
      inputSchema: definition.inputSchema,
    },
    handler,
  });
}

export function getToolDefinitions() {
  return Array.from(toolRegistry.values()).map((t) => t.definition);
}

export async function handleToolCall(name, args = {}) {
  const tool = toolRegistry.get(name);
  if (!tool) {
    throw new Error(`Unknown CNTXT MCP tool: ${name}`);
  }
  return await tool.handler(args);
}

// ------------------------------------------
// Tool 1: cntxt_open_deliverable
// ------------------------------------------
registerTool(
  'cntxt_open_deliverable',
  {
    description:
      'Open or update a dedicated tab in the CNTXT desktop app displaying an AI plan, brief, audit report, or deliverable encapsulated inside a collapsible CNTXT Rich Container block (`~~~markdown | id=...`).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Tab and deliverable header title' },
        content: { type: 'string', description: 'Markdown deliverable content' },
        agentHandle: { type: 'string', description: 'Agent handle badge (default: @agy)' },
        blockId: { type: 'string', description: 'Optional explicit CNTXT block id=' },
        status: { type: 'string', description: 'Optional CNTXT status= (default: ready)' },
        tags: { type: 'string', description: 'Comma-separated tags= (default: deliverable)' },
        filePath: { type: 'string', description: 'Optional absolute file path to associate with the tab' },
        notify: { type: 'boolean', description: 'Show a toast notification in CNTXT (default: true)' },
      },
      required: ['title', 'content'],
    },
  },
  async (args) => {
    const wrapped = wrapDeliverableInCodeBlock(
      args.content,
      args.title,
      args.agentHandle || '@agy',
      args.blockId || '',
      args.status || 'ready',
      args.tags || 'deliverable'
    );
    const res = await callCntxtGateway('/api/v1/tabs/open', 'POST', {
      title: args.title,
      content: wrapped,
      language: 'markdown',
      ...(args.filePath ? { filePath: args.filePath } : {}),
    });
    if (args.notify !== false) {
      await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'notify',
        action: 'show',
        payload: {
          type: 'info',
          title: args.title,
          message: `Opened deliverable in CNTXT: ${args.title}`,
        },
      });
    }
    return res;
  }
);

// ------------------------------------------
// Tool 2: cntxt_append_deliverable
// ------------------------------------------
registerTool(
  'cntxt_append_deliverable',
  {
    description:
      'Append a CNTXT Rich Container deliverable turn into the currently active CNTXT tab.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Deliverable turn title' },
        content: { type: 'string', description: 'Markdown content to wrap in a CNTXT Rich Container and append' },
        agentHandle: { type: 'string', description: 'Agent handle badge (default: @agy)' },
        blockId: { type: 'string', description: 'Optional explicit CNTXT block id=' },
        status: { type: 'string', description: 'Optional CNTXT status= (default: ready)' },
        tags: { type: 'string', description: 'Comma-separated tags= (default: deliverable)' },
      },
      required: ['title', 'content'],
    },
  },
  async (args) => {
    const wrapped =
      '\n\n' +
      wrapDeliverableInCodeBlock(
        args.content,
        args.title,
        args.agentHandle || '@agy',
        args.blockId || '',
        args.status || 'ready',
        args.tags || 'deliverable'
      );
    return await callCntxtGateway('/api/v1/editor/insert', 'POST', {
      text: wrapped,
      mode: 'append',
    });
  }
);

// ------------------------------------------
// Tool 3: cntxt_list_blocks
// ------------------------------------------
registerTool(
  'cntxt_list_blocks',
  {
    description:
      'List all CNTXT (`|`) blocks in the active (or specified) tab, optionally filtered by tag or status.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', description: 'Optional target tabId' },
        tag: { type: 'string', description: 'Optional tag filter (e.g. deliverable, plan)' },
        status: { type: 'string', description: 'Optional status filter (e.g. draft, review, approved)' },
      },
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'blocks',
      action: 'list',
      payload: {
        ...(args.tabId ? { tabId: args.tabId } : {}),
        ...(args.tag ? { tag: args.tag } : {}),
        ...(args.status ? { status: args.status } : {}),
      },
    });
  }
);

// ------------------------------------------
// Tool 4: cntxt_get_block
// ------------------------------------------
registerTool(
  'cntxt_get_block',
  {
    description:
      'Retrieve a single CNTXT (`|`) block by its `id=` governance parameter along with its forward `linksTo` and reverse `linkedFrom` edges.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Block id= to retrieve' },
        tabId: { type: 'string', description: 'Optional target tabId' },
      },
      required: ['id'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'blocks',
      action: 'get',
      payload: {
        id: args.id,
        ...(args.tabId ? { tabId: args.tabId } : {}),
      },
    });
  }
);

// ------------------------------------------
// Tool 5: cntxt_upsert_block
// ------------------------------------------
registerTool(
  'cntxt_upsert_block',
  {
    description:
      'Surgically insert or update a CNTXT (`|`) block in place by its `id=` governance parameter (respects `locked=user` human guardrail).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique block id= to insert or update' },
        type: { type: 'string', description: 'Block language/type (default: markdown)' },
        content: { type: 'string', description: 'Inner content of the block' },
        params: {
          type: 'object',
          description: 'Governance parameters (tags, locked, status, link, source, label)',
        },
        afterBlockId: { type: 'string', description: 'Optional block id= after which to insert' },
        tabId: { type: 'string', description: 'Optional target tabId' },
      },
      required: ['id', 'content'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'blocks',
      action: 'upsert',
      payload: {
        id: args.id,
        type: args.type || 'markdown',
        content: args.content,
        params: args.params || {},
        ...(args.afterBlockId ? { afterBlockId: args.afterBlockId } : {}),
        ...(args.tabId ? { tabId: args.tabId } : {}),
      },
    });
  }
);

// ------------------------------------------
// Tool 6: cntxt_update_block_params
// ------------------------------------------
registerTool(
  'cntxt_update_block_params',
  {
    description:
      'Surgically update the governance parameters (`status=`, `tags=`, `link=`, `source=`, `label`) of an existing CNTXT block by `id=`.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Target block id=' },
        params: { type: 'object', description: 'Governance parameters to merge' },
        tabId: { type: 'string', description: 'Optional target tabId' },
      },
      required: ['id', 'params'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'blocks',
      action: 'updateParams',
      payload: {
        id: args.id,
        params: args.params || {},
        ...(args.tabId ? { tabId: args.tabId } : {}),
      },
    });
  }
);

// ------------------------------------------
// Tool 7: cntxt_get_active_context
// ------------------------------------------
registerTool(
  'cntxt_get_active_context',
  {
    description:
      'Read the currently active document tab (title, content, filePath, isDirty) and currently highlighted text selection from CNTXT.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async () => {
    const [docRes, selRes] = await Promise.all([
      callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'editor',
        action: 'getActiveDocument',
        payload: {},
      }),
      callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'editor',
        action: 'getSelection',
        payload: {},
      }),
    ]);
    return {
      activeDocument: docRes?.data ?? null,
      selectedText: selRes?.data ?? '',
    };
  }
);

// ------------------------------------------
// Tool 8: cntxt_list_tabs
// ------------------------------------------
registerTool(
  'cntxt_list_tabs',
  {
    description: 'List all currently open document tabs in CNTXT.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async () => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'tabs',
      action: 'list',
      payload: {},
    });
  }
);

// ------------------------------------------
// Tool 9: cntxt_focus_tab
// ------------------------------------------
registerTool(
  'cntxt_focus_tab',
  {
    description: 'Focus a specific open tab in CNTXT by its tabId.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', description: 'Target tab ID from cntxt_list_tabs' },
      },
      required: ['tabId'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'tabs',
      action: 'focus',
      payload: { tabId: args.tabId },
    });
  }
);

// ------------------------------------------
// Tool 10: cntxt_set_diagnostics
// ------------------------------------------
registerTool(
  'cntxt_set_diagnostics',
  {
    description:
      'Render inline squiggly diagnostic underlines (error, warning, info, hint) in the active CNTXT editor tab.',
    inputSchema: {
      type: 'object',
      properties: {
        diagnostics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'number' },
              to: { type: 'number' },
              severity: { type: 'string', enum: ['error', 'warning', 'info', 'hint'] },
              message: { type: 'string' },
            },
            required: ['from', 'to', 'severity', 'message'],
          },
        },
      },
      required: ['diagnostics'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'editor',
      action: 'setDiagnostics',
      payload: { diagnostics: args.diagnostics || [] },
    });
  }
);

// ------------------------------------------
// Tool 11: cntxt_clear_diagnostics (FG-21 Plan §1.3)
// ------------------------------------------
registerTool(
  'cntxt_clear_diagnostics',
  {
    description: 'Clear all active inline diagnostic squigglies from the active CNTXT editor tab.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  async () => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'editor',
      action: 'clearDiagnostics',
      payload: {},
    });
  }
);

// ------------------------------------------
// Tool 12: cntxt_apply_template (FG-21 Plan §1.3)
// ------------------------------------------
registerTool(
  'cntxt_apply_template',
  {
    description: 'Apply and render a CNTXT template into the active or target editor tab.',
    inputSchema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', description: 'ID of the template to apply' },
        tabId: { type: 'string', description: 'Optional target tabId' },
      },
      required: ['templateId'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'templates',
      action: 'apply',
      payload: {
        templateId: args.templateId,
        ...(args.tabId ? { targetTabId: args.tabId } : {}),
      },
    });
  }
);

// ------------------------------------------
// Tool 13: cntxt_notify (FG-21 Plan §1.3)
// ------------------------------------------
registerTool(
  'cntxt_notify',
  {
    description: 'Surface a user-facing toast notification inside the CNTXT application frame.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['info', 'success', 'warning', 'error'], description: 'Notification level' },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Notification message body' },
      },
      required: ['title', 'message'],
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'notify',
      action: 'show',
      payload: {
        type: args.type || 'info',
        title: args.title,
        message: args.message,
      },
    });
  }
);
// ------------------------------------------
// Tool 14: cntxt_get_directives (FG-25 / Improvements 2 & 4)
// ------------------------------------------
registerTool(
  'cntxt_get_directives',
  {
    description:
      'Retrieve authoritative CNTXT directives, Rich Container syntax rules, and supported capabilities catalog.',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['json', 'markdown'],
          description:
            'Format to return: json (capabilities manifest + directives) or markdown (human-readable guide)',
        },
      },
    },
  },
  async (args) => {
    return await callCntxtGateway('/api/v1/rpc', 'POST', {
      domain: 'directives',
      action: 'get',
      payload: { format: args?.format || 'json' },
    });
  }
);

// ==========================================
// Dynamic MCP Resource Registry (Pillar 4 Modularity)
// ==========================================

const resourceRegistry = new Map();

export function registerResource(uri, definition, handler) {
  resourceRegistry.set(uri, {
    definition: {
      uri,
      name: definition.name,
      description: definition.description,
      mimeType: definition.mimeType,
    },
    handler,
  });
}

export function getResourceDefinitions() {
  return Array.from(resourceRegistry.values()).map((r) => r.definition);
}

export async function handleResourceRead(uri) {
  const resource = resourceRegistry.get(uri);
  if (!resource) {
    throw new Error(`Resource not found: ${uri}`);
  }
  return await resource.handler(uri);
}

// Register standard CNTXT resources
registerResource(
  'cntxt://directives/agent-guide',
  {
    name: 'CNTXT AI Agent Integration & Governance Guide',
    description: 'Authoritative directives, syntax rules, and guidelines for external AI agents',
    mimeType: 'text/markdown',
  },
  async (uri) => {
    const res = await callCntxtGateway('/api/v1/directives', 'GET');
    const text =
      res?.data?.guideMarkdown ||
      (typeof res === 'string' ? res : JSON.stringify(res, null, 2));
    return {
      contents: [{ uri, mimeType: 'text/markdown', text }],
    };
  }
);

registerResource(
  'cntxt://directives/capabilities',
  {
    name: 'CNTXT Capabilities & Tools Manifest',
    description: 'Machine-readable catalog of all CNTXT RPC domains, actions, and MCP tools',
    mimeType: 'application/json',
  },
  async (uri) => {
    const res = await callCntxtGateway('/api/v1/capabilities', 'GET');
    return {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(res, null, 2) }],
    };
  }
);

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id, code, message) {
  process.stdout.write(
    JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n'
  );
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch (parseErr) {
      console.error('[cntxt-mcp-server] Failed to parse JSON-RPC line:', parseErr);
      sendError(null, -32700, 'Parse error: malformed JSON-RPC message');
      return;
    }

    const { id, method, params } = msg;

    try {
      if (method === 'initialize') {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'cntxt-mcp-server', version: mcpPackageVersion },
          instructions:
            'CNTXT AI Agent Directive: All deliverables, plans, briefs, and reviews MUST be wrapped in CNTXT Rich Containers (~~~markdown | id=<slug> tags=deliverable locked=agent status=ready source=@agent title="<Title>"). Never overwrite blocks marked locked=user. Use cntxt_upsert_block for surgical block updates instead of replacing full files. When working in active threads, new deliverables prepend below id=user-inbox and user comments cite blocks via [[#^block-id]].',
        });
      } else if (method === 'resources/list') {
        sendResponse(id, { resources: getResourceDefinitions() });
      } else if (method === 'resources/read') {
        const result = await handleResourceRead(params?.uri);
        sendResponse(id, result);
      } else if (method === 'notifications/initialized') {
        // No response required for notification
      } else if (method === 'tools/list') {
        sendResponse(id, { tools: getToolDefinitions() });
      } else if (method === 'tools/call') {
        const result = await handleToolCall(params?.name, params?.arguments);
        sendResponse(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        });
      } else if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
    } catch (err) {
      if (id !== undefined) {
        sendError(id, -32000, err instanceof Error ? err.message : String(err));
      }
    }
  });
}
