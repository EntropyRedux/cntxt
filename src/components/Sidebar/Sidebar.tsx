import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSettingsStore, isOmniTerminalFeatureEnabled } from '../../store/settingsStore';
import { useRuntimeBridge, useWindowDimensions, getWindowWidth, addWindowListener } from '../../adapters';
import { safePersist } from '../../services/storageHelper';
import { FileExplorer } from './FileExplorer';
import { OutlinePanel } from './OutlinePanel';
import { TemplateManager } from './TemplateManager';
import { ActionManager } from './ActionManager';
import { TokenAnalytics } from './TokenAnalytics';
import { SettingsPanel } from './SettingsPanel';
import { 
  PanelRightClose, 
  FolderTree, 
  ListTree, 
  LayoutTemplate, 
  Terminal, 
  Coins, 
  Settings,
  Sparkles,
  Upload,
  Download,
  FolderGit2,
  Layers,
  Bot
} from 'lucide-react';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useConfirmStore } from '../../store/confirmStore';
import { triggerFileDownload, triggerFileInput } from '../../adapters';
import { PersonalGitHubLibraryModal } from './PersonalGitHubLibraryModal';
import { AppBuilderPanel } from '../panelApps/AppBuilderPanel';
import { AppPanelPlaceholder } from '../panelApps/AppPanelPlaceholder';
import { AppFrameHost } from '../panelApps/AppFrameHost';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { OmniTerminalView } from '../OmniTerminal/OmniTerminalView';

const STORAGE_KEY = 'contextpad_sidepanel_width';
const DEFAULT_DESKTOP_WIDTH = 340;

