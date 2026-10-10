import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockStoreAdd, mockStoreOpen, mockScanHtml } = vi.hoisted(() => ({
  mockStoreAdd: vi.fn(),
  mockStoreOpen: vi.fn(),
  mockScanHtml: vi.fn(),
}));

vi.mock('../src/features/panelApps/state/panelAppsStore', () => ({
  usePanelAppsStore: {
    getState: () => ({
      add: mockStoreAdd,
      open: mockStoreOpen,
    }),
  },
}));

vi.mock('../src/features/panelApps/preflight/scan', () => ({
  scanHtml: mockScanHtml,
}));

import { createPanelApp, newAppId, sanitizeFileName } from '../src/features/panelApps/services/createPanelApp';
import type { IRuntimeBridge } from '../src/ui-contract/bridgeContract';

function makeBridge(overrides: Partial<IRuntimeBridge> = {}): IRuntimeBridge {
  return {
    fs: {
      saveFile: vi.fn().mockResolvedValue(true),
      saveFileAs: vi.fn().mockResolvedValue('/fake/path/app-file.cntxt'),
      ...overrides.fs,
    } as any,
    window: { isNative: false } as any,
    clipboard: { readText: vi.fn(), writeText: vi.fn() } as any,
    storage: {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(true),
      removeItem: vi.fn().mockResolvedValue(true),
      ...overrides.storage,
    } as any,
    platform: { os: 'web' } as any,
    theme: { applyTheme: vi.fn() } as any,
    ...overrides,
  } as IRuntimeBridge;
}

const VALID_INPUT = {
  details: { name: 'Test App', icon: 'Layers', description: 'A test', network: 'offline' as const, panelWidth: 480 },
  html: '<div>Hello World</div>',
  createdFrom: 'tab' as const,
};

