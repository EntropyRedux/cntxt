import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostCommandBus, isPathInsideRoot } from '../src/features/panelApps/rpc/hostCommandBus';
import { buildClientSdkInjection } from '../src/features/panelApps/rpc/clientSdk';
import {
  validateRpcRequest,
  validateWorkspaceReadFile,
  validateWorkspaceWriteFile,
  pathIsAbsoluteOrSensitive,
} from '../src/contracts/boundarySchemas';
import { useTabStore } from '../src/store/tabStore';
import { useNotificationStore } from '../src/store/notificationStore';
import { useTemplateStore } from '../src/store/templateStore';
import { useActionStore } from '../src/store/actionStore';
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

  describe('Terminal Domain (FG-17)', () => {
    it('spawns, lists, sends input, and kills a terminal channel via RPC', async () => {
      // 1. Spawn channel
      const spawnRes = await bus.handleRequest({
        id: 'req-term-spawn',
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
      expect(spawnRes.success).toBe(true);

      // 2. List channels
      const listRes = await bus.handleRequest({
        id: 'req-term-list',
        domain: 'terminal',
        action: 'listChannels',
        appId: 'test-agent'
      });
      expect(listRes.success).toBe(true);
      const channels = listRes.data as Array<{ id: string; name: string }>;
      expect(channels.some(c => c.id === 'agent-cli-1')).toBe(true);

      // 3. Send Input
      const inputRes = await bus.handleRequest({
        id: 'req-term-input',
        domain: 'terminal',
        action: 'sendInput',
        appId: 'test-agent',
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
        appId: 'test-agent',
        payload: {
          channelId: 'agent-cli-1'
        }
      });
      expect(killRes.success).toBe(true);
    });
  });

  describe('Client SDK Polyfill Generation', () => {
    it('generates the client SDK script containing all domain APIs', () => {
      const sdkCode = buildClientSdkInjection('my-custom-app-123');
      expect(sdkCode).toContain("appId: 'my-custom-app-123'");
      expect(sdkCode).toContain('window.CNTXT.call = callHost;');
      expect(sdkCode).toContain('window.CNTXT.editor');
      expect(sdkCode).toContain('window.CNTXT.tabs');
      expect(sdkCode).toContain('window.CNTXT.workspace');
      expect(sdkCode).toContain('window.CNTXT.templates');
      expect(sdkCode).toContain('window.CNTXT.actions');
      expect(sdkCode).toContain('window.CNTXT.notify');
      expect(sdkCode).toContain('window.CNTXT.terminal');
      expect(sdkCode).toContain('window.CNTXT.state');
      expect(sdkCode).toContain('window.CNTXT.ready');
    });
  });
});

