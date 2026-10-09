import React, { useEffect, useState } from 'react';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge } from '../../adapters';
import { parseCntxtApp } from '../../features/panelApps/format/cntxtApp';
import { PanelAppManifest } from '../../contracts/data_shapes';
import { AppIcon } from '../Common/AppIcon';
import { NetworkBadge } from './NetworkBadge';
import { 
  X, 
  RotateCw, 
  FileEdit, 
  Trash2, 
  ShieldCheck, 
  Info,
  Code2,
  HardDrive
} from 'lucide-react';

export interface AppPanelPlaceholderProps {
  onClose?: () => void;
}

export const AppPanelPlaceholder: React.FC<AppPanelPlaceholderProps> = ({ onClose }) => {
  const bridge = useRuntimeBridge();
  const { apps, activeId, open, remove } = usePanelAppsStore();
  const { createTab } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [manifest, setManifest] = useState<PanelAppManifest | null>(null);
  const [htmlLength, setHtmlLength] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const activeApp = apps.find((a) => a.id === activeId);

  // Load and parse the .cntxt document whenever active app changes or reload is triggered
  const loadAppDoc = async () => {
    if (!activeApp) return;
    setLoading(true);
    setError(null);

    try {
      const content = await bridge.fs.readFile?.(activeApp.path);
      if (content === null || content === undefined) {
        throw new Error(`Could not read .cntxt document at: ${activeApp.path}`);
      }

      const parsed = parseCntxtApp(content);
      if (!parsed.ok) {
        const errMsg = 'error' in parsed ? parsed.error : 'Parse failed';
        throw new Error(`Parse error: ${errMsg}`);
      }

      setManifest(parsed.manifest);
      setHtmlLength(parsed.html.length);
    } catch (e) {
      console.error('[AppPanelPlaceholder] Load error:', e);
      setError((e as Error).message || 'Failed to parse .cntxt document');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppDoc();
  }, [activeApp?.id, activeApp?.path]);

  if (!activeApp) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-[var(--text-muted)] space-y-2 select-none">
        <Info className="w-8 h-8 opacity-40" />
        <div className="text-xs font-medium">No Panel App selected</div>
        <div className="text-[11px]">Select an app from the rail to view.</div>
      </div>
    );
  }

  const handleOpenInEditor = async () => {
    try {
      const content = await bridge.fs.readFile?.(activeApp.path);
      if (content !== null && content !== undefined) {
        createTab(activeApp.name, content, 'markdown', activeApp.path);
        addNotification('Opened in Editor', `Now editing ${activeApp.name}`, 'info');
      }
    } catch (e) {
      addNotification('Open Failed', (e as Error).message, 'error');
    }
  };

  const handleRemove = () => {
    if (window.confirm(`Remove "${activeApp.name}" from your panel apps rail? (The .cntxt file on disk will NOT be deleted)`)) {
      remove(activeApp.id, bridge.storage);
      if (onClose) onClose();
      addNotification('Panel App Removed', `"${activeApp.name}" removed from rail`, 'info');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--sidebar-bg)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 truncate pr-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-2xs">
            <AppIcon name={activeApp.icon} size={15} />
          </div>
          <div className="truncate">
            <div className="font-semibold text-xs text-[var(--text-primary)] truncate">{activeApp.name}</div>
            <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{activeApp.id}</div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={loadAppDoc}
            title="Reload App"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Error State */}
        {error ? (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2">
            <div className="font-semibold flex items-center gap-1.5 text-xs">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>Failed to load panel app file</span>
            </div>
            <p className="text-[11px] leading-relaxed font-mono">{error}</p>
            <button
              type="button"
              onClick={loadAppDoc}
              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Status & Network Badge */}
            <div className="p-3.5 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-medium">Network Isolation:</span>
                <NetworkBadge offlineReady={manifest?.network === 'offline'} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Source Document:</span>
                <span className="font-mono text-[var(--text-secondary)]">{manifest?.createdFrom || 'file'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Extracted Size:</span>
                <span className="font-mono text-[var(--text-secondary)]">{(htmlLength / 1024).toFixed(1)} KB</span>
              </div>
            </div>

            {/* Sandbox Notice */}
            <div className="p-3.5 rounded-xl bg-[var(--accent-container)]/40 border border-[var(--accent-primary)]/20 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[var(--accent-primary)] text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Sandbox Security Boundary Active</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Panel apps execute within isolated origins (<code className="text-[var(--accent-primary)] font-mono">cntxt-app://{activeApp.id}</code>). Apps have dedicated origin storage and IndexedDB with zero native IPC or session token access.
              </p>
            </div>

            {/* Description (if provided) */}
            {manifest?.description && (
              <div className="p-3 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-1">
                <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Description
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{manifest.description}</p>
              </div>
            )}

            {/* File Path Reference */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Source Document Path
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] break-all select-text">
                {activeApp.path}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={handleOpenInEditor}
          className="flex-1 h-8 px-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] text-xs text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer font-medium"
        >
          <FileEdit className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Edit .cntxt File</span>
        </button>

        <button
          type="button"
          onClick={handleRemove}
          title="Remove from rail"
          className="h-8 px-2.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
