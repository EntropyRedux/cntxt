export interface UiActionItem {
  id: string;
  name: string;
  description: string;
  category?: string;
  shortcut?: string;
  icon?: any;
  action: () => void | Promise<void>;
  isAccent?: boolean;
  disabled?: boolean;
}

export interface UiMenuGroup {
  label: string;
  icon?: any;
  items: {
    label: string;
    shortcut?: string;
    action: () => void | Promise<void>;
    isDivider?: boolean;
    disabled?: boolean;
  }[];
}

export interface AppUiEvents {
  onOpenFile: () => void | Promise<void>;
  onOpenFolder: () => void | Promise<void>;
  onSaveFile: () => void | Promise<void>;
  onSaveAs: () => void | Promise<void>;
  onNewWindow: () => void | Promise<void>;
  onExportWorkspace: () => void | Promise<void>;
  onImportWorkspace: () => void | Promise<void>;
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
  onOpenVariableModal: () => void;
  onOpenActionEditor: (actionId?: string) => void;
  onToggleEditorMode: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onCut?: () => void | Promise<void>;
  onCopy?: () => void | Promise<void>;
  onPaste?: () => void | Promise<void>;
  onSelectAll?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
}

