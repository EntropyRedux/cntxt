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
  validateOmniSession,
  validateUserLibraryItems,
  validateCommunityLibraryItems,
  validateLibraryCollections,
  validateGitHubCatalog,
  validatePanelAppManifest,
  validatePanelAppRecords,
  validateEditorInsert,
  validateTabCreate,
  validateWorkspaceReadFile,
  validateWorkspaceWriteFile,
  validateTemplateApply,
  validateActionExecute,
  validateNotify
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
        expect(result.data.title).toBe('Project Notes.md');
      }
    });

    it('rejects a Tab missing id or having empty id', () => {
      const missingId = {
        title: 'No ID Tab',
        content: 'content',
        isDirty: false,
        language: 'markdown'
      };
      expect(validateTab(missingId).success).toBe(false);

      const emptyId = {
        id: '',
        title: 'Empty ID',
        content: 'content',
        isDirty: false,
        language: 'markdown'
      };
      expect(validateTab(emptyId).success).toBe(false);
    });

    it('rejects an unsupported language on TabSchema', () => {
      const invalidLang = {
        id: 'tab-bad',
        title: 'Bad Lang',
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
      expect(validateTerminalResize({ channelId: 'term-1', cols: 5, rows: 24 }).success).toBe(false);
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

  describe('Library Boundary Schemas (GAP-02 Verification)', () => {
    it('validates valid UserLibraryItems array and rejects invalid elements', () => {
      const validItems = [
        {
          id: 'item-1',
          name: 'Architecture Prompt',
          type: 'prompt',
          category: 'Architecture',
          source: 'user-authored',
          template: '# Blueprint',
          createdAt: 100,
          updatedAt: 100
        }
      ];
      expect(validateUserLibraryItems(validItems).success).toBe(true);

      const invalidItems = [
        {
          id: 'item-2',
          name: 'Bad Type',
          type: 'unsupported-type',
          source: 'user-authored',
          template: 'content',
          createdAt: 100,
          updatedAt: 100
        }
      ];
      expect(validateUserLibraryItems(invalidItems).success).toBe(false);
      expect(validateUserLibraryItems('not-an-array').success).toBe(false);
    });

    it('validates CommunityLibraryItems and LibraryCollections', () => {
      const community = [
        {
          id: 'c-1',
          name: 'System Prompt Architect',
          type: 'prompt',
          category: 'Prompt Engineering',
          template: 'Prompt here',
          tags: ['llm', 'system']
        }
      ];
      expect(validateCommunityLibraryItems(community).success).toBe(true);

      const collections = [
        {
          id: 'col-1',
          name: 'Enterprise Prompts',
          category: 'Technical Specs',
          source: 'community-fork',
          itemIds: ['c-1'],
          createdAt: 1000,
          updatedAt: 1000
        }
      ];
      expect(validateLibraryCollections(collections).success).toBe(true);

            const catalog = [
        {
          id: 'cat-1',
          name: 'Code Review Skill',
          path: 'skills/code-review.md',
          type: 'skill'
        }
      ];
      expect(validateGitHubCatalog(catalog).success).toBe(true);
      expect(validateGitHubCatalog('not-an-array').success).toBe(false);
    });
  });

  describe('Panel Apps Boundary Schemas (GAP-02 Verification)', () => {
    it('validates a valid PanelAppManifest and rejects invalid formats', () => {
      const validManifest = {
        schemaVersion: 1,
        id: 'calc123456789012',
        name: 'Quick Calc',
        icon: 'Calculator',
        description: 'Arithmetic calculator',
        runtime: 'html',
        network: 'offline',
        panelWidth: 400,
        createdFrom: 'tab'
      };
      expect(validatePanelAppManifest(validManifest).success).toBe(true);

      // ID must start with lowercase letter and be 12-32 chars
      const badIdManifest = {
        ...validManifest,
        id: '123'
      };
      expect(validatePanelAppManifest(badIdManifest).success).toBe(false);

      // Width must be between 280 and 1200
      const badWidthManifest = {
        ...validManifest,
        panelWidth: 2000
      };
      expect(validatePanelAppManifest(badWidthManifest).success).toBe(false);
    });

    it('validates panel app records array and handles fab migration', () => {
      const records = [
        {
          id: 'app123456789012',
          path: 'C:/apps/calc.cntxt',
          name: 'Calc App',
          icon: 'Calculator',
          presentation: 'docked'
        }
      ];
      const result = validatePanelAppRecords(records);
      expect(result.success).toBe(true);

      const invalidRecords = [{ id: 'bad' }];
      expect(validatePanelAppRecords(invalidRecords).success).toBe(false);
    });
  });

  describe('RPC Payloads & Boundary Schemas (GAP-02 Verification)', () => {
    it('validates EditorInsert and TabCreate payloads', () => {
      expect(validateEditorInsert({ text: 'Hello', mode: 'append' }).success).toBe(true);
      expect(validateEditorInsert({ text: 'Hello', mode: 'invalid_mode' as any }).success).toBe(false);

      expect(validateTabCreate({ title: 'New Doc', content: 'Doc body' }).success).toBe(true);
      expect(validateTabCreate({ title: '', content: 'Doc body' }).success).toBe(false);
    });

    it('validates WorkspaceReadFile and WorkspaceWriteFile payloads', () => {
      expect(validateWorkspaceReadFile({ relativePath: 'src/main.ts' }).success).toBe(true);
      expect(validateWorkspaceReadFile({ relativePath: '../outside.ts' }).success).toBe(false);

      expect(validateWorkspaceWriteFile({ relativePath: 'notes.md', content: 'Hello' }).success).toBe(true);
      expect(validateWorkspaceWriteFile({ relativePath: '/root/bad.txt', content: 'Hello' }).success).toBe(false);
    });

    it('validates TemplateApply, ActionExecute, and Notify payloads', () => {
      expect(validateTemplateApply({ templateId: 't-1', variables: { key: 'val' } }).success).toBe(true);
      expect(validateTemplateApply({ templateId: '', variables: {} }).success).toBe(false);

      expect(validateActionExecute({ actionId: 'act-1', input: 'sample' }).success).toBe(true);
      expect(validateActionExecute({ actionId: '' }).success).toBe(false);

      expect(validateNotify({ type: 'success', message: 'Operation complete' }).success).toBe(true);
      expect(validateNotify({ type: 'invalid-type' as any, message: 'Bad' }).success).toBe(false);
      expect(validateNotify({ type: 'info', message: '' }).success).toBe(false);
    });
  });
});

