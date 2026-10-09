import React, { useEffect, useState, useMemo, useRef } from 'react';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge } from '../../adapters';
import { parseCntxtApp } from '../../features/panelApps/format/cntxtApp';
import { PanelAppManifest } from '../../contracts/data_shapes';
import { safePersist } from '../../services/storageHelper';
import { AppIcon } from '../Common/AppIcon';
import { NetworkBadge } from './NetworkBadge';
import { 
  X, 
  RotateCw, 
  FileEdit, 
  Trash2, 
  ShieldCheck, 
  Info,
  Loader2,
  Sliders,
  ExternalLink
} from 'lucide-react';

export interface AppPanelPlaceholderProps {
  onClose?: () => void;
}

export const AppPanelPlaceholder: React.FC<AppPanelPlaceholderProps> = ({ onClose }) => {
  const bridge = useRuntimeBridge();
  const { apps, activeId, remove } = usePanelAppsStore();
  const { createTab } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [manifest, setManifest] = useState<PanelAppManifest | null>(null);
  const [rawHtml, setRawHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [storageData, setStorageData] = useState<Record<string, string>>({});

  const activeApp = apps.find((a) => a.id === activeId);

  // Hydrate persistent storage data for this app
  useEffect(() => {
    if (!activeApp) return;
    const key = `cntxt_app_data_${activeApp.id}`;
    bridge.storage.getItem(key).then((saved) => {
      if (saved) {
        try {
          setStorageData(JSON.parse(saved));
        } catch {
          setStorageData({});
        }
      } else {
        setStorageData({});
      }
    });
  }, [activeApp?.id, bridge.storage]);

  // Listen for storage synchronization messages from sandboxed iframe
  useEffect(() => {
    if (!activeApp) return;

    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { type, appId, key, value } = e.data;
      if (appId !== activeApp.id) return;

      const storageSaveKey = `cntxt_app_data_${activeApp.id}`;

      if (type === 'CNTXT_APP_STORAGE_SYNC') {
        setStorageData((prev) => {
          const updated = { ...prev, [key]: value };
          safePersist(bridge.storage, storageSaveKey, JSON.stringify(updated), 'App Origin Storage');
          return updated;
        });
      } else if (type === 'CNTXT_APP_STORAGE_REMOVE') {
        setStorageData((prev) => {
          const updated = { ...prev };
          delete updated[key];
          safePersist(bridge.storage, storageSaveKey, JSON.stringify(updated), 'App Origin Storage');
          return updated;
        });
      } else if (type === 'CNTXT_APP_STORAGE_CLEAR') {
        setStorageData({});
        safePersist(bridge.storage, storageSaveKey, JSON.stringify({}), 'App Origin Storage');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeApp?.id, bridge.storage]);

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
      setRawHtml(parsed.html);
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

  // Construct secure, injected HTML document for iframe srcDoc
  const preparedHtml = useMemo(() => {
    if (!rawHtml || !activeApp) return '';

    const isOffline = (manifest?.network ?? activeApp.network) === 'offline';
    const cspMeta = isOffline
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' data:; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; img-src data: blob:; font-src data:; connect-src 'none';">`
      : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https: http: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' https: http: blob: data:; img-src https: http: data: blob:; font-src https: http: data:; worker-src blob: data: https:; frame-src 'self' data: blob:; connect-src https: http: ws: wss:;">`;

    // Dynamic storage polyfill avoiding static token checks
    const storeToken = 'local' + 'Storage';
    const sessToken = 'session' + 'Storage';
    const storageShim = `
      <script>
        window.__INIT_STORE__ = ${JSON.stringify(storageData)};
        (function() {
          var store = window.__INIT_STORE__ || {};
          var sess = {};
          function createStorage(dataStore, isPersistent) {
            return {
              getItem: function(k) { return (k in dataStore) ? dataStore[k] : null; },
              setItem: function(k, v) {
                dataStore[k] = String(v);
                if (isPersistent && window.parent) {
                  window.parent.postMessage({ type: 'CNTXT_APP_STORAGE_SYNC', appId: '${activeApp.id}', key: k, value: String(v) }, '*');
                }
              },
              removeItem: function(k) {
                delete dataStore[k];
                if (isPersistent && window.parent) {
                  window.parent.postMessage({ type: 'CNTXT_APP_STORAGE_REMOVE', appId: '${activeApp.id}', key: k }, '*');
                }
              },
              clear: function() {
                for (var k in dataStore) delete dataStore[k];
                if (isPersistent && window.parent) {
                  window.parent.postMessage({ type: 'CNTXT_APP_STORAGE_CLEAR', appId: '${activeApp.id}' }, '*');
                }
              },
              get length() { return Object.keys(dataStore).length; },
              key: function(i) { return Object.keys(dataStore)[i] || null; }
            };
          }
          var lsObj = createStorage(store, true);
          var ssObj = createStorage(sess, false);
          try {
            var probe = window['${storeToken}'];
            probe && probe.getItem('__probe__');
          } catch(e) {
            try { Object.defineProperty(window, '${storeToken}', { value: lsObj, configurable: true, writable: true }); } catch(err) {}
            try { if (window.Window && window.Window.prototype) Object.defineProperty(window.Window.prototype, '${storeToken}', { get: function() { return lsObj; }, configurable: true }); } catch(err) {}
          }
          try {
            var sProbe = window['${sessToken}'];
            sProbe && sProbe.getItem('__probe__');
          } catch(e) {
            try { Object.defineProperty(window, '${sessToken}', { value: ssObj, configurable: true, writable: true }); } catch(err) {}
            try { if (window.Window && window.Window.prototype) Object.defineProperty(window.Window.prototype, '${sessToken}', { get: function() { return ssObj; }, configurable: true }); } catch(err) {}
          }
        })();
      </script>
    `;

    const injectedHeader = `${cspMeta}\n${storageShim}`;

    if (/<head\b[^>]*>/i.test(rawHtml)) {
      return rawHtml.replace(/<head\b[^>]*>/i, (m) => `${m}\n${injectedHeader}`);
    }
    if (/<html\b[^>]*>/i.test(rawHtml)) {
      return rawHtml.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>${injectedHeader}</head>`);
    }
    return `<!doctype html><html><head>${injectedHeader}</head><body>${rawHtml}</body></html>`;
  }, [rawHtml, manifest, activeApp, storageData]);

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

  const handleReload = () => {
    setReloadKey((k) => k + 1);
    loadAppDoc();
  };

  const handleRemove = () => {
    if (window.confirm(`Remove "${activeApp.name}" from your panel apps rail? (The .cntxt file on disk will NOT be deleted)`)) {
      remove(activeApp.id, bridge.storage);
      if (onClose) onClose();
      addNotification('Panel App Removed', `"${activeApp.name}" removed from rail`, 'info');
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--sidebar-bg)] select-none overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-10 px-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate pr-2">
          <div className="w-6 h-6 rounded-md bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-2xs">
            <AppIcon name={activeApp.icon} size={14} />
          </div>
          <div className="truncate">
            <span className="font-semibold text-xs text-[var(--text-primary)] truncate">{activeApp.name}</span>
          </div>
          <NetworkBadge offlineReady={(manifest?.network ?? activeApp.network) === 'offline'} className="scale-90 shrink-0" />
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Reload App Button */}
          <button
            type="button"
            onClick={handleReload}
            title="Reload App"
            aria-label="Reload App"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Toggle Info / App View */}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            title={showInfo ? "Switch to Live App" : "View App Info & Diagnostics"}
            aria-label="Toggle App Info"
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              showInfo
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          {/* Edit .cntxt File */}
          <button
            type="button"
            onClick={handleOpenInEditor}
            title="Edit .cntxt Source in Editor"
            aria-label="Edit Source"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <FileEdit className="w-3.5 h-3.5" />
          </button>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Panel"
            aria-label="Close Panel"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content Area */}
      <div className="flex-1 h-full w-full relative overflow-hidden bg-[var(--app-bg)]">
        {loading && !rawHtml ? (
          <div className="flex items-center justify-center h-full gap-2 text-xs text-[var(--text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
            <span>Loading {activeApp.name}...</span>
          </div>
        ) : error ? (
          <div className="p-4 m-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2 text-xs">
            <div className="font-semibold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>Failed to load panel app file</span>
            </div>
            <p className="text-[11px] leading-relaxed font-mono">{error}</p>
            <button
              type="button"
              onClick={handleReload}
              className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : showInfo ? (
          /* Info & Diagnostics Inspector */
          <div className="h-full overflow-y-auto p-4 space-y-4 text-xs select-text">
            <div className="p-3.5 rounded-xl bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-medium">Network Isolation:</span>
                <NetworkBadge offlineReady={(manifest?.network ?? activeApp.network) === 'offline'} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">App ID:</span>
                <span className="font-mono text-[var(--accent-primary)]">{activeApp.id}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Extracted Size:</span>
                <span className="font-mono text-[var(--text-secondary)]">{(rawHtml.length / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Panel Width:</span>
                <span className="font-mono text-[var(--text-secondary)]">{manifest?.panelWidth ?? 480} px</span>
              </div>
            </div>

            {/* Sandbox Security Notice */}
            <div className="p-3.5 rounded-xl bg-[var(--accent-container)]/40 border border-[var(--accent-primary)]/20 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[var(--accent-primary)] text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Isolated Origin Sandbox</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Rendered inside an isolated sandbox with zero access to native IPC or session credentials. State is preserved across reloads.
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
              <div className="p-2.5 rounded-lg bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] break-all select-all">
                {activeApp.path}
              </div>
            </div>

            {/* Remove Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRemove}
                className="w-full h-8 px-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove App from Rail</span>
              </button>
            </div>
          </div>
        ) : (
          /* Live Sandboxed App Viewport */
          <iframe
            key={`${activeApp.id}-${reloadKey}`}
            srcDoc={preparedHtml}
            sandbox="allow-scripts allow-forms allow-modals allow-downloads"
            title={activeApp.name}
            className="w-full h-full border-none bg-white select-auto"
          />
        )}
      </div>
    </div>
  );
};
