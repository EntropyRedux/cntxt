import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { IRuntimeBridge } from '../ui-contract/bridgeContract';
import { AppUiEvents } from '../ui-contract/actionContract';

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
  return {
    onOpenFile: async () => {
      try {
        const file = await bridge.fs.openFile();
        if (file) {
          useTabStore.getState().createTab(file.name, file.content, file.language, file.path);
          useNotificationStore.getState().addNotification('File Opened', file.name, 'success');
        }
      } catch (err: any) {
        useNotificationStore.getState().addNotification('Error Opening File', err?.message, 'error');
      }
    },

    onSaveFile: async () => {
      try {
        await useTabStore.getState().saveCurrentTab();
        useNotificationStore.getState().addNotification('Saved', 'Document saved', 'success');
      } catch (err: any) {
        useNotificationStore.getState().addNotification('Save Failed', err?.message, 'error');
      }
    },

    onSaveAs: async () => {
      const { tabs, activeTabId, saveTabAs } = useTabStore.getState();
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) return;

      const newTitle = prompt('Enter new document name:', activeTab.title);
      if (newTitle && newTitle.trim()) {
        await saveTabAs(activeTab.id, newTitle.trim());
        useNotificationStore.getState().addNotification('Saved As', newTitle.trim(), 'success');
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
      } catch (err: any) {
        useNotificationStore.getState().addNotification('New Window Error', err?.message, 'error');
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
      } catch (err: any) {
        useNotificationStore.getState().addNotification('Export Failed', err?.message, 'error');
      }
    },

    onImportWorkspace: async () => {
      try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
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
      } catch (err: any) {
        useNotificationStore.getState().addNotification('Import Failed', err?.message, 'error');
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
    }
  };
}