export interface SidebarProps {
  isClosed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isClosed = false }) => {
  const bridge = useRuntimeBridge();
  const { settings, toggleSidebar, updateSettings } = useSettingsStore();
  const { width: windowWidth } = useWindowDimensions();
  const panelRef = useRef<HTMLElement>(null);
  const isOverlay = !!settings.sidebarOverlay;

  const { exportTemplates, previewImportTemplates, commitImportTemplates } = useTemplateStore();
  const { exportActions, importActions } = useActionStore();
  const { addNotification } = useNotificationStore();
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  const handleExportActions = () => {
    const json = exportActions();
    const dateStr = new Date().toISOString().split('T')[0];
    triggerFileDownload(`contextpad-actions-${dateStr}.json`, json);
    addNotification('Export Complete', 'Actions JSON exported', 'success');
  };

  const handleImportActions = () => {
    triggerFileInput('.json', (text) => {
      try {
        const count = importActions(text);
        if (count === 0) {
          addNotification('Import Error', 'No valid actions found in file', 'error');
          return;
        }
        addNotification(
          'Import Complete',
          `Successfully imported ${count} action(s)`,
          'success'
        );
      } catch {
        addNotification('Import Error', 'Invalid or unreadable action JSON', 'error');
      }
    });
  };

  const handleExportTemplates = () => {
    const json = exportTemplates();
    const dateStr = new Date().toISOString().split('T')[0];
    triggerFileDownload(`contextpad-templates-${dateStr}.json`, json);
    addNotification('Export Complete', 'Templates JSON exported', 'success');
  };

  const handleImportTemplates = () => {
    triggerFileInput('.json', (text) => {
      try {
        const preview = previewImportTemplates(text);
        if (preview.addedCount === 0 && preview.duplicates.length === 0) {
          addNotification('Import Error', 'No valid templates found in file', 'error');
          return;
        }

        const doCommit = () => {
          commitImportTemplates(preview.newTemplates);
          addNotification(
            'Import Complete',
            `Successfully imported ${preview.newTemplates.length} template(s)`,
            'success'
          );
        };

        if (preview.duplicates.length > 0) {
          useConfirmStore.getState().showConfirm({
            title: 'Duplicate Templates Found',
            message: `Duplicate template names found:\n${preview.duplicates.join(', ')}\n\nImport anyway? (Duplicate items will be added with new unique IDs)`,
            confirmLabel: 'Import Anyway',
            variant: 'warning',
            onConfirm: doCommit,
          });
          return;
        }

        doCommit();
      } catch {
        addNotification('Import Error', 'Invalid or unreadable template JSON', 'error');
      }
    });
  };

  // Initialize width from bridge storage or screen dimensions
  const [width, setWidth] = useState<number>(() => {
    const winWidth = getWindowWidth();
    if (winWidth < 640) {
      return Math.max(220, Math.round(winWidth - 60));
    }
    if (winWidth < 1024) {
      return 300;
    }
    return DEFAULT_DESKTOP_WIDTH;
  });

  useEffect(() => {
    bridge.storage.getItem(STORAGE_KEY).then(saved => {
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 1200) {
          setWidth(parsed);
        }
      }
    }).catch(err => console.warn('[Sidebar] Failed to load stored width', err));
  }, [bridge.storage]);

  // Adjust width if active panel app specifies default width
  const activePanelAppId = usePanelAppsStore(state => state.activeId);
  const panelApps = usePanelAppsStore(state => state.apps);
  const mountedPanelAppIds = usePanelAppsStore(state => state.mounted);
  const panelAppsReloadNonce = usePanelAppsStore(state => state.reloadNonce);
  const panelAppsHtmlCache = usePanelAppsStore(state => state.htmlCache);
  const setPresentation = usePanelAppsStore(state => state.setPresentation);
  const setFloatingPosition = usePanelAppsStore(state => state.setFloatingPosition);

  useEffect(() => {
    if (settings.activeSidebarTab === 'panel-app') {
      const activeApp = panelApps.find(a => a.id === activePanelAppId);
      if (activeApp?.panelWidth) {
        setWidth(activeApp.panelWidth);
      }
    }
  }, [settings.activeSidebarTab, activePanelAppId, panelApps]);

  const [isResizing, setIsResizing] = useState(false);

  // Clamp width whenever the window size changes
  useEffect(() => {
    const parentContainer = panelRef.current?.parentElement;
    const containerWidth = parentContainer ? parentContainer.clientWidth : windowWidth;
    const maxAvailable = Math.max(200, containerWidth - 24);
    setWidth(prev => (prev > maxAvailable ? maxAvailable : prev));
  }, [windowWidth]);

  // Reset width to sensible default
  const handleResetWidth = useCallback(() => {
    const parentContainer = panelRef.current?.parentElement;
    const containerWidth = parentContainer ? parentContainer.clientWidth : windowWidth;
    const target = windowWidth < 640
      ? Math.max(220, containerWidth - 40)
      : DEFAULT_DESKTOP_WIDTH;

    setWidth(target);
    safePersist(bridge.storage, STORAGE_KEY, String(target), 'sidebar width');
  }, [bridge.storage, windowWidth]);

  // Drag resizer: Mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsResizing(true);

    const rightEdge = panelRef.current 
      ? panelRef.current.getBoundingClientRect().right 
      : windowWidth;

    let cleanupListeners = () => {};

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const newWidth = rightEdge - moveEvent.clientX;
      const parentContainer = panelRef.current?.parentElement;
      const containerWidth = parentContainer ? parentContainer.clientWidth : windowWidth;
      const minWidth = Math.min(220, Math.max(160, Math.floor(containerWidth * 0.25)));
      const maxWidth = Math.max(minWidth, containerWidth - 24);
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setWidth(clamped);
      safePersist(bridge.storage, STORAGE_KEY, String(clamped), 'sidebar width');
    };

    const onMouseUp = () => {
      setIsResizing(false);
      cleanupListeners();
    };

    const removeMove = addWindowListener('mousemove', onMouseMove);
    const removeUp = addWindowListener('mouseup', onMouseUp);
    cleanupListeners = () => {
      removeMove();
      removeUp();
    };
  }, [bridge.storage, windowWidth]);

  // Drag resizer: Touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsResizing(true);

    const rightEdge = panelRef.current 
      ? panelRef.current.getBoundingClientRect().right 
      : windowWidth;

    let cleanupTouchListeners = () => {};

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const clientX = moveEvent.touches[0].clientX;
      const newWidth = rightEdge - clientX;
      const parentContainer = panelRef.current?.parentElement;
      const containerWidth = parentContainer ? parentContainer.clientWidth : windowWidth;
      const minWidth = Math.min(220, Math.max(160, Math.floor(containerWidth * 0.25)));
      const maxWidth = Math.max(minWidth, containerWidth - 24);
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setWidth(clamped);
      safePersist(bridge.storage, STORAGE_KEY, String(clamped), 'sidebar width');
    };

    const onTouchEnd = () => {
      setIsResizing(false);
      cleanupTouchListeners();
    };

    const removeTouchMove = addWindowListener('touchmove', onTouchMove);
    const removeTouchEnd = addWindowListener('touchend', onTouchEnd);
    const removeTouchCancel = addWindowListener('touchcancel', onTouchEnd);
    cleanupTouchListeners = () => {
      removeTouchMove();
      removeTouchEnd();
      removeTouchCancel();
    };
  }, [bridge.storage, windowWidth]);

  const getTabInfo = () => {
    switch (settings.activeSidebarTab) {
      case 'explorer':
        return { title: 'File Explorer', icon: FolderTree };
      case 'outline':
        return { title: 'Document Outline', icon: ListTree };
      case 'templates':
        return { title: 'Templates & Variables', icon: LayoutTemplate };
      case 'actions':
        return { title: 'Action Scripts', icon: Terminal };
      case 'tokens':
        return { title: 'Token Analytics', icon: Coins };
      case 'settings':
        return { title: 'Preferences', icon: Settings };
      case 'app-builder':
        return { title: 'Panel App Builder', icon: Layers };
      case 'panel-app':
        return { title: 'Panel App', icon: Sparkles };
      case 'omni-terminal':
        return { title: 'Omni Terminal', icon: Bot };
      default:
        return { title: 'Side Panel', icon: Sparkles };
    }
  };

  const renderContent = () => {
    switch (settings.activeSidebarTab) {
      case 'explorer':
        return <FileExplorer />;
      case 'outline':
        return <OutlinePanel />;
      case 'templates':
        return <TemplateManager />;
      case 'actions':
        return <ActionManager />;
      case 'tokens':
        return <TokenAnalytics />;
      case 'settings':
        return <SettingsPanel />;
      case 'app-builder':
        return <AppBuilderPanel onClose={() => toggleSidebar()} />;
      case 'panel-app':
        return <AppPanelPlaceholder onClose={() => toggleSidebar()} />;
      case 'omni-terminal':
        if (!isOmniTerminalFeatureEnabled(settings)) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[var(--text-muted)] select-none">
              <Bot className="w-10 h-10 text-[var(--accent-primary)] mb-3 opacity-30" />
              <div className="font-semibold text-sm text-[var(--text-primary)] mb-1">Omni Terminal is Disabled</div>
              <p className="text-xs max-w-xs mb-4 text-[var(--text-secondary)] leading-relaxed">
                Omni Terminal is an experimental feature and is currently disabled. To activate it, go to Settings and enable <strong>Experimental Settings</strong>, <strong>Terminal Shells & Multi-Agent Bus</strong>, and <strong>Omni Terminal Mission Control</strong>.
              </p>
              <button
                type="button"
                onClick={() => useSettingsStore.getState().setActiveSidebarTab('settings')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Open Settings
              </button>
            </div>
          );
        }
        if (settings.isOmniFloating) {
          return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[var(--text-muted)] select-none">
              <Bot className="w-10 h-10 text-[var(--accent-primary)] mb-3 opacity-80" />
              <div className="font-semibold text-sm text-[var(--text-primary)] mb-1">Omni Terminal is Popped Out</div>
              <p className="text-xs max-w-xs mb-4">
                The terminal session is active in the floating window. You can interact with it there or dock it back into this sidebar.
              </p>
              <button
                type="button"
                onClick={() => updateSettings({ isOmniFloating: false })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-[var(--button-primary-text)] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Dock Back to Sidebar
              </button>
            </div>
          );
        }
        return <OmniTerminalView />;
      default:
        return <TemplateManager />;
    }
  };

  const tabInfo = getTabInfo();
  const TabIcon = tabInfo.icon;

  return (
    <aside
      ref={panelRef}
      style={{
        width: isClosed ? 0 : `${width}px`,
        maxWidth: isOverlay ? 'calc(100% - 24px)' : '100%',
        borderLeft: isClosed ? 'none' : undefined,
        overflow: isClosed ? 'visible' : undefined,
      }}
      aria-label={tabInfo.title}
      className={`theme-sidebar h-full flex flex-col select-none transition-none ${
        isClosed
          ? 'border-none bg-transparent overflow-visible'
          : `border-l border-[var(--border-primary)] bg-[var(--sidebar-bg)] ${
              isOverlay 
                ? 'absolute right-0 top-0 bottom-0 z-30 shadow-2xl backdrop-blur-md' 
                : 'relative shrink-0 z-10 shadow-xs'
            }`
      }`}
    >
      {/* Left-edge Draggable Resizer Handle */}
      {!isClosed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize side panel"
          title="Drag to resize"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center select-none touch-none ${
            isResizing ? 'cursor-col-resize' : ''
          }`}
        >
          {/* Continuous border highlight line */}
          <div
            className={`w-0.5 h-full transition-colors ${
              isResizing
                ? 'bg-[var(--accent-primary)]'
                : 'bg-transparent group-hover:bg-[var(--accent-primary)]/60'
            }`}
          />
          {/* Subtle center grip pill */}
          <div
            className={`absolute w-1 h-8 rounded-full transition-all pointer-events-none ${
              isResizing
                ? 'bg-[var(--accent-primary)] opacity-100 scale-110 shadow-xs'
                : 'bg-[var(--text-muted)] opacity-0 group-hover:opacity-60'
            }`}
          />
        </div>
      )}

      {/* Full-viewport transparent overlay shield active during drag */}
      {isResizing && (
        <div
          className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        />
      )}

      {/* Side Panel Header (hidden when closed, or for self-contained panel app and builder) */}
      {!isClosed && settings.activeSidebarTab !== 'app-builder' && settings.activeSidebarTab !== 'panel-app' && (
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/80 backdrop-blur-xs shrink-0 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <TabIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span className="font-semibold text-xs truncate text-[var(--text-primary)]">
            {tabInfo.title}
          </span>
          {isOverlay && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide bg-[var(--accent-container)] text-[var(--on-accent-container)] shrink-0 hidden xs:inline-block">
              Overlay
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {settings.activeSidebarTab === 'templates' && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setIsGitHubModalOpen(true)}
                title="Personal GitHub Library (Free Cloud Sync)"
                aria-label="Personal GitHub Library"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-purple-400 hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleImportTemplates}
                title="Import Templates JSON"
                aria-label="Import Templates JSON"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportTemplates}
                title="Export Templates JSON"
                aria-label="Export Templates JSON"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />
            </div>
          )}

          {settings.activeSidebarTab === 'actions' && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setIsGitHubModalOpen(true)}
                title="Personal GitHub Library (Free Cloud Sync)"
                aria-label="Personal GitHub Library"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-purple-400 hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleImportActions}
                title="Import Actions JSON"
                aria-label="Import Actions JSON"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExportActions}
                title="Export Actions JSON"
                aria-label="Export Actions JSON"
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3.5 bg-[var(--border-subtle)] mx-0.5" />
            </div>
          )}

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            title="Close side panel"
            aria-label="Close side panel"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95 cursor-pointer"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>
      )}

      {/* Tab Panel View Content */}
      <div
        className="flex-1 h-full overflow-hidden relative"
        style={isClosed ? { overflow: 'visible' } : undefined}
      >
        {/* Stable Keep-Alive App Host: keeps mounted panel app iframes alive in the DOM across panel switches and sidebar close */}
        <AppFrameHost
          mountedIds={mountedPanelAppIds}
          activeId={!isClosed && settings.activeSidebarTab === 'panel-app' ? activePanelAppId : null}
          visible={!isClosed && settings.activeSidebarTab === 'panel-app'}
          reloadNonce={panelAppsReloadNonce}
          getUrl={() => 'about:blank'}
          getSrcDoc={(id) => panelAppsHtmlCache[id] || ''}
          titleOf={(id) => panelApps.find((a) => a.id === id)?.name ?? id}
          topOffset="40px"
          theme={settings.theme}
          apps={panelApps}
          onSetFloatingPosition={(id, pos) => setFloatingPosition(id, pos, bridge.storage)}
          onSetPresentation={(id, mode) => setPresentation(id, mode, bridge.storage)}
        />

        {/* When active tab is NOT panel-app, render that panel above */}
        {!isClosed && settings.activeSidebarTab !== 'panel-app' && (
          <div className="absolute inset-0 z-10 bg-[var(--sidebar-bg)] overflow-hidden">
            {renderContent()}
          </div>
        )}

        {/* When active tab IS panel-app, render AppPanelPlaceholder overlay controls */}
        {!isClosed && settings.activeSidebarTab === 'panel-app' && (
          <div className="absolute inset-x-0 top-0 z-10 pointer-events-none h-full">
            <AppPanelPlaceholder onClose={() => toggleSidebar()} />
          </div>
        )}
      </div>

      {/* Personal GitHub Library Modal */}
      <PersonalGitHubLibraryModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </aside>
  );
};
