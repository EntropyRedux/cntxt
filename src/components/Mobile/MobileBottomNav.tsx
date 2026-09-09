import React from 'react';
import { 
  FolderTree, 
  ListTree, 
  LayoutTemplate, 
  Terminal, 
  Coins, 
  Settings,
  SlidersHorizontal
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { ViewSettings } from '../../types';

export const MobileBottomNav: React.FC = () => {
  const { settings, setActiveSidebarTab, toggleSidebar } = useSettingsStore();

  const navItems: { id: ViewSettings['activeSidebarTab']; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'explorer', label: 'Files', icon: FolderTree },
    { id: 'outline', label: 'Outline', icon: ListTree },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate },
    { id: 'actions', label: 'Actions', icon: Terminal },
    { id: 'tokens', label: 'Tokens', icon: Coins },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: ViewSettings['activeSidebarTab']) => {
    if (settings.showSidebar && settings.activeSidebarTab === tabId) {
      toggleSidebar();
    } else {
      setActiveSidebarTab(tabId);
    }
  };

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden border-t border-[var(--border-primary)] bg-[var(--titlebar-bg)]/98 backdrop-blur-md h-14 flex items-stretch justify-around px-1 z-30 shrink-0 select-none shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = settings.showSidebar && settings.activeSidebarTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleTabClick(item.id)}
            title={item.label}
            aria-label={item.label}
            aria-pressed={isActive}
            className={`flex-1 flex items-center justify-center py-1 transition-all rounded-lg active:scale-95 ${
              isActive 
                ? 'text-[var(--accent-primary)] font-semibold' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <div className={`p-2 rounded-md transition-colors ${isActive ? 'bg-[var(--accent-container)]' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
          </button>
        );
      })}
    </nav>
  );
};
