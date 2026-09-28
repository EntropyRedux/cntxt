/**
 * ANDROID BRIDGE HELPER (src/adapters/androidBridgeHelper.ts)
 * 
 * Safely accesses Android Storage Access Framework (SAF) Java bridge interface.
 * Isolates mobile webview global coupling away from the cross-platform runtime adapter.
 */

export interface IAndroidJavaBridge {
  shareText?: (text: string) => void;
  launchOpenDocument?: () => void;
  launchOpenDocumentTree?: () => void;
  readDirectory?: (path: string) => string;
  createTempFileForRead?: (path: string) => string;
  saveToSaf?: (path: string, tempPath: string) => boolean;
  consumeSharedText?: () => string;
}

export function getAndroidBridge(): IAndroidJavaBridge | null {
  if (typeof window !== 'undefined' && (window as unknown as { AndroidBridge?: IAndroidJavaBridge }).AndroidBridge) {
    return (window as unknown as { AndroidBridge: IAndroidJavaBridge }).AndroidBridge;
  }
  return null;
}
