import { ThemeName } from './themeContract';
import { SupportedLanguage } from './tabContract';

/**
 * Shell Mode:
 * - 'classic': Traditional ContextPad desktop UI (TitleBar + TabBar + Editor + Left ActivityBar + Right Sidebar + Toggleable Modular Ribbon Toolbox)
 * - 'prototype': (Legacy alias for classic with ribbon active)
 */
export type ShellMode = 'classic' | 'prototype';

export type UiDensity = 'desktop' | 'touch';

export type DockSide = 'left' | 'right';

export interface AppShellState {
  mode: ShellMode;
  density: UiDensity;
  touchOptimized: boolean;
  theme: ThemeName;
  sidebarOpen: boolean;
  sidebarDockSide: DockSide;
  activePanelId: string;
  activityBarVisible: boolean;
  statusBarVisible: boolean;
  mobileAccessoryBarVisible: boolean;
  isCommandPaletteOpen: boolean;
  isShortcutsModalOpen: boolean;
  isVariableFillerOpen: boolean;
  isActionEditorOpen: boolean;
  isSaving: boolean;
}

export interface AppShellCapabilities {
  hasFileSystemAccess: boolean;
  hasNativeWindowControls: boolean;
  supportsMultiWindow: boolean;
  supportsDevTools: boolean;
  isTouchDevice: boolean;
}
