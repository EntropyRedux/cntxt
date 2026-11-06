import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostCommandBus, isPathInsideRoot } from '../src/features/panelApps/rpc/hostCommandBus';
import { buildClientSdkInjection } from '../src/features/panelApps/rpc/clientSdk';
import {
  validateRpcRequest,
  validateWorkspaceReadFile,
  validateWorkspaceWriteFile,
  validateRestGatewayConfig,
  pathIsAbsoluteOrSensitive,
} from '../src/contracts/boundarySchemas';
import { useTabStore } from '../src/store/tabStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { useTemplateStore } from '../src/store/templateStore';
import { useActionStore } from '../src/store/actionStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { IRuntimeBridge } from '../src/ui-contract/bridgeContract';

describe('Host Command Bus & RPC Bridge (FG-16)', () => {
  let mockBridge: IRuntimeBridge;
  let bus: HostCommandBus;
  const mockStorageData = new Map<string, string>();
  const mockFiles = new Map<string, string>();

  beforeEach(() => {
    mockStorageData.clear();
    mockFiles.clear();

    mockBridge = {
      storage: {
        getItem: vi.fn(async (key: string) => mockStorageData.get(key) ?? null),
        setItem: vi.fn(async (key: string, val: string) => {
          mockStorageData.set(key, val);
        }),
        removeItem: vi.fn(async (key: string) => {
          mockStorageData.delete(key);
        }),
        clear: vi.fn(async () => {
          mockStorageData.clear();
        }),
      },
      fs: {
        readFile: vi.fn(async (path: string) => mockFiles.get(path) ?? null),
        saveFile: vi.fn(async (path: string, content: string) => {
          mockFiles.set(path, content);
        }),
        readDirectory: vi.fn(async () => [
          { id: '1', name: 'README.md', path: 'C:/TestWorkspace/README.md', type: 'file' as const },
          {
            id: '2',
            name: 'src',
            path: 'C:/TestWorkspace/src',
            type: 'folder' as const,
            children: [
              { id: '3', name: 'main.ts', path: 'C:/TestWorkspace/src/main.ts', type: 'file' as const },
            ],
          },
        ]),
        openFile: vi.fn(),
        saveFileAs: vi.fn(),
        getDefaultAppsDir: vi.fn(async () => 'C:/AppData/Panel Apps'),
        exportWorkspace: vi.fn(async () => '{}'),
        importWorkspace: vi.fn(async () => true),
      },
      clipboard: {
        readText: vi.fn(async () => ''),
        writeText: vi.fn(async () => {}),
      },
      window: {
        minimize: vi.fn(async () => {}),
        toggleMaximize: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
        isMaximized: vi.fn(async () => false),
        setTitle: vi.fn(async () => {}),
      },
      platform: {
        os: 'windows',
        version: '10.0',
        isDesktop: true,
        isWeb: false,
        isMobile: false,
      },
    };

    bus = new HostCommandBus(mockBridge);

    // Reset stores
    useTabStore.setState({
      tabs: [
        {
          id: 'tab-1',
          title: 'Document 1',
          content: 'Hello World from Document 1',
          language: 'markdown',
          isDirty: false,
          filePath: 'C:/TestWorkspace/doc1.md',
          folderPath: null,
        },
      ],
      activeTabId: 'tab-1',
    });

    useNotificationStore.setState({ notifications: [] });

    useTemplateStore.setState({
      templates: [
        {
          id: 'tpl-1',
          name: 'Greeting Template',
          description: 'Generates a greeting',
          content: 'Hello {{NAME}}, welcome to {{APP}}!',
          category: 'Text',
          variables: ['NAME', 'APP'],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
    });

    useActionStore.setState({
      actions: [
        {
          id: 'action-upper',
          name: 'Uppercase Transform',
          code: 'return input.toUpperCase();',
          enabled: true,
        },
      ],
    });
  });

  describe('Boundary Schema & Security Validation', () => {
    it('validates a well-formed RPC request', () => {
      const parsed = validateRpcRequest({
        id: 'req_1_123',
        domain: 'editor',
        action: 'getSelection',
        appId: 'test-app-1',
        payload: {},
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.domain).toBe('editor');
        expect(parsed.data.action).toBe('getSelection');
      }
    });

    it('rejects an RPC request with invalid or missing domain', () => {
      const parsed = validateRpcRequest({
        id: 'req_1_123',
        domain: 'unauthorized_kernel_domain',
        action: 'execute',
        appId: 'test-app-1',
      });
      expect(parsed.success).toBe(false);
    });

    it('strictly detects and rejects path traversal sequences', () => {
      expect(pathIsAbsoluteOrSensitive('../secret.txt')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('foo/../../bar.txt')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('C:/Windows/System32')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('/etc/passwd')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('.env')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('.env.local')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('.git/config')).toBe(true);
      expect(pathIsAbsoluteOrSensitive('.ssh/id_rsa')).toBe(true);

      // Safe relative paths
      expect(pathIsAbsoluteOrSensitive('notes/meeting.md')).toBe(false);
      expect(pathIsAbsoluteOrSensitive('src/components/App.tsx')).toBe(false);
      expect(pathIsAbsoluteOrSensitive('data.json')).toBe(false);
    });

    it('validates workspace read and write boundary schemas', () => {
      expect(validateWorkspaceReadFile({ relativePath: 'notes/doc.md' }).success).toBe(true);
      expect(validateWorkspaceReadFile({ relativePath: '../../etc/passwd' }).success).toBe(false);
      expect(validateWorkspaceWriteFile({ relativePath: 'test.md', content: 'test' }).success).toBe(true);
      expect(validateWorkspaceWriteFile({ relativePath: '..\\exploit.exe', content: 'malicious' }).success).toBe(false);
    });

    it('verifies path containment logic in isPathInsideRoot', () => {
      expect(isPathInsideRoot('C:/Projects/App', 'C:/Projects/App/src/index.ts')).toBe(true);
      expect(isPathInsideRoot('C:/Projects/App', 'C:/Projects/App')).toBe(true);
      expect(isPathInsideRoot('C:/Projects/App', 'C:/Projects/Other/index.ts')).toBe(false);
      expect(isPathInsideRoot('C:/Projects/App', 'C:/Windows/System32')).toBe(false);
    });
  });

  describe('Editor Domain Handlers', () => {
    it('returns empty string if no selection is active', async () => {
      const response = await bus.handleRequest({
        id: 'r1',
        domain: 'editor',
        action: 'getSelection',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      expect(response.data).toBe('');
    });

    it('retrieves active document metadata', async () => {
      const response = await bus.handleRequest({
        id: 'r2',
        domain: 'editor',
        action: 'getActiveDocument',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const doc = response.data as { title: string; content: string; language: string; isDirty: boolean };
      expect(doc.title).toBe('Document 1');
      expect(doc.content).toBe('Hello World from Document 1');
      expect(doc.language).toBe('markdown');
    });

    it('appends text to the active document', async () => {
      const response = await bus.handleRequest({
        id: 'r3',
        domain: 'editor',
        action: 'insert',
        appId: 'app-1',
        payload: { text: '\n\nExtra note from app', mode: 'append' },
      });
      expect(response.success).toBe(true);
      const tab = useTabStore.getState().tabs.find((t) => t.id === 'tab-1');
      expect(tab?.content).toContain('Extra note from app');
    });

    it('sets and retrieves multi-cursor selections', async () => {
      // Invalid payload
      const errRes = await bus.handleRequest({
        id: 'r_sel_err',
        domain: 'editor',
        action: 'setSelections',
        appId: 'app-1',
        payload: { selections: [{ anchor: -1, head: -1 }] },
      });
      expect(errRes.success).toBe(false);
      expect(errRes.error?.code).toBe('VALIDATION_ERROR');

      // Valid payload
      const okRes = await bus.handleRequest({
        id: 'r_sel_ok',
        domain: 'editor',
        action: 'setSelections',
        appId: 'app-1',
        payload: {
          selections: [
            { anchor: 0, head: 5 },
            { anchor: 10, head: 15 },
          ],
        },
      });
      expect(okRes.success).toBe(true);

      const getRes = await bus.handleRequest({
        id: 'r_sel_get',
        domain: 'editor',
        action: 'getSelections',
        appId: 'app-1',
      });
      expect(getRes.success).toBe(true);
      expect(Array.isArray(getRes.data)).toBe(true);
    });

    it('handles fold commands and validates options', async () => {
      const errRes = await bus.handleRequest({
        id: 'r_fold_err',
        domain: 'editor',
        action: 'fold',
        appId: 'app-1',
        payload: { line: -5 },
      });
      expect(errRes.success).toBe(false);
      expect(errRes.error?.code).toBe('VALIDATION_ERROR');

      const okRes = await bus.handleRequest({
        id: 'r_fold_ok',
        domain: 'editor',
        action: 'fold',
        appId: 'app-1',
        payload: { all: true, unfold: false },
      });
      expect(okRes.success).toBe(true);

      // Test fold aliases per FIND-12
      const foldRangeRes = await bus.handleRequest({
        id: 'r_fold_range',
        domain: 'editor',
        action: 'foldRange',
        appId: 'app-1',
        payload: { line: 1 },
      });
      expect(foldRangeRes.success).toBe(true);

      const unfoldAllRes = await bus.handleRequest({
        id: 'r_unfold_all',
        domain: 'editor',
        action: 'unfoldAll',
        appId: 'app-1',
      });
      expect(unfoldAllRes.success).toBe(true);
    });

    it('sets and clears diagnostic markers with boundary validation', async () => {
      const errRes = await bus.handleRequest({
        id: 'r_diag_err',
        domain: 'editor',
        action: 'setDiagnostics',
        appId: 'app-1',
        payload: { diagnostics: [{ from: 10, to: 5, severity: 'error', message: 'Wrong order' }] },
      });
      expect(errRes.success).toBe(false);
      expect(errRes.error?.code).toBe('VALIDATION_ERROR');

      const okRes = await bus.handleRequest({
        id: 'r_diag_ok',
        domain: 'editor',
        action: 'setDiagnostics',
        appId: 'app-1',
        payload: {
          diagnostics: [
            { from: 0, to: 5, severity: 'error', message: 'Syntax error' },
            { from: 10, to: 15, severity: 'warning', message: 'Unused variable' },
          ],
        },
      });
      expect(okRes.success).toBe(true);

      const clearRes = await bus.handleRequest({
        id: 'r_diag_clear',
        domain: 'editor',
        action: 'clearDiagnostics',
        appId: 'app-1',
      });
      expect(clearRes.success).toBe(true);
    });

    it('replaces range and validates required numeric bounds', async () => {
      const errRes = await bus.handleRequest({
        id: 'r_replace_err',
        domain: 'editor',
        action: 'replaceRange',
        appId: 'app-1',
        payload: { from: 'bad', to: 5, text: 'hello' },
      });
      expect(errRes.success).toBe(false);
      expect(errRes.error?.code).toBe('VALIDATION_ERROR');

      const okRes = await bus.handleRequest({
        id: 'r_replace_ok',
        domain: 'editor',
        action: 'replaceRange',
        appId: 'app-1',
        payload: { from: 0, to: 5, text: 'Greetings' },
      });
      expect(okRes.success).toBe(true);
    });
  });

  describe('Tabs Domain Handlers', () => {
    it('lists all open tabs with summary info', async () => {
      const response = await bus.handleRequest({
        id: 'r4',
        domain: 'tabs',
        action: 'list',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const list = response.data as Array<{ id: string; title: string }>;
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('tab-1');
      expect(list[0].title).toBe('Document 1');
    });

    it('creates a new document tab', async () => {
      const response = await bus.handleRequest({
        id: 'r5',
        domain: 'tabs',
        action: 'create',
        appId: 'app-1',
        payload: {
          title: 'Generated Report.md',
          content: '# Generated Analysis\nData goes here...',
          language: 'markdown',
        },
      });
      expect(response.success).toBe(true);
      const { tabId } = response.data as { tabId: string };
      expect(tabId).toBeDefined();

      const tabs = useTabStore.getState().tabs;
      expect(tabs.length).toBe(2);
      expect(tabs.some((t) => t.id === tabId && t.title === 'Generated Report.md')).toBe(true);
    });

    it('focuses an existing tab by ID', async () => {
      const newTabId = useTabStore.getState().createTab('Second Tab', 'Content 2');
      expect(useTabStore.getState().activeTabId).toBe(newTabId);

      const response = await bus.handleRequest({
        id: 'r6',
        domain: 'tabs',
        action: 'focus',
        appId: 'app-1',
        payload: { tabId: 'tab-1' },
      });
      expect(response.success).toBe(true);
      expect(useTabStore.getState().activeTabId).toBe('tab-1');
    });
  });

  describe('Workspace Domain Handlers', () => {
    beforeEach(() => {
      mockStorageData.set('contextpad_workspace_path', 'C:/TestWorkspace');
      mockFiles.set('C:/TestWorkspace/notes/todo.md', '- [ ] Complete FG-16');
    });

    it('returns workspace info including root path and project name', async () => {
      const response = await bus.handleRequest({
        id: 'r7',
        domain: 'workspace',
        action: 'getInfo',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const info = response.data as { rootPath: string; projectName: string };
      expect(info.rootPath).toBe('C:/TestWorkspace');
      expect(info.projectName).toBe('TestWorkspace');
    });

    it('lists relative files within the workspace root', async () => {
      const response = await bus.handleRequest({
        id: 'r8',
        domain: 'workspace',
        action: 'listFiles',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const files = response.data as string[];
      expect(files).toContain('README.md');
      expect(files).toContain('src/main.ts');
    });

    it('reads file content inside workspace root', async () => {
      const response = await bus.handleRequest({
        id: 'r9',
        domain: 'workspace',
        action: 'readFile',
        appId: 'app-1',
        payload: { relativePath: 'notes/todo.md' },
      });
      expect(response.success).toBe(true);
      const { content } = response.data as { content: string };
      expect(content).toBe('- [ ] Complete FG-16');
    });

    it('rejects reading files outside workspace root with PATH_TRAVERSAL error', async () => {
      const response = await bus.handleRequest({
        id: 'r10',
        domain: 'workspace',
        action: 'readFile',
        appId: 'app-1',
        payload: { relativePath: '../../Windows/System32/drivers/etc/hosts' },
      });
      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });

    it('saves a clean file to disk when no dirty tab is open', async () => {
      const response = await bus.handleRequest({
        id: 'r11',
        domain: 'workspace',
        action: 'writeFile',
        appId: 'app-1',
        payload: { relativePath: 'output/result.txt', content: 'Processed Data 123' },
      });
      expect(response.success).toBe(true);
      expect(mockFiles.get('C:/TestWorkspace/output/result.txt')).toBe('Processed Data 123');
    });

    it('mediates write to tab buffer directly when target file is open and dirty', async () => {
      useTabStore.setState({
        tabs: [
          {
            id: 'tab-dirty',
            title: 'doc1.md',
            content: 'Original in-flight typing...',
            language: 'markdown',
            isDirty: true,
            filePath: 'C:/TestWorkspace/doc1.md',
            folderPath: null,
          },
        ],
        activeTabId: 'tab-dirty',
      });

      const response = await bus.handleRequest({
        id: 'r12',
        domain: 'workspace',
        action: 'writeFile',
        appId: 'app-1',
        payload: { relativePath: 'doc1.md', content: 'New content from panel app' },
      });

      expect(response.success).toBe(true);
      const result = response.data as { writtenTo: string; tabId: string };
      expect(result.writtenTo).toBe('tab_buffer');
      expect(result.tabId).toBe('tab-dirty');

      // Verify the tab store buffer was updated
      const dirtyTab = useTabStore.getState().tabs.find((t) => t.id === 'tab-dirty');
      expect(dirtyTab?.content).toBe('New content from panel app');

      // Verify user received notification
      const notifs = useNotificationStore.getState().notifications;
      expect(notifs.some((n) => n.title === 'Editor Buffer Updated')).toBe(true);
    });
  });

  describe('Templates & Actions Domain Handlers', () => {
    it('lists templates from template store', async () => {
      const response = await bus.handleRequest({
        id: 'r13',
        domain: 'templates',
        action: 'list',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const templates = response.data as Array<{ id: string; name: string }>;
      expect(templates.length).toBe(1);
      expect(templates[0].id).toBe('tpl-1');
    });

    it('applies a template with user-provided variables', async () => {
      const response = await bus.handleRequest({
        id: 'r14',
        domain: 'templates',
        action: 'apply',
        appId: 'app-1',
        payload: {
          templateId: 'tpl-1',
          variables: { NAME: 'Alice', APP: 'ContextPad' },
        },
      });
      expect(response.success).toBe(true);
      const { content } = response.data as { content: string };
      expect(content).toBe('Hello Alice, welcome to ContextPad!');
    });

    it('lists actions from action store', async () => {
      const response = await bus.handleRequest({
        id: 'r15',
        domain: 'actions',
        action: 'list',
        appId: 'app-1',
      });
      expect(response.success).toBe(true);
      const actions = response.data as Array<{ id: string; name: string }>;
      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe('action-upper');
    });
  });

  describe('Notification Domain Handler', () => {
    it('dispatches a toast notification to useNotificationStore', async () => {
      const response = await bus.handleRequest({
        id: 'r16',
        domain: 'notify',
        action: 'notify',
        appId: 'app-1',
        payload: {
          type: 'success',
          title: 'Operation Finished',
          message: 'All tasks completed successfully.',
        },
      });
      expect(response.success).toBe(true);
      const { notificationId } = response.data as { notificationId: string };
      expect(notificationId).toBeDefined();

      const notifs = useNotificationStore.getState().notifications;
      expect(notifs.some((n) => n.id === notificationId && n.title === 'Operation Finished')).toBe(true);
    });
  });

  describe('Terminal Domain (FG-17 & RA-01/RA-09 Security)', () => {
    it('rejects external panel mini-apps from calling terminal domain (RA-01)', async () => {
      const res = await bus.handleRequest({
        id: 'req-term-untrusted',
        domain: 'terminal',
        action: 'spawn',
        appId: 'test-agent',
        payload: {
          id: 'agent-cli-1',
          name: 'CLI Agent',
          command: 'npm',
          args: ['run', 'lint']
        }
      });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FORBIDDEN');
    });

    it('rejects internal callers when experimental terminal bus is disabled (RA-09)', async () => {
      useSettingsStore.getState().updateSettings({
        enableExperimentalSettings: false,
        enableTerminalBus: false,
      });

      const res = await bus.handleRequest({
        id: 'req-term-disabled',
        domain: 'terminal',
        action: 'spawn',
        appId: 'internal',
        payload: {
          id: 'agent-cli-1',
          name: 'CLI Agent',
          command: 'npm',
          args: ['run', 'lint']
        }
      });
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe('FEATURE_DISABLED');
    });

    it('spawns, lists, sends input, and kills a terminal channel via internal RPC when enabled', async () => {
      useSettingsStore.getState().updateSettings({
        enableExperimentalSettings: true,
        enableTerminalBus: true,
      });

      // 1. Spawn channel
      const spawnRes = await bus.handleRequest({
        id: 'req-term-spawn',
        domain: 'terminal',
        action: 'spawn',
        appId: 'internal',
        payload: {
          id: 'agent-cli-1',
          name: 'CLI Agent',
          command: 'npm',
          args: ['run', 'lint']
        }
      });
      expect(spawnRes.success).toBe(true);

      // 2. List channels
      const listRes = await bus.handleRequest({
        id: 'req-term-list',
        domain: 'terminal',
        action: 'listChannels',
        appId: 'internal'
      });
      expect(listRes.success).toBe(true);
      const channels = listRes.data as Array<{ id: string; name: string }>;
      expect(channels.some(c => c.id === 'agent-cli-1')).toBe(true);

      // 3. Send Input
      const inputRes = await bus.handleRequest({
        id: 'req-term-input',
        domain: 'terminal',
        action: 'sendInput',
        appId: 'internal',
        payload: {
          channelId: 'agent-cli-1',
          data: 'y\n'
        }
      });
      expect(inputRes.success).toBe(true);

      // 4. Kill channel
      const killRes = await bus.handleRequest({
        id: 'req-term-kill',
        domain: 'terminal',
        action: 'kill',
        appId: 'internal',
        payload: {
          channelId: 'agent-cli-1'
        }
      });
      expect(killRes.success).toBe(true);
    });
  });

  describe('Client SDK Polyfill Generation & Resilience', () => {
    it('generates the client SDK script containing all domain APIs and convenience aliases', () => {
      const sdkCode = buildClientSdkInjection('my-custom-app-123');
      expect(sdkCode).toContain("appId: 'my-custom-app-123'");
      expect(sdkCode).toContain('window.CNTXT.call = callHost;');
      expect(sdkCode).toContain('window.CNTXT.editor');
      expect(sdkCode).toContain('insertText: function');
      expect(sdkCode).toContain('setSelections: function');
      expect(sdkCode).toContain('getSelections: function');
      expect(sdkCode).toContain('fold: function');
      expect(sdkCode).toContain('setDiagnostics: function');
      expect(sdkCode).toContain('clearDiagnostics: function');
      expect(sdkCode).toContain('replaceRange: function');
      expect(sdkCode).toContain('foldRange: function');
      expect(sdkCode).toContain('unfoldRange: function');
      expect(sdkCode).toContain('foldAll: function');
      expect(sdkCode).toContain('unfoldAll: function');

      // Exercise validateRestGatewayConfig (FIND-14)
      const validConfig = validateRestGatewayConfig({ enabled: true, port: 9876, authToken: 'tok_123' });
      expect(validConfig.success).toBe(true);
      expect(sdkCode).toContain('window.CNTXT.tabs');
      expect(sdkCode).toContain('openFile: function');
      expect(sdkCode).toContain('window.CNTXT.workspace');
      expect(sdkCode).toContain('window.CNTXT.templates');
      expect(sdkCode).toContain('window.CNTXT.actions');
      expect(sdkCode).toContain('window.CNTXT.notify');
      expect(sdkCode).toContain('window.CNTXT.ui');
      expect(sdkCode).toContain('showToast: function');
      expect(sdkCode).not.toContain('window.CNTXT.terminal');
      expect(sdkCode).toContain('window.CNTXT.state');
      expect(sdkCode).toContain('window.CNTXT.ready');
    });

    it('filters listFiles by subfolder when folder is passed', async () => {
      mockStorageData.set('contextpad_workspace_path', 'C:/TestWorkspace');
      mockBridge.fs.readDirectory = vi.fn(async () => [
        { id: '1', name: 'c1.md', path: 'C:/TestWorkspace/notes/cards/c1.md', type: 'file' as const },
        { id: '2', name: 'c2.md', path: 'C:/TestWorkspace/notes/cards/c2.md', type: 'file' as const },
        { id: '3', name: 'doc.md', path: 'C:/TestWorkspace/other/doc.md', type: 'file' as const },
      ]);

      const response = await bus.handleRequest({
        id: 'r_list_filter',
        domain: 'workspace',
        action: 'listFiles',
        appId: 'app-1',
        payload: { folder: 'notes/cards' },
      });

      expect(response.success).toBe(true);
      const files = response.data as string[];
      expect(files).toContain('notes/cards/c1.md');
      expect(files).toContain('notes/cards/c2.md');
      expect(files).not.toContain('other/doc.md');
    });

    it('falls back to getDefaultAppsDir when contextpad_workspace_path is empty', async () => {
      mockStorageData.delete('contextpad_workspace_path');
      mockFiles.set('C:/AppData/Panel Apps/saved_note.md', 'Fallback content');

      const readRes = await bus.handleRequest({
        id: 'r_fallback_read',
        domain: 'workspace',
        action: 'readFile',
        appId: 'app-1',
        payload: { relativePath: 'saved_note.md' },
      });

      expect(readRes.success).toBe(true);
      const { content } = readRes.data as { content: string };
      expect(content).toBe('Fallback content');
    });
  });
  describe('12. Directives & Capabilities Domain (Improvements 2, 4, 5)', () => {
    it('returns complete capabilities manifest and structured directives on directives.get', async () => {
      const response = await bus.handleRequest({
        id: 'r_dir_1',
        domain: 'directives',
        action: 'get',
        appId: 'rest_gateway',
        payload: {},
      });

      expect(response.success).toBe(true);
      const data = response.data as any;
      expect(data.capabilities.status).toBe('ok');
      expect(data.capabilities.rpcDomains.length).toBeGreaterThan(0);
      expect(data.capabilities.restEndpoints.length).toBeGreaterThan(0);
      expect(data.directives.systemDirective).toContain('CNTXT Rich Containers');
      expect(data.guideMarkdown).toContain('# CNTXT AI Agent Integration & Governance Protocol');
    });

    it('supports format: "markdown" to return markdown guide directly', async () => {
      const response = await bus.handleRequest({
        id: 'r_dir_2',
        domain: 'directives',
        action: 'get',
        appId: 'agent-1',
        payload: { format: 'markdown' },
      });

      expect(response.success).toBe(true);
      const data = response.data as any;
      expect(data.guideMarkdown).toContain('# CNTXT AI Agent Integration & Governance Protocol');
      expect(data.capabilities).toBeUndefined();
    });

    it('returns raw markdown guide on directives.getGuide', async () => {
      const response = await bus.handleRequest({
        id: 'r_dir_3',
        domain: 'directives',
        action: 'getGuide',
        appId: 'agent-1',
        payload: {},
      });

      expect(response.success).toBe(true);
      const data = response.data as any;
      expect(data.guideMarkdown).toContain('Mandatory Rich Container Deliverable Wrapping');
    });

    it('rejects invalid format with VALIDATION_ERROR', async () => {
      const response = await bus.handleRequest({
        id: 'r_dir_4',
        domain: 'directives',
        action: 'get',
        appId: 'agent-1',
        payload: { format: 'invalid_format' },
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns NOT_FOUND for unknown directives action', async () => {
      const response = await bus.handleRequest({
        id: 'r_dir_5',
        domain: 'directives',
        action: 'unknownAction',
        appId: 'agent-1',
        payload: {},
      });

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
    });
  });
});

