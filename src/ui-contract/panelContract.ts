import type React from 'react';

export type SidebarPanelId = 
  | 'explorer' 
  | 'outline' 
  | 'templates' 
  | 'actions' 
  | 'workflows' 
  | 'tokens' 
  | 'formulas' 
  | 'settings';

export interface UiPanelDescriptor {
  id: SidebarPanelId;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  shortcut?: string;
  description?: string;
}

export interface PanelEventContracts {
  onSelectPanel: (panelId: SidebarPanelId) => void;
  onToggleSidebar: () => void;
  onToggleActivityBar: () => void;
  onSetSidebarDockSide?: (side: 'left' | 'right') => void;
}
