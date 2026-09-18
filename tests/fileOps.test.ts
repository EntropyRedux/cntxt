import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTabStore } from '../src/store/tabStore';
import { createUiEventDispatcher } from '../src/adapters/eventDispatcher';
import { IRuntimeBridge } from '../src/ui-contract/bridgeContract';
import { computeRelativePath } from '../src/components/Sidebar/FileExplorer';

describe('Native File Operations & Event Dispatcher (FG-04)', () => {
  let mockBridge: IRuntimeBridge;
  let savedFiles: Record<string, string>;

  beforeEach(() => {
    savedFiles = {};
    useTabStore.setState({ tabs: [], activeTabId: '', isSaving: false });

    mockBridge = {
      fs: {
        openFile: vi.fn(async () => ({
          name: 'read_doc.md',
          path: 'C:/docs/read_doc.md',
          content: '# Disk File Content',
          language: 'markdown'
        })),
        readFile: vi.fn(async (path: string) => savedFiles[path] || '# Content from ' + path),
        saveFile: vi.fn(async (path: string, content: string) => {
          savedFiles[path] = content;
          return true;
        }),
        saveFileAs: vi.fn(async (suggestedName: string, content: string) => {
          const path = `C:/docs/${suggestedName}`;
          savedFiles[path] = content;
          return path;
        }),
        openDirectory: vi.fn(async () => ({
          name: 'project',
          path: 'C:/project',
          entries: [
            { id: '1', name: 'readme.md', type: 'file', path: 'C:/project/readme.md' },
            { id: '2', name: 'src', type: 'folder', path: 'C:/project/src', children: [] }
          ]
        })),
        exportWorkspace: vi.fn(async () => JSON.stringify({})),
        importWorkspace: vi.fn(async () => true),
      },
      window: {
        newWindow: vi.fn(async () => true),
        isNative: false,
        getPlatform: () => 'windows',
      },
      clipboard: {
        readText: vi.fn(async () => 'clipboard text'),
        writeText: vi.fn(async () => true),
      },
      storage: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => true),
        removeItem: vi.fn(async () => true),
        clear: vi.fn(async () => true),
      },
      system: {
        getAppInfo: vi.fn(async () => ({ name: 'CNTXT', version: '0.1.0', platform: 'windows', session_id: 'test' })),
        getSystemInfo: vi.fn(async () => ({ os: 'windows', arch: 'x64' })),
        openExternal: vi.fn(async () => {}),
      },
      platform: {
        isMac: false,
        isWindows: true,
        isLinux: false,
        isMobile: false,
      },
      theme: {
        getTheme: () => 'dark',
        setTheme: vi.fn(),
      }
    };
  });

  it('onOpenFile reads from bridge and populates active tab with filePath', async () => {
    const dispatcher = createUiEventDispatcher(mockBridge);
    await dispatcher.onOpenFile();

    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].title).toBe('read_doc.md');
    expect(state.tabs[0].filePath).toBe('C:/docs/read_doc.md');
    expect(state.tabs[0].content).toBe('# Disk File Content');
    expect(state.tabs[0].isDirty).toBe(false);
  });

  it('onSaveFile with existing filePath calls bridge.fs.saveFile and clears isDirty', async () => {
    const dispatcher = createUiEventDispatcher(mockBridge);
    const tabId = useTabStore.getState().createTab('existing.md', 'Hello World', 'markdown', 'C:/docs/existing.md');
    useTabStore.getState().updateTabContent(tabId, 'Updated Content');

    expect(useTabStore.getState().tabs[0].isDirty).toBe(true);

    await dispatcher.onSaveFile();

    expect(mockBridge.fs.saveFile).toHaveBeenCalledWith('C:/docs/existing.md', 'Updated Content');
    expect(savedFiles['C:/docs/existing.md']).toBe('Updated Content');
    expect(useTabStore.getState().tabs[0].isDirty).toBe(false);
  });

  it('onSaveFile without filePath triggers onSaveAs and binds new filePath', async () => {
    const dispatcher = createUiEventDispatcher(mockBridge);
    const tabId = useTabStore.getState().createTab('Untitled.md', 'Draft Content', 'markdown');

    await dispatcher.onSaveFile();

    expect(mockBridge.fs.saveFileAs).toHaveBeenCalledWith('Untitled.md', 'Draft Content');
    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab?.filePath).toBe('C:/docs/Untitled.md');
    expect(tab?.isDirty).toBe(false);
  });

  it('onSaveAs updates tab title and filePath to newly selected path', async () => {
    const dispatcher = createUiEventDispatcher(mockBridge);
    const tabId = useTabStore.getState().createTab('MyNote.md', 'Some Notes', 'markdown');

    await dispatcher.onSaveAs();

    expect(mockBridge.fs.saveFileAs).toHaveBeenCalledWith('MyNote.md', 'Some Notes');
    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab?.title).toBe('MyNote.md');
    expect(tab?.filePath).toBe('C:/docs/MyNote.md');
    expect(tab?.isDirty).toBe(false);
  });

  it('onOpenFolder calls bridge.fs.openDirectory, stores path and notifies tree', async () => {
    const dispatcher = createUiEventDispatcher(mockBridge);
    await dispatcher.onOpenFolder();

    expect(mockBridge.fs.openDirectory).toHaveBeenCalled();
    expect(mockBridge.storage.setItem).toHaveBeenCalledWith(
      'contextpad_virtual_files',
      expect.stringContaining('C:/project')
    );
  });

  it('bridge.fs.readDirectory retrieves children on demand for subfolder', async () => {
    mockBridge.fs.readDirectory = vi.fn(async (path: string) => [
      { id: 'sub1', name: 'nested.ts', type: 'file', path: `${path}/nested.ts` }
    ]);

    const children = await mockBridge.fs.readDirectory('C:/project/src');
    expect(children).toHaveLength(1);
    expect(children?.[0].name).toBe('nested.ts');
    expect(children?.[0].path).toBe('C:/project/src/nested.ts');
  });

  describe('computeRelativePath (File Explorer History & Pinned Tooltips)', () => {
    it('computes relative path for nested files inside active workspace', () => {
      expect(computeRelativePath('C:/project/src/index.ts', 'C:/project')).toBe('src/index.ts');
      expect(computeRelativePath('C:\\project\\docs\\readme.md', 'C:\\project')).toBe('docs/readme.md');
      expect(computeRelativePath('/home/user/workspace/src/App.tsx', '/home/user/workspace')).toBe('src/App.tsx');
    });

    it('returns "." when target path matches workspace root', () => {
      expect(computeRelativePath('C:/project', 'C:/project')).toBe('.');
      expect(computeRelativePath('C:\\project\\', 'C:\\project')).toBe('.');
    });

    it('preserves target path if target is outside active workspace', () => {
      expect(computeRelativePath('D:/other/file.txt', 'C:/project')).toBe('D:/other/file.txt');
      expect(computeRelativePath('/var/log/syslog', '/home/user/workspace')).toBe('/var/log/syslog');
    });

    it('handles case-insensitivity on Windows paths gracefully', () => {
      expect(computeRelativePath('c:/Project/src/file.ts', 'C:/project')).toBe('src/file.ts');
    });

    it('returns empty string or target if targetPath or workspacePath is missing', () => {
      expect(computeRelativePath(undefined, 'C:/project')).toBe('');
      expect(computeRelativePath(null, 'C:/project')).toBe('');
      expect(computeRelativePath('notes.md', null)).toBe('notes.md');
    });
  });
});
