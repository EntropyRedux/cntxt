/**
 * Tauri v2 Desktop Runtime Adapter
 * Implements IRuntimeBridge for production native desktop apps.
 * Direct bridge to custom Tauri commands registered in src-tauri/src/main.rs.
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
  BridgeDirectoryEntry, 
  SupportedLanguage 
} from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from './storageKeys';
import { applyThemeTokensToElement } from '../../theme/index';
import { ThemeName } from '../ui-contract/themeContract';
import { getCurrentWindow } from '@tauri-apps/api/window';


export class TauriRuntimeAdapter implements IRuntimeBridge {
  private inMemoryFallback: Map<string, string> = new Map();
  private sessionToken: string | null = null;

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

  public async getSessionToken(): Promise<string> {
    if (this.sessionToken) return this.sessionToken;
    try {
      const info = await this.invokeTauri<{ session_id?: string }>('get_app_info');
      if (info?.session_id) {
        this.sessionToken = info.session_id;
        return this.sessionToken;
      }
    } catch (e) {
      console.warn('[TauriRuntimeAdapter] Failed to get session token:', e);
    }
    return '';
  }

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        const selectedPath = await this.invokeTauri<string | null>('open_file_dialog');
        if (!selectedPath) return null;

        const content = await this.invokeTauri<string>('read_file', { path: selectedPath });
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
        const selectedPath = await this.invokeTauri<string | null>('open_folder_dialog');
        if (!selectedPath) return null;

        const rawEntries = await this.invokeTauri<any[]>('read_directory', { path: selectedPath }) || [];
        const mapFileNodes = (nodes: any[]): BridgeDirectoryEntry[] => {
          return nodes.map(node => ({
            id: node.path || `node_${Math.random().toString(36).substr(2, 7)}`,
            name: node.name,
            type: (node.is_dir ? 'folder' : 'file') as 'file' | 'folder',
            path: node.path,
            language: node.is_dir ? undefined : this.detectLanguage(node.name),
            children: node.children ? mapFileNodes(node.children) : undefined
          }));
        };

        const entries = mapFileNodes(rawEntries);
        const filename = selectedPath.split(/[/\\]/).pop() || 'Workspace';
        return {
          name: filename,
          path: selectedPath,
          entries
        };
      } catch (err) {
        console.error('[TauriRuntimeAdapter] openDirectory error:', err);
        return null;
      }
    },

    readDirectory: async (path: string): Promise<BridgeDirectoryEntry[] | null> => {
      try {
        const rawEntries = await this.invokeTauri<any[]>('read_directory', { path });
        if (!rawEntries) return null;

        const mapFileNodes = (nodes: any[]): BridgeDirectoryEntry[] => {
          return nodes.map(node => ({
            id: node.path || `node_${Math.random().toString(36).substr(2, 7)}`,
            name: node.name,
            type: (node.is_dir ? 'folder' : 'file') as 'file' | 'folder',
            path: node.path,
            language: node.is_dir ? undefined : this.detectLanguage(node.name),
            children: node.children ? mapFileNodes(node.children) : undefined
          }));
        };

        return mapFileNodes(rawEntries);
      } catch (err) {
        console.error('[TauriRuntimeAdapter] readDirectory error:', err);
        return null;
      }
    },

    readFile: async (path: string): Promise<string | null> => {
      try {
        const content = await this.invokeTauri<string>('read_file', { path });
        return content;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] readFile error:', err);
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
        const savePath = await this.invokeTauri<string | null>('save_file_dialog', { defaultName: suggestedName });
        if (!savePath) return null;

        await this.invokeTauri('write_file', { path: savePath, content });
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
    newWindow: async (): Promise<boolean> => {
      try {
        await this.invokeTauri('new_window');
        return true;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] newWindow error:', err);
        return false;
      }
    },
    minimize: async (): Promise<void> => {
      await this.invokeTauri('minimize_window');
    },
    maximize: async (): Promise<void> => {
      await this.invokeTauri('maximize_window');
    },
    unmaximize: async (): Promise<void> => {
      await this.invokeTauri('unmaximize_window');
    },
    isMaximized: async (): Promise<boolean> => {
      try {
        return await this.invokeTauri<boolean>('is_maximized');
      } catch (err) {
        console.warn('[TauriRuntimeAdapter] isMaximized error:', err);
        return false;
      }
    },
    toggleMaximize: async (): Promise<void> => {
      try {
        const max = await this.invokeTauri<boolean>('is_maximized');
        if (max) {
          await this.invokeTauri('unmaximize_window');
        } else {
          await this.invokeTauri('maximize_window');
        }
      } catch (err) {
        console.error('[TauriRuntimeAdapter] toggleMaximize error:', err);
      }
    },
    startDragging: async (): Promise<void> => {
      try {
        // getCurrentWindow() is pre-imported at module load — no async gap
        // that would lose the synchronous mousedown gesture context.
        await getCurrentWindow().startDragging();
      } catch {
        // Fallback for secondary windows if capability isn't matched yet
        await this.invokeTauri('start_dragging');
      }
    },
    close: async (): Promise<void> => {
      await this.invokeTauri('close_window');
    },
    openDevTools: async (): Promise<void> => {
      await this.invokeTauri('open_devtools');
    },
    toggleDevTools: async (): Promise<void> => {
      await this.invokeTauri('toggle_devtools');
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
      const result = await this.invokeTauri<string>('clipboard_read_text');
      if (result !== null) return result;
      return navigator.clipboard.readText();
    },
    writeText: async (text: string): Promise<boolean> => {
      try {
        const result = await this.invokeTauri('clipboard_write_text', { text });
        if (result !== null) return true;
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] writeText error:', err);
        return false;
      }
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
    os: (() => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
      const p = typeof navigator !== 'undefined' ? navigator.platform.toLowerCase() : '';
      if (ua.includes('android')) return 'android';
      if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'windows';
    })(),
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints > 0)),
    isMac: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    isMobile: typeof window !== 'undefined' && (
      /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (('ontouchstart' in window || (navigator.maxTouchPoints > 0)) && window.innerWidth < 768)
    )
  };

  public theme: IThemeBridge = {
    applyTheme: (theme: string) => {
      if (typeof document !== 'undefined') {
        applyThemeTokensToElement(theme as ThemeName, document.documentElement);
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

  // Sensitive native operations requiring token verification
  public async deleteFile(path: string): Promise<boolean> {
    const token = await this.getSessionToken();
    const res = await this.invokeTauri('delete_file', { path, authToken: token });
    return res !== null;
  }

  public async openFileExplorer(path: string): Promise<boolean> {
    const token = await this.getSessionToken();
    const res = await this.invokeTauri('open_file_explorer', { path, authToken: token });
    return res !== null;
  }

  public async openExternalUrl(url: string): Promise<boolean> {
    const token = await this.getSessionToken();
    const res = await this.invokeTauri('open_external', { url, authToken: token });
    return res !== null;
  }
}
