import { describe, it, expect } from 'vitest';
import {
  buildCntxtTerminalBus,
  parseCntxtTerminalBus,
} from '../src/features/terminal/format/cntxtTerminalBus';
import { TerminalSessionManifest } from '../src/contracts/data_shapes';

describe('cntxtTerminalBus (.cntxt Terminal Bus Serializer & Parser)', () => {
  const sampleManifest: TerminalSessionManifest = {
    name: 'Multi-Agent Dev Session',
    type: 'terminal-bus',
    version: '1.0.0',
    channels: [
      {
        id: 'coder-1',
        name: 'Code Agent',
        command: 'agy',
        args: ['coder', '--autonomy'],
        cwd: 'src'
      },
      {
        id: 'test-1',
        name: 'Vitest Watcher',
        command: 'npm',
        args: ['test', '--', '--watch']
      }
    ]
  };

  const sampleState = {
    version: 1,
    activeChannel: 'coder-1',
    transcripts: {
      'coder-1': [
        { t: 1728560001, stream: 'stdout' as const, data: 'Spawning agent...\r\n' }
      ]
    }
  };

  it('builds a well-formed .cntxt terminal bus document', () => {
    const doc = buildCntxtTerminalBus(sampleManifest, sampleState);
    expect(doc).toContain('---');
    expect(doc).toContain('type: "terminal-bus"');
    expect(doc).toContain('```state');
    expect(doc).toContain('"activeChannel": "coder-1"');
    expect(doc).toContain('Spawning agent...');
  });

  it('round-trips build and parse correctly', () => {
    const doc = buildCntxtTerminalBus(sampleManifest, sampleState);
    const parsed = parseCntxtTerminalBus(doc);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.manifest.name).toBe('Multi-Agent Dev Session');
      expect(parsed.manifest.type).toBe('terminal-bus');
      expect(parsed.manifest.channels).toHaveLength(2);
      expect(parsed.manifest.channels[0].id).toBe('coder-1');
      expect(parsed.state).toBeDefined();
      expect(parsed.state?.activeChannel).toBe('coder-1');
      expect(parsed.state?.transcripts['coder-1'][0].data).toBe('Spawning agent...\r\n');
    }
  });

  it('rejects documents without frontmatter or with wrong type', () => {
    const noFront = '# Just a markdown file';
    expect(parseCntxtTerminalBus(noFront).ok).toBe(false);

    const wrongType = '---\nname: "App"\ntype: "panel-app"\n---\n';
    expect(parseCntxtTerminalBus(wrongType).ok).toBe(false);
  });
});
