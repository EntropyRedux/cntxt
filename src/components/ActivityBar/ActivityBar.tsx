import React, { useRef, useState } from 'react';
import { 
  FolderTree, 
  ListTree,
  LayoutTemplate, 
  Zap, 
  Settings,
  User,
  FolderGit2,
  Boxes
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { ViewSettings } from '../../types';
import { AuthPopover } from '../Auth/AuthPopover';
import { AuthBottomSheet } from '../Auth/AuthBottomSheet';
import { PersonalGitHubLibraryModal } from '../Sidebar/PersonalGitHubLibraryModal';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useBuilderStore } from '../../features/panelApps/state/builderStore';
import { AppRail } from '../panelApps/AppRail';

export interface ActivityBarProps {
  orientation?: 'vertical' | 'bottom';
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ orientation = 'vertical' }) => {
  const { settings, setActiveSidebarTab, toggleSidebar } = useSettingsStore();
  const { user } = useAuthStore();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  const userButtonRef = useRef<HTMLButtonElement>(null);
  const touchUserButtonRef = useRef<HTMLButtonElement>(null);

  const navItems: { id: ViewSettings['activeSidebarTab']; label: string; ariaLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'explorer', label: 'File Explorer (Ctrl+Shift+E)', ariaLabel: 'File Explorer', icon: FolderTree },
    { id: 'outline', label: 'Document Outline (Ctrl+Shift+O)', ariaLabel: 'Document Outline', icon: ListTree },
    { id: 'templates', label: 'Templates & Variables (Ctrl+Alt+T)', ariaLabel: 'Templates & Variables', icon: LayoutTemplate },
    { id: 'actions', label: 'Action Scripts & Prompts', ariaLabel: 'Action Scripts', icon: Zap },
    { id: 'code-blocks', label: 'Code Block Builder (Ctrl+Shift+B)', ariaLabel: 'Code Block Builder', icon: Boxes },
  ];

  const handleTabClick = (tabId: ViewSettings['activeSidebarTab']) => {
    if (settings.showSidebar && settings.activeSidebarTab === tabId) {
      toggleSidebar();
    } else {
      setActiveSidebarTab(tabId);
    }
  };

  const { apps, activeId, open: openPanelApp } = usePanelAppsStore();
  const { start: startAppBuilder } = useBuilderStore();

  const handleOpenBuilder = () => {
    setActiveSidebarTab('app-builder');
    startAppBuilder();
  };

  const handleOpenApp = (id: string) => {
    openPanelApp(id);
    setActiveSidebarTab('panel-app');
  };

  if (orientation === 'bottom') {
    return (
      <>
        <nav 
          aria-label="Touch Navigation Bar"
          className="theme-activitybar w-full border-t border-[var(--border-subtle)] bg-[var(--activitybar-bg)] h-12 flex items-center justify-between px-2 sm:px-4 shrink-0 select-none relative z-20 overflow-x-auto no-scrollbar shadow-xs"
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
                  className={`min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 cursor-pointer ${
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

            {/* Panel Apps Dynamic Rail (Touch) */}
            <AppRail
              apps={apps}
              activeId={settings.activeSidebarTab === 'panel-app' ? activeId : null}
              isBuilderActive={settings.showSidebar && settings.activeSidebarTab === 'app-builder'}
              onOpenApp={handleOpenApp}
              onOpenBuilder={handleOpenBuilder}
              orientation="horizontal"
            />

            {/* Separator */}
            <div className="h-5 w-px bg-[var(--border-subtle)] mx-0.5 sm:mx-1 shrink-0" />

            {/* Personal GitHub Library Trigger */}
            <button
              type="button"
              onClick={() => setIsGitHubModalOpen(true)}
              title={user?.githubLibrary ? `GitHub: ${user.githubLibrary.repoName}` : "Personal GitHub Library"}
              aria-label="Personal GitHub Library"
              className={`min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 cursor-pointer ${
                user?.githubLibrary 
                  ? 'text-purple-400 bg-purple-500/10' 
                  : 'text-[var(--text-muted)] hover:text-purple-400 hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <FolderGit2 className="w-4.5 h-4.5" />
            </button>

            {/* User Profile / Auth Button */}
            <button
              ref={touchUserButtonRef}
              type="button"
              onClick={() => setIsSheetOpen(true)}
              title={user ? `${user.name} (${user.email})` : "Sign In / Account"}
              aria-label="User Account"
              className="min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {user?.avatarUrl ? (
                <div className="relative">
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover ring-1 ring-[var(--accent-primary)]"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[var(--activitybar-bg)]" />
                </div>
              ) : (
                <User className="w-4.5 h-4.5" />
              )}
            </button>

            {/* Preferences / Settings */}
            <button
              type="button"
              onClick={() => handleTabClick('settings')}
              title="Preferences & Themes"
              aria-label="Preferences and Themes"
              aria-pressed={settings.showSidebar && settings.activeSidebarTab === 'settings'}
              className={`min-w-[40px] h-10 px-2 rounded-lg flex items-center justify-center transition-all relative shrink-0 active:scale-95 cursor-pointer ${
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

        {/* Mobile Auth Bottom Sheet */}
        <AuthBottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        />

        {/* Personal GitHub Library Modal */}
        <PersonalGitHubLibraryModal
          isOpen={isGitHubModalOpen}
          onClose={() => setIsGitHubModalOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <aside 
        aria-label="Activity Bar"
        className="theme-activitybar w-11 sm:w-12 h-full flex flex-col items-center py-2 justify-between shrink-0 select-none relative z-30 overflow-y-auto no-scrollbar border-r border-[var(--border-subtle)]"
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
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer ${
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

          {/* Panel Apps Dynamic Rail (Desktop) */}
          <AppRail
            apps={apps}
            activeId={settings.activeSidebarTab === 'panel-app' ? activeId : null}
            isBuilderActive={settings.showSidebar && settings.activeSidebarTab === 'app-builder'}
            onOpenApp={handleOpenApp}
            onOpenBuilder={handleOpenBuilder}
            orientation="vertical"
          />
        </div>

        {/* Bottom Utility Actions */}
        <div className="flex flex-col items-center space-y-1.5 w-full">
          {/* Personal GitHub Cloud Library Quick Launcher */}
          <button
            type="button"
            onClick={() => setIsGitHubModalOpen(true)}
            title={user?.githubLibrary ? `GitHub: ${user.githubLibrary.repoOwner}/${user.githubLibrary.repoName}` : "Personal GitHub Cloud Library (Free Storage)"}
            aria-label="Personal GitHub Library"
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              user?.githubLibrary 
                ? 'text-purple-400 bg-purple-500/10 hover:bg-purple-500/20' 
                : 'text-[var(--text-muted)] hover:text-purple-400 hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
          </button>

          {/* User Profile / Auth Avatar Button */}
          <button
            ref={userButtonRef}
            type="button"
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            title={user ? `${user.name} (${user.email})` : "Sign In to CNTXT"}
            aria-label="User Account"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]"
          >
            {user?.avatarUrl ? (
              <div className="relative">
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-[var(--accent-primary)]"
                />
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[var(--activitybar-bg)]" />
              </div>
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>

          {/* Preferences */}
          <button
            onClick={() => handleTabClick('settings')}
            title="Preferences & Themes"
            aria-label="Preferences and Themes"
            aria-pressed={settings.showSidebar && settings.activeSidebarTab === 'settings'}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              settings.showSidebar && settings.activeSidebarTab === 'settings' 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Desktop Auth Popover */}
      <AuthPopover
        anchorRef={userButtonRef}
        isOpen={isPopoverOpen}
        onClose={() => setIsPopoverOpen(false)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Personal GitHub Library Modal */}
      <PersonalGitHubLibraryModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </>
  );
};
