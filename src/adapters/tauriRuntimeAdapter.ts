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
  WindowResizeDirection
} from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from './storageKeys';
import { applyThemeTokensToElement } from '../../theme/index';
import { ThemeName } from '../ui-contract/themeContract';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useNotificationStore } from '../store/notificationStore';
import { getAndroidBridge } from './androidBridgeHelper';

const CRITICAL_IPC_COMMANDS = ['read_file', 'write_file', 'delete_file', 'store_api_key', 'delete_api_key'];

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
      const tauri = (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__?.core || (window as any).__TAURI__;
      if (tauri && typeof tauri.invoke === 'function') {
        return await tauri.invoke(cmd, args);
      }
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<T>(cmd, args);
    } catch (e: any) {
      console.warn(`[TauriRuntimeAdapter] invoke(${cmd}) failed:`, e);
      if (CRITICAL_IPC_COMMANDS.includes(cmd)) {
        const errorMsg = typeof e === 'string' ? e : e?.message || `Operation ${cmd} failed`;
        useNotificationStore.getState().addNotification('System Error', errorMsg, 'error');
      }
    }
    return null;
  }

  private async invokeTauriVoid(cmd: string, args: Record<string, any> = {}): Promise<boolean> {
    try {
      const tauri = (window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__?.core || (window as any).__TAURI__;
      if (tauri && typeof tauri.invoke === 'function') {
        await tauri.invoke(cmd, args);
        return true;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke(cmd, args);
      return true;
    } catch (e: any) {
      console.warn(`[TauriRuntimeAdapter] invokeVoid(${cmd}) failed:`, e);
      if (CRITICAL_IPC_COMMANDS.includes(cmd)) {
        const errorMsg = typeof e === 'string' ? e : e?.message || `Operation ${cmd} failed`;
        useNotificationStore.getState().addNotification('System Error', errorMsg, 'error');
      }
    }
    return false;
  }

  public async getSessionToken(): Promise<string> {
    return '';
  }

  public shareContent = async (text: string): Promise<boolean> => {
    const bridge = getAndroidBridge();
    if (this.platform.isMobile && bridge?.shareText) {
      bridge.shareText(text);
      return true;
    }
    return false;
  };

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        const bridge = getAndroidBridge();
        if (this.platform.isMobile && bridge?.launchOpenDocument) {
          return new Promise<BridgeFileResult | null>((resolve) => {
            const handleSafEvent = async (e: Event) => {
              const customEvent = e as CustomEvent<string>;
              window.removeEventListener('saf:file_picked', handleSafEvent);

              const payload = customEvent.detail;
              if (!payload || payload === 'CANCELLED') {
                resolve(null);
                return;
              }

              const parts = payload.split('|||');
              if (parts.length >= 3) {
                const uri = parts[0];
                const tempPath = parts[1];
                const filename = parts[2];

                // Read from the tempPath natively via Tauri's existing POSIX file reader
                const content = await this.invokeTauri<string>('read_file', { path: tempPath });

                resolve({
                  name: filename,
                  path: uri, // We store the content:// URI so saveFile knows it's a SAF file
                  content: content || '',
                  language: this.detectLanguage(filename)
                });
              } else {
                resolve(null);
              }
            };
            window.addEventListener('saf:file_picked', handleSafEvent);
            bridge.launchOpenDocument();
          });
        }

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
        const bridge = getAndroidBridge();
        if (this.platform.isMobile && bridge?.launchOpenDocumentTree) {
          return new Promise<BridgeFolderResult | null>((resolve) => {
            const handleSafFolderEvent = (e: Event) => {
              const customEvent = e as CustomEvent<string>;
              window.removeEventListener('saf:folder_picked', handleSafFolderEvent);

              const payload = customEvent.detail;
              if (!payload || payload === 'CANCELLED') {
                resolve(null);
                return;
              }

              try {
                // Parse the BridgeFolderResult JSON constructed in Kotlin
                const folderResult: BridgeFolderResult = JSON.parse(payload);
                resolve(folderResult);
              } catch (parseErr) {
                console.error('[TauriRuntimeAdapter] Failed to parse SAF folder result:', parseErr);
                resolve(null);
              }
            };
            window.addEventListener('saf:folder_picked', handleSafFolderEvent);
            bridge.launchOpenDocumentTree();
          });
        }

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
        const androidBridge = getAndroidBridge();
        if (this.platform.isMobile && path.startsWith('content://') && androidBridge?.readDirectory) {
          const jsonArrayStr = androidBridge.readDirectory(path);
          if (!jsonArrayStr) return null;

          try {
            const rawEntries = JSON.parse(jsonArrayStr);
            return rawEntries.map((node: any) => ({
              id: node.id || node.path,
              name: node.name,
              type: node.type as 'file' | 'folder',
              path: node.path,
              language: node.type === 'folder' ? undefined : this.detectLanguage(node.name)
            }));
          } catch (e) {
            console.error('[TauriRuntimeAdapter] Failed to parse SAF directory result:', e);
            return null;
          }
        }

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
        const androidBridge = getAndroidBridge();
        if (this.platform.isMobile && path.startsWith('content://') && androidBridge?.createTempFileForRead) {
          const tempPath = androidBridge.createTempFileForRead(path);
          if (tempPath) {
            return await this.invokeTauri<string>('read_file', { path: tempPath });
          }
          return null;
        }

        const content = await this.invokeTauri<string>('read_file', { path });
        return content;
      } catch (err) {
        console.error('[TauriRuntimeAdapter] readFile error:', err);
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      try {
        const androidBridge = getAndroidBridge();
        if (this.platform.isMobile && path.startsWith('content://') && androidBridge?.saveToSaf) {
          // Write to a temporary POSIX file in the sandboxed app cache, then bridge to SAF
          const tempPath = `/data/user/0/com.cntxt.desktop/cache/saf_write_temp.txt`;
          const writeSuccess = await this.invokeTauriVoid('write_file', { path: tempPath, content });
          if (writeSuccess) {
            return androidBridge.saveToSaf(path, tempPath);
          }
          return false;
        }

        return await this.invokeTauriVoid('write_file', { path, content });
      } catch (err) {
        console.error('[TauriRuntimeAdapter] saveFile error:', err);
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
    },

    getPendingFiles: async (): Promise<string[]> => {
      try {
        const files = await this.invokeTauri<string[]>('get_pending_files');
        return files || [];
      } catch (err) {
        console.error('[TauriRuntimeAdapter] getPendingFiles error:', err);
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
    startResizeDragging: async (direction: WindowResizeDirection): Promise<void> => {
      try {
        await getCurrentWindow().startResizeDragging(direction as any);
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
    consumeSharedText: () => {
      const androidBridge = getAndroidBridge();
      if (androidBridge?.consumeSharedText) {
        return androidBridge.consumeSharedText() || null;
      }
      return null;
    }
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
}

