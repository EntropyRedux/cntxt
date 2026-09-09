import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Settings, 
  FolderOpen, 
  Save, 
  Plus, 
  Palette, 
  Command, 
  HelpCircle, 
  Sun, 
  Moon, 
  PanelRight, 
  Sidebar as SidebarIcon,
  Download,
  Upload,
  Touchpad,
  Smartphone
} from 'lucide-react';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { ThemeName } from '../types';
import { ShellMode } from '../ui-contract/appShellContract';
import { AppUiEvents } from '../ui-contract/actionContract';
import { ShellModeSwitcher } from './ShellModeSwitcher';

export interface ShellTitleBarProps {
  events: AppUiEvents;
  shellMode: ShellMode;
  onShellModeChange: (mode: ShellMode) => void;
}

export const ShellTitleBar: React.FC<ShellTitleBarProps> = ({
  events,
  shellMode,
  onShellModeChange
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { createTab, saveCurrentTab } = useTabStore();
  const { 
    settings, 
    setTheme, 
    toggleSidebar, 
    toggleActivityBar, 
    toggleEditorMode, 
    updateSettings 
  } = useSettingsStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themes: { id: ThemeName; name: string }[] = [
    { id: 'google-material-3', name: 'Google Material 3 (Light)' },
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
        { isDivider: true },
        { label: 'Export Workspace...', shortcut: 'JSON', action: events.onExportWorkspace },
        { label: 'Import Workspace...', shortcut: 'JSON', action: events.onImportWorkspace },
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { 
          label: settings.showSidebar ? 'Hide Sidebar' : 'Show Sidebar', 
          shortcut: 'Ctrl+B', 
          action: toggleSidebar 
        },
        { 
          label: settings.showActivityBar ? 'Hide Activity Bar' : 'Show Activity Bar', 
          action: toggleActivityBar 
        },
        { 
          label: settings.editorMode === 'rendered' ? 'Switch to Raw Markdown' : 'Switch to Live Rendered View', 
          shortcut: 'Ctrl+M', 
          action: toggleEditorMode 
        },
        { isDivider: true },
        { 
          label: 'Density: Compact', 
          action: () => updateSettings({ uiDensity: 'compact' }) 
        },
        { 
          label: 'Density: Comfortable', 
          action: () => updateSettings({ uiDensity: 'comfortable' }) 
        },
        { 
          label: 'Density: Touchscreen Optimized', 
          action: () => updateSettings({ uiDensity: 'touch', touchOptimized: true })
        }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+K', action: events.onOpenCommandPalette },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', action: events.onOpenShortcuts },
        { isDivider: true },
        { label: 'About CNTXT Parallel Frontend', action: () => {
          useNotificationStore.getState().addNotification(
            'CNTXT Frontend Scaffold',
            'Portable, decoupled UI layer ready for desktop runtime binding.',
            'info'
          );
        }}
      ]
    }
  ];

  const isLightMode = settings.theme === 'google-material-3' || settings.theme === 'github-light';

  return (
    <header className="h-10 bg-[var(--titlebar-bg)] border-b border-[var(--border-primary)] flex items-center justify-between px-3 shrink-0 select-none z-30">
      {/* Left: App Branding & Menus */}
      <div className="flex items-center gap-2" ref={menuRef}>
        <div className="flex items-center gap-2 pr-2 border-r border-[var(--border-subtle)]">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-[var(--accent-primary)] to-blue-400 flex items-center justify-center text-white shadow-xs">
            <span className="font-mono font-bold text-[10px]">C</span>
          </div>
          <span className="font-semibold text-xs tracking-tight text-[var(--text-primary)] hidden sm:inline">
            CNTXT
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] hidden lg:inline">
            Parallel UI
          </span>
        </div>

        {/* Dropdown Menus */}
        <div className="flex items-center gap-0.5">
          {menuGroups.map((menu) => (
            <div key={menu.id} className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  openMenu === menu.id
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] font-medium shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                {menu.label}
              </button>

              {openMenu === menu.id && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
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
                        className="w-full px-3 py-1.5 text-xs text-left flex items-center justify-between text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[10px] font-mono opacity-60">
                            {item.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center: Shell Mode Switcher */}
      <div className="hidden md:flex items-center">
        <ShellModeSwitcher 
          currentMode={shellMode} 
          onModeChange={onShellModeChange} 
        />
      </div>

      {/* Right: Quick Tools, Theme & Panel Toggles */}
      <div className="flex items-center gap-1.5">
        {/* Quick Command Palette Button */}
        <button
          type="button"
          onClick={events.onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-2 py-1 bg-[var(--editor-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-md text-xs transition-colors hover:border-[var(--border-primary)]"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="text-[11px]">Command Palette</span>
          <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">
            Ctrl+K
          </kbd>
        </button>

        {/* Touch Mode Quick Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextTouch = !settings.touchOptimized;
            updateSettings({
              touchOptimized: nextTouch,
              uiDensity: nextTouch ? 'touch' : 'comfortable'
            });
          }}
          title={settings.touchOptimized ? 'Disable Touch Mode' : 'Enable Touch Mode'}
          className={`p-1.5 rounded-md text-xs transition-colors ${
            settings.touchOptimized 
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
        </button>

        {/* Theme Picker Dropdown */}
        <div className="relative group">
          <button
            type="button"
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded-md transition-colors"
            title="Switch Theme"
          >
            {isLightMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--dropdown-bg)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 z-50 hidden group-hover:block hover:block">
            <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)]">
              Color Themes
            </div>
            {themes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                  settings.theme === t.id
                    ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium'
                    : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <span>{t.name}</span>
                {settings.theme === t.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Sidebar Icon */}
        <button
          type="button"
          onClick={toggleSidebar}
          title="Toggle Sidebar (Ctrl+B)"
          className={`p-1.5 rounded-md transition-colors ${
            settings.showSidebar 
              ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]/50' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
