/**
 * Mock Runtime Adapter
 * Implements IRuntimeBridge with pure in-memory state.
 * Useful for automated headless unit tests, SSR, or Storybook previews.
 */

import { 
  IRuntimeBridge, 
  IFileSystemBridge, 
  IWindowBridge, 
  IClipboardBridge, 
  IStorageBridge,
  IPlatformBridge,
  IThemeBridge,
  BridgeFileResult, 
  SupportedLanguage 
} from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from './storageKeys';

export class MockRuntimeAdapter implements IRuntimeBridge {
  public mockFiles: Map<string, { content: string; language: SupportedLanguage }> = new Map();
  public mockClipboard: string = '';
  public storageMap: Map<string, string> = new Map();
  public currentTheme: string = 'contextpad-dark';

  constructor() {
    this.mockFiles.set('demo.md', {
      content: '# Mock Document\nHello from MockRuntimeAdapter.',
      language: 'markdown'
    });
  }

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      const firstEntry = Array.from(this.mockFiles.entries())[0];
      if (!firstEntry) return null;
      return {
        name: firstEntry[0],
        path: `/mock/${firstEntry[0]}`,
        content: firstEntry[1].content,
        language: firstEntry[1].language
      };
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      this.mockFiles.set(path, { content, language: 'markdown' });
      return true;
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      this.mockFiles.set(suggestedName, { content, language: 'markdown' });
      return `/mock/${suggestedName}`;
    },

    exportWorkspace: async (): Promise<string> => {
      const data: Record<string, any> = {};
      for (const [k, v] of this.storageMap.entries()) {
        try {
          data[k] = JSON.parse(v);
        } catch {
          data[k] = v;
        }
      }
      return JSON.stringify({ version: '1.10.0', data }, null, 2);
    },

    importWorkspace: async (jsonData: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(jsonData);
        const data = parsed.data || parsed;
        for (const [k, v] of Object.entries(data)) {
          this.storageMap.set(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
        return true;
      } catch {
        return false;
      }
    }
  };

  public window: IWindowBridge = {
    isNative: false,
    newWindow: async (_url?: string): Promise<boolean> => {
      return true;
    },
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' => {
      return 'web';
    }
  };

  public clipboard: IClipboardBridge = {
    readText: async (): Promise<string> => {
      return this.mockClipboard;
    },
    writeText: async (text: string): Promise<boolean> => {
      this.mockClipboard = text;
      return true;
    }
  };

  public storage: IStorageBridge = {
    getItem: async (key: string): Promise<string | null> => {
      return this.storageMap.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<boolean> => {
      this.storageMap.set(key, value);
      return true;
    },
    removeItem: async (key: string): Promise<boolean> => {
      this.storageMap.delete(key);
      return true;
    },
    hasItem: async (key: string): Promise<boolean> => {
      return this.storageMap.has(key);
    }
  };

  public platform: IPlatformBridge = {
    os: 'web',
    isTouch: false,
    isMac: false,
    isMobile: false
  };

  public theme: IThemeBridge = {
    applyTheme: (theme: string) => {
      this.currentTheme = theme;
    },
    getEffectiveTheme: () => {
      return this.currentTheme;
    }
  };
}
