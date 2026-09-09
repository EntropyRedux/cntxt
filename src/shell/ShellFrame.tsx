import React, { useState, useEffect, useCallback } from 'react';
import { ClassicShell } from './ClassicShell';
import { ShellModalLayer } from './ShellModalLayer';
import { ShellNotificationLayer } from './ShellNotificationLayer';
import { createUiEventDispatcher } from '../adapters/eventDispatcher';
import { useRuntimeBridge } from '../adapters/runtimeBridge';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useWorkflowStore } from '../store/workflowStore';
import { useRibbonStore } from '../store/ribbonStore';
import { useFormattingStore } from '../store/formattingStore';
import { useNotificationStore } from '../store/notificationStore';
import { compressAndConvertToDataUrl, generateImageAlt } from '../services/imageService';

export const ShellFrame: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const bridge = useRuntimeBridge();
  const { settings } = useSettingsStore();

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    initializeTabs,
    createTab,
    saveCurrentTab,
    closeTab,
    insertTextAtCursor,
  } = useTabStore();

  const { addNotification } = useNotificationStore();

  const { initializeTemplates, openVariableModal } = useTemplateStore();
  const { initializeActions } = useActionStore();
  const { initializeWorkflows } = useWorkflowStore();
  const { initializeRibbon } = useRibbonStore();
  const { initializeFormattingStore } = useFormattingStore();
  const { toggleActivityBar, toggleEditorMode, initializeSettings } = useSettingsStore();

  // Initialize data stores on mount with bridge
  useEffect(() => {
    initializeSettings(bridge.storage, bridge.platform);
    initializeTabs(bridge.storage);
    initializeTemplates(bridge.storage);
    initializeActions(bridge.storage);
    initializeWorkflows(bridge.storage);
    initializeRibbon(bridge.storage);
    initializeFormattingStore(bridge.storage);
  }, [bridge, initializeSettings, initializeTabs, initializeTemplates, initializeActions, initializeWorkflows, initializeRibbon, initializeFormattingStore]);

  // Sync theme via bridge
  useEffect(() => {
    const currentTheme = settings.theme || 'contextpad-dark';
    bridge.theme.applyTheme(currentTheme);
  }, [settings.theme, bridge.theme]);

  // Create event dispatcher adapter
  const events = React.useMemo(() => {
    return createUiEventDispatcher(bridge, {
      setIsCommandPaletteOpen,
      setIsShortcutsOpen,
    });
  }, [bridge]);

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMac = bridge.platform.isMac;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setIsCommandPaletteOpen(prev => !prev);
    } else if (modifier && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (e.shiftKey) {
        events.onSaveAs();
      } else {
        events.onSaveFile();
      }
    } else if (modifier && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleActivityBar();
    } else if (modifier && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      useSettingsStore.getState().setActiveSidebarTab('outline');
    } else if (modifier && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleEditorMode();
    } else if (modifier && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      if (e.shiftKey) {
        events.onNewWindow();
      } else {
        createTab();
      }
    } else if (modifier && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    } else if (modifier && e.key === '/') {
      e.preventDefault();
      setIsShortcutsOpen(true);
    } else if (modifier && e.altKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      openVariableModal();
    } else if ((modifier && e.key === 'PageDown') || (modifier && e.altKey && e.key === 'ArrowRight')) {
      e.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
      }
    } else if ((modifier && e.key === 'PageUp') || (modifier && e.altKey && e.key === 'ArrowLeft')) {
      e.preventDefault();
      if (tabs.length > 1) {
        const currentIndex = tabs.findIndex(t => t.id === activeTabId);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTabId(tabs[prevIndex].id);
      }
    }
  }, [tabs, activeTabId, setActiveTabId, closeTab, toggleActivityBar, toggleEditorMode, createTab, events, openVariableModal]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];

        if (file.type.startsWith('image/')) {
          try {
            const res = await compressAndConvertToDataUrl(file);
            const alt = generateImageAlt(file);
            const md = `\n![${alt}](${res.dataUrl})\n`;
            if (activeTabId) {
              insertTextAtCursor(activeTabId, md);
            } else {
              createTab(file.name, `# ${alt}\n${md}`, 'markdown');
            }
            addNotification('Image Added', `Loaded ${file.name} into document`, 'success');
          } catch (err) {
            console.error('Failed to load dropped image', err);
          }
          continue;
        }

        const content = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        const lang = ext === 'json' ? 'json' : ext === 'js' ? 'javascript' : ext === 'py' ? 'python' : 'markdown';
        createTab(file.name, content, lang as any);
      }
    }
  };

  return (
    <div
      data-theme={settings.theme || 'contextpad-dark'}
      data-density={settings.uiDensity || 'comfortable'}
      data-touch={settings.touchOptimized ? 'true' : 'false'}
      className="flex flex-col h-screen w-screen theme-app font-sans overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Primary Workspace Shell */}
      <ClassicShell events={events} />

      {/* Global Modals Layer */}
      <ShellModalLayer 
        isCommandPaletteOpen={isCommandPaletteOpen}
        onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
        isShortcutsOpen={isShortcutsOpen}
        onCloseShortcuts={() => setIsShortcutsOpen(false)}
      />

      {/* Global Notification Toast Layer */}
      <ShellNotificationLayer />
    </div>
  );
};
