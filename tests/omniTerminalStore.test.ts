import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOmniTerminalStore } from '../src/store/omniTerminalStore';

describe('useOmniTerminalStore (FG-18 Verification)', () => {
  beforeEach(() => {
    useOmniTerminalStore.getState().clearSession();
    useOmniTerminalStore.getState().setTargetFolder('C:/TestProject');
  });

  it('initializes and creates a new session with dual paths', async () => {
    const store = useOmniTerminalStore.getState();
    const session = await store.createSession('Refactor Sprint');

    expect(session.id).toContain('ses_');
    expect(session.title).toBe('Refactor Sprint');
    expect(session.targetFolder).toBe('C:/TestProject');
    expect(session.rawFilePath).toBe(`C:/TestProject/${session.id}_raw.cntxt`);
    expect(session.outputFilePath).toBe(`C:/TestProject/${session.id}_output.cntxt`);
    expect(useOmniTerminalStore.getState().activeSession).toEqual(session);
  });

  it('manages agent roster: add, remove, and update status', () => {
    const store = useOmniTerminalStore.getState();
    store.createSession('Roster Test');

    store.addAgent({
      id: 'agent-agy',
      name: 'Pass 1 Auditor',
      handle: 'agy',
      role: 'Auditor Agent',
      command: 'powershell.exe -NoLogo',
      spawnMode: 'headless',
    });

    let current = useOmniTerminalStore.getState().activeSession;
    expect(current?.pinnedAgents).toHaveLength(1);
    expect(current?.pinnedAgents[0].handle).toBe('agy');

    store.removeAgent('agent-agy');
    current = useOmniTerminalStore.getState().activeSession;
    expect(current?.pinnedAgents).toHaveLength(0);
  });

  it('sends user messages and extracts targeted handles', async () => {
    const store = useOmniTerminalStore.getState();
    await store.createSession('Chat Test');

    store.addAgent({
      id: 'agent-claude',
      name: 'Implementer',
      handle: 'claude',
      role: 'Prod Agent',
      command: 'cmd.exe',
      spawnMode: 'headless',
    });

    // Targeted message
    await store.sendMessage('@claude implement phase 2');
    let messages = useOmniTerminalStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].targetHandle).toBe('claude');
    expect(messages[0].content).toBe('implement phase 2');

    // Broadcast message
    await store.sendMessage('run test suites');
    messages = useOmniTerminalStore.getState().messages;
    expect(messages).toHaveLength(2);
    expect(messages[1].targetHandle).toBeUndefined();
    expect(messages[1].content).toBe('run test suites');
  });

  it('accumulates chunks and debounces turn completion', async () => {
    vi.useFakeTimers();

    const store = useOmniTerminalStore.getState();
    await store.createSession('Streaming Test');

    store.addAgent({
      id: 'agent-agy',
      name: 'Auditor',
      handle: 'agy',
      role: 'Auditor Agent',
      command: 'powershell.exe',
      spawnMode: 'headless',
    });

    // Append chunks
    store.appendAgentChunk('agent-agy', '<thought>Auditing...</thought>\n');
    store.appendAgentChunk('agent-agy', 'Verdict: PASS\n');

    // Before debounce
    expect(useOmniTerminalStore.getState().messages).toHaveLength(0);

    // Fast-forward past debounce timer (1200ms)
    vi.advanceTimersByTime(1250);

    const messages = useOmniTerminalStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].senderName).toBe('agy');
    expect(messages[0].thought).toBe('Auditing...');
    expect(messages[0].content).toContain('Verdict: PASS');

    vi.useRealTimers();
  });

  it('suppresses stdin prompt echo from appearing as an agent chat bubble', async () => {
    vi.useFakeTimers();

    const store = useOmniTerminalStore.getState();
    await store.createSession('Echo Suppression Test');

    store.addAgent({
      id: 'agent-agy',
      name: 'Auditor',
      handle: 'agy',
      role: 'Auditor Agent',
      command: 'powershell.exe',
      spawnMode: 'headless',
    });

    // User sends prompt
    await store.sendMessage('@agy can you check the status of CNTXT?');
    expect(useOmniTerminalStore.getState().messages).toHaveLength(1);
    expect(useOmniTerminalStore.getState().messages[0].senderId).toBe('user');

    // Terminal PTY echoes the prompt back on stdout
    store.appendAgentChunk('agent-agy', 'can you check the status of CNTXT?\r\n');

    // Advance past debounce timer
    vi.advanceTimersByTime(1300);

    // Assert: The echoed prompt was suppressed and NOT published as an agent bubble!
    const msgsAfterEcho = useOmniTerminalStore.getState().messages;
    expect(msgsAfterEcho).toHaveLength(1); // Only user message, zero agent echo!

    // Later, the agent actually responds with real output
    store.appendAgentChunk('agent-agy', 'CNTXT is running normally with 0 errors.\n');
    vi.advanceTimersByTime(1300);

    const msgsAfterRealReply = useOmniTerminalStore.getState().messages;
    expect(msgsAfterRealReply).toHaveLength(2);
    expect(msgsAfterRealReply[1].senderName).toBe('agy');
    expect(msgsAfterRealReply[1].content).toContain('CNTXT is running normally');

    vi.useRealTimers();
  });

  it('pins message to clean output', async () => {
    const store = useOmniTerminalStore.getState();
    await store.createSession('Pin Test');

    await store.sendMessage('test message');
    const msgId = useOmniTerminalStore.getState().messages[0].id;

    await store.pinMessageToOutput(msgId);
    expect(useOmniTerminalStore.getState().messages[0].isPinnedToOutput).toBe(true);
  });
});
