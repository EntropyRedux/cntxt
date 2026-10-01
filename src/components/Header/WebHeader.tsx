import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Check, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  PanelTop, 
  Eye, 
  Code2, 
  Columns, 
  Maximize2, 
  Minimize2, 
  Search, 
  LogOut, 
  User, 
  Sparkles,
  FileText,
  FolderOpen,
  Save,
  Download,
  Sidebar as SidebarIcon,
  HelpCircle,
  Command
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { AppUiEvents } from '../../ui-contract/actionContract';

export interface WebHeaderProps {
  events: AppUiEvents;
  onOpenOnboarding?: () => void;
  className?: string;
  isAutoHidden?: boolean;
}

export const WebHeader: React.FC<WebHeaderProps> = ({
  events,
  onOpenOnboarding,
  className = '',
  isAutoHidden = false,
}) => {
  const { tabs, activeTabId, updateTabMetadata, createTab } = useTabStore();
  const { settings, updateSettings, toggleSidebar, toggleRibbon, toggleEditorMode } = useSettingsStore();
  const { user, isGuestMode, syncStatus, signOut, triggerSync } = useAuthStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Document Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Dropdown States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Zen Mode (hides sidebars and status bar)
  const isZenMode = !settings.showSidebar && !settings.showStatusBar && !settings.showActivityBar;
  const isRendered = (settings.editorMode || 'rendered') === 'rendered';

  const toggleZenMode = () => {
    if (isZenMode) {
      updateSettings({
        showSidebar: true,
        showStatusBar: true,
        showActivityBar: true,
      });
    } else {
      updateSettings({
        showSidebar: false,
        showStatusBar: false,
        showActivityBar: false,
      });
    }
  };

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Title edit handling
  const startEditingTitle = () => {
    if (!activeTab) return;
    setTitleInput(activeTab.title);
    setIsEditingTitle(true);
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 20);
  };

  const commitTitleEdit = () => {
    if (activeTab && titleInput.trim()) {
      updateTabMetadata(activeTab.id, { title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  return (
    <header
      className={`h-11 w-full bg-[var(--titlebar-bg)] border-b border-[var(--border-subtle)] flex items-center justify-between px-2.5 sm:px-3 shrink-0 z-30 select-none transition-transform duration-300 ease-in-out font-sans ${
        isAutoHidden ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
    >
      {/* ── Left: App Brand & Inline Title & Sync Status ── */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Menu Dropdown Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-7 h-7 rounded-md hover:bg-[var(--card-hover-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            title="Document & Workspace Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-8.5 w-56 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1 z-50 text-xs text-[var(--text-primary)] backdrop-blur-md">
              <button
                onClick={() => {
                  createTab('Untitled.md', '# Untitled Document\n\n', 'markdown');
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>New Document</span>
              </button>
              <button
                onClick={() => {
                  events.onOpenFile();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Open File...</span>
              </button>
              <button
                onClick={() => {
                  events.onSaveFile();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Save to Local File</span>
              </button>
              <button
                onClick={() => {
                  events.onExportWorkspace();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Export Workspace JSON</span>
              </button>
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                onClick={() => {
                  toggleSidebar();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer"
              >
                <SidebarIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Toggle Drawer ({settings.showSidebar ? 'Hide' : 'Show'})</span>
              </button>
              {onOpenOnboarding && (
                <button
                  onClick={() => {
                    onOpenOnboarding();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2.5 cursor-pointer text-[var(--accent-primary)] font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Onboarding & Superpowers</span>
                </button>
              )}

              {tabs.length > 1 && (
                <div className="mt-1 pt-1 border-t border-[var(--border-subtle)]">
                  <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Switch Document ({tabs.length})
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => {
                          useTabStore.getState().setActiveTabId(tab.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between text-xs cursor-pointer ${
                          tab.id === activeTabId
                            ? 'bg-[var(--accent-container)]/50 text-[var(--accent-primary)] font-medium'
                            : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="truncate pr-2">{tab.title}</span>
                        {tab.id === activeTabId && (
                          <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brand Icon & Name */}
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <img 
            src="/logo.png" 
            alt="CNTXT" 
            className="w-5 h-5 rounded-xs object-contain shrink-0 shadow-2xs" 
          />
          <span className="font-bold text-xs tracking-wider text-[var(--text-primary)] hidden sm:inline">
            .CNTXT
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-4 bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {/* Editable Title */}
        <div className="flex items-center min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-xs">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={commitTitleEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitleEdit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              className="bg-[var(--editor-bg)] text-[var(--text-primary)] text-xs px-2 py-0.5 rounded outline-none border border-[var(--accent-primary)] w-full"
            />
          ) : (
            <button
              onClick={startEditingTitle}
              className="text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] truncate px-1.5 py-0.5 rounded hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer text-left"
              title="Click to rename document"
            >
              {activeTab ? activeTab.title : 'Untitled.md'}
            </button>
          )}
        </div>

        {/* Cloud Sync Status Indicator */}
        <div className="hidden lg:flex items-center ml-1">
          {user ? (
            <button
              onClick={triggerSync}
              className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-0.5 rounded-full bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] transition-colors"
              title="Click to trigger manual cloud sync"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-[var(--accent-primary)] animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span className="text-[var(--text-secondary)]">Saved</span>
                </>
              )}
            </button>
          ) : isGuestMode ? (
            <div 
              className="flex items-center gap-1 text-[10.5px] font-medium text-[var(--status-warning,#eab308)] px-2 py-0.5 rounded-full bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)]"
              title="Guest Mode: Auto-saved to browser IndexedDB"
            >
              <CloudOff className="w-3 h-3 opacity-80" />
              <span>Offline Guest</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Center: Workspace Controls (Ribbon, Render Mode, Preview) ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Modular Ribbon Toggle */}
        <button
          onClick={toggleRibbon}
          className={`h-6.5 px-2 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer border ${
            settings.showRibbon !== false
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40 shadow-2xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-bg)] border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)]'
          }`}
          title="Toggle Modular Ribbon Toolbox (Ctrl+Shift+R)"
        >
          <PanelTop className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Ribbon</span>
        </button>

        {/* Rendered vs Raw Mode Switcher */}
        <button
          onClick={toggleEditorMode}
          className={`h-6.5 px-2 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer border ${
            isRendered
              ? 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)]'
              : 'bg-[var(--card-secondary-bg)] text-[var(--status-warning,#eab308)] border-[var(--status-warning,#eab308)]/40'
          }`}
          title="Toggle Rendered Markdown vs Raw Source (Ctrl+M)"
        >
          {isRendered ? <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> : <Code2 className="w-3.5 h-3.5" />}
          <span className="hidden md:inline">{isRendered ? 'Rendered' : 'Raw'}</span>
        </button>

        {/* Live Preview Toggle */}
        <button
          onClick={() => updateSettings({ showLivePreview: !settings.showLivePreview })}
          className={`h-6.5 px-2 rounded-md flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer border ${
            settings.showLivePreview
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-2xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-bg)] border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)]'
          }`}
          title="Toggle Split Live Preview"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>

      {/* ── Right: Command Palette, Zen Mode, & User Avatar ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Command Palette Trigger */}
        <button
          onClick={events.onOpenCommandPalette}
          className="h-6.5 px-2 flex items-center gap-1.5 rounded-md bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)] hover:border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs transition-all cursor-pointer shadow-xs"
          title="Command Palette (Ctrl+K or ⌘K)"
        >
          <Search className="w-3 h-3" />
          <span className="hidden md:inline text-[11px]">Search</span>
          <Command className="w-3 h-3 opacity-60 ml-0.5 hidden sm:inline" />
        </button>

        {/* Zen Mode Button */}
        <button
          onClick={toggleZenMode}
          className={`w-6.5 h-6.5 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
            isZenMode
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--card-bg)] border-[var(--border-subtle)] hover:bg-[var(--card-hover-bg)]'
          }`}
          title={isZenMode ? 'Exit Zen Mode' : 'Zen Focus Mode (Distraction-Free)'}
        >
          {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* User Profile / Auth Button */}
        <div className="relative" ref={userMenuRef}>
          {user ? (
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center p-0.5 rounded-full hover:ring-2 hover:ring-[var(--accent-primary)]/50 transition-all cursor-pointer"
              title={user.name || user.email}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-6.5 h-6.5 rounded-full object-cover border border-[var(--border-primary)]"
                />
              ) : (
                <div className="w-6.5 h-6.5 rounded-full bg-[var(--accent-primary)] text-white text-[11px] font-semibold flex items-center justify-center">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => signOut()}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-[var(--accent-primary)] hover:opacity-90 text-white shadow-xs transition-opacity cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* User Menu Dropdown */}
          {isUserMenuOpen && user && (
            <div className="absolute right-0 top-8.5 w-56 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-lg shadow-xl py-1.5 z-50 text-xs text-[var(--text-primary)] backdrop-blur-md">
              <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                <p className="font-semibold truncate">{user.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  triggerSync();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Sync Library Now</span>
              </button>
              {onOpenOnboarding && (
                <button
                  onClick={() => {
                    onOpenOnboarding();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Product Tour</span>
                </button>
              )}
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                onClick={() => {
                  signOut();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--card-hover-bg)] text-[var(--status-error,#ef4444)] flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
