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
  BridgeFolderResult,
  BridgeDirectoryEntry, 
  SupportedLanguage,
  WindowResizeDirection,
  ITerminalBridge,
  TerminalChunkEvent,
  TerminalExitEvent,
  TerminalSpawnOptions,
  IRestGatewayBridge,
  IRestGatewayStatus
} from '../ui-contract/bridgeContract';
import { getHostCommandBus } from '../features/panelApps/rpc/hostCommandBus';
import { CntxtRpcRequest } from '../contracts/data_shapes';
import { STORAGE_KEYS } from './storageKeys';
import { applyThemeTokensToElement } from '../../theme/index';
import { ThemeName } from '../ui-contract/themeContract';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useNotificationStore } from '../store/notificationStore';

const CRITICAL_IPC_COMMANDS = ['read_file', 'write_file', 'delete_file', 'store_api_key', 'delete_api_key'];

let cachedSessionToken: string | null = null;

export async function getSessionToken(): Promise<string | null> {
  if (cachedSessionToken) return cachedSessionToken;
  if (typeof window !== 'undefined' && window.__CNTXT_SESSION_TOKEN__) {
    cachedSessionToken = window.__CNTXT_SESSION_TOKEN__;
    try {
      delete window.__CNTXT_SESSION_TOKEN__;
    } catch {
      window.__CNTXT_SESSION_TOKEN__ = undefined;
    }
    return cachedSessionToken;
  }
  try {
    if (window.__TAURI_INTERNALS__?.invoke) {
      cachedSessionToken = (await window.__TAURI_INTERNALS__.invoke('get_session_token')) as string;
    } else if (window.__TAURI__?.core?.invoke) {
      cachedSessionToken = (await window.__TAURI__.core.invoke('get_session_token')) as string;
    } else {
      const { invoke } = await import('@tauri-apps/api/core');
      cachedSessionToken = await invoke<string>('get_session_token');
    }
  } catch {
    // Session token recovery fallback
  }
  return cachedSessionToken;
}

export class TauriRuntimeAdapter implements IRuntimeBridge {
  private inMemoryFallback: Map<string, string> = new Map();
  private sessionToken: string | null = null;

  constructor() {
    this.detectLanguage = this.detectLanguage.bind(this);
    this.initRpcListener();
    if (typeof window !== 'undefined' && window.__CNTXT_SESSION_TOKEN__) {
      this.sessionToken = window.__CNTXT_SESSION_TOKEN__;
      cachedSessionToken = window.__CNTXT_SESSION_TOKEN__;
      try {
        delete window.__CNTXT_SESSION_TOKEN__;
      } catch {
        window.__CNTXT_SESSION_TOKEN__ = undefined;
      }
    }
  }

