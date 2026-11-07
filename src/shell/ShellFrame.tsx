import { recordDiagnostic } from '../services/diagnosticLogger';
import React, { useState, useEffect, useCallback } from 'react';
import { ClassicShell } from './ClassicShell';
import { WindowResizeHandles } from './WindowResizeHandles';
import { ShellModalLayer } from './ShellModalLayer';
import { ShellNotificationLayer } from './ShellNotificationLayer';
import { createUiEventDispatcher } from '../adapters/eventDispatcher';
import { useRuntimeBridge } from '../adapters/runtimeBridge';
import { addWindowListener } from '../adapters/domHelper';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useRibbonStore } from '../store/ribbonStore';
import { useFormattingStore } from '../store/formattingStore';
import { useNotificationStore } from '../store/notificationStore';
import { useFileHistoryStore } from '../store/fileHistoryStore';
import { useImageModalStore } from '../store/imageModalStore';
import { useAuthStore } from '../store/authStore';
import { usePanelAppsStore } from '../features/panelApps/state/panelAppsStore';
import { WebAuthGateway } from '../components/Auth/WebAuthGateway';
import { compressAndConvertToDataUrl, generateImageAlt } from '../services/imageService';
import { openDocumentWithLargeDocCheck } from '../services/largeDocHelper';
import { dismissActiveCntxtOverlayPopover } from '../extensions/liveMarkdown/cntxtBlockOverlay';
import { SupportedLanguage } from '../types';

declare global {
  interface Window {
    __CNTXT_HANDLE_BACK__?: () => boolean;
  }
}

