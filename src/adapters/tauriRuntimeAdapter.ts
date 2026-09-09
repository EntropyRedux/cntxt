/**
 * Tauri v2 Desktop Runtime Adapter
 * Implements IRuntimeBridge for production native desktop apps.
 *
 * All platform capabilities are backed by custom Rust commands exposed
 * through the Tauri invoke bridge (no third-party plugins required).
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
  private appVersion: string | null = null;

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

  private detectPlatform(): 'web' | 'macos' | 'windows' | 'linux' {
    const p = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase();
    if (p.includes('mac')) return 'macos';
    if (p.includes('win')) return 'windows';
    if (p.includes('linux')) return 'linux';
    return 'web';
  }

  private async resolveAppVersion(): Promise<string> {
    if (this.appVersion) return this.appVersion;
    const info = await this.invokeTauri<{ version?: string }>('get_app_info');
    if (info && typeof info.version === 'string' && info.version) {
      this.appVersion = info.version;
      return info.version;
    }
    return '0.1.0';
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

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        const selectedPath = await this.invokeTauri<string>('open_file_dialog');
        if (!selectedPath) return null;

        const content = await this.invokeTauri<string>('read_file', { path: selectedPath });
        if (content === null) return null;

        const filename = selectedPath.split(/[/\\]/).pop() || 'Untitled';

        const detected = await this.invokeTauri<string>('detect_language_from_path', { path: selectedPath });
        const language = (detected as SupportedLanguage) || this.detectLanguage(filename);

        return {
          name: filename,
          path: selectedPath,
          content,
          language
        };
      } catch (err) {
        console.error('[TauriRuntimeAdapter] openFile error:', err);
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      try {
        const result = await this.invokeTauri('write_file', { path, content });
        return result !== null;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFile error:', err);
        return false;
      }
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      try {
        const savePath = await this.invokeTauri<string>('save_file_dialog', { defaultName: suggestedName });
        if (!savePath) return null;

        const result = await this.invokeTauri('write_file', { path: savePath, content });
        if (result === null) return null;

        return savePath;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFileAs error:', err);
        return null;
      }
    },

    exportWorkspace: async (): Promise<string> => {
      const keys = Object.values(STORAGE_KEYS);
      const backup: Record<string, any> = {
        version: await this.resolveAppVersion(),
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
    newWindow: async (): Promise<boolean> => {
      const result = await this.invokeTauri('new_window');
      return result !== null;
    },
    minimize: async (): Promise<void> => {
      await this.invokeTauri('minimize_window');
    },
    maximize: async (): Promise<void> => {
      await this.invokeTauri('maximize_window');
    },
    close: async (): Promise<void> => {
      await this.invokeTauri('confirm_close');
    },
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' => {
      return this.detectPlatform();
    }
  };

  public clipboard: IClipboardBridge = {
    readText: async (): Promise<string> => {
      const result = await this.invokeTauri<string>('clipboard_read_text');
      if (result !== null) return result;
      if (navigator.clipboard && navigator.clipboard.readText) {
        return navigator.clipboard.readText();
      }
      return '';
    },
    writeText: async (text: string): Promise<boolean> => {
      try {
        const result = await this.invokeTauri('clipboard_write_text', { text });
        if (result !== null) return true;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (err) {
        console.error('[TauriRuntimeAdapter] writeText error:', err);
      }
      return false;
    }
  };

  public storage: IStorageBridge = {
    getItem: async (key: string): Promise<string | null> => {
      const val = await this.invokeTauri<string | null>('kv_get', { key });
      if (val !== null) return val;
      return this.inMemoryFallback.get(key) ?? null;
    },
    setItem: async (key: string, value: string): Promise<boolean> => {
      const res = await this.invokeTauri('kv_set', { key, value });
      if (res !== null) return true;
      this.inMemoryFallback.set(key, value);
      return true;
    },
    removeItem: async (key: string): Promise<boolean> => {
      const res = await this.invokeTauri('kv_remove', { key });
      if (res !== null) return true;
      this.inMemoryFallback.delete(key);
      return true;
    },
    hasItem: async (key: string): Promise<boolean> => {
      const res = await this.invokeTauri<boolean>('kv_has', { key });
      if (res !== null) return res;
      return this.inMemoryFallback.has(key);
    }
  };

  public platform: IPlatformBridge = {
    os: this.detectPlatform() as 'macos' | 'windows' | 'linux' | 'web',
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints > 0)),
    isMac: (typeof navigator !== 'undefined' ? navigator.platform.toUpperCase().indexOf('MAC') >= 0 : false),
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