import { describe, it, expect } from 'vitest';
import {
  getAgentDirectives,
  getCapabilitiesManifest,
  getRawMarkdownGuide,
  getAgentBootstrapPrompt,
  CNTXT_PROTOCOL_VERSION,
} from '../src/services/agentDirectivesService';

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

  it('generates a complete capabilities manifest containing endpoints, domains, and tools', () => {
    const manifest = getCapabilitiesManifest('0.7.8');
    expect(manifest.status).toBe('ok');
    expect(manifest.version).toBe('0.7.8');
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
    const md = getRawMarkdownGuide('0.7.8');
    expect(md).toContain('# CNTXT AI Agent Integration & Governance Protocol (v0.7.8)');
    expect(md).toContain('Mandatory Rich Container Deliverable Wrapping');
    expect(md).toContain('Surgical Block Operations Over Document Rewriting');
    expect(md).toContain('Active Thread Citations & User Inbox');
    expect(md).toContain('Diagnostics & Squigglies');
  });

  it('generates a clean 1-click bootstrap prompt string', () => {
    const prompt = getAgentBootstrapPrompt('http://127.0.0.1:9876', 'cntxt_sec_12345');
    expect(prompt).toBe(
      'You are connected to CNTXT at http://127.0.0.1:9876 with header X-CNTXT-Token: cntxt_sec_12345. First call GET /api/v1/capabilities to discover all available controls and strictly follow the returned system directives when interacting with CNTXT.'
    );
  });
});