export const ShellFrame: React.FC = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  const bridge = useRuntimeBridge();
  const { settings } = useSettingsStore();
  const { user, isGuestMode, isInitialized, hasCompletedOnboarding } = useAuthStore();

  const {
    tabs,
    activeTabId,
    setActiveTabId,
    initializeTabs,
    createTab,
    saveCurrentTab,
    closeTab,
    reopenClosedTab,
    insertTextAtCursor,
  } = useTabStore();

  const { addNotification } = useNotificationStore();

  const { initializeTemplates, openVariableModal } = useTemplateStore();
  const { initializeActions } = useActionStore();
  const { initializeRibbon } = useRibbonStore();
  const { initializeFormattingStore } = useFormattingStore();
  const { toggleActivityBar, toggleEditorMode, initializeSettings } = useSettingsStore();
  const { initializeFileHistory, recordOpenedFile } = useFileHistoryStore();

  // Initialize data stores concurrently on mount with bridge
  useEffect(() => {
    Promise.allSettled([
      initializeSettings(bridge.storage, bridge.platform),
      initializeTabs(bridge.storage),
      initializeTemplates(bridge.storage),
      initializeActions(bridge.storage),
      initializeRibbon(bridge.storage),
      initializeFormattingStore(bridge.storage),
      initializeFileHistory(bridge.storage),
      usePanelAppsStore.getState().initialize(bridge.storage),
    ]).catch((e) => console.error('Store init batch failed', e));
  }, [bridge, initializeSettings, initializeTabs, initializeTemplates, initializeActions, initializeRibbon, initializeFormattingStore, initializeFileHistory]);

  // Initialize auth session on mount
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);

  // Web Header Auto-Hide on Scroll Down / Reveal on Scroll Up or Top Hover
  useEffect(() => {
    if (bridge.window.isNative) return;

    let lastScrollTop = 0;
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || typeof target.scrollTop !== 'number') return;
      const currentScrollTop = target.scrollTop;
      if (currentScrollTop > lastScrollTop + 15 && currentScrollTop > 60) {
        setIsHeaderHidden(true);
      } else if (currentScrollTop < lastScrollTop - 15 || currentScrollTop < 20) {
        setIsHeaderHidden(false);
      }
      lastScrollTop = currentScrollTop;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 35) {
        setIsHeaderHidden(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [bridge.window.isNative]);

  // Sync theme via bridge
  useEffect(() => {
    const currentTheme = settings.theme || 'contextpad-dark';
    bridge.theme.applyTheme(currentTheme);
  }, [settings.theme, bridge.theme]);

  // Auto-start Localhost REST API Gateway on boot when enabled in settings
  useEffect(() => {
    if (!bridge.gateway?.isAvailable?.()) return;
    const isEnabled = Boolean(settings.enableExperimentalSettings && settings.enableRestGateway);
    if (isEnabled) {
      bridge.gateway.start(settings.restGatewayPort ?? 9876).catch((err) => {
        recordDiagnostic('warn', 'ShellFrame', 'Failed to auto-start REST gateway', { error: String(err) });
        console.warn('[ShellFrame] Failed to auto-start REST gateway:', err);
      });
    } else {
      bridge.gateway.stop().catch((err: unknown) => {
        recordDiagnostic('warn', 'ShellFrame', 'Notice while terminating REST gateway', { error: String(err) });
        console.warn('[ShellFrame] Notice while terminating REST gateway:', err);
      });
    }
  }, [bridge.gateway, settings.enableExperimentalSettings, settings.enableRestGateway, settings.restGatewayPort]);

  // Surface user-visible notification on live markdown decoration rendering errors
  useEffect(() => {
    const handleMarkdownError = (e: Event) => {
      const custom = e as CustomEvent<{ error?: unknown }>;
      const msg = (custom.detail?.error as Error)?.message || 'Syntax error encountered during markdown decoration rendering';
      addNotification('Live Markdown Rendering Error', msg, 'error');
    };
    window.addEventListener('live-markdown-render-error', handleMarkdownError);
    return () => window.removeEventListener('live-markdown-render-error', handleMarkdownError);
  }, [addNotification]);

  // Handle files requested at startup or via single-instance file associations
  useEffect(() => {
    const detectLanguage = (filename: string): SupportedLanguage => {
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      switch (ext) {
        case 'md':
        case 'markdown':
        case 'mdown':
        case 'mkdn':
        case 'cntxt':
          return 'markdown';
        case 'js':
        case 'jsx':
        case 'mjs':
        case 'cjs':
          return 'javascript';
        case 'ts':
        case 'tsx':
          return 'typescript';
        case 'py':
        case 'pyw':
          return 'python';
        case 'json':
          return 'json';
        case 'yaml':
        case 'yml':
          return 'yaml';
        case 'html':
        case 'htm':
        case 'xml':
        case 'svg':
          return 'html';
        case 'css':
        case 'scss':
        case 'sass':
        case 'less':
          return 'css';
        default:
          return 'text';
      }
    };

    const openPaths = async (filePaths: string[]) => {
      for (const filePath of filePaths) {
        if (!filePath) continue;
        try {
          const content = await bridge.fs.readFile?.(filePath);
          if (content !== null && content !== undefined) {
            const fileName = filePath.split(/[/\\]/).pop() || filePath;
            const lang = detectLanguage(fileName);
            useTabStore.getState().createTab(fileName, content, lang, filePath);
            useFileHistoryStore.getState().recordOpenedFile({
              id: filePath,
              name: fileName,
              type: 'file',
              path: filePath,
              language: lang,
              content
            });
            addNotification('File Opened', fileName, 'success');
          }
        } catch (err) {
          console.error('[ShellFrame] Failed to open external file:', filePath, err);
          addNotification('Open File Error', `Failed to open ${filePath}: ${(err as Error)?.message || 'Unknown error'}`, 'error');
        }
      }
    };

    bridge.fs.getPendingFiles?.().then((paths) => {
      if (paths && paths.length > 0) {
        openPaths(paths);
      }
    }).catch((err) => {
      console.warn('[ShellFrame] Failed to query pending files:', err);
    });

    const unlisten = bridge.fs.onOpenFileRequested?.((paths) => {
      if (paths && paths.length > 0) {
        openPaths(paths);
      }
    });

    // Android Mobile Incoming Share Intent handler
    const handleIncomingShare = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const payload = customEvent.detail;
      if (payload) {
        const timestamp = new Date().toISOString().split('T')[1].substring(0, 8).replace(/:/g, '-');
        useTabStore.getState().createTab(`Shared_${timestamp}.md`, payload, 'markdown');
        addNotification('Content Received', 'New tab created from shared content', 'success');
      }
    };

    // Check for cold-start share intent immediately
    if (bridge.platform.isMobile && bridge.platform.consumeSharedText) {
      const coldStartText = bridge.platform.consumeSharedText();
      if (coldStartText) {
        handleIncomingShare(new CustomEvent('saf:shared_text', { detail: coldStartText }));
      }
    }

    window.addEventListener('saf:shared_text', handleIncomingShare);

    return () => {
      if (unlisten) unlisten();
      window.removeEventListener('saf:shared_text', handleIncomingShare);
    };
  }, [bridge.fs, bridge.platform, addNotification]);

  // Selective cross-window live synchronization for permanent assets
  useEffect(() => {
    const SYNCABLE_STORAGE_KEYS = new Set<string>([
      STORAGE_KEYS.TEMPLATES,
      STORAGE_KEYS.ACTIONS,
      STORAGE_KEYS.RIBBON,
      STORAGE_KEYS.FORMATTING_BUTTONS,
      STORAGE_KEYS.PINNED_ITEMS,
      STORAGE_KEYS.VIRTUAL_FILES,
    ]);

    const unlistenStorage = bridge.storage.onStorageChanged?.((key: string) => {
      if (!SYNCABLE_STORAGE_KEYS.has(key)) return;
      if (key === STORAGE_KEYS.TEMPLATES) {
        useTemplateStore.getState().initializeTemplates();
      } else if (key === STORAGE_KEYS.ACTIONS) {
        useActionStore.getState().initializeActions();
      } else if (key === STORAGE_KEYS.RIBBON) {
        useRibbonStore.getState().initializeRibbon();
      } else if (key === STORAGE_KEYS.FORMATTING_BUTTONS) {
        useFormattingStore.getState().initializeFormattingStore();
      } else if (key === STORAGE_KEYS.PINNED_ITEMS) {
        useFileHistoryStore.getState().initializeFileHistory();
      }
    });

    return () => {
      if (unlistenStorage) unlistenStorage();
    };
  }, [bridge.storage]);

  // Register Android back-button handshake handler with priority dismiss hierarchy
  useEffect(() => {
    const handleAndroidBack = (): boolean => {
      if (dismissActiveCntxtOverlayPopover()) {
        return true;
      }
      if (isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
        return true;
      }
      if (isShortcutsOpen) {
        setIsShortcutsOpen(false);
        return true;
      }
      if (useSettingsStore.getState().isFontSelectorOpen) {
        useSettingsStore.getState().closeFontSelector();
        return true;
      }
      if (useImageModalStore.getState().isOpen) {
        useImageModalStore.getState().closeImageModal();
        return true;
      }
      if (useTemplateStore.getState().isVariableModalOpen) {
        useTemplateStore.getState().closeVariableModal();
        return true;
      }
      if (useActionStore.getState().isActionEditorOpen) {
        useActionStore.getState().closeActionEditor();
        return true;
      }
      if (useRibbonStore.getState().isCustomizerOpen) {
        useRibbonStore.getState().closeCustomizer();
        return true;
      }
      if (useFormattingStore.getState().isCustomizerOpen) {
        useFormattingStore.getState().closeCustomizer();
        return true;
      }
      if (useSettingsStore.getState().settings.showSidebar) {
        useSettingsStore.getState().updateSettings({ showSidebar: false });
        return true;
      }
      return false;
    };

    window.__CNTXT_HANDLE_BACK__ = handleAndroidBack;
    return () => {
      delete window.__CNTXT_HANDLE_BACK__;
    };
  }, [isCommandPaletteOpen, isShortcutsOpen]);


  // Track active tab in opened file history
  useEffect(() => {
    if (activeTabId && tabs.length > 0) {
      const active = tabs.find(t => t.id === activeTabId);
      if (active && active.title) {
        recordOpenedFile({
          id: active.id,
          name: active.title,
          path: active.filePath,
          language: active.language
        });
      }
    }
  }, [activeTabId, tabs, recordOpenedFile]);

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
    } else if (modifier && e.shiftKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      useSettingsStore.getState().toggleRibbon();
    } else if (modifier && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      if (e.shiftKey) {
        const show = useSettingsStore.getState().settings.showSidebar;
        useSettingsStore.getState().updateSettings({ showSidebar: !show });
      } else {
        toggleActivityBar();
      }
    } else if (modifier && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      useSettingsStore.getState().updateSettings({ showSidebar: true });
      useSettingsStore.getState().setActiveSidebarTab('explorer');
    } else if (modifier && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      if (e.shiftKey) {
        useSettingsStore.getState().updateSettings({ showSidebar: true });
        useSettingsStore.getState().setActiveSidebarTab('outline');
      } else {
        events.onOpenFile();
      }
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
    } else if (modifier && e.shiftKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      reopenClosedTab();
    } else if (modifier && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (activeTabId) closeTab(activeTabId);
    } else if (modifier && e.key === '/') {
      e.preventDefault();
      setIsShortcutsOpen(true);
    } else if (modifier && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      events.onFind?.();
    } else if (modifier && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      events.onReplace?.();
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
    } else if (e.altKey && !modifier && e.key.toLowerCase() === 'z') {
      // Alt+Z: toggle Word Wrap. Skip when the CodeMirror editor holds focus — the
      // editor's own keymap owns Alt+Z there (prevents double-fire).
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('.cm-editor')) {
        return;
      }
      e.preventDefault();
      useSettingsStore.getState().toggleWordWrap();
    } else if (e.key === 'Escape') {
      const { settings, toggleSidebar } = useSettingsStore.getState();
      if (settings.showSidebar && (settings.activeSidebarTab === 'panel-app' || settings.activeSidebarTab === 'app-builder')) {
        e.preventDefault();
        toggleSidebar();
      }
    } else if (e.key === 'F12' || (modifier && e.shiftKey && e.key.toLowerCase() === 'i')) {
      e.preventDefault();
      bridge.window.toggleDevTools?.();
    }
  }, [tabs, activeTabId, setActiveTabId, closeTab, toggleActivityBar, toggleEditorMode, createTab, events, openVariableModal, bridge]);

  useEffect(() => {
    const unsub = addWindowListener('keydown', handleKeyDown);
    return unsub;
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
            addNotification('Image Import Failed', (err as Error)?.message || 'Failed to process dropped image', 'error');
          }
          continue;
        }

        const content = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        const lang: SupportedLanguage = ext === 'json' ? 'json' : ext === 'js' ? 'javascript' : ext === 'py' ? 'python' : 'markdown';
        openDocumentWithLargeDocCheck({
          title: file.name,
          content,
          language: lang
        });
      }
    }
  };

  const isWeb = !bridge.window.isNative;

  // Web SaaS Gateway: Unauthenticated visitors must sign in or enter guest workspace
  if (isWeb && isInitialized && !user && !isGuestMode) {
    return <WebAuthGateway />;
  }

  return (
    <div
      data-theme={settings.theme || 'contextpad-dark'}
      data-density={settings.uiDensity === 'touch' ? 'touch' : 'desktop'}
      data-touch={settings.touchOptimized ? 'true' : 'false'}
      className="flex flex-col h-full w-full theme-app font-sans overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Primary Workspace Shell */}
      <ClassicShell 
        events={events} 
        isHeaderHidden={isHeaderHidden}
        onOpenOnboarding={() => setIsOnboardingModalOpen(true)}
      />

      {/* Client-Side Window Resize Handles (for frameless windows) */}
      <WindowResizeHandles />

      {/* Global Modals Layer */}
      <ShellModalLayer 
        isCommandPaletteOpen={isCommandPaletteOpen}
        onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
        isShortcutsOpen={isShortcutsOpen}
        onCloseShortcuts={() => setIsShortcutsOpen(false)}
        isOnboardingOpen={(!hasCompletedOnboarding && isInitialized && (Boolean(user) || isGuestMode)) || isOnboardingModalOpen}
        onCloseOnboarding={() => setIsOnboardingModalOpen(false)}
      />

      {/* Global Notification Toast Layer */}
      <ShellNotificationLayer />
    </div>
  );
};
