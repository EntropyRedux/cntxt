import { describe, it, expect } from 'vitest';
import {
  wrapDeliverableInCodeBlock,
  getToolDefinitions,
  registerTool,
  handleToolCall,
  registerResource,
  getResourceDefinitions,
  handleResourceRead,
} from '../scripts/mcp/cntxt-mcp-server.mjs';

describe('CNTXT Native MCP Server (FG-21 / FG-22 / FG-25)', () => {
  describe('1. wrapDeliverableInCodeBlock', () => {
    it('wraps raw text in a canonical CNTXT rich container block', () => {
      const wrapped = wrapDeliverableInCodeBlock(
        '# Executive Summary\nAll tests pass.',
        'Architecture Review',
        '@auditor',
        'arch-rev-1',
        'ready',
        'audit,report'
      );

      expect(wrapped).toContain('~~~markdown | id=arch-rev-1');
      expect(wrapped).toContain('tags=audit,report');
      expect(wrapped).toContain('locked=agent');
      expect(wrapped).toContain('status=ready');
      expect(wrapped).toContain('source=@auditor');
      expect(wrapped).toContain('title="Architecture Review');
      expect(wrapped).toContain('# Executive Summary\nAll tests pass.');
    });

    it('does not double-wrap if text is already inside a CNTXT pipe block', () => {
      const alreadyWrapped = '~~~markdown | id=test-1 tags=deliverable\nInner content\n~~~';
      const result = wrapDeliverableInCodeBlock(alreadyWrapped, 'Test');
      expect(result).toBe(alreadyWrapped);
    });
  });

  describe('2. Tool Registry and Declarations (Pillar 4 & FG-21 §1.3 & FG-25)', () => {
    it('exposes all declared MCP tools including clear_diagnostics, apply_template, notify, and get_directives', () => {
      const tools = getToolDefinitions();
      const toolNames = tools.map((t: any) => t.name);

      // FG-21, FG-22 & FG-25 declared tools
      expect(toolNames).toContain('cntxt_open_deliverable');
      expect(toolNames).toContain('cntxt_append_deliverable');
      expect(toolNames).toContain('cntxt_list_blocks');
      expect(toolNames).toContain('cntxt_get_block');
      expect(toolNames).toContain('cntxt_upsert_block');
      expect(toolNames).toContain('cntxt_update_block_params');
      expect(toolNames).toContain('cntxt_get_active_context');
      expect(toolNames).toContain('cntxt_list_tabs');
      expect(toolNames).toContain('cntxt_focus_tab');
      expect(toolNames).toContain('cntxt_set_diagnostics');
      expect(toolNames).toContain('cntxt_clear_diagnostics');
      expect(toolNames).toContain('cntxt_apply_template');
      expect(toolNames).toContain('cntxt_notify');
      expect(toolNames).toContain('cntxt_get_directives');

      // Undeclared raw passthrough cntxt_rpc must NOT be present
      expect(toolNames).not.toContain('cntxt_rpc');
    });

    it('allows dynamic registration of custom tools (Pillar 4 extensibility)', async () => {
      let executed = false;
      registerTool(
        'cntxt_custom_echo',
        {
          description: 'Test echo tool',
          inputSchema: { type: 'object', properties: { msg: { type: 'string' } } },
        },
        async (args: any) => {
          executed = true;
          return { echo: args.msg };
        }
      );

      const res = await handleToolCall('cntxt_custom_echo', { msg: 'hello' });
      expect(executed).toBe(true);
      expect((res as any).echo).toBe('hello');
    });

    it('throws when invoking an unknown tool', async () => {
      await expect(handleToolCall('cntxt_nonexistent_tool', {})).rejects.toThrow(
        /Unknown CNTXT MCP tool: cntxt_nonexistent_tool/
      );
    });
  });

  describe('3. MCP Resources & Directives (FG-25 / Improvements 2 & 4)', () => {
    it('exposes standard directives resources for connecting agents', () => {
      const resources = getResourceDefinitions();
      const uris = resources.map((r: any) => r.uri);

      expect(uris).toContain('cntxt://directives/agent-guide');
      expect(uris).toContain('cntxt://directives/capabilities');
    });

    it('supports dynamic registration of custom MCP resources (Pillar 4 Modularity)', async () => {
      let readCount = 0;
      registerResource(
        'cntxt://custom/test-resource',
        {
          name: 'Custom Resource',
          description: 'A test custom resource',
          mimeType: 'text/plain',
        },
        async (uri: string) => {
          readCount++;
          return { contents: [{ uri, mimeType: 'text/plain', text: 'Custom Hello' }] };
        }
      );

      const definitions = getResourceDefinitions();
      expect(definitions.map((d: any) => d.uri)).toContain('cntxt://custom/test-resource');

      const res = await handleResourceRead('cntxt://custom/test-resource');
      expect(readCount).toBe(1);
      expect((res as any).contents[0].text).toBe('Custom Hello');
    });

    it('throws when reading an unknown resource URI', async () => {
      await expect(handleResourceRead('cntxt://unknown/resource')).rejects.toThrow(
        /Resource not found: cntxt:\/\/unknown\/resource/
      );
    });
  });
});
