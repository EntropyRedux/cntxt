import React, { useState, useEffect } from 'react';
import { PanelAppRecord } from '../../contracts/data_shapes';
import { AppIcon } from '../Common/AppIcon';
import { 
  Layers, 
  RotateCw, 
  RotateCcw, 
  FileEdit, 
  FolderOpen, 
  Trash2, 
  Play 
} from 'lucide-react';
import { useRuntimeBridge } from '../../adapters';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useConfirmStore } from '../../store/confirmStore';

export interface AppRailProps {
  apps: PanelAppRecord[];
  activeId: string | null;
  isBuilderActive: boolean;
  onOpenApp: (id: string) => void;
  onOpenBuilder: () => void;
  orientation?: 'vertical' | 'horizontal';
}

export const AppRail: React.FC<AppRailProps> = ({
  apps,
  activeId,
  isBuilderActive,
  onOpenApp,
  onOpenBuilder,
  orientation = 'vertical',
}) => {
  const bridge = useRuntimeBridge();
  const { remove } = usePanelAppsStore();
  const { createTab } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    app: PanelAppRecord;
  } | null>(null);

  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener('click', handleClose);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, app: PanelAppRecord) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 280),
      app,
    });
  };

  const handleClearAppData = (app: PanelAppRecord) => {
    setContextMenu(null);
    useConfirmStore.getState().showConfirm({
      title: 'Reset Stored Data',
      message: `Reset all stored data for "${app.name}"? This clears its stored data state.`,
      confirmLabel: 'Reset Data',
      variant: 'warning',
      onConfirm: async () => {
        const key = `cntxt_app_data_${app.id}`;
        await bridge.storage.removeItem(key);
        addNotification('Data Reset', `Local storage for "${app.name}" was reset.`, 'info');
      }
    });
  };

  const handleOpenInEditor = async (app: PanelAppRecord) => {
    try {
      const content = await bridge.fs.readFile?.(app.path);
      if (content !== null && content !== undefined) {
        createTab(app.name, content, 'markdown', app.path);
        addNotification('Opened in Editor', `Now editing ${app.name}`, 'info');
      } else {
        throw new Error('File content could not be read');
      }
    } catch (e) {
      addNotification('Open Failed', (e as Error).message, 'error');
    }
    setContextMenu(null);
  };

  const handleRevealInExplorer = async (app: PanelAppRecord) => {
    try {
      if (bridge.fs.openFileExplorer) {
        await bridge.fs.openFileExplorer(app.path);
      } else {
        addNotification('File Location', app.path, 'info');
      }
    } catch (e) {
      addNotification('Explorer Error', (e as Error).message, 'error');
    }
    setContextMenu(null);
  };

  const handleRemoveApp = (app: PanelAppRecord) => {
    setContextMenu(null);
    useConfirmStore.getState().showConfirm({
      title: 'Remove App from Rail',
      message: `Remove "${app.name}" from your panel apps rail? (The .cntxt file on disk will NOT be deleted)`,
      confirmLabel: 'Remove',
      variant: 'warning',
      onConfirm: () => {
        remove(app.id, bridge.storage);
        addNotification('App Removed', `"${app.name}" removed from rail`, 'info');
      }
    });
  };

  const handleDeleteAppAndFile = (app: PanelAppRecord) => {
    setContextMenu(null);
    useConfirmStore.getState().showConfirm({
      title: 'Delete App & File',
      message: `Permanently delete "${app.name}" and remove its .cntxt file from disk? This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (bridge.fs.deleteFile) {
            await bridge.fs.deleteFile(app.path);
          }
        } catch (err) {
          console.warn('[AppRail] Failed to delete file on disk:', err);
        }
        await bridge.storage.removeItem(`cntxt_app_data_${app.id}`);
        remove(app.id, bridge.storage);
        addNotification('App Deleted', `Deleted "${app.name}" and removed file`, 'info');
      }
    });
  };

  if (orientation === 'horizontal') {
    return (
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 px-1">
        {/* Launch App Builder Button */}
        <button
          type="button"
          onClick={onOpenBuilder}
          title="Panel App Builder"
          aria-label="Panel App Builder"
          className={`h-9 px-2.5 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs ${
            isBuilderActive
              ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0 text-[var(--accent-primary)]" />
          <span className="font-medium text-[11px]">Builder</span>
        </button>

        {/* Dynamic App Icons */}
        {apps.map((app) => {
          const isActive = activeId === app.id;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenApp(app.id)}
              onContextMenu={(e) => handleContextMenu(e, app)}
              title={`${app.name} (Right-click for options)`}
              aria-label={app.name}
              className={`h-9 px-2 rounded-lg flex items-center gap-1.5 transition-all shrink-0 cursor-pointer text-xs ${
                isActive
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <AppIcon name={app.icon} size={15} className="shrink-0" />
              <span className="truncate max-w-[100px] text-[11px]">{app.name}</span>
            </button>
          );
        })}

        {/* Context Menu Modal */}
        {contextMenu && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="theme-dropdown fixed z-50 min-w-[200px] rounded-xl shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 border border-[var(--border-primary)] bg-[var(--card-secondary-bg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1.5 font-semibold text-[11px] text-[var(--text-muted)] border-b border-[var(--border-subtle)] truncate">
              {contextMenu.app.name}
            </div>

            <button
              type="button"
              onClick={() => {
                onOpenApp(contextMenu.app.id);
                setContextMenu(null);
              }}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Open in Panel</span>
            </button>

            <button
              type="button"
              onClick={() => handleClearAppData(contextMenu.app)}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Stored Data</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenInEditor(contextMenu.app)}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Edit .cntxt in Editor</span>
            </button>

            <button
              type="button"
              onClick={() => handleRevealInExplorer(contextMenu.app)}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Reveal in File Explorer</span>
            </button>

            <div className="my-1 border-t border-[var(--border-subtle)]" />

            <button
              type="button"
              onClick={() => handleRemoveApp(contextMenu.app)}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-red-500 hover:text-white flex items-center gap-2 text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove from Rail</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteAppAndFile(contextMenu.app)}
              className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-red-600 hover:text-white flex items-center gap-2 text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete App & File</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-1.5 w-full py-1">
      {/* Subtle Divider */}
      <div className="w-6 h-px bg-[var(--border-subtle)] opacity-70 my-0.5 shrink-0" />

      {/* Launch App Builder Button */}
      <button
        type="button"
        onClick={onOpenBuilder}
        title="Panel App Builder (Create or manage HTML mini-apps)"
        aria-label="Panel App Builder"
        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer group ${
          isBuilderActive
            ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs'
            : 'text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)]'
        }`}
      >
        <Layers className="w-4 h-4" />
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--accent-primary)] text-white flex items-center justify-center text-[9px] font-bold">
          +
        </span>
        {isBuilderActive && (
          <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-r" />
        )}
      </button>

      {/* Dynamic Registered Apps Scrollable Stack */}
      {apps.map((app) => {
        const isActive = activeId === app.id;
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => onOpenApp(app.id)}
            onContextMenu={(e) => handleContextMenu(e, app)}
            title={`${app.name} (Right-click for options)`}
            aria-label={app.name}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative cursor-pointer ${
              isActive
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-xs ring-1 ring-[var(--accent-primary)]/40'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <AppIcon name={app.icon} size={16} />
            {isActive && (
              <div className="absolute left-0 w-0.5 h-4 bg-[var(--accent-primary)] rounded-r" />
            )}
          </button>
        );
      })}

      {/* Context Menu Modal */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="theme-dropdown fixed z-50 min-w-[200px] rounded-xl shadow-2xl p-1 text-xs select-none animate-in fade-in zoom-in-95 border border-[var(--border-primary)] bg-[var(--card-secondary-bg)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1.5 font-semibold text-[11px] text-[var(--text-muted)] border-b border-[var(--border-subtle)] truncate">
            {contextMenu.app.name}
          </div>

          <button
            type="button"
            onClick={() => {
              onOpenApp(contextMenu.app.id);
              setContextMenu(null);
            }}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Open in Panel</span>
          </button>

          <button
            type="button"
            onClick={() => handleClearAppData(contextMenu.app)}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Reset Stored Data</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenInEditor(contextMenu.app)}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Edit .cntxt in Editor</span>
          </button>

          <button
            type="button"
            onClick={() => handleRevealInExplorer(contextMenu.app)}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Reveal in File Explorer</span>
          </button>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <button
            type="button"
            onClick={() => handleRemoveApp(contextMenu.app)}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-red-500 hover:text-white flex items-center gap-2 text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove from Rail</span>
          </button>

          <button
            type="button"
            onClick={() => handleDeleteAppAndFile(contextMenu.app)}
            className="w-full px-2.5 py-1.5 rounded-md text-left hover:bg-red-600 hover:text-white flex items-center gap-2 text-red-500 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete App & File</span>
          </button>
        </div>
      )}
    </div>
  );
};

