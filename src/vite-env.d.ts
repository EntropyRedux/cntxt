/// <reference types="vite/client" />

interface Window {
  __CONTEXTPAD_DEMO__?: boolean;
  __CNTXT_SESSION_TOKEN__?: string;
  __TAURI_INTERNALS__?: { // platform-leak-ignore
    invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
  };
  __TAURI__?: {
    core?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  };
  isTauri?: boolean;
  AndroidBridge?: { // platform-leak-ignore
    openFile?: () => void;
    saveFile?: (content: string, name: string) => void;
    readDirectory?: () => void;
    consumeSharedText?: () => string;
    shareContent?: (title: string, text: string) => void;
  };
  showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (options?: unknown) => Promise<FileSystemDirectoryHandle>;
}

interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: unknown): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values(): AsyncIterable<FileSystemHandle>;
}
