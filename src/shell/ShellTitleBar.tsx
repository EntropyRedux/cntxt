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
  Check,
  Search
} from 'lucide-react';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { ThemeName } from '../types';
import { AppUiEvents } from '../ui-contract/actionContract';
import { addWindowListener, useRuntimeBridge, useWindowDrag } from '../adapters';
import { WindowControls } from '../components/TitleBar/WindowControls';

export interface ShellTitleBarProps {
  events: AppUiEvents;
}

export const ShellTitleBar: React.FC<ShellTitleBarProps> = ({
  events
}) => {
  const bridge = useRuntimeBridge();
  const { handleMouseDown: handleWindowDrag } = useWindowDrag(bridge);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a')
    ) {
      return;
    }
    bridge.window.toggleMaximize?.();
  };

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

    const removePointer = addWindowListener('pointerdown', handlePointerDown);
    const removeKey = addWindowListener('keydown', handleKeyDown);
    return () => {
      removePointer();
      removeKey();
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
      className={`flex flex-col shrink-0 select-none relative overflow-visible ${
        openMenu !== null ? 'z-50' : 'z-40'
      }`}
    >
      {/* Row 1: Themed Window Title Bar & Centered Quick Tools */}
      <div 
        data-tauri-drag-region
        onMouseDown={handleWindowDrag}
        onDoubleClick={handleTitleBarDoubleClick}
        className="h-9 bg-[var(--titlebar-bg)] border-b border-[var(--border-primary)] flex items-center justify-between px-2 sm:px-3 shrink-0 gap-2 min-w-0 relative overflow-visible cursor-default select-none"
      >
        {/* Left: Brand + Left Rail Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div 
            className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-primary)] px-1 tracking-wider select-none cursor-default"
            onMouseDown={handleWindowDrag}
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0" />
            <span>CNTXT</span>
          </div>
          <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5" />
          <button
            type="button"
            onClick={toggleActivityBar}
            title={settings.showActivityBar ? "Hide Left Rail (Ctrl+B)" : "Show Left Rail (Ctrl+B)"}
            aria-label={settings.showActivityBar ? "Hide Left Rail" : "Show Left Rail"}
            aria-pressed={settings.showActivityBar}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors shrink-0 cursor-pointer ${
              settings.showActivityBar 
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]/50 hover:bg-[var(--accent-container)]/80' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Drag Spacer Left */}
        <div 
          className="flex-1 h-full min-w-3 cursor-default select-none" 
          data-tauri-drag-region
          onMouseDown={handleWindowDrag}
          onDoubleClick={handleTitleBarDoubleClick}
        />

        {/* Center: Search, Render MODE, Command Palette, Touch Mode, Theme Selection */}
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick Search / Command Palette Bar */}
          <button
            type="button"
            onClick={events.onOpenCommandPalette}
            title="Search / Command Palette (Ctrl+K)"
            aria-label="Search / Command Palette"
            className="h-6 px-2 sm:px-2.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--editor-bg)]/80 hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] hover:border-[var(--border-primary)] rounded-md transition-all cursor-pointer max-w-[190px] truncate shadow-xs"
          >
            <Search className="w-3 h-3 shrink-0" />
            <span className="text-[11px] truncate hidden md:inline">Search (Ctrl+K)</span>
            <Command className="w-3 h-3 shrink-0 opacity-60 ml-auto hidden sm:inline" />
          </button>

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
            className={`h-6 px-2 flex items-center gap-1 rounded-md transition-all border text-xs cursor-pointer ${
              isRendered
                ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 hover:bg-[var(--accent-container)]/80'
                : 'bg-[var(--card-secondary-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/40 hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            {isRendered ? (
              <>
                <Eye className="w-3 h-3 text-[var(--accent-primary)] shrink-0" />
                <span className="font-medium text-[10.5px]">Rendered</span>
              </>
            ) : (
              <>
                <Code2 className="w-3 h-3 text-[var(--status-warning)] shrink-0" />
                <span className="font-medium text-[10.5px]">Raw</span>
              </>
            )}
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
            className={`h-6 px-2 flex items-center gap-1 rounded-md text-xs transition-colors cursor-pointer border ${
              settings.touchOptimized 
                ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border border-[var(--accent-primary)]/40' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border-transparent'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span className="text-[10.5px] hidden lg:inline">Touch</span>
          </button>

          {/* Theme Picker Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(prev => prev === 'theme' ? null : 'theme')}
              className={`h-6 px-2 flex items-center gap-1 rounded-md transition-colors cursor-pointer border ${
                openMenu === 'theme'
                  ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border-transparent'
              }`}
              title="Switch Theme"
              aria-label="Switch Theme"
              aria-expanded={openMenu === 'theme'}
            >
              {isLightMode ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3" />}
              <span className="text-[10.5px] hidden xl:inline">Theme</span>
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

        {/* Drag Spacer Right */}
        <div 
          className="flex-1 h-full min-w-3 cursor-default select-none" 
          data-tauri-drag-region
          onMouseDown={handleWindowDrag}
          onDoubleClick={handleTitleBarDoubleClick}
        />

        {/* Right: Themed Window Controls (Tauri Desktop only; null in Web) */}
        <div className="flex items-center shrink-0 h-full -mr-2 sm:-mr-3">
          <WindowControls />
        </div>
      </div>

      {/* Row 2: Compact Menu Bar (File, Edit, View, Tools, Help) */}
      <nav 
        data-tauri-drag-region
        onMouseDown={handleWindowDrag}
        onDoubleClick={handleTitleBarDoubleClick}
        className={`bg-[var(--titlebar-bg)]/85 border-b border-[var(--border-subtle)] flex items-center px-2 sm:px-3 shrink-0 gap-0.5 sm:gap-1 select-none relative z-30 transition-all cursor-default ${
          settings.touchOptimized ? 'h-8.5' : 'h-7'
        }`}
        aria-label="Menu bar"
      >
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
                className={`${
                  settings.touchOptimized ? 'h-7 px-2.5 text-xs' : 'h-5.5 px-2 text-[11.5px]'
                } font-medium rounded transition-colors flex items-center gap-1 cursor-pointer select-none ${
                  isOpen
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <MenuIcon className={`${settings.touchOptimized ? 'w-3.5 h-3.5' : 'w-3 h-3'} shrink-0`} />
                <span>{menu.label}</span>
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

        {/* Trailing Drag Region for Menu Bar */}
        <div 
          className="flex-1 h-full cursor-default select-none" 
          data-tauri-drag-region
          onMouseDown={handleWindowDrag}
          onDoubleClick={handleTitleBarDoubleClick}
        />
      </nav>
    </header>
  );
};

