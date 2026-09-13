import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Edit3, 
  Eye, 
  Wrench, 
  HelpCircle, 
  Sun, 
  Moon, 
  PanelLeft, 
  Command, 
  Code2, 
  Smartphone,
  SlidersHorizontal,
  Variable,
  Terminal,
  Check
} from 'lucide-react';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { ThemeName } from '../types';
import { AppUiEvents } from '../ui-contract/actionContract';

export interface ShellTitleBarProps {
  events: AppUiEvents;
}

export const ShellTitleBar: React.FC<ShellTitleBarProps> = ({
  events
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const { createTab, closeTab, activeTabId } = useTabStore();
  const { 
    settings, 
    setTheme, 
    toggleActivityBar, 
    toggleRibbon,
    toggleEditorMode, 
    toggleSidebarOverlay,
    setActiveSidebarTab,
    updateSettings 
  } = useSettingsStore();

  // Close menus on outside click / tap or Escape key
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const themes: { id: ThemeName; name: string }[] = [
    { id: 'google-material-3', name: 'Google Material 3 (Light)' },
    { id: 'parchment', name: 'Parchment (Warm Linen)' },
    { id: 'contextpad-dark', name: 'ContextPad Dark (Default)' },
    { id: 'one-dark', name: 'One Dark Pro' },
    { id: 'dracula', name: 'Dracula' },
    { id: 'nord', name: 'Nord' },
    { id: 'monokai', name: 'Monokai' },
    { id: 'github-dark', name: 'GitHub Dark' },
    { id: 'github-light', name: 'GitHub Light' },
    { id: 'solarized-dark', name: 'Solarized Dark' },
  ];

  const menuGroups = [
    {
      id: 'file',
      label: 'File',
      icon: FileText,
      items: [
        { label: 'New Tab', shortcut: 'Ctrl+N', action: () => createTab() },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: events.onNewWindow },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: events.onOpenFile },
        { label: 'Save Document', shortcut: 'Ctrl+S', action: events.onSaveFile },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: events.onSaveAs },
        { 
          label: 'Close Current Tab', 
          shortcut: 'Ctrl+W', 
          action: () => { if (activeTabId) closeTab(activeTabId); } 
        },
        { isDivider: true },
        { label: 'Export Workspace...', shortcut: 'JSON', action: events.onExportWorkspace },
        { label: 'Import Workspace...', shortcut: 'JSON', action: events.onImportWorkspace },
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: Edit3,
      items: [
        { label: 'Insert Variable...', shortcut: 'Alt+V', action: events.onOpenVariableModal },
        { label: 'Action Scripts Editor...', action: () => events.onOpenActionEditor() },
        { isDivider: true },
        { label: 'Command Palette', shortcut: 'Ctrl+K', action: events.onOpenCommandPalette },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: events.onOpenShortcuts },
      ]
    },
    {
      id: 'view',
      label: 'View',
      icon: Eye,
      items: [
        { 
          label: settings.showActivityBar ? 'Hide Left Rail' : 'Show Left Rail', 
          shortcut: 'Ctrl+B', 
          action: toggleActivityBar 
        },
        { 
          label: settings.showRibbon ? 'Hide Formatting Ribbon' : 'Show Formatting Ribbon', 
          action: toggleRibbon 
        },
        { 
          label: settings.sidebarOverlay ? 'Right Panel: Switch to Docked' : 'Right Panel: Switch to Overlay', 
          action: toggleSidebarOverlay 
        },
        { 
          label: settings.editorMode === 'rendered' ? 'Switch to Raw Markdown' : 'Switch to Live Rendered View', 
          shortcut: 'Ctrl+M', 
          action: toggleEditorMode 
        },
        { isDivider: true },
        { 
          label: 'Density: Desktop', 
          action: () => updateSettings({ uiDensity: 'desktop', touchOptimized: false }) 
        },
        { 
          label: 'Density: Touch Optimized', 
          action: () => updateSettings({ uiDensity: 'touch', touchOptimized: true })
        }
      ]
    },
    {
      id: 'tools',
      label: 'Tools',
      icon: Wrench,
      items: [
        { 
          label: 'Command Palette', 
          shortcut: 'Ctrl+K', 
          action: events.onOpenCommandPalette 
        },
        { 
          label: 'Template & Variables', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('templates');
          } 
        },
        { 
          label: 'Action Scripts', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('actions');
          } 
        },
        { 
          label: 'Workflows', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('workflows');
          } 
        },
        { 
          label: 'Token Analytics', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('tokens');
          } 
        },
        { 
          label: 'Formula Playground', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('formulas');
          } 
        },
        { 
          label: 'File Explorer', 
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('explorer');
          } 
        },
        { 
          label: 'Document Outline', 
          shortcut: 'Ctrl+Shift+O',
          action: () => {
            updateSettings({ showSidebar: true });
            setActiveSidebarTab('outline');
          } 
        },
      ]
    },
    {
      id: 'help',
      label: 'Help',
      icon: HelpCircle,
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+K', action: events.onOpenCommandPalette },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: events.onOpenShortcuts },
        { isDivider: true },
        { label: 'About ContextPad', action: () => {
          useNotificationStore.getState().addNotification(
            'ContextPad Desktop Shell',
            'Portable, decoupled prompt engineering and markdown editor UI.',
            'info'
          );
        }}
      ]
    }
  ];

  const isLightMode = settings.theme === 'google-material-3' || settings.theme === 'github-light' || settings.theme === 'parchment';
  const isRendered = (settings.editorMode || 'rendered') === 'rendered';

  return (
    <header 
      ref={headerRef}
      className={`h-10 bg-[var(--titlebar-bg)] border-b border-[var(--border-primary)] flex items-center justify-between px-2 sm:px-3 shrink-0 select-none gap-2 min-w-0 relative overflow-visible ${
        openMenu !== null ? 'z-50' : 'z-40'
      }`}
    >
      {/* Left: Rail Toggle & Menus */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative overflow-visible">
        <div className="flex items-center pr-1.5 sm:pr-2 border-r border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={toggleActivityBar}
            title={settings.showActivityBar ? "Hide Left Rail (Ctrl+B)" : "Show Left Rail (Ctrl+B)"}
            aria-label={settings.showActivityBar ? "Hide Left Rail" : "Show Left Rail"}
            aria-pressed={settings.showActivityBar}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors shrink-0 cursor-pointer ${
              settings.showActivityBar 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]/50 hover:bg-[var(--accent-container)]/80' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Dropdown Menus */}
        <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Menu bar">
          {menuGroups.map((menu) => {
            const MenuIcon = menu.icon;
            const isOpen = openMenu === menu.id;

            return (
              <div key={menu.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenu(prev => prev === menu.id ? null : menu.id)}
                  onMouseEnter={() => {
                    if (openMenu !== null && openMenu !== 'theme') {
                      setOpenMenu(menu.id);
                    }
                  }}
                  title={`${menu.label} Menu`}
                  aria-label={`${menu.label} Menu`}
                  aria-expanded={isOpen}
                  className={`h-7 px-2 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                    isOpen
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <MenuIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{menu.label}</span>
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full mt-1 w-56 sm:w-60 bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
                    {menu.items.map((item, idx) => {
                      if (item.isDivider) {
                        return <div key={idx} className="my-1 border-t border-[var(--border-subtle)]" />;
                      }
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            item.action?.();
                            setOpenMenu(null);
                          }}
                          aria-label={item.label}
                          title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
                          className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="truncate">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[10px] font-mono opacity-60 ml-2 shrink-0">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right: Quick Tools, Theme & Panel Toggles */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Rendered vs Raw Markdown Switcher */}
        <button
          type="button"
          onClick={toggleEditorMode}
          title={
            isRendered
              ? 'Switch to Raw Markdown Mode (Ctrl+M)'
              : 'Switch to Live Rendered View (Ctrl+M)'
          }
          aria-label={`Editor mode: currently in ${isRendered ? 'Rendered' : 'Raw'} mode. Click to switch.`}
          aria-pressed={isRendered}
          className={`h-7 px-2 flex items-center gap-1.5 rounded-md transition-all border text-xs cursor-pointer ${
            isRendered
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 hover:bg-[var(--accent-container)]/80'
              : 'bg-[var(--card-secondary-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/40 hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          {isRendered ? (
            <>
              <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span className="hidden md:inline font-medium text-[11px]">Rendered</span>
            </>
          ) : (
            <>
              <Code2 className="w-3.5 h-3.5 text-[var(--status-warning)] shrink-0" />
              <span className="hidden md:inline font-medium text-[11px]">Raw</span>
            </>
          )}
        </button>

        {/* Quick Command Palette Button */}
        <button
          type="button"
          onClick={events.onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
          aria-label="Command Palette (Ctrl+K)"
          className="w-7 h-7 flex items-center justify-center bg-[var(--editor-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md transition-colors hover:border-[var(--border-primary)] cursor-pointer"
        >
          <Command className="w-3.5 h-3.5" />
        </button>

        {/* Touch Mode Quick Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextTouch = !settings.touchOptimized;
            updateSettings({
              touchOptimized: nextTouch,
              uiDensity: nextTouch ? 'touch' : 'desktop'
            });
          }}
          title={settings.touchOptimized ? 'Disable Touch Mode' : 'Enable Touch Mode'}
          aria-label={settings.touchOptimized ? 'Disable Touch Mode' : 'Enable Touch Mode'}
          className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-colors cursor-pointer ${
            settings.touchOptimized 
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
        </button>

        {/* Theme Picker Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(prev => prev === 'theme' ? null : 'theme')}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              openMenu === 'theme'
                ? 'bg-[var(--accent-primary)] text-white'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
            title="Switch Theme"
            aria-label="Switch Theme"
            aria-expanded={openMenu === 'theme'}
          >
            {isLightMode ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          
          {openMenu === 'theme' && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)]">
                Color Themes
              </div>
              <div className="max-h-64 overflow-y-auto py-0.5">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTheme(t.id);
                      setOpenMenu(null);
                    }}
                    aria-label={`Theme: ${t.name}`}
                    title={t.name}
                    className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                      settings.theme === t.id
                        ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                    }`}
                  >
                    <span>{t.name}</span>
                    {settings.theme === t.id && (
                      <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

