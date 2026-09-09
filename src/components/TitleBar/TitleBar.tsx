import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  PanelLeft,
  HelpCircle,
  FileText,
  Edit3,
  Eye,
  Code2,
  Wrench,
  LayoutTemplate,
  Smartphone,
  Laptop
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge, execUndo, execRedo, querySelector } from '../../adapters';

interface TitleBarProps {
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
  onOpenFile: () => void;
  onSaveAs: () => void;
  onNewWindow?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenFile,
  onSaveAs,
  onNewWindow
}) => {
  const bridge = useRuntimeBridge();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { tabs, activeTabId, saveCurrentTab, isSaving, createTab, closeTab, closeAllTabs, duplicateTab } = useTabStore();
  const { settings, toggleSidebar, toggleActivityBar, toggleEditorMode, toggleStatusBar, toggleTouchMode, updateSettings, setActiveSidebarTab } = useSettingsStore();
  const { templates, openVariableModal, resetToDefaults: resetTemplates } = useTemplateStore();
  const { actions, openActionEditor, resetToDefaults: resetActions } = useActionStore();
  const { addNotification } = useNotificationStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewWindow = async () => {
    if (onNewWindow) {
      onNewWindow();
      return;
    }
    try {
      await bridge.window.newWindow();
      addNotification('New Window', 'Opened new ContextPad window', 'info');
    } catch {
      addNotification('New Window', 'New window requested', 'info');
    }
  };

  const handleExportWorkspace = async () => {
    try {
      await bridge.fs.exportWorkspace();
      addNotification('Backup Exported', 'Workspace data exported successfully', 'success');
    } catch (e: any) {
      addNotification('Export Failed', e.message, 'error');
    }
  };

  const handleImportBackup = async () => {
    try {
      const file = await bridge.fs.openFile();
      if (!file) return;
      const ok = await bridge.fs.importWorkspace(file.content);
      if (ok) {
        addNotification('Backup Restored', 'Workspace restored successfully', 'success');
      } else {
        addNotification('Import Error', 'Failed to restore backup', 'error');
      }
    } catch (err: any) {
      addNotification('Import Error', 'Invalid backup JSON file', 'error');
    }
  };

  const menuSections: { 
    id: string; 
    label: string; 
    ariaLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    items: Array<{ label: string; shortcut?: string; action: () => void; divider?: boolean; danger?: boolean }> 
  }[] = [
    {
      id: 'file',
      label: 'File',
      ariaLabel: 'File menu (New, Open, Save, Export)',
      icon: FileText,
      items: [
        { label: 'New Tab', shortcut: 'Ctrl+N', action: () => createTab() },
        { label: 'New Window', shortcut: 'Ctrl+Shift+N', action: handleNewWindow },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: onOpenFile },
        { label: 'Save Document', shortcut: 'Ctrl+S', action: () => saveCurrentTab() },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: onSaveAs },
        { label: 'Duplicate Active Tab', action: () => duplicateTab(activeTabId), divider: true },
        { label: 'Export Workspace JSON', action: handleExportWorkspace },
        { label: 'Import Backup JSON...', action: handleImportBackup, divider: true },
        { label: 'Close Active Tab', shortcut: 'Ctrl+W', action: () => closeTab(activeTabId) },
        { label: 'Close All Tabs', danger: true, action: closeAllTabs }
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      ariaLabel: 'Edit menu (Undo, Redo, Variables, Find)',
      icon: Edit3,
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => execUndo() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => execRedo(), divider: true },
        { label: 'Fill Template Variables...', shortcut: 'Ctrl+Alt+V', action: () => openVariableModal() },
        { label: 'Find & Replace in Editor', shortcut: 'Ctrl+F', action: () => {
          const cm = querySelector('.cm-editor');
          cm?.focus();
        }}
      ]
    },
    {
      id: 'view',
      label: 'View',
      ariaLabel: 'View menu (Zen Mode, Preview, Sidebar, Zoom)',
      icon: Eye,
      items: [
        { 
          label: (settings.editorMode || 'rendered') === 'rendered' ? 'Switch to Raw Markdown Mode' : 'Switch to Rendered Markdown Mode', 
          shortcut: 'Ctrl+M', 
          action: toggleEditorMode 
        },
        { label: 'Toggle Activity Rail (Icons)', shortcut: 'Ctrl+B', action: toggleActivityBar },
        { label: 'Toggle Status Bar', action: toggleStatusBar, divider: true },
        { label: 'Show File Explorer', action: () => setActiveSidebarTab('explorer') },
        { label: 'Show Document Outline', action: () => setActiveSidebarTab('outline') },
        { label: 'Show Templates Library', action: () => setActiveSidebarTab('templates') },
        { label: 'Show Action Scripts', action: () => setActiveSidebarTab('actions') },
        { label: 'Show Workflows', action: () => setActiveSidebarTab('workflows') },
        { label: 'Show Token Analytics', action: () => setActiveSidebarTab('tokens') },
        { label: 'Show Formula Reference', action: () => setActiveSidebarTab('formulas'), divider: true },
        { label: 'Zoom In (Font +)', action: () => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) }) },
        { label: 'Zoom Out (Font -)', action: () => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) }) },
        { label: 'Toggle Word Wrap', action: () => updateSettings({ wordWrap: !settings.wordWrap }) }
      ]
    },
    {
      id: 'templates',
      label: 'Templates',
      ariaLabel: 'Templates quick insert menu',
      icon: LayoutTemplate,
      items: [
        ...templates.slice(0, 6).map(t => ({
          label: t.name,
          action: () => {
            const active = tabs.find(tab => tab.id === activeTabId);
            if (active) {
              const cm = (window as any).__cmEditorView;
              if (cm) {
                cm.dispatch(cm.state.replaceSelection(`\n\n${t.content}\n\n`));
              } else {
                useTabStore.getState().updateTabContent(active.id, `${active.content}\n\n${t.content}`);
              }
              addNotification('Template Inserted', t.name, 'success');
            }
          }
        })),
        { label: 'Open Template Manager...', divider: true, action: () => setActiveSidebarTab('templates') },
        { label: 'Reset System Templates to Default', action: resetTemplates }
      ]
    },
    {
      id: 'actions',
      label: 'Actions',
      ariaLabel: 'Transform actions menu',
      icon: Wrench,
      items: [
        ...actions.slice(0, 6).map(a => ({
          label: a.name,
          action: () => {
            setActiveSidebarTab('actions');
          }
        })),
        { label: 'Create New Action...', divider: true, action: () => openActionEditor(null) },
        { label: 'Open Action Manager...', action: () => setActiveSidebarTab('actions') },
        { label: 'Reset Built-in Actions', action: resetActions }
      ]
    }
  ];

  return (
    <header 
      ref={menuRef}
      role="banner"
      aria-label="Application Top Bar"
      className="theme-titlebar flex items-center justify-between px-3 py-1.5 select-none relative z-40 gap-2 shrink-0 min-h-[40px]"
    >
      {/* Left: Pure Icon Dropdown Menus & Quick File Actions */}
      <div className="flex flex-wrap items-center gap-1">
        {/* Brand Icon */}
        <div 
          title="ContextPad" 
          aria-label="ContextPad Home"
          className="w-7 h-7 rounded-md bg-[var(--accent-primary)] flex items-center justify-center text-white shadow-xs shrink-0 mr-0.5"
        >
          <Sparkles className="w-4 h-4" />
        </div>

        {/* Pure Icon Menus */}
        <div className="flex flex-wrap items-center space-x-0.5">
          {menuSections.map(menu => {
            const Icon = menu.icon;
            const isOpen = openMenu === menu.id;
            return (
              <div key={menu.id} className="relative">
                <button
                  onClick={() => setOpenMenu(isOpen ? null : menu.id)}
                  onMouseEnter={() => {
                    if (openMenu !== null) setOpenMenu(menu.id);
                  }}
                  title={menu.label}
                  aria-label={menu.ariaLabel}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                    isOpen 
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] shadow-xs' 
                      : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>

                {isOpen && (
                  <div 
                    role="menu"
                    aria-label={`${menu.label} submenu`}
                    className="theme-dropdown absolute top-full left-0 mt-1 min-w-[220px] rounded-lg shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider border-b border-[var(--border-primary)] mb-1">
                      {menu.label}
                    </div>
                    {menu.items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <button
                          role="menuitem"
                          onClick={() => {
                            item.action();
                            setOpenMenu(null);
                          }}
                          className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                            item.danger 
                              ? 'text-[var(--status-error)] hover:bg-red-500/15' 
                              : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white'
                          }`}
                        >
                          <span className="truncate pr-2">{item.label}</span>
                          {item.shortcut && (
                            <span className="text-[10px] font-mono opacity-70 group-hover:text-white shrink-0">{item.shortcut}</span>
                          )}
                        </button>
                        {item.divider && <div className="my-1 border-t border-[var(--border-primary)]" />}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="flex items-center justify-center my-0">
        <button
          onClick={onOpenCommandPalette}
          title="Search or Command Palette (Ctrl+K)"
          aria-label="Search commands or files"
          className="w-7 h-7 flex items-center justify-center theme-input hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all group shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
        </button>
      </div>

      {/* Right: Workspace Controls */}
      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] ml-auto sm:ml-0">
        {/* Touch & Tablet Mode Toggle */}
        <button
          onClick={toggleTouchMode}
          title={settings.touchOptimized ? 'Switch to Compact Desktop Mode' : 'Switch to Touchscreen & Tablet Mode (44px+ touch targets)'}
          aria-label={settings.touchOptimized ? 'Touchscreen mode active' : 'Desktop mode active'}
          aria-pressed={settings.touchOptimized}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border ${
            settings.touchOptimized 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 shadow-xs' 
              : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border-transparent'
          }`}
        >
          {settings.touchOptimized ? (
            <Smartphone className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          ) : (
            <Laptop className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Editor Mode Switch: Raw Markdown <-> Live Rendered Markdown */}
        <button
          onClick={toggleEditorMode}
          title={
            (settings.editorMode || 'rendered') === 'rendered' 
              ? 'Switch to Raw Markdown Mode (Ctrl+M)' 
              : 'Switch to Live Rendered Markdown Mode (Ctrl+M)'
          }
          aria-label={`Editor mode: currently in ${(settings.editorMode || 'rendered') === 'rendered' ? 'Rendered' : 'Raw'} mode. Click to switch.`}
          aria-pressed={(settings.editorMode || 'rendered') === 'rendered'}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border ${
            (settings.editorMode || 'rendered') === 'rendered'
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 hover:bg-[var(--accent-container)]/80'
              : 'bg-[var(--card-secondary-bg)] text-[var(--status-warning)] border-[var(--status-warning)]/40 hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          {(settings.editorMode || 'rendered') === 'rendered' ? (
            <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          ) : (
            <Code2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Hide / Show Activity Rail Button */}
        <button
          onClick={toggleActivityBar}
          title={settings.showActivityBar ? 'Hide Activity Rail (Ctrl+B)' : 'Show Activity Rail (Ctrl+B)'}
          aria-label={settings.showActivityBar ? 'Hide Activity Rail' : 'Show Activity Rail'}
          aria-pressed={settings.showActivityBar}
          className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
            settings.showActivityBar 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-container)]/80' 
              : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
          }`}
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>

        {/* Shortcuts / Help */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (Ctrl+/)"
          aria-label="Keyboard Shortcuts Guide"
          className="w-7 h-7 flex items-center justify-center hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
