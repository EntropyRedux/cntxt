export type SupportedLanguage = 
  | 'markdown' 
  | 'javascript' 
  | 'typescript' 
  | 'python' 
  | 'json' 
  | 'yaml' 
  | 'html' 
  | 'css' 
  | 'text';

export interface UiTab {
  id: string;
  title: string;
  content: string;
  filePath: string | null;
  folderPath: string | null;
  isDirty: boolean;
  language: SupportedLanguage;
  isPinned?: boolean;
  lastModifiedTime?: number;
  cursorLine?: number;
  cursorCol?: number;
  selectionStartLine?: number | null;
  selectionEndLine?: number | null;
}

export interface TabEventContracts {
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherTabs?: (tabId: string) => void;
  onCloseAllTabs?: () => void;
  onNewTab: (title?: string, content?: string, language?: SupportedLanguage) => void;
  onPinTab?: (tabId: string) => void;
  onSaveTab: (tabId: string) => Promise<void> | void;
  onSaveTabAs?: (tabId: string, newTitle: string) => Promise<void> | void;
  onRenameTab?: (tabId: string, newTitle: string) => void;
  onContentChange?: (tabId: string, newContent: string) => void;
}
