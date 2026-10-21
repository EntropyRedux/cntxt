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
import readline from 'node:readline';

const CONFIG_PATH = 'C:/Projects/LocalActive/.localactive/cntxt_gateway.json';
const CANDIDATE_PORTS = [9876, 9877, 9878, 9879, 9880, 9881];

function loadGatewayConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // Fallback to defaults
  }
  return { url: 'http://127.0.0.1:9876', token: process.env.CNTXT_TOKEN || '' };
}

async function resolveGatewayEndpoint() {
  const cfg = loadGatewayConfig();
  const token = process.env.CNTXT_TOKEN || cfg.token || '';

  // 1. Try configured URL first
  if (cfg.url) {
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

async function callCntxtGateway(path, method = 'POST', bodyObj = null) {
  const { baseUrl, token } = await resolveGatewayEndpoint();
  const headers = {
    'X-CNTXT-Token': token,
    'Content-Type': 'application/json; charset=utf-8',
  };
  const res = await fetch(`${baseUrl}${path}`, {
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

const TOOLS = [
  {
    name: 'cntxt_open_deliverable',
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
  {
    name: 'cntxt_append_deliverable',
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
  {
    name: 'cntxt_list_blocks',
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
  {
    name: 'cntxt_get_block',
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
  {
    name: 'cntxt_upsert_block',
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
  {
    name: 'cntxt_update_block_params',
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
  {
    name: 'cntxt_get_active_context',
    description:
      'Read the currently active document tab (title, content, filePath, isDirty) and currently highlighted text selection from CNTXT.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'cntxt_list_tabs',
    description: 'List all currently open document tabs in CNTXT.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'cntxt_focus_tab',
    description: 'Focus a specific open tab in CNTXT by its tabId.',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'string', description: 'Target tab ID from cntxt_list_tabs' },
      },
      required: ['tabId'],
    },
  },
  {
    name: 'cntxt_set_diagnostics',
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
  {
    name: 'cntxt_rpc',
    description:
      'Execute any raw Host Command Bus RPC action across CNTXT domains (editor, tabs, workspace, templates, actions, notify, terminal, blocks).',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          enum: ['editor', 'tabs', 'workspace', 'templates', 'actions', 'notify', 'terminal', 'blocks'],
        },
        action: { type: 'string' },
        payload: { type: 'object' },
      },
      required: ['domain', 'action'],
    },
  },
];

async function handleToolCall(name, args = {}) {
  switch (name) {
    case 'cntxt_open_deliverable': {
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

    case 'cntxt_append_deliverable': {
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

    case 'cntxt_list_blocks': {
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

    case 'cntxt_get_block': {
      return await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'blocks',
        action: 'get',
        payload: {
          id: args.id,
          ...(args.tabId ? { tabId: args.tabId } : {}),
        },
      });
    }

    case 'cntxt_upsert_block': {
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

    case 'cntxt_update_block_params': {
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

    case 'cntxt_get_active_context': {
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

    case 'cntxt_list_tabs': {
      return await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'tabs',
        action: 'list',
        payload: {},
      });
    }

    case 'cntxt_focus_tab': {
      return await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'tabs',
        action: 'focus',
        payload: { tabId: args.tabId },
      });
    }

    case 'cntxt_set_diagnostics': {
      return await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: 'editor',
        action: 'setDiagnostics',
        payload: { diagnostics: args.diagnostics || [] },
      });
    }

    case 'cntxt_rpc': {
      return await callCntxtGateway('/api/v1/rpc', 'POST', {
        domain: args.domain,
        action: args.action,
        payload: args.payload || {},
      });
    }

    default:
      throw new Error(`Unknown CNTXT MCP tool: ${name}`);
  }
}

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
    } catch {
      return;
    }

    const { id, method, params } = msg;

    try {
      if (method === 'initialize') {
        sendResponse(id, {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'cntxt-mcp-server', version: '0.6.0' },
        });
      } else if (method === 'notifications/initialized') {
        // No response required for notification
      } else if (method === 'tools/list') {
        sendResponse(id, { tools: TOOLS });
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
