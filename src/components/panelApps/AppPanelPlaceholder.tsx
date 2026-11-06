import React, { useEffect, useState, useMemo, useRef } from 'react';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useRuntimeBridge } from '../../adapters';
import { parseCntxtApp, updateCntxtAppState } from '../../features/panelApps/format/cntxtApp';
import { autoHealHtml } from '../../features/panelApps/format/autoHeal';
import { buildThemeInjection } from '../../features/panelApps/theme/themeSync';
import { PanelAppManifest } from '../../contracts/data_shapes';
import { safePersist } from '../../services/storageHelper';
import { HostCommandBus } from '../../features/panelApps/rpc/hostCommandBus';
import { buildClientSdkInjection } from '../../features/panelApps/rpc/clientSdk';
import { AppIcon } from '../Common/AppIcon';
import { NetworkBadge } from './NetworkBadge';
import { 
  X, 
  RotateCw, 
  RotateCcw,
  FileEdit, 
  Trash2, 
  ShieldCheck, 
  Info,
  Loader2,
  Sliders,
  ExternalLink,
  FolderOpen,
  Pin
} from 'lucide-react';

export interface AppPanelPlaceholderProps {
  onClose?: () => void;
}

export const AppPanelPlaceholder: React.FC<AppPanelPlaceholderProps> = ({ onClose }) => {
  const bridge = useRuntimeBridge();
  const { apps, activeId, remove, reload } = usePanelAppsStore();
  const { createTab } = useTabStore();
  const { addNotification } = useNotificationStore();

  const hostCommandBus = useMemo(() => new HostCommandBus(bridge), [bridge]);

  const [manifest, setManifest] = useState<PanelAppManifest | null>(null);
  const [rawHtml, setRawHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [storageData, setStorageData] = useState<Record<string, string>>({});
  const [fileState, setFileState] = useState<unknown>(null);
  const fileStateRef = useRef<unknown>(null);
  const storageDataRef = useRef<Record<string, string>>({});
  fileStateRef.current = fileState;
  storageDataRef.current = storageData;

  const isInternalWriting = useRef(false);
  const lastSavedStateHash = useRef<string>('');
  const saveDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeApp = apps.find((a) => a.id === activeId);

  // Hydrate persistent storage data for this app
  useEffect(() => {
    if (!activeApp) return;
    const key = `cntxt_app_data_${activeApp.id}`;
    bridge.storage.getItem(key).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setStorageData(parsed);
          storageDataRef.current = parsed;
        } catch {
          setStorageData({});
          storageDataRef.current = {};
        }
      } else {
        setStorageData({});
        storageDataRef.current = {};
      }
    });
  }, [activeApp?.id, bridge.storage]);

  // Listen for storage synchronization and state lifecycle messages from sandboxed iframe
  useEffect(() => {
    if (!activeApp) return;

    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const { type, appId, key, value } = e.data;

      // 1. Handshake: App announces readiness
      if (type === 'CNTXT_APP_READY') {
        try {
          const curFileState = fileStateRef.current;
          const curStorage = storageDataRef.current;
          const hasFileState = curFileState !== null && curFileState !== undefined;
          const hasStorageData = curStorage && Object.keys(curStorage).length > 0;
          const initPayload = hasFileState ? curFileState : hasStorageData ? curStorage : null;
          (e.source as WindowProxy | null)?.postMessage(
            { type: 'CNTXT_STATE_INIT', state: initPayload },
            '*'
          );
        } catch {
          // sandbox cross-origin ignore
        }
        return;
      }

      // 2. File-backed state persistence
      if (type === 'CNTXT_STATE_SAVE') {
        const targetId = appId || activeApp.id;
        if (targetId !== activeApp.id) return;

        const newState = e.data.state;
        setFileState(newState);

        if (saveDebounceTimer.current) {
          clearTimeout(saveDebounceTimer.current);
        }

        const executeSave = async (stateToSave: unknown) => {
          try {
            const stateString = typeof stateToSave === 'string' ? stateToSave : JSON.stringify(stateToSave);
            if (stateString === lastSavedStateHash.current) return;
            lastSavedStateHash.current = stateString;

            // Protection: Skip writing if active editor tab has unsaved changes to this file
            const activeTabs = useTabStore.getState().tabs;
            const isDirty = activeTabs.some(
              (t) =>
                t.filePath &&
                (t.filePath === activeApp.path || t.filePath.endsWith(activeApp.path)) &&
                t.isDirty
            );
            if (isDirty) {
              console.warn('[AppPanelPlaceholder] Skipping file state save: editor tab has unsaved modifications');
              return;
            }

            isInternalWriting.current = true;
            const currentContent = await bridge.fs.readFile?.(activeApp.path);
            if (!currentContent) return;

            const updated = updateCntxtAppState(currentContent, stateToSave);
            await bridge.fs.saveFile(activeApp.path, updated);
          } catch (err) {
            console.error('[AppPanelPlaceholder] Error saving app state to file:', err);
          } finally {
            isInternalWriting.current = false;
          }
        };

        saveDebounceTimer.current = setTimeout(() => {
          executeSave(newState);
        }, 300);
        return;
      }

      // 3. Storage sync (local store proxy shim)
      if (
        type === 'CNTXT_APP_STORAGE_SYNC' ||
        type === 'CNTXT_APP_STORAGE_REMOVE' ||
        type === 'CNTXT_APP_STORAGE_CLEAR'
      ) {
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
        return;
      }

      // 4. Host Command Bus RPC Bridge (FG-16)
      if (type === 'CNTXT_RPC_REQUEST' && e.data.request) {
        const sourceWin = e.source as WindowProxy | null;
        if (!sourceWin) return;

        // Pillar 8 Security (RA-01, RA-02): Enforce authenticated panel app identity.
        // Never trust client-supplied appId or allow panel apps to assert 'internal'.
        const rawReq = (e.data.request && typeof e.data.request === 'object') ? e.data.request : {};
        const secureRequest = {
          ...rawReq,
          appId: `panel-app:${activeApp.id}`,
        };

        hostCommandBus.handleRequest(secureRequest).then((response) => {
          try {
            sourceWin.postMessage({ type: 'CNTXT_RPC_RESPONSE', response }, '*');
          } catch {
            // Sandboxed iframe cross-origin postMessage ignore
          }
        });
        return;
      }

      // 5. Runtime Error Observability
      if (type === 'CNTXT_APP_ERROR' && (appId === activeApp.id || !appId)) {
        const msg = e.data.message || 'Script error';
        const loc = e.data.lineno ? ` (line ${e.data.lineno})` : '';
        const fullErr = `${msg}${loc}`;
        setRuntimeError(fullErr);
        addNotification('Panel App Notice', `${activeApp.name}: ${fullErr}`, 'warning');
        return;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (saveDebounceTimer.current) {
        clearTimeout(saveDebounceTimer.current);
        // Flush pending state to disk immediately on unmount
        if (fileStateRef.current !== null && fileStateRef.current !== undefined && activeApp?.path) {
          const currentContentPromise = bridge.fs.readFile?.(activeApp.path);
          if (currentContentPromise) {
            currentContentPromise.then((currentContent) => {
              if (currentContent) {
                const updated = updateCntxtAppState(currentContent, fileStateRef.current);
                bridge.fs.saveFile(activeApp.path, updated).catch((err) => {
                  console.warn('[AppPanelPlaceholder] Failed to flush final state on unmount:', err);
                });
              }
            });
          }
        }
      }
    };
  }, [activeApp?.id, activeApp?.path, bridge.storage, bridge.fs]);

  // Load and parse the .cntxt document whenever active app changes or reload is triggered
  const loadAppDoc = async () => {
    if (!activeApp) return;
    setLoading(true);
    setError(null);
    setRuntimeError(null);

    try {
      let resolvedPath = activeApp.path;
      let content: string | null | undefined = null;
      try {
        content = await bridge.fs.readFile?.(resolvedPath);
      } catch {
        content = null;
      }

      // If direct read failed, search candidate paths to heal relative or moved files
      if (content === null || content === undefined) {
        const normPath = resolvedPath.replace(/\\/g, '/');
        const fileName = normPath.split('/').pop() || '';
        const candidates: string[] = [];

        // 1. Current workspace path
        const currentWorkspace = await bridge.storage.getItem('contextpad_workspace_path');
        if (currentWorkspace) {
          const wsClean = currentWorkspace.replace(/[/\\]+$/, '');
          candidates.push(`${wsClean}/${normPath}`);
          candidates.push(`${wsClean}/Panel Apps/${fileName}`);
          candidates.push(`${wsClean}/${fileName}`);
        }

        // 2. Default app data directory
        if (bridge.fs.getDefaultAppsDir) {
          const defaultDir = await bridge.fs.getDefaultAppsDir();
          if (defaultDir) {
            const defClean = defaultDir.replace(/[/\\]+$/, '');
            candidates.push(`${defClean}/${fileName}`);
            candidates.push(`${defClean}/${normPath}`);
          }
        }

        // 3. Dev / working directory fallback
        candidates.push(`src-tauri/Panel Apps/${fileName}`);
        candidates.push(`Panel Apps/${fileName}`);
        candidates.push(fileName);

        for (const candidate of candidates) {
          try {
            const candidateContent = await bridge.fs.readFile?.(candidate);
            if (candidateContent !== null && candidateContent !== undefined) {
              content = candidateContent;
              resolvedPath = candidate;
              // Permanently heal the stored path in the registry!
              usePanelAppsStore.getState().update(activeApp.id, { path: candidate }, bridge.storage);
              break;
            }
          } catch {
            // try next candidate
          }
        }
      }

      if (content === null || content === undefined) {
        throw new Error(`Could not read .cntxt document at: ${activeApp.path}`);
      }

      const parsed = parseCntxtApp(content);
      if (!parsed.ok) {
        const errMsg = 'error' in parsed ? parsed.error : 'Parse failed';
        throw new Error(`Parse error: ${errMsg}`);
      }

      setManifest(parsed.manifest);
      if (parsed.state) {
        try {
          setFileState(JSON.parse(parsed.state));
        } catch {
          setFileState(parsed.state);
        }
      }
      // Guard against reload loops: only change rawHtml state if HTML content actually differed
      setRawHtml((prev) => (prev === parsed.html ? prev : parsed.html));
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

    // Auto-heal pervasive LLM syntax traps (markdown checklist regexes, template backticks, etc.)
    const cleanedHtml = autoHealHtml(rawHtml);

    const isOffline = (manifest?.network ?? activeApp.network) === 'offline';
    const cspMeta = isOffline
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' data: blob:; script-src 'unsafe-inline' 'unsafe-eval' blob: data:; img-src data: blob:; font-src data: blob:; connect-src 'none';">`
      : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https: http: data: blob:; script-src 'unsafe-inline' 'unsafe-eval' https: http: blob: data:; img-src https: http: data: blob:; font-src https: http: data: blob:; worker-src 'self' blob: data: https: http:; frame-src 'self' data: blob: https: http:; connect-src https: http: ws: wss:; media-src https: http: data: blob:;">`;

    // Dynamic storage and state protocol polyfill
    const storeToken = 'local' + 'Storage';
    const sessToken = 'session' + 'Storage';
    const themeStyles = buildThemeInjection();
    const initStoreJson = JSON.stringify(storageDataRef.current || storageData || {});
    const storageShim = `
      <script>
        window.__INIT_STORE__ = ${initStoreJson};
        window.__INIT_STATE__ = window.__INIT_STATE__ || null;
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

          // Unconditional robust isolated store polyfill for sandboxed iframe
          try {
            Object.defineProperty(window, '${storeToken}', {
              get: function() { return lsObj; },
              set: function() {},
              configurable: true,
              enumerable: true
            });
          } catch(e) {
            console.warn('[AppPanelPolyfill] Failed to define store token on window:', e);
          }
          try {
            if (window.Window && window.Window.prototype) {
              Object.defineProperty(window.Window.prototype, '${storeToken}', {
                get: function() { return lsObj; },
                set: function() {},
                configurable: true,
                enumerable: true
              });
            }
          } catch(err) {
            console.warn('[AppPanelPolyfill] Failed to define store token on Window.prototype:', err);
          }
          try {
            Object.defineProperty(window, '${sessToken}', {
              get: function() { return ssObj; },
              set: function() {},
              configurable: true,
              enumerable: true
            });
          } catch(e) {
            console.warn('[AppPanelPolyfill] Failed to define sess token on window:', e);
          }
          try {
            if (window.Window && window.Window.prototype) {
              Object.defineProperty(window.Window.prototype, '${sessToken}', {
                get: function() { return ssObj; },
                set: function() {},
                configurable: true,
                enumerable: true
              });
            }
          } catch(err) {
            console.warn('[AppPanelPolyfill] Failed to define sess token on Window.prototype:', err);
          }

          // Expose unified CNTXT_STORAGE bridge
          window.CNTXT_STORAGE = {
            getItem: function(k) { return lsObj.getItem(k); },
            setItem: function(k, v) { lsObj.setItem(k, v); },
            removeItem: function(k) { lsObj.removeItem(k); },
            clear: function() { lsObj.clear(); },
            getState: function() { return window.__INIT_STATE__; },
            saveState: function(s) {
              window.__INIT_STATE__ = s;
              window.parent.postMessage({ type: 'CNTXT_STATE_SAVE', state: s, appId: '${activeApp.id}' }, '*');
            }
          };

          // Runtime Error & Exception Observability
          window.addEventListener('error', function(ev) {
            try {
              window.parent.postMessage({
                type: 'CNTXT_APP_ERROR',
                appId: '${activeApp.id}',
                message: ev.message || 'Script error',
                lineno: ev.lineno,
                colno: ev.colno
              }, '*');
            } catch(e) {
              console.error('[AppPanelError] Failed to postMessage error event to parent:', e);
            }
          });
          window.addEventListener('unhandledrejection', function(ev) {
            try {
              window.parent.postMessage({
                type: 'CNTXT_APP_ERROR',
                appId: '${activeApp.id}',
                message: (ev.reason && (ev.reason.message || ev.reason.stack)) || String(ev.reason)
              }, '*');
            } catch(e) {
              console.error('[AppPanelError] Failed to postMessage unhandled rejection to parent:', e);
            }
          });

          // Expose unified window.CNTXT SDK for panel apps (FG-16)
          ${buildClientSdkInjection(activeApp.id)}
          window.CNTXT.storage = lsObj;

          // Live host theme synchronization listener
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'CNTXT_THEME_UPDATE') {
              var tokens = e.data.tokens || {};
              var d = window['doc' + 'ument'];
              var root = d ? d.documentElement : null;
              if (root) {
                if (e.data.colorScheme) root.style.colorScheme = e.data.colorScheme;
                for (var k in tokens) {
                  root.style.setProperty(k, tokens[k], 'important');
                }
              }
            }
          });
        })();
      </script>
    `;

    const injectedMetaAndShim = `${cspMeta}\n${storageShim}`;
    const injectedTheme = themeStyles;

    // Place CSP and shim at start of head (APIs ready before app scripts)
    let fullDoc = '';
    if (/<\/head>/i.test(cleanedHtml)) {
      fullDoc = cleanedHtml
        .replace(/<head\b[^>]*>/i, (m) => `${m}\n${injectedMetaAndShim}`)
        .replace(/<\/head>/i, `${injectedTheme}\n</head>`);
    } else if (/<head\b[^>]*>/i.test(cleanedHtml)) {
      fullDoc = cleanedHtml.replace(/<head\b[^>]*>/i, (m) => `${m}\n${injectedMetaAndShim}\n${injectedTheme}`);
    } else if (/<html\b[^>]*>/i.test(cleanedHtml)) {
      fullDoc = cleanedHtml.replace(/<html\b[^>]*>/i, (m) => `${m}\n<head>${injectedMetaAndShim}\n${injectedTheme}</head>`);
    } else {
      fullDoc = `<!doctype html><html><head>${injectedMetaAndShim}\n${injectedTheme}</head><body>${cleanedHtml}</body></html>`;
    }

    return fullDoc;
  }, [rawHtml, manifest?.network, activeApp?.id, activeApp?.network]);

  // Sync prepared HTML into central keep-alive cache only when content actually changes
  useEffect(() => {
    if (activeApp && preparedHtml) {
      const cur = usePanelAppsStore.getState().htmlCache[activeApp.id];
      if (cur !== preparedHtml) {
        usePanelAppsStore.getState().setHtmlCache(activeApp.id, preparedHtml);
      }
    }
  }, [activeApp?.id, preparedHtml]);

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
      } else {
        throw new Error('File content could not be read');
      }
    } catch (e) {
      addNotification('Open Failed', (e as Error).message, 'error');
    }
  };

  const handleReload = () => {
    if (activeApp) {
      reload(activeApp.id);
    }
    setReloadKey((k) => k + 1);
    loadAppDoc();
    addNotification('App Reloaded', `Reloading ${activeApp.name}`, 'info');
  };

  const handleClearAppData = () => {
    if (!activeApp) return;
    useConfirmStore.getState().showConfirm({
      title: 'Reset Stored Data',
      message: `Reset all stored data for "${activeApp.name}"? This clears its stored data state and reloads the app with fresh defaults.`,
      confirmLabel: 'Reset Data',
      variant: 'warning',
      onConfirm: async () => {
        const key = `cntxt_app_data_${activeApp.id}`;
        await bridge.storage.removeItem(key);
        setStorageData({});
        setReloadKey((k) => k + 1);
        addNotification('Data Reset', `Local storage data for "${activeApp.name}" was cleared.`, 'info');
      }
    });
  };

  const handleRevealInExplorer = async () => {
    if (!activeApp) return;
    try {
      if (bridge.fs.openFileExplorer) {
        await bridge.fs.openFileExplorer(activeApp.path);
      } else {
        addNotification('File Location', activeApp.path, 'info');
      }
    } catch (e) {
      addNotification('Explorer Error', (e as Error).message, 'error');
    }
  };

  const handleRelinkFile = async () => {
    if (!activeApp) return;
    try {
      const file = await bridge.fs.openFile();
      if (!file) return;

      const parsed = parseCntxtApp(file.content);
      if (!parsed.ok) {
        const errMsg = 'error' in parsed ? parsed.error : 'Invalid format';
        addNotification('Invalid File', `Selected file is not a valid .cntxt document: ${errMsg}`, 'error');
        return;
      }

      usePanelAppsStore.getState().update(
        activeApp.id,
        {
          path: file.path,
          name: parsed.manifest.name,
          icon: parsed.manifest.icon,
          network: parsed.manifest.network,
          panelWidth: parsed.manifest.panelWidth,
        },
        bridge.storage
      );

      addNotification('App Re-linked', `Now linked to: ${file.name}`, 'success');
      setReloadKey((k) => k + 1);
      loadAppDoc();
    } catch (e) {
      addNotification('Relink Failed', (e as Error).message, 'error');
    }
  };

  const handleRemove = () => {
    if (!activeApp) return;
    useConfirmStore.getState().showConfirm({
      title: 'Remove Panel App',
      message: `Remove "${activeApp.name}" from your panel apps rail? (The .cntxt file on disk will NOT be deleted)`,
      confirmLabel: 'Remove',
      variant: 'warning',
      onConfirm: () => {
        remove(activeApp.id, bridge.storage);
        if (onClose) onClose();
        addNotification('Panel App Removed', `"${activeApp.name}" removed from rail`, 'info');
      }
    });
  };

  const handleDeleteAppAndFile = () => {
    if (!activeApp) return;
    useConfirmStore.getState().showConfirm({
      title: 'Delete App & File',
      message: `Permanently delete "${activeApp.name}" and remove its .cntxt file from disk? This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (bridge.fs.deleteFile) {
            await bridge.fs.deleteFile(activeApp.path);
          }
        } catch (err) {
          console.warn('[AppPanelPlaceholder] Failed to delete file on disk:', err);
        }
        await bridge.storage.removeItem(`cntxt_app_data_${activeApp.id}`);
        remove(activeApp.id, bridge.storage);
        if (onClose) onClose();
        addNotification('Panel App Deleted', `Deleted "${activeApp.name}" and file removed`, 'info');
      }
    });
  };

  const isOverlayActive = Boolean((loading && !rawHtml) || error || showInfo);

  return (
    <div className={`flex flex-col ${isOverlayActive ? 'h-full' : 'h-10'} w-full bg-transparent select-none overflow-hidden`}>
      {/* Top Header Bar */}
      <div className="h-10 px-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between shrink-0 pointer-events-auto">
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <div
            className="w-6 h-6 rounded-md bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0 border border-[var(--border-subtle)] shadow-2xs"
            title={activeApp.name}
          >
            <AppIcon name={activeApp.icon} size={14} />
          </div>
          <NetworkBadge offlineReady={(manifest?.network ?? activeApp.network) === 'offline'} className="scale-90 shrink-0" />

          {/* CNTXT-Owned Mini-App Controls: Keep-Alive, Floating Window, FAB */}
          <div className="flex items-center gap-0.5 ml-0.5 border-l border-[var(--border-subtle)] pl-1">
            {/* Keep-Alive Toggle */}
            <button
              type="button"
              onClick={() => usePanelAppsStore.getState().toggleKeepAlive(activeApp.id, bridge.storage)}
              title={
                activeApp.keepAlive
                  ? "Keep Alive Active: Running continuously in background across tabs"
                  : "Enable Keep Alive: Prevent timers/state from stopping when switching tabs"
              }
              aria-label="Toggle Keep Alive"
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                activeApp.keepAlive
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${activeApp.keepAlive ? 'rotate-45 text-[var(--accent-primary)]' : ''}`} />
            </button>

            {/* Pop-out Floating Window Toggle */}
            <button
              type="button"
              onClick={() => {
                const nextMode = activeApp.presentation === 'floating' ? 'docked' : 'floating';
                usePanelAppsStore.getState().setPresentation(activeApp.id, nextMode, bridge.storage);
              }}
              title={
                activeApp.presentation === 'floating'
                  ? "Dock App back into Sidebar"
                  : "Pop Out into Resizable Floating Window"
              }
              aria-label="Toggle Floating Window"
              className={`p-1 rounded-md transition-colors cursor-pointer ${
                activeApp.presentation === 'floating'
                  ? 'text-[var(--accent-primary)] bg-[var(--accent-container)] shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {runtimeError && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] truncate max-w-[120px]"
              title={`App Warning: ${runtimeError}`}
            >
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">{runtimeError}</span>
              <button
                type="button"
                onClick={() => setRuntimeError(null)}
                className="text-amber-400 hover:text-white ml-0.5 text-xs cursor-pointer font-bold"
              >
                ×
              </button>
            </div>
          )}
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

          {/* Reset App State (Clear Data) */}
          <button
            type="button"
            onClick={handleClearAppData}
            title="Reset App State (Clear Stored Data)"
            aria-label="Reset App State"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-amber-400 hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Reveal File in Explorer */}
          <button
            type="button"
            onClick={handleRevealInExplorer}
            title="Reveal .cntxt File in File Explorer"
            aria-label="Reveal in Explorer"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
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

          {/* Remove from Rail */}
          <button
            type="button"
            onClick={handleRemove}
            title="Remove App from Rail"
            aria-label="Remove from Rail"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Main Viewport Content Area - Only rendered when an overlay is active */}
      {isOverlayActive && (
        <div className="flex-1 h-full w-full relative overflow-hidden bg-transparent pointer-events-auto">
          {loading && !rawHtml ? (
            <div className="flex items-center justify-center h-full gap-2 text-xs text-[var(--text-muted)] bg-[var(--sidebar-bg)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-primary)]" />
              <span>Loading {activeApp.name}...</span>
            </div>
          ) : error ? (
            <div className="p-4 m-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-3 text-xs select-text bg-[var(--sidebar-bg)]">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-4 h-4 text-red-400 shrink-0" />
                <span>Failed to load panel app file</span>
              </div>
              <p className="text-[11px] leading-relaxed font-mono break-all">{error}</p>
              <div className="p-2 rounded bg-black/20 text-[10px] text-[var(--text-muted)] font-mono break-all">
                Path: {activeApp.path}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReload}
                  className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleRelinkFile}
                  className="px-2.5 py-1 rounded bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <FolderOpen className="w-3 h-3" />
                  <span>Locate .cntxt File...</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove from Rail</span>
                </button>
              </div>
            </div>
          ) : showInfo ? (
            /* Info & Diagnostics Inspector */
            <div className="h-full overflow-y-auto p-4 space-y-4 text-xs select-text bg-[var(--sidebar-bg)]">
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

              {/* Actions Section */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={handleClearAppData}
                  className="w-full h-8 px-3 rounded-lg border border-amber-500/20 text-amber-400 hover:bg-amber-500/10 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset App State (Clear Local Storage)</span>
                </button>

                <button
                  type="button"
                  onClick={handleRevealInExplorer}
                  className="w-full h-8 px-3 rounded-lg border border-[var(--border-primary)] text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Reveal in File Explorer</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-full h-8 px-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove App from Rail</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteAppAndFile}
                  className="w-full h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Permanently Delete App File</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
