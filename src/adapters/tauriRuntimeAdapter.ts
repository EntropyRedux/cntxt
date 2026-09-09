import { invoke, isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { IRuntimeBridge, BridgeFileResult } from '../ui-contract/bridgeContract';
import { dbStorage } from '../services/storage/IndexedDBStorage';
import { SupportedLanguage } from '../types';

/**
 * TauriRuntimeAdapter — Desktop Runtime Bridge (Tauri v2)
 * 
 * Implements IRuntimeBridge using Tauri v2 APIs and native Rust commands.
 * Matches ContextPad's proven native dialog, file I/O, and window management.
 */
export class TauriRuntimeAdapter implements IRuntimeBridge {
  /**
   * File System Operations
   */
  fs = {
    openFile: async (): Promise<BridgeFileResult | null> => {
      try {
        const filePath = await invoke<string | null>('open_file_dialog');
        if (!filePath) return null;

        const content = await invoke<string>('read_file', { path: filePath });
        const name = await invoke<string>('get_file_name', { path: filePath });
        const rawLang = await invoke<string>('detect_language_from_path', { path: filePath });
        
        const language: SupportedLanguage = 
          rawLang === 'json' ? 'json' :
          rawLang === 'javascript' ? 'javascript' :
          rawLang === 'typescript' ? 'typescript' :
          rawLang === 'python' ? 'python' :
          rawLang === 'html' ? 'html' :
          rawLang === 'css' ? 'css' :
          rawLang === 'yaml' ? 'yaml' : 'markdown';

        return { name, path: filePath, content, language };
      } catch (error) {
        console.error('Failed to open file via Tauri:', error);
        return null;
      }
    },

    saveFile: async (path: string, content: string): Promise<boolean> => {
      try {
        await invoke('write_file', { path, content });
        return true;
      } catch (error) {
        console.error('Failed to save file via Tauri:', error);
        return false;
      }
    },

    saveFileAs: async (suggestedName: string, content: string): Promise<string | null> => {
      try {
        const targetPath = await invoke<string | null>('save_file_dialog', { defaultName: suggestedName });
        if (!targetPath) return null;
        await invoke('write_file', { path: targetPath, content });
        return targetPath;
      } catch (error) {
        console.error('Failed to save file as via Tauri:', error);
        return null;
      }
    },

    exportWorkspace: async (): Promise<string> => {
      try {
        return await dbStorage.exportAllData();
      } catch (error) {
        console.error('Failed to export workspace:', error);
        return '';
      }
    },

    importWorkspace: async (jsonData: string): Promise<boolean> => {
      try {
        return await dbStorage.importAllData(jsonData);
      } catch (error) {
        console.error('Failed to import workspace:', error);
        return false;
      }
    },
  };

  /**
   * Window Management Operations
   */
  window = {
    newWindow: async (): Promise<boolean> => {
      try {
        await invoke('new_window');
        return true;
      } catch (error) {
        console.error('Failed to create new window:', error);
        return false;
      }
    },

    minimize: async (): Promise<void> => {
      try {
        const win = getCurrentWindow();
        await win.minimize();
      } catch (error) {
        console.error('Failed to minimize window:', error);
      }
    },

    maximize: async (): Promise<void> => {
      try {
        const win = getCurrentWindow();
        await win.toggleMaximize();
      } catch (error) {
        console.error('Failed to maximize window:', error);
      }
    },

    close: async (): Promise<void> => {
      try {
        await invoke('confirm_close');
      } catch {
        const win = getCurrentWindow();
        await win.close();
      }
    },

    isNative: true,

    getPlatform: (): 'windows' | 'macos' | 'linux' => {
      if (navigator.userAgent.includes('Mac')) return 'macos';
      if (navigator.userAgent.includes('Linux')) return 'linux';
      return 'windows';
    },
  };

  /**
   * Clipboard Operations
   */
  clipboard = {
    readText: async (): Promise<string> => {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.error('Failed to read clipboard:', error);
        return '';
      }
    },

    writeText: async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        console.error('Failed to write clipboard:', error);
        return false;
      }
    },
  };

  /**
   * App Metadata
   */
  getAppInfo = async () => {
    try {
      return await invoke('get_app_info');
    } catch (error) {
      console.error('Failed to get app info:', error);
      return null;
    }
  };

  /**
   * System Info
   */
  getSystemInfo = async () => {
    try {
      return await invoke('get_system_info');
    } catch (error) {
      console.error('Failed to get system info:', error);
      return null;
    }
  };

  /**
   * Open External URL
   */
  openExternal = async (url: string): Promise<void> => {
    try {
      await invoke('open_external', { url });
    } catch (error) {
      console.error('Failed to open external URL:', error);
      window.open(url, '_blank');
    }
  };
}

export { isTauri };
