import { describe, it, expect } from 'vitest';
import {
  stripAnsi,
  stripThoughtBlocks,
  extractAnnotatedOutput,
  buildInitialSessionFiles,
  serializeRawTurn,
  serializeOutputTurn,
  parseOutputDocumentTurns,
  extractCleanDeliverable,
  parseCommandLine,
} from '../src/features/omniTerminal/format/omniDocumentSync';
import { OmniChatMessage, OmniSession } from '../src/contracts/data_shapes';

describe('OmniDocumentSync Engine (FG-18 Verification)', () => {
  it('strips ANSI color and control codes correctly', () => {
    const raw = '\x1b[32mSUCCESS\x1b[0m: Process completed.\r\nNext line';
    const cleaned = stripAnsi(raw);
    expect(cleaned).toBe('SUCCESS: Process completed.\nNext line');
  });

  it('strips <thought> and <thinking> blocks cleanly', () => {
    const textWithThoughts = `
<thought>
I need to inspect package.json first.
Running verification commands.
</thought>
Here is the final report:
All 589 tests are passing.
`;
    const clean = stripThoughtBlocks(textWithThoughts);
    expect(clean).toBe('Here is the final report:\nAll 589 tests are passing.');
  });

  it('extracts explicitly annotated output tags', () => {
    const text = `
Intermediate logs...
<!-- cntxt:output:start -->
# Final Audit Verdict
PASS: 0 Critical Defects
<!-- cntxt:output:end -->
Trailing comment.
`;
    const extracted = extractAnnotatedOutput(text);
    expect(extracted).toBe('# Final Audit Verdict\nPASS: 0 Critical Defects');
  });

  it('builds initial raw and output headers with frontmatter', () => {
    const session: OmniSession = {
      id: 'session-test',
      title: 'Full Codebase Audit',
      targetFolder: 'C:/Projects/Active',
      rawFilePath: 'C:/Projects/Active/session_raw.cntxt',
      outputFilePath: 'C:/Projects/Active/session_output.cntxt',
      createdAt: '2026-10-11T18:00:00Z',
      updatedAt: '2026-10-11T18:00:00Z',
      pinnedAgents: [
        {
          id: 'agent-agy',
          name: 'Independent Auditor',
          handle: 'agy',
          role: 'Auditor Agent',
          command: 'powershell.exe',
          spawnMode: 'headless',
          status: 'idle',
        },
      ],
      status: 'idle',
    };

    const files = buildInitialSessionFiles(session);
    expect(files.rawContent).toContain('busType: "omni-terminal-raw"');
    expect(files.rawContent).toContain('sessionId: "session-test"');
    expect(files.rawContent).toContain('Independent Auditor');

    expect(files.outputContent).toContain('busType: "omni-terminal-output"');
    expect(files.outputContent).toContain('Omni Terminal Clean Output & Deliverables');
  });

  it('serializes a turn to raw flight recorder stream', () => {
    const turn: OmniChatMessage = {
      id: 'turn-1',
      sessionId: 'session-test',
      senderId: 'user',
      senderName: 'User',
      targetHandle: 'agy',
      content: '@agy run full codebase audit',
      timestamp: '2026-10-11T18:05:00Z',
      isPinnedToOutput: false,
    };

    const serialized = serializeRawTurn(turn);
    expect(serialized).toContain('<!-- cntxt:turn:start id="turn-1" sender="user" target="@agy"');
    expect(serialized).toContain('@agy run full codebase audit');
    expect(serialized).toContain('<!-- cntxt:turn:end -->');
  });

  it('extracts clean deliverables from agent turns while ignoring thoughts', () => {
    const agentTurn: OmniChatMessage = {
      id: 'turn-2',
      sessionId: 'session-test',
      senderId: 'agent-agy',
      senderName: 'agy',
      content: '<thought>Testing 9 pillars...</thought>\n\nAudit complete: 0 defects found.',
      thought: 'Testing 9 pillars...',
      timestamp: '2026-10-11T18:06:00Z',
      isPinnedToOutput: false,
    };

    const deliverable = extractCleanDeliverable(agentTurn);
    expect(deliverable).not.toBeNull();
    expect(deliverable).toContain('@agy');
    expect(deliverable).toContain('Audit complete: 0 defects found.');
    expect(deliverable).not.toContain('<thought>');
  });

  it('honors isPinnedToOutput flag on agent turns', () => {
    const pinnedTurn: OmniChatMessage = {
      id: 'turn-3',
      sessionId: 'session-test',
      senderId: 'agent-claude',
      senderName: 'claude',
      content: 'Important milestone note.',
      timestamp: '2026-10-11T18:10:00Z',
      isPinnedToOutput: true,
    };

    const deliverable = extractCleanDeliverable(pinnedTurn);
    expect(deliverable).toContain('📌 @claude (Pinned)');
    expect(deliverable).toContain('Important milestone note.');
  });

  it('parses command line strings respecting quoted arguments', () => {
    const cmdStr = 'powershell.exe -NoLogo -NoExit -Command "agy --dangerously-skip-permissions"';
    const parsed = parseCommandLine(cmdStr);
    expect(parsed.command).toBe('powershell.exe');
    expect(parsed.args).toEqual([
      '-NoLogo',
      '-NoExit',
      '-Command',
      'agy --dangerously-skip-permissions',
    ]);

    const simpleCmd = 'cline --auto-approve true';
    const parsedSimple = parseCommandLine(simpleCmd);
    expect(parsedSimple.command).toBe('cline');
    expect(parsedSimple.args).toEqual(['--auto-approve', 'true']);
  });

  it('serializes output turns with color and handle and parses them back cleanly', () => {
    const userTurn: OmniChatMessage = {
      id: 'turn-u1',
      sessionId: 'session-test',
      senderId: 'user',
      senderName: 'User',
      targetHandle: 'agy',
      content: 'Please audit the codebase',
      timestamp: '2026-10-12T00:00:00Z',
      isPinnedToOutput: false,
    };

    const agentTurn: OmniChatMessage = {
      id: 'turn-a1',
      sessionId: 'session-test',
      senderId: 'agent-agy',
      senderName: 'agy',
      color: '#10b981',
      content: '## Audit Results\n- All 9 Pillars verified.\n- Zero defects found.',
      timestamp: '2026-10-12T00:01:00Z',
      isPinnedToOutput: false,
    };

    const serializedUser = serializeOutputTurn(userTurn);
    const serializedAgent = serializeOutputTurn(agentTurn);
    const fullDoc = `# Header\n${serializedUser}\n${serializedAgent}`;

    const parsedTurns = parseOutputDocumentTurns(fullDoc, 'session-test');
    expect(parsedTurns).toHaveLength(2);

    expect(parsedTurns[0].id).toBe('turn-u1');
    expect(parsedTurns[0].senderId).toBe('user');
    expect(parsedTurns[0].targetHandle).toBe('agy');
    expect(parsedTurns[0].content).toBe('Please audit the codebase');

    expect(parsedTurns[1].id).toBe('turn-a1');
    expect(parsedTurns[1].senderId).toBe('agent-agy');
    expect(parsedTurns[1].senderName).toBe('agy');
    expect(parsedTurns[1].color).toBe('#10b981');
    expect(parsedTurns[1].content).toContain('## Audit Results');
    expect(parsedTurns[1].content).toContain('Zero defects found.');
  });
});
