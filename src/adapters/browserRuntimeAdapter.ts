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
  SupportedLanguage 
} from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from './storageKeys';
import { browserDB } from './browserIndexedDB';

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
    }
  };

  public window: IWindowBridge = {
    isNative: false,
    newWindow: async (url?: string): Promise<boolean> => {
      window.open(url || window.location.href, '_blank');
      return true;
    },
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
      return browserDB.getItem(key);
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
    }
  };

  public platform: IPlatformBridge = {
    os: (() => {
      const p = navigator.platform.toLowerCase();
      if (p.includes('mac')) return 'macos';
      if (p.includes('win')) return 'windows';
      if (p.includes('linux')) return 'linux';
      return 'web';
    })(),
    isTouch: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints > 0)),
    isMac: typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    isMobile: typeof window !== 'undefined' && ('ontouchstart' in window || (navigator.maxTouchPoints > 0)) && window.innerWidth < 768
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
