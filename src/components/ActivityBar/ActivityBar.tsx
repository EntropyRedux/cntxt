import React from 'react';
import { 
  FolderTree, 
  ListTree,
  LayoutTemplate, 
  Terminal, 
  Workflow, 
  Coins, 
  Calculator, 
  Settings
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { ViewSettings } from '../../types';

export const ActivityBar: React.FC = () => {
  const { settings, setActiveSidebarTab, toggleSidebar } = useSettingsStore();

  const navItems: { id: ViewSettings['activeSidebarTab']; label: string; ariaLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'explorer', label: 'File Explorer (Ctrl+Shift+E)', ariaLabel: 'File Explorer', icon: FolderTree },
    { id: 'outline', label: 'Document Outline (Ctrl+Shift+O)', ariaLabel: 'Document Outline', icon: ListTree },
    { id: 'templates', label: 'Templates & Variables (Ctrl+Alt+T)', ariaLabel: 'Templates & Variables', icon: LayoutTemplate },
    { id: 'actions', label: 'Action Scripts & Prompts', ariaLabel: 'Action Scripts', icon: Terminal },
    { id: 'workflows', label: 'Workflows & Multi-Step Blueprints', ariaLabel: 'Workflows', icon: Workflow },
    { id: 'tokens', label: 'Token & Cost Analytics', ariaLabel: 'Token Analytics', icon: Coins },
    { id: 'formulas', label: 'Formula & Math Playground', ariaLabel: 'Formula Playground', icon: Calculator },
  ];

  const handleTabClick = (tabId: ViewSettings['activeSidebarTab']) => {
    if (settings.showSidebar && settings.activeSidebarTab === tabId) {
      toggleSidebar();
    } else {
      setActiveSidebarTab(tabId);
    }
  };

  return (
    <aside 
      aria-label="Activity Bar"
      className="theme-activitybar w-12 hidden md:flex flex-col items-center py-2.5 justify-between shrink-0 select-none z-20"
    >
      {/* Top Primary Navigation Items */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = settings.showSidebar && settings.activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              title={item.label}
              aria-label={item.ariaLabel}
              aria-pressed={isActive}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative ${
                isActive 
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <div className="absolute right-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-l" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Utility Actions */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        {/* Preferences */}
        <button
          onClick={() => handleTabClick('settings')}
          title="Preferences & Themes"
          aria-label="Preferences and Themes"
          aria-pressed={settings.showSidebar && settings.activeSidebarTab === 'settings'}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            settings.showSidebar && settings.activeSidebarTab === 'settings' 
              ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
