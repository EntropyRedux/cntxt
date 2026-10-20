import { spliceChunkIntoFullContent, detectExternalModification } from '../services/chunkBufferService';
import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useSettingsStore } from '../store/settingsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useFileHistoryStore } from '../store/fileHistoryStore';
import { IRuntimeBridge, BridgeDirectoryEntry, SupportedLanguage } from '../ui-contract/bridgeContract';
import { AppUiEvents } from '../ui-contract/actionContract';
import { editorRegistry } from '../services/editor/editorRegistry';
import { copyText, execUndo, execRedo, getSelectionText } from './domHelper';
import { openDocumentWithLargeDocCheck } from '../services/largeDocHelper';

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
          openDocumentWithLargeDocCheck({
            title: file.name,
            content: file.content,
            language: file.language,
            filePath: file.path
          });
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
          interface EventEntry {
            id?: string;
            name: string;
            type?: string;
            content?: string;
            language?: string;
            path?: string;
            children?: EventEntry[];
          }
          const mapEntries = (entries: EventEntry[]): BridgeDirectoryEntry[] => {
            return entries.map(entry => ({
              id: entry.id || entry.path || `item_${Math.random().toString(36).substr(2, 7)}`,
              name: entry.name,
              type: (entry.type as 'file' | 'folder') || 'file',
              content: entry.content,
              language: (entry.language as SupportedLanguage) || 'markdown',
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
          let current: Array<{ name?: string }> = [];
          if (saved) {
            try {
              current = JSON.parse(saved);
            } catch (e) {
              console.warn('[eventDispatcher] Failed to parse saved virtual files:', e);
            }
          }
          const updated = [newFolder, ...current.filter(f => f && f.name !== dirResult.name)];
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
      const { tabs, activeTabId, saveCurrentTab, updateTabMetadata } = useTabStore.getState();
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (!activeTab) return;

      // If document is untitled, delegate to Save As dialog
      if (!activeTab.filePath) {
        await dispatcher.onSaveAs();
        return;
      }

      // Check if this is a chunked/virtualized document tab
      if (activeTab.chunkSession?.isChunked) {
        // FIND-05: External modification collision detection
        try {
          const currentDiskContent = await bridge.fs.readFile(activeTab.filePath);
          if (
            currentDiskContent !== null &&
            activeTab.chunkSession.originalChecksum &&
            detectExternalModification(currentDiskContent, activeTab.chunkSession)
          ) {
            const conflictPath = `${activeTab.filePath}.edited-chunk-conflict-${Date.now()}.md`;
            await bridge.fs.saveFile(conflictPath, activeTab.content);
            useNotificationStore.getState().addNotification(
              'File Conflict Detected',
              `The master file was modified externally on disk. To prevent data loss, your edits were saved to: ${conflictPath}`,
              'error'
            );
            return;
          }
        } catch (readErr: unknown) {
          console.warn('Could not verify disk checksum before splicing:', readErr);
        }

        const spliceResult = spliceChunkIntoFullContent(
          activeTab.chunkSession.originalFullContent,
          activeTab.content,
          activeTab.chunkSession
        );

        if (!spliceResult.success) {
          // FIND-02: Real safety recovery backup file writing on splice failure
          const recoveryPath = `${activeTab.filePath}.edited-chunk-recovery-${Date.now()}.md`;
          try {
            await bridge.fs.saveFile(recoveryPath, activeTab.content);
          } catch (writeErr: unknown) {
            console.error('Failed to write safety recovery file:', writeErr);
          }
          useNotificationStore.getState().addNotification(
            'Splice Error',
            `${spliceResult.error || 'Could not safely splice chunked sections into master file.'} Your edits were preserved in: ${recoveryPath}`,
            'error'
          );
          return;
        }

        try {
          const success = await bridge.fs.saveFile(activeTab.filePath, spliceResult.updatedFullContent);
          if (success) {
            updateTabMetadata(activeTab.id, {
              chunkSession: spliceResult.updatedSession,
              rawFullContent: spliceResult.updatedFullContent,
              isDirty: false,
              lastModifiedTime: Date.now()
            });
            await saveCurrentTab();
            const sizeKb = Math.round(new Blob([spliceResult.updatedFullContent]).size / 1024);
            useNotificationStore.getState().addNotification(
              'Spliced & Saved',
              `${activeTab.title} (${sizeKb} KB) — Master file updated without data loss.`,
              'success'
            );
          } else {
            useNotificationStore.getState().addNotification('Save Failed', `Could not write to ${activeTab.filePath}`, 'error');
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          useNotificationStore.getState().addNotification('Save Failed', msg, 'error');
        }
        return;
      }

      // Guard: Legacy truncated preview without chunk session
      if (activeTab.isTruncatedView) {
        useNotificationStore.getState().addNotification(
          'Direct Save Locked',
          'Cannot overwrite original file from a truncated preview. Use "Save As" to export these sections or click "Open Full Document" in the banner to edit.',
          'warning'
        );
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