  protected detectLanguage(filename: string): SupportedLanguage {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'markdown':
      case 'cntxt':
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

  private async ensureSessionToken(): Promise<string | null> {
    if (this.sessionToken) return this.sessionToken;
    this.sessionToken = await getSessionToken();
    return this.sessionToken;
  }

  protected async invokeTauri<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T | null> {
    try {
      if (!this.sessionToken && cmd !== 'get_session_token') {
        await this.ensureSessionToken();
      }
      const mergedArgs = {
        sessionToken: this.sessionToken,
        ...args
      };
      if (window.__TAURI_INTERNALS__?.invoke) {
        return (await window.__TAURI_INTERNALS__.invoke(cmd, mergedArgs)) as T;
      }
      if (window.__TAURI__?.core?.invoke) {
        return (await window.__TAURI__.core.invoke(cmd, mergedArgs)) as T;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, mergedArgs);
    } catch (e: unknown) {
      console.warn(`[TauriRuntimeAdapter] invoke(${cmd}) failed:`, e);
      if (CRITICAL_IPC_COMMANDS.includes(cmd)) {
        const errorMsg = typeof e === 'string' ? e : (e as Error)?.message || `Operation ${cmd} failed`;
        useNotificationStore.getState().addNotification('System Error', errorMsg, 'error');
      }
    }
    return null;
  }

  protected async invokeTauriVoid(cmd: string, args: Record<string, unknown> = {}): Promise<boolean> {
    try {
      if (!this.sessionToken && cmd !== 'get_session_token') {
        await this.ensureSessionToken();
      }
      const mergedArgs = {
        sessionToken: this.sessionToken,
        ...args
      };
      if (window.__TAURI_INTERNALS__?.invoke) {
        await window.__TAURI_INTERNALS__.invoke(cmd, mergedArgs);
        return true;
      }
      if (window.__TAURI__?.core?.invoke) {
        await window.__TAURI__.core.invoke(cmd, mergedArgs);
        return true;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke(cmd, mergedArgs);
      return true;
    } catch (e: unknown) {
      console.warn(`[TauriRuntimeAdapter] invokeVoid(${cmd}) failed:`, e);
      if (CRITICAL_IPC_COMMANDS.includes(cmd)) {
        const errorMsg = typeof e === 'string' ? e : (e as Error)?.message || `Operation ${cmd} failed`;
        useNotificationStore.getState().addNotification('System Error', errorMsg, 'error');
      }
    }
    return false;
  }

  public async getSessionToken(): Promise<string> {
    return '';
  }

  public shareContent = async (_text: string): Promise<boolean> => {
    return false;
  };

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
        useNotificationStore.getState().addNotification('File Error', `Failed to open file: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    openDirectory: async () => {
      try {
        const selectedPath = await this.invokeTauri<string | null>('open_folder_dialog');
        if (!selectedPath) return null;

        interface TauriNode { name: string; path: string; is_dir?: boolean; children?: TauriNode[] }
        const rawEntries = await this.invokeTauri<TauriNode[]>('read_directory', { path: selectedPath }) || [];
        const mapFileNodes = (nodes: TauriNode[]): BridgeDirectoryEntry[] => {
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
        useNotificationStore.getState().addNotification('Directory Error', `Failed to open directory: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    readDirectory: async (path: string): Promise<BridgeDirectoryEntry[] | null> => {
      try {
        interface TauriNode { name: string; path: string; is_dir?: boolean; children?: TauriNode[] }
        const rawEntries = await this.invokeTauri<TauriNode[]>('read_directory', { path });
        if (!rawEntries) return null;

        interface TauriNode { name: string; path: string; is_dir?: boolean; children?: TauriNode[] }
        const mapFileNodes = (nodes: TauriNode[]): BridgeDirectoryEntry[] => {
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
        useNotificationStore.getState().addNotification('Directory Error', `Failed to read directory ${path}: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    readFile: async (path: string): Promise<string | null> => {
      try {
        return await this.invokeTauri<string>('read_file', { path });
      } catch (err) {
        console.error('[TauriRuntimeAdapter] readFile error:', err);
        useNotificationStore.getState().addNotification('File Error', `Failed to read file ${path}: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      try {
        return await this.invokeTauriVoid('write_file', { path, content });
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFile error:', err);
        useNotificationStore.getState().addNotification('Save Error', `Failed to save file ${path}: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return false;
      }
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      try {
        const savePath = await this.invokeTauri<string | null>('save_file_dialog', { defaultName: suggestedName });
        if (!savePath) return null;

        const writeSuccess = await this.invokeTauriVoid('write_file', { path: savePath, content });
        return writeSuccess ? savePath : null;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFileAs error:', err);
        useNotificationStore.getState().addNotification('Save Error', `Failed to save file: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    exportWorkspace: async (): Promise<string> => {
      const keys = Object.values(STORAGE_KEYS);
      const backup: { version: string; exportedAt: string; data: Record<string, unknown> } = {
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
        useNotificationStore.getState().addNotification('Import Error', `Failed to import workspace: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return false;
      }
    },

    getPendingFiles: async (): Promise<string[]> => {
      try {
        const files = await this.invokeTauri<string[]>('get_pending_files');
        return files || [];
      } catch (err) {
        console.error('[TauriRuntimeAdapter] getPendingFiles error:', err);
        useNotificationStore.getState().addNotification('Pending Files Error', `Failed to check pending files: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return [];
      }
    },

    onOpenFileRequested: (callback: (filePaths: string[]) => void): (() => void) => {
      let isUnmounted = false;
      let unlistenFn: (() => void) | null = null;

      // Use direct @tauri-apps/api/event import — works in both dev and production.
      import('@tauri-apps/api/event').then(({ listen }) => {
        if (isUnmounted) return;
        listen<string[]>('open-files', (event) => {
          if (Array.isArray(event.payload) && event.payload.length > 0) {
            callback(event.payload);
          }
        }).then((unlisten) => {
          if (isUnmounted) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        }).catch((err) => {
          console.error('[TauriRuntimeAdapter] listen open-files error:', err);
        });
      }).catch((err) => {
        console.error('[TauriRuntimeAdapter] load @tauri-apps/api/event error:', err);
      });

      return () => {
        isUnmounted = true;
        if (unlistenFn) {
          unlistenFn();
        }
      };
    },

    deleteFile: async (path: string): Promise<boolean> => {
      try {
        return await this.invokeTauriVoid('delete_file', { path });
      } catch (err) {
        console.error('[TauriRuntimeAdapter] deleteFile error:', err);
        useNotificationStore.getState().addNotification('Delete Error', `Failed to delete file ${path}: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return false;
      }
    },

    getDefaultAppsDir: async (): Promise<string | null> => {
      try {
        return await this.invokeTauri<string>('get_default_panel_apps_dir');
      } catch (err) {
        console.error('[TauriRuntimeAdapter] getDefaultAppsDir error:', err);
        useNotificationStore.getState().addNotification('System Error', `Failed to resolve default apps directory: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        return null;
      }
    },

    openFileExplorer: async (path: string): Promise<boolean> => {
      try {
        return await this.invokeTauriVoid('open_file_explorer', { path });
      } catch (err) {
        console.error('[TauriRuntimeAdapter] openFileExplorer error:', err);
        useNotificationStore.getState().addNotification('File Explorer Error', `Failed to reveal file in explorer: ${(err as Error)?.message || 'Unknown error'}`, 'error');
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
        useNotificationStore.getState().addNotification('Window Error', `Failed to open new window: ${(err as Error)?.message || 'Unknown error'}`, 'error');
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
        useNotificationStore.getState().addNotification('Window Error', `Failed to toggle window maximize state: ${(err as Error)?.message || 'Unknown error'}`, 'error');
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
    startResizeDragging: async (direction: WindowResizeDirection): Promise<void> => {
      try {
        await (getCurrentWindow().startResizeDragging as (dir: string) => Promise<void>)(direction);
      } catch (err) {
        console.warn('[TauriRuntimeAdapter] startResizeDragging error:', err);
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
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' | 'android' => {
      const p = navigator.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'linux';
    },
    reload: (): void => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
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
        const ok = await this.invokeTauriVoid('clipboard_write_text', { text });
        if (ok) return true;
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
      const ok = await this.invokeTauriVoid('kv_set', { key, value });
      if (ok) return true;
      this.inMemoryFallback.set(key, value);
      return true;
    },
    removeItem: async (key: string): Promise<boolean> => {
      const ok = await this.invokeTauriVoid('kv_remove', { key });
      if (ok) return true;
      this.inMemoryFallback.delete(key);
      return true;
    },
    hasItem: async (key: string): Promise<boolean> => {
      const res = await this.invokeTauri<boolean>('kv_has', { key });
      if (res !== null) return res;
      return this.inMemoryFallback.has(key);
    },
    onStorageChanged: (callback: (key: string) => void): (() => void) => {
      let isUnmounted = false;
      let unlistenFn: (() => void) | null = null;

      // Import from @tauri-apps/api/event directly — this works in both dev
      // and production builds. We avoid the __TAURI_INTERNALS__ guard which
      // is unreliable in production due to WebView2 initialization timing.
      const attach = () => {
        import('@tauri-apps/api/event').then(({ listen }) => {
          if (isUnmounted) return;
          listen<{ key: string }>('storage_changed', (event) => {
            if (event.payload?.key) {
              callback(event.payload.key);
            }
          }).then((unlisten) => {
            if (isUnmounted) {
              unlisten();
            } else {
              unlistenFn = unlisten;
            }
          }).catch((err) => {
            // If IPC isn't ready yet (production race), retry after 500ms
            if (!isUnmounted) {
              console.warn('[TauriRuntimeAdapter] storage_changed listen failed, retrying...', err);
              setTimeout(attach, 500);
            }
          });
        }).catch((err) => {
          console.error('[TauriRuntimeAdapter] load @tauri-apps/api/event error:', err);
        });
      };

      attach();

      return () => {
        isUnmounted = true;
        if (unlistenFn) {
          unlistenFn();
        }
      };
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
    ),
    consumeSharedText: () => null
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

  // Sensitive native operations with authorization and validation
  public async deleteFile(path: string): Promise<boolean> {
    return await this.invokeTauriVoid('delete_file', { path });
  }

  public async openFileExplorer(path: string): Promise<boolean> {
    return await this.invokeTauriVoid('open_file_explorer', { path });
  }

  public async openExternalUrl(url: string): Promise<boolean> {
    return await this.invokeTauriVoid('open_external', { url });
  }

  public terminal: ITerminalBridge = {
    isAvailable: (): boolean => {
      return typeof window !== 'undefined' && Boolean(
        window.isTauri || window.__TAURI_INTERNALS__ || window.__TAURI__
      );
    },
    spawn: async (options: TerminalSpawnOptions): Promise<string> => {
      const token = await this.ensureSessionToken();
      const res = await this.invokeTauri<string>('spawn_pty', {
        sessionToken: token,
        id: options.id,
        command: options.command,
        args: options.args || [],
        cwd: options.cwd,
        cols: options.cols,
        rows: options.rows
      });
      if (!res) {
        throw new Error(`Failed to spawn terminal process '${options.command}'`);
      }
      return res;
    },
    write: async (id: string, data: string): Promise<void> => {
      const token = await this.ensureSessionToken();
      await this.invokeTauri<void>('write_pty', {
        sessionToken: token,
        id,
        data
      });
    },
    resize: async (id: string, cols: number, rows: number): Promise<void> => {
      const token = await this.ensureSessionToken();
      await this.invokeTauri<void>('resize_pty', {
        sessionToken: token,
        id,
        cols,
        rows
      });
    },
    kill: async (id: string): Promise<void> => {
      const token = await this.ensureSessionToken();
      await this.invokeTauri<void>('kill_pty', {
        sessionToken: token,
        id
      });
    },
    listSessions: async (): Promise<string[]> => {
      const token = await this.ensureSessionToken();
      const sessions = await this.invokeTauri<string[]>('list_pty_sessions', {
        sessionToken: token
      });
      return sessions || [];
    },
    spawnExternal: async (targetDir: string, shellOverride?: string): Promise<boolean> => {
      const token = await this.ensureSessionToken();
      const res = await this.invokeTauri<boolean>('spawn_external_terminal', {
        sessionToken: token,
        targetDir,
        shellOverride: shellOverride || null,
      });
      return res ?? false;
    },
    onData: (id: string, callback: (event: TerminalChunkEvent) => void): (() => void) => {
      let isDisposed = false;
      let unlistenFn: (() => void) | null = null;
      const eventName = `terminal:chunk:${id}`;

      import('@tauri-apps/api/event').then(({ listen }) => {
        if (isDisposed) return;
        listen<TerminalChunkEvent>(eventName, (event) => {
          if (!isDisposed) {
            callback(event.payload);
          }
        }).then((unlisten) => {
          if (isDisposed) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        }).catch((err) => {
          console.warn('Failed to listen to terminal chunk event:', err);
        });
      }).catch((err) => {
        console.warn('Failed to load @tauri-apps/api/event:', err);
      });

      return () => {
        isDisposed = true;
        if (unlistenFn) {
          unlistenFn();
          unlistenFn = null;
        }
      };
    },
    onExit: (id: string, callback: (event: TerminalExitEvent) => void): (() => void) => {
      let isDisposed = false;
      let unlistenFn: (() => void) | null = null;
      const eventName = `terminal:exit:${id}`;

      import('@tauri-apps/api/event').then(({ listen }) => {
        if (isDisposed) return;
        listen<TerminalExitEvent>(eventName, (event) => {
          if (!isDisposed) {
            callback(event.payload);
          }
        }).then((unlisten) => {
          if (isDisposed) {
            unlisten();
          } else {
            unlistenFn = unlisten;
          }
        }).catch((err) => {
          console.warn('Failed to listen to terminal exit event:', err);
        });
      }).catch((err) => {
        console.warn('Failed to load @tauri-apps/api/event:', err);
      });

      return () => {
        isDisposed = true;
        if (unlistenFn) {
          unlistenFn();
          unlistenFn = null;
        }
      };
    }
  };

  private initRpcListener(): void {
    if (typeof window === 'undefined') return;
    try {
      const currentWin = getCurrentWindow();
      if (currentWin && typeof currentWin.label === 'string' && currentWin.label !== 'main') {
        return;
      }
    } catch {
      // Proceed if window label cannot be synchronously inspected in test/mock environments
    }
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ correlationId: string; request: CntxtRpcRequest }>('cntxt://rpc-request', async (event) => {
        try {
          const win = getCurrentWindow();
          if (win && typeof win.label === 'string' && win.label !== 'main') {
            return;
          }
        } catch {
          // Proceed in non-windowed test environments
        }
        const { correlationId, request } = event.payload;
        try {
          const bus = getHostCommandBus(this);
          const response = await bus.handleRequest(request);
          await this.invokeTauriVoid('resolve_rpc_response', { correlationId, response });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const errResponse = {
            id: request?.id || correlationId,
            success: false,
            error: { code: 'EXECUTION_ERROR', message: errMsg }
          };
          await this.invokeTauriVoid('resolve_rpc_response', { correlationId, response: errResponse });
        }
      }).catch((err: unknown) => {
        console.error('Failed to listen to cntxt://rpc-request:', err);
        useNotificationStore.getState().addNotification(
          'RPC Bridge Warning',
          'Failed to bind native RPC listener for external gateway.',
          'warning'
        );
      });
    }).catch((importErr: unknown) => {
      console.error('Failed to import @tauri-apps/api/event for RPC bridge:', importErr);
    });
  }

  public gateway: IRestGatewayBridge = {
    isAvailable: (): boolean => true,
    start: async (port?: number, allowLan?: boolean): Promise<{ port: number; authToken: string; lanIp?: string | null }> => {
      const boundPort = await this.invokeTauri<number>('start_rest_gateway', { port, allow_lan: allowLan });
      const status = await this.invokeTauri<IRestGatewayStatus>('get_gateway_status');
      return { port: boundPort ?? 9876, authToken: status?.authToken ?? '', lanIp: status?.lanIp };
    },
    stop: async (): Promise<void> => {
      await this.invokeTauriVoid('stop_rest_gateway');
    },
    getStatus: async (): Promise<IRestGatewayStatus> => {
      const status = await this.invokeTauri<IRestGatewayStatus>('get_gateway_status');
      return status ?? { running: false, port: 0, authToken: '', lanIp: null, allowLan: false };
    },
    regenerateToken: async (): Promise<string> => {
      const token = await this.invokeTauri<string>('regenerate_gateway_token');
      return token ?? '';
    }
  };
}
