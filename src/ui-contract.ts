export type SidebarTab =
  | 'explorer'
  | 'outline'
  | 'templates'
  | 'actions'
  | 'workflows'
  | 'tokens'
  | 'formulas'
  | 'settings';

export interface ThemeTokenSet {
  bg: string;
  panel: string;
  panelAlt: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  danger: string;
}

export interface TabModel {
  id: string;
  title: string;
  content: string;
  language: string;
  isDirty?: boolean;
}

export interface NotificationModel {
  id: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  actionLabel?: string;
}

export interface AppShellState {
  theme: string;
  activeSidebarTab: SidebarTab;
  sidebarOpen: boolean;
  activityBarOpen: boolean;
  tabs: TabModel[];
  activeTabId?: string;
  notifications: NotificationModel[];
}

export interface ActionEvent {
  type: 'create-tab' | 'open-file' | 'save' | 'close-tab' | 'toggle-sidebar' | 'toggle-activity' | 'notify';
  payload?: Record<string, unknown>;
}

export type UIAdapter<T> = (state: AppShellState) => T;
