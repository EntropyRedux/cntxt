import { ThemeName, SupportedLanguage } from '../types';

/**
 * Shell Mode switcher:
 * - 'classic': Traditional ContextPad desktop UI (TitleBar + TabBar + Editor + Right-docked ActivityBar/Sidebar)
 * - 'prototype': Next-generation modular CNTXT layout with sleek unified topbar, quick command bar, and floating panels
 * - 'workbench': Prompt engineering and AI context builder workbench with split panels, live variable inspector, and token gauge
 */
export type ShellMode = 'classic' | 'prototype' | 'workbench';

export type UiDensity = 'compact' | 'comfortable' | 'touch';

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
