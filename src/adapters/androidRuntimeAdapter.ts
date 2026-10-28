/**
 * Android Native Runtime Adapter (src/adapters/androidRuntimeAdapter.ts)
 * Extends TauriRuntimeAdapter to handle Android Storage Access Framework (SAF)
 * and AndroidBridge IPC interactions.
 */

import { TauriRuntimeAdapter } from './tauriRuntimeAdapter';
import {
  BridgeFileResult,
  BridgeFolderResult,
  BridgeDirectoryEntry,
  IPlatformBridge,
  ITerminalBridge,
  IRestGatewayBridge,
  IRestGatewayStatus
} from '../ui-contract/bridgeContract';
import { getAndroidBridge } from './androidBridgeHelper';
import { useNotificationStore } from '../store/notificationStore';

export class AndroidRuntimeAdapter extends TauriRuntimeAdapter {
  public override platform: IPlatformBridge = {
    os: 'android',
    isTouch: true,
    isMac: false,
    isMobile: true,
    consumeSharedText: () => {
      const androidBridge = getAndroidBridge();
      if (androidBridge?.consumeSharedText) {
        return androidBridge.consumeSharedText() || null;
      }
      return null;
    }
  };

  public override terminal: ITerminalBridge = {
    isAvailable: (): boolean => false,
    spawn: async (): Promise<string> => {
      throw new Error('Terminal PTY execution is not supported on Android');
    },
    write: async (): Promise<void> => {},
    resize: async (): Promise<void> => {},
    kill: async (): Promise<void> => {},
    listSessions: async (): Promise<string[]> => [],
    onData: (): (() => void) => () => {},
    onExit: (): (() => void) => () => {}
  };

  public override shareContent = async (text: string): Promise<boolean> => {
    const bridge = getAndroidBridge();
    if (bridge?.shareText) {
      bridge.shareText(text);
      return true;
    }
    return false;
  };

  constructor() {
    super();
    this.fs = {
      ...this.fs,
      openFile: async (): Promise<BridgeFileResult | null> => {
        const bridge = getAndroidBridge();
        if (bridge?.launchOpenDocument) {
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

                const content = await this.invokeTauri<string>('read_file', { path: tempPath });
                resolve({
                  name: filename,
                  path: uri,
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
        return this.fs.openFile();
      },

      openDirectory: async (): Promise<BridgeFolderResult | null> => {
        const bridge = getAndroidBridge();
        if (bridge?.launchOpenDocumentTree) {
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
                const folderResult: BridgeFolderResult = JSON.parse(payload);
                resolve(folderResult);
              } catch (parseErr) {
                console.error('[AndroidRuntimeAdapter] Failed to parse SAF folder result:', parseErr);
                resolve(null);
              }
            };
            window.addEventListener('saf:folder_picked', handleSafFolderEvent);
            bridge.launchOpenDocumentTree();
          });
        }
        return this.fs.openDirectory ? this.fs.openDirectory() : null;
      },

      readDirectory: async (path: string): Promise<BridgeDirectoryEntry[] | null> => {
        const androidBridge = getAndroidBridge();
        if (path.startsWith('content://') && androidBridge?.readDirectory) {
          const jsonArrayStr = androidBridge.readDirectory(path);
          if (!jsonArrayStr) return null;

          try {
            const rawEntries = JSON.parse(jsonArrayStr);
            return rawEntries.map((node: { id?: string; path: string; name: string; type: string }) => ({
              id: node.id || node.path,
              name: node.name,
              type: node.type as 'file' | 'folder',
              path: node.path,
              language: node.type === 'folder' ? undefined : this.detectLanguage(node.name)
            }));
          } catch (e) {
            console.error('[AndroidRuntimeAdapter] Failed to parse SAF directory result:', e);
            return null;
          }
        }
        return this.invokeTauri<BridgeDirectoryEntry[]>('read_directory', { path });
      },

      readFile: async (path: string): Promise<string | null> => {
        try {
          const androidBridge = getAndroidBridge();
          if (path.startsWith('content://') && androidBridge?.createTempFileForRead) {
            const tempPath = androidBridge.createTempFileForRead(path);
            if (tempPath) {
              return await this.invokeTauri<string>('read_file', { path: tempPath });
            }
            return null;
          }
          return await this.invokeTauri<string>('read_file', { path });
        } catch (err) {
          console.error('[AndroidRuntimeAdapter] readFile error:', err);
          useNotificationStore.getState().addNotification('File Error', `Failed to read file ${path}`, 'error');
          return null;
        }
      },

      saveFile: async (path: string, content: string): Promise<boolean> => {
        try {
          const androidBridge = getAndroidBridge();
          if (path.startsWith('content://') && androidBridge?.saveToSaf) {
            const tempPath = '/data/user/0/com.cntxt.desktop/cache/saf_write_temp.txt';
            const writeSuccess = await this.invokeTauriVoid('write_file', { path: tempPath, content });
            if (writeSuccess) {
              return androidBridge.saveToSaf(path, tempPath);
            }
            return false;
          }
          return await this.invokeTauriVoid('write_file', { path, content });
        } catch (err) {
          console.error('[AndroidRuntimeAdapter] saveFile error:', err);
          useNotificationStore.getState().addNotification('Save Error', `Failed to save file ${path}`, 'error');
          return false;
        }
      }
    };
    this.window = {
      ...this.window,
      getPlatform: () => 'android'
    };
  }
}
