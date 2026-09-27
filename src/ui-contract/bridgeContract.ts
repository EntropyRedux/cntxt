export type { SupportedLanguage } from './tabContract';
import { SupportedLanguage } from './tabContract';

/**
 * File Descriptor returned by native or browser open dialogs
 */
export interface BridgeFileResult {
  name: string;
  path: string;
  content: string;
  language: SupportedLanguage;
}

export interface BridgeDirectoryEntry {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: SupportedLanguage;
  path?: string;
  children?: BridgeDirectoryEntry[];
}

export interface BridgeFolderResult {
  name: string;
  path?: string;
  entries: BridgeDirectoryEntry[];
}

/**
 * FileSystem Bridge Contract
 * Decouples the UI from Tauri fs, Node fs, or Web file picker
 */
export interface IFileSystemBridge {
  openFile: () => Promise<BridgeFileResult | null>;
  openDirectory?: () => Promise<BridgeFolderResult | null>;
  readDirectory?: (path: string) => Promise<BridgeDirectoryEntry[] | null>;
  readFile?: (path: string) => Promise<string | null>;
  saveFile: (path: string, content: string) => Promise<boolean>;
  saveFileAs: (suggestedName: string, content: string) => Promise<string | null>;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (jsonData: string) => Promise<boolean>;
  getPendingFiles?: () => Promise<string[]>;
  onOpenFileRequested?: (callback: (filePaths: string[]) => void) => () => void;
}

/**
 * Window & System Bridge Contract
 * Decouples the UI from Tauri appWindow, Electron BrowserWindow, or browser window manager
 */
export type WindowResizeDirection =
  | 'East'
  | 'North'
  | 'NorthEast'
  | 'NorthWest'
  | 'South'
  | 'SouthEast'
  | 'SouthWest'
  | 'West';

export interface IWindowBridge {
  newWindow: (url?: string) => Promise<boolean>;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  unmaximize?: () => Promise<void>;
  toggleMaximize?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
  startDragging?: () => Promise<void>;
  startResizeDragging?: (direction: WindowResizeDirection) => Promise<void>;
  close?: () => Promise<void>;
  openDevTools?: () => Promise<void>;
  toggleDevTools?: () => Promise<void>;
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
 * Persistence & Storage Bridge Contract
 * Stores stay persistence-agnostic. All KV storage flows through this bridge.
 */
export interface IStorageBridge {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<boolean>;
  removeItem: (key: string) => Promise<boolean>;
  hasItem?: (key: string) => Promise<boolean>;
  onStorageChanged?: (callback: (key: string) => void) => (() => void);
}

export type PlatformOS = 'macos' | 'windows' | 'linux' | 'android' | 'ios' | 'web';

/**
 * Platform & Device Detection Contract
 */
export interface IPlatformBridge {
  os: PlatformOS;
  isTouch: boolean;
  isMac: boolean;
  isMobile: boolean;
  consumeSharedText?: () => string | null;
}

/**
 * Theme Bridge Contract
 */
export interface IThemeBridge {
  applyTheme: (theme: string) => void;
  getEffectiveTheme: () => string;
}

/**
 * Unified Runtime Bridge Interface
 * The ONLY point of contact between UI components and the platform runtime.
 */
export interface IRuntimeBridge {
  fs: IFileSystemBridge;
  window: IWindowBridge;
  clipboard: IClipboardBridge;
  storage: IStorageBridge;
  platform: IPlatformBridge;
  theme: IThemeBridge;
  shareContent?: (text: string) => Promise<boolean>;
  getSessionToken?: () => Promise<string>;
  deleteFile?: (path: string) => Promise<boolean>;
  openFileExplorer?: (path: string) => Promise<boolean>;
  openExternalUrl?: (url: string) => Promise<boolean>;
}

