import React, { useState, useRef, useEffect } from 'react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useNotificationStore } from '../../store/notificationStore';
import { dbStorage } from '../../services/storage/IndexedDBStorage';

interface MenuBarProps {
  onOpenFile: () => void;
  onSaveAs: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcuts: () => void;
}

export const MenuBar: React.FC<MenuBarProps> = ({
  onOpenFile,
  onSaveAs,
  onOpenCommandPalette,
  onOpenShortcuts
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { createTab, saveCurrentTab, closeTab, closeAllTabs, activeTabId, tabs, duplicateTab } = useTabStore();
  const { settings, updateSettings, toggleSidebar, togglePreview, toggleStatusBar, setActiveSidebarTab } = useSettingsStore();
  const { templates, openVariableModal, resetToDefaults: resetTemplates } = useTemplateStore();
  const { actions, openActionEditor, resetToDefaults: resetActions } = useActionStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportWorkspace = async () => {
    try {
      const data = await dbStorage.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contextpad-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification('Backup Exported', 'Workspace data exported successfully', 'success');
    } catch (e: any) {
      addNotification('Export Failed', e.message, 'error');
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.templates) localStorage.setItem('contextpad_templates', JSON.stringify(json.templates));
        if (json.actions) localStorage.setItem('contextpad_actions', JSON.stringify(json.actions));
        if (json.workflows) localStorage.setItem('contextpad_workflows', JSON.stringify(json.workflows));
        if (json.settings) localStorage.setItem('contextpad_settings', JSON.stringify(json.settings));
        addNotification('Backup Restored', 'Please reload workspace to apply', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err: any) {
        addNotification('Import Error', 'Invalid backup JSON file', 'error');
      }
    };
    input.click();
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  const menuItems: { id: string; label: string; items: Array<{ label: string; shortcut?: string; action: () => void; divider?: boolean; danger?: boolean }> }[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New Tab', shortcut: 'Ctrl+N', action: () => createTab() },
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
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo'), divider: true },
        { label: 'Fill Template Variables...', shortcut: 'Ctrl+Alt+V', action: () => openVariableModal() },
        { label: 'Find & Replace in Editor', shortcut: 'Ctrl+F', action: () => {
          const cm = document.querySelector('.cm-editor') as HTMLElement;
          cm?.focus();
        }}
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: toggleSidebar },
        { label: 'Toggle Live Preview', shortcut: 'Ctrl+P', action: togglePreview },
        { label: 'Toggle Status Bar', action: toggleStatusBar, divider: true },
        { label: 'Show File Explorer', action: () => setActiveSidebarTab('explorer') },
        { label: 'Show Document Outline', action: () => setActiveSidebarTab('outline') },
        { label: 'Show Templates Library', action: () => setActiveSidebarTab('templates') },
        { label: 'Show Action Scripts', action: () => setActiveSidebarTab('actions') },
        { label: 'Show Workflows & Blueprints', action: () => setActiveSidebarTab('workflows') },
        { label: 'Show Token Analytics', action: () => setActiveSidebarTab('tokens') },
        { label: 'Show Formula Playground', action: () => setActiveSidebarTab('formulas'), divider: true },
        { label: 'Zoom In (Font +)', action: () => updateSettings({ fontSize: Math.min(24, settings.fontSize + 1) }) },
        { label: 'Zoom Out (Font -)', action: () => updateSettings({ fontSize: Math.max(10, settings.fontSize - 1) }) },
        { label: 'Toggle Word Wrap', action: () => updateSettings({ wordWrap: !settings.wordWrap }) }
      ]
    },
    {
      id: 'templates',
      label: 'Templates',
      items: [
        { label: 'Manage Templates', action: () => setActiveSidebarTab('templates') },
        { label: 'Fill Active Document Variables', shortcut: 'Ctrl+Alt+V', action: () => openVariableModal(), divider: true },
        ...templates.slice(0, 5).map(tmpl => ({
          label: `Insert: ${tmpl.name}`,
          action: () => {
            if (activeTab) {
              useTabStore.getState().insertTextAtCursor(activeTab.id, tmpl.content);
              addNotification('Template Inserted', tmpl.name, 'success');
            }
          }
        })),
        { label: 'Reset Templates to Defaults', danger: true, divider: true, action: resetTemplates }
      ]
    },
    {
      id: 'actions',
      label: 'Actions',
      items: [
        { label: 'New Custom Action Script...', action: () => openActionEditor(null) },
        { label: 'View Action Library', action: () => setActiveSidebarTab('actions'), divider: true },
        ...actions.filter(a => a.enabled).slice(0, 5).map(act => ({
          label: `Run: ${act.name}`,
          action: () => {
            setActiveSidebarTab('actions');
          }
        })),
        { label: 'Reset Actions to Defaults', danger: true, divider: true, action: resetActions }
      ]
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'Command Palette', shortcut: 'Ctrl+K', action: onOpenCommandPalette },
        { label: 'Keyboard Shortcuts Guide', shortcut: 'Ctrl+/', action: onOpenShortcuts, divider: true },
        { label: 'Documentation & Formula Reference', action: () => setActiveSidebarTab('formulas') },
        { label: 'About ContextPad v1.10.0', action: () => {
          addNotification('ContextPad v1.10.0', 'Desktop-first workspace for structured writing & prompt engineering', 'info');
        }}
      ]
    }
  ];

  return (
    <div ref={menuRef} className="theme-menubar h-6 border-b border-[var(--border-primary)] flex items-center px-3 select-none text-[12px] font-sans z-20 shrink-0">
      <div className="flex items-center space-x-1">
        {menuItems.map(menu => (
          <div key={menu.id} className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === menu.id ? null : menu.id)}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(menu.id);
              }}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                openMenu === menu.id 
                  ? 'bg-[var(--accent-primary)] text-white' 
                  : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)]'
              }`}
            >
              {menu.label}
            </button>

            {openMenu === menu.id && (
              <div className="theme-dropdown absolute top-full left-0 mt-1 min-w-[220px] rounded shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                {menu.items.map((item, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => {
                        item.action();
                        setOpenMenu(null);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between transition-colors ${
                        item.danger 
                          ? 'text-[var(--status-error)] hover:bg-[var(--status-error)]/15' 
                          : 'text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white group'
                      }`}
                    >
                      <span className="truncate pr-2">{item.label}</span>
                      {item.shortcut && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-white shrink-0">{item.shortcut}</span>
                      )}
                    </button>
                    {item.divider && <div className="my-1 border-t border-[var(--border-primary)]" />}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
