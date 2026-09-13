/**
 * Tauri v2 Desktop Runtime Adapter
 * Implements IRuntimeBridge for production native desktop apps.
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

export class TauriRuntimeAdapter implements IRuntimeBridge {
  private inMemoryFallback: Map<string, string> = new Map();

  constructor() {
    this.detectLanguage = this.detectLanguage.bind(this);
  }

  private detectLanguage(filename: string): SupportedLanguage {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'py':
        return 'python';
      case 'json':
        return 'json';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'text';
    }
  }

  private async invokeTauri<T>(cmd: string, args: Record<string, any> = {}): Promise<T | null> {
    try {
      const tauri = (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__;
      if (tauri && typeof tauri.invoke === 'function') {
        return await tauri.invoke(cmd, args);
      }
    } catch (e) {
      console.warn(`[TauriRuntimeAdapter] invoke(${cmd}) failed:`, e);
    }
    return null;
  }

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        const selectedPath = await this.invokeTauri<string | null>('plugin:dialog|open', {
          options: {
            multiple: false,
            filters: [{ name: 'Documents', extensions: ['md', 'txt', 'json', 'js', 'ts', 'py', 'html', 'css', 'yaml'] }]
          }
        });
        if (!selectedPath) return null;

        const content = await this.invokeTauri<string>('plugin:fs|read_text_file', { path: selectedPath });
        if (content === null) return null;

        const filename = selectedPath.split(/[/\\]/).pop() || 'Untitled';
        return {
          name: filename,
          path: selectedPath,
          content,
          language: this.detectLanguage(filename)
        };
      } catch (err) {
        console.error('[TauriRuntimeAdapter] openFile error:', err);
        return null;
      }
    },

    openDirectory: async () => {
      try {
        const selectedPath = await this.invokeTauri<string | null>('plugin:dialog|open', {
          options: {
            directory: true,
            multiple: false
          }
        });
        if (!selectedPath) return null;
        const filename = selectedPath.split(/[/\\]/).pop() || 'Workspace';
        return {
          name: filename,
          path: selectedPath,
          entries: []
        };
      } catch (err) {
        console.error('[TauriRuntimeAdapter] openDirectory error:', err);
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      try {
        const result = await this.invokeTauri('plugin:fs|write_text_file', { path, contents: content });
        return result !== null;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFile error:', err);
        return false;
      }
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      try {
        const savePath = await this.invokeTauri<string | null>('plugin:dialog|save', {
          options: {
            defaultPath: suggestedName,
            filters: [{ name: 'Documents', extensions: ['md', 'txt', 'json'] }]
          }
        });
        if (!savePath) return null;

        await this.invokeTauri('plugin:fs|write_text_file', { path: savePath, contents: content });
        return savePath;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFileAs error:', err);
        return null;
      }
    },

    exportWorkspace: async (): Promise<string> => {
      const keys = Object.values(STORAGE_KEYS);
      const backup: Record<string, any> = {
        version: '1.10.0',
        exportedAt: new Date().toISOString(),
        data: {}
      };

      for (const key of keys) {
        const val = await this.storage.getItem(key);
        if (val) {
          try {
            backup.data[key] = JSON.parse(val);
          } catch {
            backup.data[key] = val;
          }
        }
      }

      return JSON.stringify(backup, null, 2);
    },

    importWorkspace: async (jsonData: string): Promise<boolean> => {
      try {
        const parsed = JSON.parse(jsonData);
        const data = parsed.data || parsed;
        for (const [key, val] of Object.entries(data)) {
          const strVal = typeof val === 'string' ? val : JSON.stringify(val);
          await this.storage.setItem(key, strVal);
        }
        return true;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] importWorkspace error:', err);
        return false;
      }
    }
  };

  public window: IWindowBridge = {
    isNative: true,
    newWindow: async (url?: string): Promise<boolean> => {
      try {
        await this.invokeTauri('plugin:window|create', {
          label: `window-${Date.now()}`,
          url: url || 'index.html'
        });
        return true;
      } catch {
        return false;
      }
    },
    minimize: async (): Promise<void> => {
      await this.invokeTauri('plugin:window|minimize');
    },
    maximize: async (): Promise<void> => {
      await this.invokeTauri('plugin:window|toggle_maximize');
    },
    close: async (): Promise<void> => {
      await this.invokeTauri('plugin:window|close');
    },
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' => {
      const p = navigator.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'linux';
    }
  };

  public clipboard: IClipboardBridge = {
    readText: async (): Promise<string> => {
      const result = await this.invokeTauri<string>('plugin:clipboard|read_text');
      if (result !== null) return result;
      return navigator.clipboard.readText();
    },
    writeText: async (text: string): Promise<boolean> => {
      try {
        const result = await this.invokeTauri('plugin:clipboard|write_text', { text });
        if (result !== null) return true;
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
  };

  public storage: IStorageBridge = {
    getItem: async (key: string): Promise<string | null> => {
      const val = await this.invokeTauri<string | null>('plugin:store|get', { key });
      if (val !== null) return val;
      return this.inMemoryFallback.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<boolean> => {
      const res = await this.invokeTauri('plugin:store|set', { key, value });
      if (res !== null) {
        await this.invokeTauri('plugin:store|save');
        return true;
      }
      this.inMemoryFallback.set(key, value);
      return true;
    },
    removeItem: async (key: string): Promise<boolean> => {
      const res = await this.invokeTauri('plugin:store|delete', { key });
      if (res !== null) {
        await this.invokeTauri('plugin:store|save');
        return true;
      }
      this.inMemoryFallback.delete(key);
      return true;
    },
    hasItem: async (key: string): Promise<boolean> => {
      const res = await this.invokeTauri<boolean>('plugin:store|has', { key });
      if (res !== null) return res;
      return this.inMemoryFallback.has(key);
    }
  };

  public platform: IPlatformBridge = {
    os: (() => {
      const p = navigator.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'linux';
    })(),
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints > 0)),
    isMac: navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    isMobile: false
  };

  public theme: IThemeBridge = {
    applyTheme: (theme: string) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
      }
    },
    getEffectiveTheme: () => {
      if (typeof document !== 'undefined') {
        return document.documentElement.getAttribute('data-theme') || 'contextpad-dark';
      }
      return 'contextpad-dark';
    }
  };
}
