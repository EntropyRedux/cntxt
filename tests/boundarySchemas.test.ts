import { describe, it, expect } from 'vitest';
import {
  TabSchema,
  TabCacheEntrySchema,
  ActionSchema,
  TemplateSchema,
  WorkspaceBackupSchema,
  VirtualFileSchema,
  validateTab,
  validateTabCache,
  validateAction,
  validateTemplate,
  validateWorkspaceBackup,
  validateVirtualFile,
  validateTerminalSpawn,
  validateTerminalSendInput,
  validateTerminalKill,
  validateTerminalResize,
  validateOmniAgentProfile,
  validateOmniChatMessage,
  validateOmniSession
} from '../src/contracts/boundarySchemas';

describe('Boundary Schemas (P-10 Verification)', () => {
  describe('TabSchema & TabCacheEntrySchema', () => {
    it('validates a well-formed Tab object', () => {
      const validTab = {
        id: 'tab-123',
        title: 'Project Notes.md',
        content: '# Hello World\nSample content',
        isDirty: false,
        language: 'markdown',
        filePath: 'C:/docs/notes.md',
        folderPath: 'C:/docs',
        lastModifiedTime: 1700000000
      };

      const result = validateTab(validTab);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('tab-123');
        expect(result.data.language).toBe('markdown');
      }
    });

    it('rejects a tab missing an id or content', () => {
      const missingId = {
        title: 'No Id',
        content: 'some text'
      };
      expect(validateTab(missingId).success).toBe(false);

      const missingContent = {
        id: 'tab-99',
        title: 'No Content'
      };
      expect(validateTab(missingContent).success).toBe(false);
    });

    it('rejects a tab with an unsupported language', () => {
      const invalidLang = {
        id: 'tab-1',
        title: 'test.xyz',
        content: 'code',
        language: 'brainfuck'
      };
      expect(validateTab(invalidLang).success).toBe(false);
    });

    it('validates a complete TabCacheEntry', () => {
      const validCache = {
        tabs: [
          {
            id: 'tab-1',
            title: 'Doc 1',
            content: 'Hello',
            language: 'markdown',
            isDirty: false
          }
        ],
        activeTabId: 'tab-1',
        checksum: '1234abcd',
        ts: Date.now()
      };

      const result = validateTabCache(validCache);
      expect(result.success).toBe(true);
    });

    it('rejects a TabCacheEntry with empty activeTabId or corrupt tabs array', () => {
      const corrupt = {
        tabs: 'not-an-array',
        activeTabId: 'tab-1',
        checksum: 'abc',
        ts: 12345
      };
      expect(validateTabCache(corrupt).success).toBe(false);
    });
  });

  describe('ActionSchema', () => {
    it('validates a valid custom action', () => {
      const action = {
        id: 'act-upper',
        name: 'Uppercase Text',
        description: 'Converts selected text to uppercase',
        code: 'const sel = api.getSelection(); api.replaceSelection(sel.toUpperCase());',
        category: 'TEXT',
        enabled: true
      };

      const result = validateAction(action);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Uppercase Text');
      }
    });

    it('rejects an action missing name or executable code', () => {
      expect(validateAction({ id: '1', name: 'No Code' }).success).toBe(false);
      expect(validateAction({ id: '2', code: 'api.toast("hi");' }).success).toBe(false);
    });
  });

  describe('TemplateSchema', () => {
    it('validates a valid template with variables', () => {
      const tmpl = {
        id: 'tmpl-meeting',
        name: 'Meeting Minutes',
        content: '# Meeting with {{client}}\nDate: {{date}}\nAttendees: {{attendees}}',
        category: 'WORK',
        variables: ['client', 'date', 'attendees']
      };

      const result = validateTemplate(tmpl);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.variables).toHaveLength(3);
      }
    });

    it('rejects a template missing name or content', () => {
      expect(validateTemplate({ id: 't1', name: 'No Content' }).success).toBe(false);
      expect(validateTemplate({ id: 't2', content: 'No Name' }).success).toBe(false);
    });
  });

  describe('WorkspaceBackupSchema', () => {
    it('validates a structured workspace backup export', () => {
      const backup = {
        version: '1.40.0',
        exportedAt: new Date().toISOString(),
        data: {
          contextpad_settings: { fontSize: 14, theme: 'contextpad-dark' },
          contextpad_actions: []
        }
      };

      const result = validateWorkspaceBackup(backup);
      expect(result.success).toBe(true);
    });

    it('rejects a workspace backup missing the data dictionary', () => {
      expect(validateWorkspaceBackup({ version: '1.0' }).success).toBe(false);
    });
  });

  describe('VirtualFileSchema', () => {
    it('validates a recursive directory structure', () => {
      const tree = {
        name: 'Workspace',
        type: 'folder' as const,
        children: [
          {
            name: 'index.md',
            type: 'file' as const,
            content: '# Welcome',
            language: 'markdown'
          },
          {
            name: 'subfolder',
            type: 'folder' as const,
            children: [
              {
                name: 'notes.txt',
                type: 'file' as const,
                content: 'Notes here'
              }
            ]
          }
        ]
      };

      const result = validateVirtualFile(tree);
      expect(result.success).toBe(true);
    });

    it('rejects a file entry with invalid type', () => {
      const invalid = {
        name: 'bad_entry',
        type: 'executable'
      };
      expect(validateVirtualFile(invalid).success).toBe(false);
    });
  });

  describe('Terminal Bus Schemas (FG-17 Verification)', () => {
    it('validates a well-formed TerminalSpawn payload', () => {
      const payload = {
        id: 'term-1',
        name: 'Vitest Runner',
        command: 'npm',
        args: ['test', '--', '--watch'],
        cwd: 'src'
      };
      const result = validateTerminalSpawn(payload);
      expect(result.success).toBe(true);
    });

    it('rejects TerminalSpawn payload with path traversal or missing fields', () => {
      const traversal = {
        id: 'term-bad',
        name: 'Hack',
        command: 'sh',
        cwd: '../outside'
      };
      expect(validateTerminalSpawn(traversal).success).toBe(false);

      const missingCommand = {
        id: 'term-2',
        name: 'Empty'
      };
      expect(validateTerminalSpawn(missingCommand).success).toBe(false);
    });

    it('validates TerminalSendInput payload', () => {
      const input = {
        channelId: 'term-1',
        data: 'echo "hello"\n'
      };
      expect(validateTerminalSendInput(input).success).toBe(true);
      expect(validateTerminalSendInput({ channelId: '' }).success).toBe(false);
    });

    it('validates TerminalKill and TerminalResize payloads', () => {
      expect(validateTerminalKill({ channelId: 'term-1' }).success).toBe(true);
      expect(validateTerminalKill({ channelId: '' }).success).toBe(false);

      expect(validateTerminalResize({ channelId: 'term-1', cols: 80, rows: 24 }).success).toBe(true);
      expect(validateTerminalResize({ channelId: 'term-1', cols: 5, rows: 24 }).success).toBe(false); // cols min is 10
    });
  });

  describe('Omni Terminal Schemas (FG-18 Verification)', () => {
    it('validates a well-formed OmniAgentProfile', () => {
      const agent = {
        id: 'agent-agy',
        name: 'Pass 1 Auditor',
        handle: 'agy',
        role: 'Auditor Agent' as const,
        command: 'powershell.exe -NoLogo',
        spawnMode: 'headless' as const,
        systemDirectives: 'Strict line citations only.',
        status: 'idle' as const,
        color: '#3b82f6'
      };
      const result = validateOmniAgentProfile(agent);
      expect(result.success).toBe(true);
    });

    it('rejects invalid OmniAgentProfile with bad handle or role', () => {
      const invalidHandle = {
        id: 'agent-1',
        name: 'Bad Agent',
        handle: 'agy with space',
        role: 'Auditor Agent',
        command: 'sh',
        spawnMode: 'headless',
        status: 'idle'
      };
      expect(validateOmniAgentProfile(invalidHandle).success).toBe(false);

      const invalidRole = {
        id: 'agent-2',
        name: 'Bad Role',
        handle: 'agent2',
        role: 'Rogue Agent',
        command: 'sh',
        spawnMode: 'headless',
        status: 'idle'
      };
      expect(validateOmniAgentProfile(invalidRole).success).toBe(false);
    });

    it('validates OmniChatMessage and OmniSession', () => {
      const message = {
        id: 'msg-1',
        sessionId: 'session-101',
        senderId: 'user',
        senderName: 'User',
        targetHandle: 'agy',
        content: '@agy audit codebase',
        timestamp: '2026-10-11T18:30:00Z',
        isPinnedToOutput: false
      };
      expect(validateOmniChatMessage(message).success).toBe(true);

      const session = {
        id: 'session-101',
        title: 'Audit & Implement',
        targetFolder: 'C:/Projects/Active',
        rawFilePath: 'C:/Projects/Active/session_raw.cntxt',
        outputFilePath: 'C:/Projects/Active/session_output.cntxt',
        createdAt: '2026-10-11T18:00:00Z',
        updatedAt: '2026-10-11T18:30:00Z',
        pinnedAgents: [
          {
            id: 'agent-agy',
            name: 'Pass 1 Auditor',
            handle: 'agy',
            role: 'Auditor Agent' as const,
            command: 'powershell.exe',
            spawnMode: 'headless' as const,
            status: 'idle' as const
          }
        ],
        status: 'idle' as const
      };
      expect(validateOmniSession(session).success).toBe(true);
    });
  });
});

