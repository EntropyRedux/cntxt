import React from 'react';
import { 
  FolderTree, 
  ListTree,
  LayoutTemplate, 
  Terminal, 
  Workflow, 
  Settings
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { ViewSettings } from '../../types';

export interface ActivityBarProps {
  orientation?: 'vertical' | 'bottom';
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ orientation = 'vertical' }) => {
  const { settings, setActiveSidebarTab, toggleSidebar } = useSettingsStore();

  const navItems: { id: ViewSettings['activeSidebarTab']; label: string; ariaLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'explorer', label: 'File Explorer (Ctrl+Shift+E)', ariaLabel: 'File Explorer', icon: FolderTree },
    { id: 'outline', label: 'Document Outline (Ctrl+Shift+O)', ariaLabel: 'Document Outline', icon: ListTree },
    { id: 'templates', label: 'Templates & Variables (Ctrl+Alt+T)', ariaLabel: 'Templates & Variables', icon: LayoutTemplate },
    { id: 'actions', label: 'Action Scripts & Prompts', ariaLabel: 'Action Scripts', icon: Terminal },
    { id: 'workflows', label: 'Workflows & Multi-Step Blueprints', ariaLabel: 'Workflows', icon: Workflow },
  ];

  const handleTabClick = (tabId: ViewSettings['activeSidebarTab']) => {
    if (settings.showSidebar && settings.activeSidebarTab === tabId) {
      toggleSidebar();
    } else {
      setActiveSidebarTab(tabId);
    }
  };

  if (orientation === 'bottom') {
    return (
      <nav 
        aria-label="Touch Navigation Bar"
        className="theme-activitybar w-full border-t border-[var(--border-primary)] bg-[var(--activitybar-bg)] h-12 flex items-center justify-between px-2 sm:px-4 shrink-0 select-none relative z-20 overflow-x-auto no-scrollbar shadow-xs"
      >
        <div className="flex items-center justify-around sm:justify-center sm:gap-1.5 w-full max-w-2xl mx-auto">
          {/* Primary Navigation Items */}
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = settings.showSidebar && settings.activeSidebarTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                title={item.label}
                aria-label={item.ariaLabel}
                aria-pressed={isActive}
                className={`min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 ${
                  isActive 
                    ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {isActive && (
                  <div className="absolute top-0 w-5 h-0.5 bg-[var(--accent-primary)] rounded-b" />
                )}
              </button>
            );
          })}

          {/* Separator */}
          <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 sm:mx-1 shrink-0" />

          {/* Preferences / Settings */}
          <button
            type="button"
            onClick={() => handleTabClick('settings')}
            title="Preferences & Themes"
            aria-label="Preferences and Themes"
            aria-pressed={settings.showSidebar && settings.activeSidebarTab === 'settings'}
            className={`min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 ${
              settings.showSidebar && settings.activeSidebarTab === 'settings' 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Settings className="w-4.5 h-4.5" />
            {settings.showSidebar && settings.activeSidebarTab === 'settings' && (
              <div className="absolute top-0 w-5 h-0.5 bg-[var(--accent-primary)] rounded-b" />
            )}
          </button>
        </div>
      </nav>
    );
  }

  return (
    <aside 
      aria-label="Activity Bar"
      className="theme-activitybar w-11 sm:w-12 flex flex-col items-center py-2 justify-between shrink-0 select-none relative z-30 overflow-y-auto no-scrollbar"
    >
      {/* Top Section */}
      <div className="flex flex-col items-center space-y-1.5 w-full">
        {/* Primary Navigation Items */}
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
                <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-r" />
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
