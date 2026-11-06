import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAgentDirectives,
  getCapabilitiesManifest,
  getRawMarkdownGuide,
  getAgentBootstrapPrompt,
  CNTXT_PROTOCOL_VERSION,
  CNTXT_APP_VERSION,
  REST_ENDPOINTS,
  MCP_TOOLS,
  RPC_DOMAINS,
} from '../src/services/agentDirectivesService';
import packageJson from '../package.json';

describe('Agent Directives & Capabilities Discovery (Improvements 2, 4, 5)', () => {
  it('returns valid structured agent directives with Rich Container syntax and examples', () => {
    const directives = getAgentDirectives();
    expect(directives.version).toBe(CNTXT_PROTOCOL_VERSION);
    expect(directives.systemDirective).toContain('CNTXT Rich Containers');
    expect(directives.richContainerSyntax.headerFormat).toContain('locked=agent');
    expect(directives.richContainerSyntax.headerFormat).toContain('tags=');
    expect(directives.richContainerSyntax.example).toContain('~~~markdown | id=arch-plan-1');
    expect(directives.citationSyntax.inboxId).toBe('user-inbox');
    expect(directives.bestPractices.length).toBeGreaterThanOrEqual(4);
  });

  it('generates a complete capabilities manifest dynamically bound to package.json version', () => {
    const manifest = getCapabilitiesManifest();
    expect(manifest.status).toBe('ok');
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.version).toBe(CNTXT_APP_VERSION);
    expect(manifest.securityModel.tokenHeader).toBe('X-CNTXT-Token');

    // Endpoints
    const endpointPaths = manifest.restEndpoints.map((e) => e.path);
    expect(endpointPaths).toContain('/api/v1/health');
    expect(endpointPaths).toContain('/api/v1/capabilities');
    expect(endpointPaths).toContain('/api/v1/directives');
    expect(endpointPaths).toContain('/api/v1/rpc');

    // RPC Domains
    const domainNames = manifest.rpcDomains.map((d) => d.domain);
    expect(domainNames).toContain('directives');
    expect(domainNames).toContain('blocks');
    expect(domainNames).toContain('editor');
    expect(domainNames).toContain('tabs');
    expect(domainNames).toContain('workspace');

    // MCP Tools
    const toolNames = manifest.mcpTools.map((t) => t.name);
    expect(toolNames).toContain('cntxt_open_deliverable');
    expect(toolNames).toContain('cntxt_upsert_block');
    expect(toolNames).toContain('cntxt_get_directives');
  });

  it('generates a comprehensive Markdown guide', () => {
    const md = getRawMarkdownGuide();
    expect(md).toContain(`# CNTXT AI Agent Integration & Governance Protocol (v${CNTXT_APP_VERSION})`);
    expect(md).toContain('Mandatory Rich Container Deliverable Wrapping');
    expect(md).toContain('Surgical Block Operations Over Document Rewriting');
    expect(md).toContain('Active Thread Citations & User Inbox');
    expect(md).toContain('Diagnostics & Squigglies');
  });

  it('generates a clean 1-click bootstrap prompt string', () => {
    const prompt = getAgentBootstrapPrompt('http://127.0.0.1:9876', 'cntxt_sec_12345');
    expect(prompt).toBe(
      'You are connected to CNTXT at http://127.0.0.1:9876 with header X-CNTXT-Token: cntxt_sec_12345 (runtime discovery mirrored at ~/.cntxt/gateway.json). First call GET /api/v1/capabilities to discover all available controls and strictly follow the returned system directives when interacting with CNTXT.'
    );
  });

  describe('Cross-Surface Parity Verification (Pillar 4 & NEW-03 / VER-08)', () => {
    it('verifies that all REST endpoints are routed in Rust gateway.rs', () => {
      const gatewayRsPath = path.resolve(__dirname, '../src-tauri/src/commands/gateway.rs');
      const gatewaySource = fs.readFileSync(gatewayRsPath, 'utf8');

      expect(gatewaySource).toContain('directivesSummary');
      expect(gatewaySource).toContain('~~~markdown | id=<slug> tags=deliverable locked=agent status=ready');

      // Verify full catalog parity
      for (const endpoint of REST_ENDPOINTS) {
        expect(gatewaySource).toContain(endpoint.path);
      }
    });

    it('verifies that all MCP tools exist in cntxt-mcp-server.mjs', () => {
      const mcpServerPath = path.resolve(__dirname, '../scripts/mcp/cntxt-mcp-server.mjs');
      const mcpSource = fs.readFileSync(mcpServerPath, 'utf8');

      expect(mcpSource).toContain('instructions:');
      expect(mcpSource).toContain('~~~markdown | id=<slug> tags=deliverable locked=agent status=ready');
      expect(mcpSource).toContain('locked=user');

      for (const tool of MCP_TOOLS) {
        expect(mcpSource).toContain(tool.name);
      }
    });

    it('verifies that all RPC domains are handled in hostCommandBus.ts', () => {
      const busPath = path.resolve(__dirname, '../src/features/panelApps/rpc/hostCommandBus.ts');
      const busSource = fs.readFileSync(busPath, 'utf8');

      for (const domainDef of RPC_DOMAINS) {
        expect(busSource).toContain(`registerDomain('${domainDef.domain}'`);
      }
    });
  });
});
