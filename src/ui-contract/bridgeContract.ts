import { SupportedLanguage } from '../types';

/**
 * File Descriptor returned by native or browser open dialogs
 */
export interface BridgeFileResult {
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage;
}

/**
 * FileSystem Bridge Contract
 * Decouples the UI from Tauri `fs`, Node `fs`, or Web `showOpenFilePicker`
 */
export interface IFileSystemBridge {
  openFile: () => Promise<BridgeFileResult | null>;
  saveFile: (path: string, content: string) => Promise<boolean>;
  saveFileAs: (suggestedName: string, content: string) => Promise<string | null>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (jsonData: string) => Promise<boolean>;
}

/**
 * Window & System Bridge Contract
 * Decouples the UI from Tauri `appWindow`, Electron `BrowserWindow`, or browser `window.open`
 */
export interface IWindowBridge {
  newWindow: (url?: string) => Promise<boolean>;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isNative: boolean;
  getPlatform: () => 'web' | 'macos' | 'windows' | 'linux';
}

/**
 * Clipboard Bridge Contract
 */
export interface IClipboardBridge {
  readText: () => Promise<string>;
  writeText: (text: string) => Promise<boolean>;
}

/**
 * Unified Runtime Bridge Interface
 * The ONLY point of contact between UI components and the platform runtime.
 */
export interface IRuntimeBridge {
  fs: IFileSystemBridge;
  window: IWindowBridge;
  clipboard: IClipboardBridge;
}
