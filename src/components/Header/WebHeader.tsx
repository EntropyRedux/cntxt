import React, { useState, useRef, useEffect } from 'react';
import { 
  Menu, 
  Check, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Bold, 
  Italic, 
  Heading2, 
  Code, 
  Zap, 
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
  HelpCircle
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { AppUiEvents } from '../../ui-contract/actionContract';
import { editorRegistry } from '../../services/editor/editorRegistry';

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
  const { tabs, activeTabId, updateTabMetadata, insertTextAtCursor, createTab } = useTabStore();
  const { settings, updateSettings, toggleSidebar } = useSettingsStore();
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

  // Formatting helpers
  const handleWrapFormat = (prefix: string, suffix: string, placeholder: string) => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      const { state } = view;
      const selection = state.selection.main;
      const selectedText = state.sliceDoc(selection.from, selection.to);
      const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${placeholder}${suffix}`;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: replacement },
        selection: {
          anchor: selectedText ? selection.from + replacement.length : selection.from + prefix.length,
          head: selectedText ? selection.from + replacement.length : selection.from + prefix.length + placeholder.length,
        },
        scrollIntoView: true,
      });
      view.focus();
    } else {
      insertTextAtCursor(activeTabId, `${prefix}${placeholder}${suffix}`);
    }
  };

  const handleLinePrefix = (prefix: string) => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      const { state } = view;
      const selection = state.selection.main;
      const line = state.doc.lineAt(selection.from);
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: prefix },
        scrollIntoView: true,
      });
      view.focus();
    } else {
      insertTextAtCursor(activeTabId, prefix);
    }
  };

  return (
    <header
      className={`h-12 w-full bg-[var(--titlebar-bg,#12141a)] border-b border-[var(--border-subtle,#24283b)] flex items-center justify-between px-3 shrink-0 z-30 select-none transition-transform duration-300 ease-in-out font-sans ${
        isAutoHidden ? '-translate-y-full' : 'translate-y-0'
      } ${className}`}
    >
      {/* ── Left: App Brand & Inline Title & Sync Status ── */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Menu Dropdown Button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Document & Workspace Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-9 w-52 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1.5 z-50 text-xs text-zinc-200 backdrop-blur-xl">
              <button
                onClick={() => {
                  createTab('Untitled.md', '# Untitled Document\n\n', 'markdown');
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>New Document</span>
              </button>
              <button
                onClick={() => {
                  events.onOpenFile();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                <span>Open File...</span>
              </button>
              <button
                onClick={() => {
                  events.onSaveFile();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-zinc-400" />
                <span>Save to Local File</span>
              </button>
              <button
                onClick={() => {
                  events.onExportWorkspace();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export Workspace JSON</span>
              </button>
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={() => {
                  toggleSidebar();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer"
              >
                <SidebarIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Toggle Drawer ({settings.showSidebar ? 'Hide' : 'Show'})</span>
              </button>
              {onOpenOnboarding && (
                <button
                  onClick={() => {
                    onOpenOnboarding();
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2.5 cursor-pointer text-indigo-400"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Onboarding & Superpowers</span>
                </button>
              )}

              {tabs.length > 1 && (
                <div className="mt-1 pt-1 border-t border-zinc-800">
                  <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
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
                            ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                            : 'hover:bg-white/10 text-zinc-300'
                        }`}
                      >
                        <span className="truncate pr-2">{tab.title}</span>
                        {tab.id === activeTabId && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Brand Icon */}
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
          <span className="font-bold text-white text-[10px]">C</span>
        </div>

        {/* Editable Title */}
        <div className="flex items-center min-w-0 max-w-[200px] sm:max-w-xs md:max-w-md">
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
              className="bg-zinc-800 text-white text-xs px-2 py-0.5 rounded outline-none border border-indigo-500 w-full"
            />
          ) : (
            <button
              onClick={startEditingTitle}
              className="text-xs font-medium text-zinc-200 hover:text-white truncate px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer text-left"
              title="Click to rename document"
            >
              {activeTab ? activeTab.title : 'No Document Open'}
            </button>
          )}
        </div>

        {/* Cloud Sync Status Indicator */}
        <div className="hidden lg:flex items-center">
          {user ? (
            <button
              onClick={triggerSync}
              className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/50 transition-colors"
              title="Click to trigger manual cloud sync"
            >
              {syncStatus === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span className="text-zinc-300">Saved</span>
                </>
              )}
            </button>
          ) : isGuestMode ? (
            <div 
              className="flex items-center gap-1 text-[10px] font-medium text-amber-400/90 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20"
              title="Guest Mode: Auto-saved to browser IndexedDB"
            >
              <CloudOff className="w-3 h-3 text-amber-400" />
              <span>Offline Guest</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Center: Formatting Pills Toolbar ── */}
      <div className="hidden sm:flex items-center gap-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-1.5 py-0.5">
        <button
          onClick={() => handleWrapFormat('**', '**', 'bold text')}
          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleWrapFormat('*', '*', 'italic text')}
          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleLinePrefix('## ')}
          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title="Heading"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleWrapFormat('```\n', '\n```', 'code')}
          className="w-6 h-6 rounded hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          title="Code Block"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
        
        <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

        {/* Action Button Insert */}
        <button
          onClick={() => handleWrapFormat('[[action:', ']]', 'id')}
          className="px-1.5 h-6 rounded hover:bg-white/10 flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
          title="Insert Executable Action Button"
        >
          <Zap className="w-3 h-3" />
          <span>Action</span>
        </button>

        <div className="w-[1px] h-3.5 bg-zinc-800 mx-0.5" />

        {/* Live Preview Toggle Pill */}
        <button
          onClick={() => updateSettings({ showLivePreview: !settings.showLivePreview })}
          className={`px-2 h-6 rounded flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
            settings.showLivePreview
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
          }`}
          title="Toggle Split Preview"
        >
          <Columns className="w-3 h-3" />
          <span>Preview</span>
        </button>
      </div>

      {/* ── Right: Command Palette, Zen Mode, & User Avatar ── */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          onClick={events.onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/70 hover:bg-zinc-700/80 border border-zinc-700/50 text-zinc-300 hover:text-white text-xs transition-all cursor-pointer shadow-xs"
          title="Command Palette (Ctrl+K or ⌘K)"
        >
          <Search className="w-3 h-3 text-zinc-400" />
          <span className="hidden md:inline text-[11px]">Search</span>
          <kbd className="text-[10px] font-mono bg-zinc-900/80 text-zinc-400 px-1 rounded border border-zinc-700/60">
            ⌘K
          </kbd>
        </button>

        {/* Zen Mode Button */}
        <button
          onClick={toggleZenMode}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isZenMode
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-white/10'
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
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer"
              title={user.name || user.email}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-xs font-semibold flex items-center justify-center">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => signOut()}
              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* User Menu Dropdown */}
          {isUserMenuOpen && user && (
            <div className="absolute right-0 top-9 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 z-50 text-xs text-zinc-200 backdrop-blur-xl">
              <div className="px-3 py-2 border-b border-zinc-800">
                <p className="font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  triggerSync();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sync Library Now</span>
              </button>
              {onOpenOnboarding && (
                <button
                  onClick={() => {
                    onOpenOnboarding();
                    setIsUserMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Product Tour</span>
                </button>
              )}
              <div className="my-1 border-t border-zinc-800" />
              <button
                onClick={() => {
                  signOut();
                  setIsUserMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-red-500/10 text-red-400 flex items-center gap-2 cursor-pointer"
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
