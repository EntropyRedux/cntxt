import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useFileHistoryStore } from '../store/fileHistoryStore';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { AppUiEvents } from '../ui-contract/actionContract';
import { editorRegistry } from '../services/editor/editorRegistry';
import { copyText, execUndo, execRedo, getSelectionText } from './domHelper';

/**
 * Creates a centralized, typed event dispatcher for UI actions
 */
export function createUiEventDispatcher(
  bridge: IRuntimeBridge,
  setModalState?: {
    setIsCommandPaletteOpen: (open: boolean) => void;
    setIsShortcutsOpen: (open: boolean) => void;
  }
): AppUiEvents {
  const dispatcher: AppUiEvents = {
    onOpenFile: async () => {
      try {
        const file = await bridge.fs.openFile();
        if (file) {
          useTabStore.getState().createTab(file.name, file.content, file.language, file.path);
          useFileHistoryStore.getState().recordOpenedFile({
            id: file.path || file.name,
            name: file.name,
            type: 'file',
            path: file.path,
            language: file.language,
            content: file.content
          });
          useNotificationStore.getState().addNotification('File Opened', file.name, 'success');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Error Opening File', msg, 'error');
      }
    },

    onOpenFolder: async () => {
      try {
        if (!bridge.fs.openDirectory) {
          useNotificationStore.getState().addNotification('Folder Picker', 'Not supported in this environment', 'error');
          return;
        }
        const dirResult = await bridge.fs.openDirectory();
        if (dirResult) {
          const folderId = `folder_${Date.now()}_${dirResult.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          const mapEntries = (entries: any[]): any[] => {
            return entries.map(entry => ({
              id: entry.id || entry.path || `item_${Math.random().toString(36).substr(2, 7)}`,
              name: entry.name,
              type: entry.type || 'file',
              content: entry.content,
              language: entry.language,
              path: entry.path,
              children: entry.children ? mapEntries(entry.children) : undefined
            }));
          };

          const newFolder = {
            id: folderId,
            name: dirResult.name,
            type: 'folder' as const,
            path: dirResult.path,
            children: mapEntries(dirResult.entries)
          };

          const saved = await bridge.storage.getItem('contextpad_virtual_files');
          let current: any[] = [];
          if (saved) {
            try { current = JSON.parse(saved); } catch {}
          }
          const updated = [newFolder, ...current.filter(f => f.name !== dirResult.name)];
          await bridge.storage.setItem('contextpad_virtual_files', JSON.stringify(updated));

          window.dispatchEvent(new CustomEvent('contextpad_files_updated'));

          useSettingsStore.getState().updateSettings({ showSidebar: true });
          useSettingsStore.getState().setActiveSidebarTab('explorer');
          useFileHistoryStore.getState().recordOpenedFile({
            id: folderId,
            name: dirResult.name,
            type: 'folder',
            path: dirResult.path
          });
          useNotificationStore.getState().addNotification('Workspace Opened', dirResult.name, 'success');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Error Opening Folder', msg, 'error');
      }
    },

    onSaveFile: async () => {
      const { tabs, activeTabId, saveCurrentTab } = useTabStore.getState();
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) return;

      // If document is untitled, delegate to Save As dialog
      if (!activeTab.filePath) {
        await dispatcher.onSaveAs();
        return;
      }

      try {
        const success = await bridge.fs.saveFile(activeTab.filePath, activeTab.content);
        if (success) {
          await saveCurrentTab();
          useNotificationStore.getState().addNotification('Saved', activeTab.title, 'success');
        } else {
          useNotificationStore.getState().addNotification('Save Failed', `Could not write to ${activeTab.filePath}`, 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Save Failed', msg, 'error');
      }
    },

    onSaveAs: async () => {
      const { tabs, activeTabId, saveTabAs } = useTabStore.getState();
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) return;

      try {
        const savedPath = await bridge.fs.saveFileAs(activeTab.title, activeTab.content);
        if (savedPath) {
          const filename = savedPath.split(/[/\\]/).pop() || activeTab.title;
          await saveTabAs(activeTab.id, filename, savedPath);
          useFileHistoryStore.getState().recordOpenedFile({
            id: savedPath,
            name: filename,
            type: 'file',
            path: savedPath,
            language: activeTab.language,
            content: activeTab.content
          });
          useNotificationStore.getState().addNotification('Saved As', filename, 'success');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Save As Failed', msg, 'error');
      }
    },

    onNewWindow: async () => {
      try {
        const success = await bridge.window.newWindow();
        if (success) {
          useNotificationStore.getState().addNotification('New Window', 'Opened new window instance', 'info');
        } else {
          useNotificationStore.getState().addNotification('New Window', 'New window requested (ready for native bridge)', 'info');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('New Window Error', msg, 'error');
      }
    },

    onExportWorkspace: async () => {
      try {
        const data = await bridge.fs.exportWorkspace();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `contextpad-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        useNotificationStore.getState().addNotification('Workspace Exported', 'Downloaded complete backup', 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Export Failed', msg, 'error');
      }
    },

    onImportWorkspace: async () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const success = await bridge.fs.importWorkspace(text);
          if (success) {
            await useTabStore.getState().initializeTabs();
            await useTemplateStore.getState().initializeTemplates();
            await useActionStore.getState().initializeActions();
            await useWorkflowStore.getState().initializeWorkflows();
            useNotificationStore.getState().addNotification('Import Successful', 'Workspace restored', 'success');
          }
        };
        input.click();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        useNotificationStore.getState().addNotification('Import Failed', msg, 'error');
      }
    },

    onOpenCommandPalette: () => {
      setModalState?.setIsCommandPaletteOpen(true);
    },

    onOpenShortcuts: () => {
      setModalState?.setIsShortcutsOpen(true);
    },

    onOpenVariableModal: () => {
      useTemplateStore.getState().openVariableModal();
    },

    onOpenActionEditor: (actionId?: string) => {
      const action = actionId ? useActionStore.getState().actions.find(a => a.id === actionId) || null : null;
      useActionStore.getState().openActionEditor(action);
    },

    onToggleEditorMode: () => {
      useSettingsStore.getState().toggleEditorMode();
    },

    onUndo: () => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId) {
        const handled = editorRegistry.undo(activeTabId);
        if (!handled) execUndo();
      }
    },

    onRedo: () => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId) {
        const handled = editorRegistry.redo(activeTabId);
        if (!handled) execRedo();
      }
    },

    onSelectAll: () => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId) {
        editorRegistry.selectAll(activeTabId);
      }
    },

    onFind: () => {
      window.dispatchEvent(new CustomEvent('open-search', { detail: { mode: 'find' } }));
    },

    onReplace: () => {
      window.dispatchEvent(new CustomEvent('open-search', { detail: { mode: 'replace' } }));
    },

    onCopy: async () => {
      const activeTabId = useTabStore.getState().activeTabId;
      const view = activeTabId ? editorRegistry.getView(activeTabId) : undefined;
      let text = '';
      if (view) {
        const { from, to } = view.state.selection.main;
        text = view.state.sliceDoc(from, to);
      }
      if (!text) {
        text = getSelectionText();
      }
      if (text) {
        await copyText(text, bridge);
        useNotificationStore.getState().addNotification('Copied', 'Selection copied to clipboard', 'info');
      }
    },

    onCut: async () => {
      const activeTabId = useTabStore.getState().activeTabId;
      const view = activeTabId ? editorRegistry.getView(activeTabId) : undefined;
      if (view) {
        const { from, to } = view.state.selection.main;
        const text = view.state.sliceDoc(from, to);
        if (text) {
          await copyText(text, bridge);
          view.dispatch({
            changes: { from, to, insert: '' },
            scrollIntoView: true
          });
          useNotificationStore.getState().addNotification('Cut', 'Selection cut to clipboard', 'info');
        }
      }
    },

    onPaste: async () => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (!activeTabId) return;
      try {
        let text = '';
        if (bridge.clipboard) {
          text = await bridge.clipboard.readText();
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
          text = await navigator.clipboard.readText();
        }
        if (text) {
          editorRegistry.insertTextAtCursor(activeTabId, text);
        }
      } catch (err) {
        console.warn('Paste failed or permission denied:', err);
      }
    }
  };

  return dispatcher;
}

