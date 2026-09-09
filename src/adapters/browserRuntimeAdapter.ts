import { IRuntimeBridge, BridgeFileResult } from '../ui-contract/bridgeContract';
import { dbStorage } from '../services/storage/IndexedDBStorage';
import { SupportedLanguage } from '../types';

/**
 * BrowserRuntimeAdapter
 * Default browser implementation of IRuntimeBridge for AI Studio preview & web apps.
 */
export class BrowserRuntimeAdapter implements IRuntimeBridge {
  fs = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        if ('showOpenFilePicker' in window) {
          const [handle] = await (window as any).showOpenFilePicker();
          const file = await handle.getFile();
          const content = await file.text();
          const ext = file.name.split('.').pop()?.toLowerCase();
          const lang: SupportedLanguage = 
            ext === 'json' ? 'json' :
            ext === 'js' ? 'javascript' :
            ext === 'ts' ? 'typescript' :
            ext === 'py' ? 'python' :
            ext === 'html' ? 'html' :
            ext === 'css' ? 'css' :
            ext === 'yaml' || ext === 'yml' ? 'yaml' : 'markdown';

          return {
            name: file.name,
            path: handle.name || file.name,
            content,
            language: lang
          };
        } else {
          return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) {
                resolve(null);
                return;
              }
              const content = await file.text();
              const ext = file.name.split('.').pop()?.toLowerCase();
              const lang: SupportedLanguage = 
                ext === 'json' ? 'json' :
                ext === 'js' ? 'javascript' :
                ext === 'ts' ? 'typescript' :
                ext === 'py' ? 'python' :
                ext === 'html' ? 'html' :
                ext === 'css' ? 'css' :
                ext === 'yaml' || ext === 'yml' ? 'yaml' : 'markdown';

              resolve({
                name: file.name,
                path: file.name,
                content,
                language: lang
              });
            };
            input.click();
          });
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return null;
        console.error('BrowserRuntimeAdapter.openFile error:', err);
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      // In browser mode, saving persists to tabStore and IndexedDB
      return true;
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          return handle.name || suggestedName;
        } else {
          // Download blob fallback
          const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = suggestedName;
          a.click();
          URL.revokeObjectURL(url);
          return suggestedName;
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return null;
        return null;
      }
    },

    exportWorkspace: async (): Promise<string> => {
      return await dbStorage.exportAllData();
    },

    importWorkspace: async (jsonData: string): Promise<boolean> => {
      return await dbStorage.importAllData(jsonData);
    }
  };

  window = {
    newWindow: async (url?: string): Promise<boolean> => {
      try {
        const targetUrl = url || window.location.href;
        const newWin = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        return !!newWin;
      } catch {
        return false;
      }
    },
    isNative: false,
    getPlatform: (): 'web' | 'macos' | 'windows' | 'linux' => {
      const p = navigator.platform.toUpperCase();
      if (p.indexOf('MAC') >= 0) return 'macos';
      if (p.indexOf('WIN') >= 0) return 'windows';
      if (p.indexOf('LINUX') >= 0) return 'linux';
      return 'web';
    }
  };

  clipboard = {
    readText: async (): Promise<string> => {
      try {
        return await navigator.clipboard.readText();
      } catch {
        return '';
      }
    },
    writeText: async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
  };
}
