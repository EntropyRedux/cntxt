/**
 * Browser Runtime Adapter
 * Implements IRuntimeBridge for the web environment using standard browser Web APIs.
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
  SupportedLanguage 
} from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from './storageKeys';
import { browserDB } from './browserIndexedDB';
import { applyThemeTokensToElement } from '../../theme/index';
import { ThemeName } from '../../contracts/data_shapes';

export class BrowserRuntimeAdapter implements IRuntimeBridge {
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

  public fs: IFileSystemBridge = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      // Modern Web File System Access API
      if ('showOpenFilePicker' in window) {
        try {
          const [fileHandle] = await (window as any).showOpenFilePicker({
            types: [
              {
                description: 'Documents & Code',
                accept: {
                  'text/*': ['.md', '.txt', '.json', '.js', '.ts', '.py', '.html', '.css', '.yaml', '.yml']
                }
              }
            ],
            multiple: false
          });

          const file = await fileHandle.getFile();
          const content = await file.text();

          return {
            name: file.name,
            path: file.name,
            content,
            language: this.detectLanguage(file.name)
          };
        } catch (err: any) {
          if (err?.name === 'AbortError') return null;
          console.warn('showOpenFilePicker failed, falling back to hidden file input', err);
        }
      }

      // Universal HTML Input Fallback
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.md,.txt,.json,.js,.ts,.py,.html,.css,.yaml,.yml';

        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              path: file.name,
              content: reader.result as string,
              language: this.detectLanguage(file.name)
            });
          };
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        };

        input.click();
      });
    },

    openDirectory: async (): Promise<BridgeFolderResult | null> => {
      // Modern Web File System Access API
      if ('showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker();
          if (!dirHandle) return null;

          const readDirectoryHandle = async (handle: any, parentPath: string = ''): Promise<BridgeDirectoryEntry[]> => {
            const list: BridgeDirectoryEntry[] = [];
            for await (const entry of handle.values()) {
              const currentPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
              if (entry.kind === 'file') {
                try {
                  const file = await entry.getFile();
                  let content = '';
                  if (file.size < 2 * 1024 * 1024) {
                    content = await file.text();
                  }
                  list.push({
                    id: `f_${Math.random().toString(36).substr(2, 6)}_${entry.name}`,
                    name: entry.name,
                    type: 'file',
                    content,
                    path: currentPath,
                    language: this.detectLanguage(entry.name)
                  });
                } catch (err) {
                  console.warn(`[BrowserRuntimeAdapter] Failed to read file ${entry.name}:`, err);
                }
              } else if (entry.kind === 'directory') {
                const children = await readDirectoryHandle(entry, currentPath);
                list.push({
                  id: `dir_${Math.random().toString(36).substr(2, 6)}_${entry.name}`,
                  name: entry.name,
                  type: 'folder',
                  path: currentPath,
                  children
                });
              }
            }
            return list;
          };

          const entries = await readDirectoryHandle(dirHandle, dirHandle.name);
          return {
            name: dirHandle.name,
            path: dirHandle.name,
            entries
          };
        } catch (err: any) {
          if (err?.name === 'AbortError') return null;
          console.warn('showDirectoryPicker failed, falling back to input webkitdirectory', err);
        }
      }

      // Universal HTML Input Fallback with webkitdirectory
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.setAttribute('webkitdirectory', '');
        input.setAttribute('directory', '');
        input.multiple = true;

        input.onchange = async () => {
          const fileList = input.files;
          if (!fileList || fileList.length === 0) {
            resolve(null);
            return;
          }

          const firstPath = fileList[0].webkitRelativePath || fileList[0].name;
          const rootName = firstPath.split('/')[0] || 'Workspace';

          const rootMap = new Map<string, any>();

          for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const relPath = file.webkitRelativePath || file.name;
            const parts = relPath.split('/');

            const subParts = parts.slice(1);
            if (subParts.length === 0) continue;

            let currentMap = rootMap;
            for (let p = 0; p < subParts.length - 1; p++) {
              const dirName = subParts[p];
              if (!currentMap.has(dirName)) {
                currentMap.set(dirName, {
                  id: `dir_${Math.random().toString(36).substr(2, 6)}_${dirName}`,
                  name: dirName,
                  type: 'folder',
                  childrenMap: new Map()
                });
              }
              currentMap = currentMap.get(dirName).childrenMap;
            }

            const fileName = subParts[subParts.length - 1];
            try {
              const text = await file.text();
              currentMap.set(fileName, {
                id: `f_${Math.random().toString(36).substr(2, 6)}_${fileName}`,
                name: fileName,
                type: 'file',
                content: text,
                path: relPath,
                language: this.detectLanguage(fileName)
              });
            } catch (err) {
              console.warn(`[BrowserRuntimeAdapter] Failed reading file text for ${fileName}:`, err);
              currentMap.set(fileName, {
                id: `f_${Math.random().toString(36).substr(2, 6)}_${fileName}`,
                name: fileName,
                type: 'file',
                content: '',
                path: relPath,
                language: this.detectLanguage(fileName)
              });
            }
          }

          const convertMapToEntries = (map: Map<string, any>): BridgeDirectoryEntry[] => {
            const result: BridgeDirectoryEntry[] = [];
            for (const [, item] of map.entries()) {
              if (item.type === 'folder') {
                result.push({
                  id: item.id,
                  name: item.name,
                  type: 'folder',
                  children: convertMapToEntries(item.childrenMap)
                });
              } else {
                result.push(item);
              }
            }
            return result;
          };

          const entries = convertMapToEntries(rootMap);
          resolve({
            name: rootName,
            path: rootName,
            entries
          });
        };

        input.click();
      });
    },

    readDirectory: async (_path: string): Promise<BridgeDirectoryEntry[] | null> => {
      return null;
    },

    readFile: async (_path: string): Promise<string | null> => {
      return null;
    },

    saveFile: async (_path: string, _content: string): Promise<boolean> => {
      return true;
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName,
            types: [{
              description: 'Plain Text / Markdown',
              accept: { 'text/plain': ['.md', '.txt', '.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          return handle.name || suggestedName;
        } catch (err: any) {
          if (err?.name === 'AbortError') return null;
          console.warn('showSaveFilePicker failed, falling back to anchor download', err);
        }
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return suggestedName;
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

      const jsonStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contextpad-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return jsonStr;
    },

    importWorkspace: async (jsonData?: string): Promise<boolean> => {
      let content = jsonData;
      if (!content) {
        content = await new Promise<string | null>((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
          };
          input.click();
        }) ?? undefined;
      }

      if (!content) return false;

      try {
        const parsed = JSON.parse(content);
        const data = parsed.data || parsed;
        for (const [key, val] of Object.entries(data)) {
          const strVal = typeof val === 'string' ? val : JSON.stringify(val);
          await this.storage.setItem(key, strVal);
        }
        return true;
      } catch (err) {
        console.error('[BrowserRuntimeAdapter] import error:', err);
        return false;
      }
    },

    getPendingFiles: async (): Promise<string[]> => [],
    onOpenFileRequested: (_callback: (filePaths: string[]) => void): (() => void) => () => {}
  };

  public window: IWindowBridge = {
    isNative: false,
    newWindow: async (url?: string): Promise<boolean> => {
      window.open(url || window.location.href, '_blank');
      return true;
    },
    minimize: async (): Promise<void> => {},
    maximize: async (): Promise<void> => {},
    unmaximize: async (): Promise<void> => {},
    toggleMaximize: async (): Promise<void> => {},
    isMaximized: async (): Promise<boolean> => false,
    startDragging: async (): Promise<void> => {},
    startResizeDragging: async (): Promise<void> => {},
    close: async (): Promise<void> => {},
    openDevTools: async (): Promise<void> => {},
    toggleDevTools: async (): Promise<void> => {},
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' => {
      const p = navigator.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'web';
    }
  };

  public clipboard: IClipboardBridge = {
    readText: async (): Promise<string> => {
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        console.warn('Clipboard read failed:', e);
        return '';
      }
    },
    writeText: async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
      }
    }
  };

  public storage: IStorageBridge = {
    getItem: async (key: string): Promise<string | null> => {
      const item = await browserDB.getItem(key);
      if (item !== null) return item;
      // In web demo/test environment, seed initial default presets on first empty read
      if (key === STORAGE_KEYS.ACTIONS) {
        const { DEFAULT_ACTIONS } = await import('../constants/defaultPresets');
        const serialized = JSON.stringify(DEFAULT_ACTIONS);
        await browserDB.setItem(key, serialized);
        return serialized;
      }
      if (key === STORAGE_KEYS.TEMPLATES) {
        const { DEFAULT_TEMPLATES } = await import('../constants/defaultPresets');
        const serialized = JSON.stringify(DEFAULT_TEMPLATES);
        await browserDB.setItem(key, serialized);
        return serialized;
      }
      return null;
    },
    setItem: async (key: string, value: string): Promise<boolean> => {
      return browserDB.setItem(key, value);
    },
    removeItem: async (key: string): Promise<boolean> => {
      return browserDB.removeItem(key);
    },
    hasItem: async (key: string): Promise<boolean> => {
      const item = await browserDB.getItem(key);
      return item !== null;
    },
    onStorageChanged: (_callback: (key: string) => void): (() => void) => {
      return () => {};
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
      return 'web';
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

  public async deleteFile(_path: string): Promise<boolean> {
    return false;
  }

  public async openFileExplorer(_path: string): Promise<boolean> {
    return false;
  }

  public async openExternalUrl(url: string): Promise<boolean> {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
      return true;
    }
    return false;
  }

  public async getSessionToken(): Promise<string> {
    return 'browser-session-token';
  }
}
