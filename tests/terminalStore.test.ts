import { describe, it, expect, beforeEach } from 'vitest';
import { useTerminalStore, MAX_CHANNEL_BUFFER_CHARS, MAX_CHANNEL_LOG_ENTRIES } from '../src/store/terminalStore';

describe('useTerminalStore (Headless Ring-Buffer Engine)', () => {
  beforeEach(() => {
    useTerminalStore.getState().reset();
  });

  it('initializes empty without channels', () => {
    const state = useTerminalStore.getState();
    expect(state.channels).toEqual({});
    expect(state.activeChannelId).toBeNull();
    expect(state.getChannelList()).toHaveLength(0);
  });

  it('creates a new channel and sets activeChannelId automatically on first channel', () => {
    const id = useTerminalStore.getState().createChannel({
      id: 'agent-1',
      name: 'Code Generator',
      command: 'npm',
      args: ['run', 'build'],
      cwd: 'src'
    });

    expect(id).toBe('agent-1');
    const state = useTerminalStore.getState();
    expect(state.activeChannelId).toBe('agent-1');
    expect(state.channels['agent-1']).toBeDefined();
    expect(state.channels['agent-1'].status).toBe('idle');
    expect(state.channels['agent-1'].buffer).toBe('');
    expect(state.channels['agent-1'].logs).toEqual([]);
  });

  it('switches active channel correctly', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-1', name: 'Channel 1' });
    useTerminalStore.getState().createChannel({ id: 'ch-2', name: 'Channel 2' });

    expect(useTerminalStore.getState().activeChannelId).toBe('ch-1');
    useTerminalStore.getState().setActiveChannel('ch-2');
    expect(useTerminalStore.getState().activeChannelId).toBe('ch-2');
  });

  it('appends output and preserves chunk logs', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-1', name: 'Channel 1' });
    useTerminalStore.getState().appendOutput('ch-1', 'stdout', 'Compiling bundle...\n');
    useTerminalStore.getState().appendOutput('ch-1', 'stdout', 'Done in 120ms\n');

    const ch = useTerminalStore.getState().channels['ch-1'];
    expect(ch.buffer).toBe('Compiling bundle...\nDone in 120ms\n');
    expect(ch.logs).toHaveLength(2);
    expect(ch.logs[0].stream).toBe('stdout');
    expect(ch.logs[0].data).toBe('Compiling bundle...\n');
  });

  it('enforces rolling ring buffer limit on large streaming data', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-large', name: 'Heavy Worker' });

    // Stream more than MAX_CHANNEL_BUFFER_CHARS
    const chunk = 'x'.repeat(100_000);
    useTerminalStore.getState().appendOutput('ch-large', 'stdout', chunk);
    useTerminalStore.getState().appendOutput('ch-large', 'stdout', chunk);
    useTerminalStore.getState().appendOutput('ch-large', 'stdout', chunk); // Total 300,000 chars

    const ch = useTerminalStore.getState().channels['ch-large'];
    expect(ch.buffer.length).toBeLessThanOrEqual(MAX_CHANNEL_BUFFER_CHARS);
    expect(ch.buffer.length).toBe(MAX_CHANNEL_BUFFER_CHARS);
  });

  it('limits log entries to MAX_CHANNEL_LOG_ENTRIES', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-many', name: 'Rapid Logs' });

    for (let i = 0; i < MAX_CHANNEL_LOG_ENTRIES + 50; i++) {
      useTerminalStore.getState().appendOutput('ch-many', 'stdout', `line ${i}\n`);
    }

    const ch = useTerminalStore.getState().channels['ch-many'];
    expect(ch.logs).toHaveLength(MAX_CHANNEL_LOG_ENTRIES);
    expect(ch.logs[ch.logs.length - 1].data).toBe(`line ${MAX_CHANNEL_LOG_ENTRIES + 49}\n`);
  });

  it('updates channel status and exit code', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-1', name: 'Channel 1' });
    useTerminalStore.getState().setChannelStatus('ch-1', 'running');
    expect(useTerminalStore.getState().channels['ch-1'].status).toBe('running');

    useTerminalStore.getState().setChannelStatus('ch-1', 'exited', 0);
    expect(useTerminalStore.getState().channels['ch-1'].status).toBe('exited');
    expect(useTerminalStore.getState().channels['ch-1'].exitCode).toBe(0);
  });

  it('clears channel output without deleting the channel', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-1', name: 'Channel 1' });
    useTerminalStore.getState().appendOutput('ch-1', 'stdout', 'Some output\n');
    useTerminalStore.getState().clearChannelOutput('ch-1');

    const ch = useTerminalStore.getState().channels['ch-1'];
    expect(ch.buffer).toBe('');
    expect(ch.logs).toEqual([]);
    expect(ch.name).toBe('Channel 1');
  });

  it('handles channel removal and shifts activeChannelId', () => {
    useTerminalStore.getState().createChannel({ id: 'ch-1', name: 'Channel 1' });
    useTerminalStore.getState().createChannel({ id: 'ch-2', name: 'Channel 2' });

    useTerminalStore.getState().removeChannel('ch-1');
    expect(useTerminalStore.getState().channels['ch-1']).toBeUndefined();
    expect(useTerminalStore.getState().activeChannelId).toBe('ch-2');

    useTerminalStore.getState().removeChannel('ch-2');
    expect(useTerminalStore.getState().activeChannelId).toBeNull();
  });
});
