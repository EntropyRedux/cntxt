import { describe, it, expect } from 'vitest';
import {
  wrapDeliverableInCodeBlock,
  getToolDefinitions,
  registerTool,
  handleToolCall,
} from '../scripts/mcp/cntxt-mcp-server.mjs';

describe('CNTXT Native MCP Server (FG-21 / FG-22)', () => {
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

  describe('2. Tool Registry and Declarations (Pillar 4 & FG-21 §1.3)', () => {
    it('exposes all declared MCP tools including clear_diagnostics, apply_template, and notify', () => {
      const tools = getToolDefinitions();
      const toolNames = tools.map((t) => t.name);

      // FG-21 & FG-22 declared tools
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
});