describe('createPanelApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScanHtml.mockReturnValue({ blocked: false, bytes: 0, externalRefs: [], offlineReady: true, contributors: [], findings: [] });
  });

  describe('newAppId', () => {
    it('generates an ID starting with lowercase letter', () => {
      const id = newAppId();
      expect(id).toMatch(/^[a-z]/);
    });

    it('generates IDs that match the schema regex', () => {
      const id = newAppId();
      expect(id).toMatch(/^[a-z][a-z0-9]{11,31}$/);
    });

    it('generates unique IDs', () => {
      const ids = new Set(Array.from({ length: 100 }, () => newAppId()));
      expect(ids.size).toBe(100);
    });
  });

  describe('sanitizeFileName', () => {
    it('strips invalid characters', () => {
      expect(sanitizeFileName('my<>:\"app\".html')).toBe('myapp.html');
    });

    it('truncates to 40 chars', () => {
      const longName = 'a'.repeat(100);
      expect(sanitizeFileName(longName).length).toBe(40);
    });

    it('defaults to "app" for empty name', () => {
      expect(sanitizeFileName('<>:\"')).toBe('app');
    });

    it('trims whitespace', () => {
      expect(sanitizeFileName('  hello  ')).toBe('hello');
    });

    it('preserves valid filename characters', () => {
      expect(sanitizeFileName('My App-123')).toBe('My App-123');
    });
  });

  describe('createPanelApp integration', () => {
    it('creates a panel app, writes file, and registers in store', async () => {
      const bridge = makeBridge();
      const result = await createPanelApp(VALID_INPUT, bridge);

      expect(result.manifest.id).toMatch(/^[a-z][a-z0-9]{11,31}$/);
      expect(result.manifest.name).toBe('Test App');
      expect(result.manifest.schemaVersion).toBe(1);
      expect(result.manifest.runtime).toBe('html');
      expect(result.manifest.network).toBe('offline');
      expect(result.manifest.panelWidth).toBe(480);
      expect(result.record.id).toBe(result.manifest.id);
      expect(result.filePath).toContain('Panel Apps');
      expect(result.filePath).toMatch(/\.cntxt$/);

      expect(bridge.fs.saveFile).toHaveBeenCalledTimes(1);
      const calls = (bridge.fs.saveFile as any).mock.calls[0];
      expect(calls[0]).toContain('Panel Apps');
      expect(calls[0]).toMatch(/\.cntxt$/);
      expect(calls[1]).toContain('Test App');
      expect(calls[1]).toContain('<div>Hello World</div>');

      expect(mockStoreAdd).toHaveBeenCalledTimes(1);
      expect(mockStoreOpen).toHaveBeenCalledWith(result.record.id);
    });

    it('uses provided workspacePath when given', async () => {
      const bridge = makeBridge();
      await createPanelApp(VALID_INPUT, bridge, '/workspace/dir');

            const [path] = (bridge.fs.saveFile as any).mock.calls[0];
      expect(path).toMatch(/\/workspace\/dir\/Panel Apps\/.+\.cntxt$/);
    });

    it('trims trailing slashes from workspacePath', async () => {
      const bridge = makeBridge();
      await createPanelApp(VALID_INPUT, bridge, '/workspace/dir///');

      const [path] = (bridge.fs.saveFile as any).mock.calls[0];
      expect(path).toMatch(/\/workspace\/dir\/Panel Apps\/.+\.cntxt$/);
    });

    it('handles workspacePath already ending with "Panel Apps"', async () => {
      const bridge = makeBridge();
      await createPanelApp(VALID_INPUT, bridge, '/workspace/Panel Apps');

      const [path] = (bridge.fs.saveFile as any).mock.calls[0];
      expect(path).toMatch(/^\/workspace\/Panel Apps\/.+\.cntxt$/);
    });

    it('throws when preflight blocks the HTML', async () => {
      mockScanHtml.mockReturnValue({ blocked: true });
      const bridge = makeBridge();

      await expect(createPanelApp(VALID_INPUT, bridge)).rejects.toThrow(
        'Panel App exceeds the hard 2MB size limit'
      );
    });

    it('falls back to saveFileAs when saveFile returns false', async () => {
      const bridge = makeBridge({
        fs: { saveFile: vi.fn().mockResolvedValue(false), saveFileAs: vi.fn().mockResolvedValue('/chosen/app-file.cntxt') },
      } as any);

      const result = await createPanelApp(VALID_INPUT, bridge);

      expect(bridge.fs.saveFile).toHaveBeenCalledTimes(1);
      expect(bridge.fs.saveFileAs).toHaveBeenCalledTimes(1);
      expect(result.filePath).toBe('/chosen/app-file.cntxt');
    });

    it('throws when both saveFile and saveFileAs fail', async () => {
      const bridge = makeBridge({
        fs: { saveFile: vi.fn().mockResolvedValue(false), saveFileAs: vi.fn().mockResolvedValue(null) },
      } as any);

      await expect(createPanelApp(VALID_INPUT, bridge)).rejects.toThrow(
        'Save was cancelled or failed to write file'
      );
    });

    it('trims name and description from input', async () => {
      const bridge = makeBridge();
      const input = {
        ...VALID_INPUT,
        details: { ...VALID_INPUT.details, name: '  Spaced App  ', description: '  Desc  ' },
      };
      const result = await createPanelApp(input, bridge);
      expect(result.manifest.name).toBe('Spaced App');
      expect(result.manifest.description).toBe('Desc');
    });

    it('defaults icon to Layers when empty', async () => {
      const bridge = makeBridge();
      const input = { ...VALID_INPUT, details: { ...VALID_INPUT.details, icon: '' } };
      const result = await createPanelApp(input, bridge);
      expect(result.manifest.icon).toBe('Layers');
    });

    it('uses getDefaultAppsDir when workspacePath is null and storage returns null', async () => {
      const bridge = makeBridge({
        storage: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn(), removeItem: vi.fn() },
        fs: { saveFile: vi.fn().mockResolvedValue(true), saveFileAs: vi.fn(), getDefaultAppsDir: vi.fn().mockResolvedValue('/default/apps') },
      } as any);

      await createPanelApp(VALID_INPUT, bridge);

      const [path] = (bridge.fs.saveFile as any).mock.calls[0];
      expect(path).toMatch(/^\/default\/apps\/Panel Apps\/.+\.cntxt$/);
    });

    it('uses relative path when no base dir available', async () => {
      const bridge = makeBridge({
        storage: { getItem: vi.fn().mockResolvedValue(null), setItem: vi.fn(), removeItem: vi.fn() },
        fs: { saveFile: vi.fn().mockResolvedValue(true), saveFileAs: vi.fn() },
      } as any);

      await createPanelApp(VALID_INPUT, bridge);

      const [path] = (bridge.fs.saveFile as any).mock.calls[0];
      expect(path).toMatch(/^Panel Apps\/.+\.cntxt$/);
    });

    it('registers record in store with correct fields', async () => {
      const bridge = makeBridge();
      const result = await createPanelApp(VALID_INPUT, bridge);

      expect(mockStoreAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: result.record.id,
          name: 'Test App',
          icon: 'Layers',
          network: 'offline',
          panelWidth: 480,
        }),
        bridge.storage
      );
    });

    it('opens record by id in store after creation', async () => {
      const bridge = makeBridge();
      const result = await createPanelApp(VALID_INPUT, bridge);

      expect(mockStoreOpen).toHaveBeenCalledWith(result.record.id);
    });
  });
});


