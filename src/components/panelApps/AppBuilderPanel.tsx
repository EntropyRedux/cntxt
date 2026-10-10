import React, { useMemo, useState } from 'react';
import { useBuilderStore } from '../../features/panelApps/state/builderStore';
import { usePanelAppsStore } from '../../features/panelApps/state/panelAppsStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useRuntimeBridge } from '../../adapters';
import { resolveHtml } from '../../features/panelApps/source/resolveHtml';
import { scanHtml } from '../../features/panelApps/preflight/scan';
import { createPanelApp } from '../../features/panelApps/services/createPanelApp';
import { useSettingsStore } from '../../store/settingsStore';
import { SourceStep } from './SourceStep';
import { DetailsStep } from './DetailsStep';
import { ReviewStep } from './ReviewStep';
import { AppIcon } from '../Common/AppIcon';
import { NetworkBadge } from './NetworkBadge';
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  Play, 
  RotateCcw, 
  FileEdit, 
  FolderOpen, 
  Trash2, 
  Plus 
} from 'lucide-react';

export interface AppBuilderPanelProps {
  onClose?: () => void;
  workspacePath?: string | null;
}

export const AppBuilderPanel: React.FC<AppBuilderPanelProps> = ({ onClose, workspacePath }) => {
  const bridge = useRuntimeBridge();
  const { tabs, createTab } = useTabStore();
  const { addNotification } = useNotificationStore();
  const { setActiveSidebarTab } = useSettingsStore();
  const { apps, remove, open } = usePanelAppsStore();

  const [panelMode, setPanelMode] = useState<'create' | 'manage'>('create');

  const {
    step,
    source,
    html,
    sourceNote,
    details,
    isCreating,
    setStep,
    setSource,
    setDetails,
    setIsCreating,
    reset,
  } = useBuilderStore();

  const handleClose = () => {
    reset();
    if (onClose) onClose();
  };

  const handleLaunchApp = (id: string) => {
    open(id);
    setActiveSidebarTab('panel-app');
  };

  const handleClearData = (appId: string, appName: string) => {
    useConfirmStore.getState().showConfirm({
      title: 'Reset Stored Data',
      message: `Reset all stored data for "${appName}"? This clears its local storage state.`,
      confirmLabel: 'Reset Data',
      variant: 'warning',
      onConfirm: async () => {
        await bridge.storage.removeItem(`cntxt_app_data_${appId}`);
        addNotification('Data Reset', `Local data for "${appName}" was cleared.`, 'info');
      }
    });
  };

  const handleOpenSource = async (appPath: string, appName: string) => {
    try {
      const content = await bridge.fs.readFile?.(appPath);
      if (content !== null && content !== undefined) {
        createTab(appName, content, 'markdown', appPath);
        addNotification('Opened in Editor', `Now editing ${appName}`, 'info');
      } else {
        throw new Error('File content could not be read');
      }
    } catch (e) {
      addNotification('Open Failed', (e as Error).message, 'error');
    }
  };

  const handleRevealFile = async (appPath: string) => {
    try {
      if (bridge.fs.openFileExplorer) {
        await bridge.fs.openFileExplorer(appPath);
      } else {
        addNotification('File Location', appPath, 'info');
      }
    } catch (e) {
      addNotification('Explorer Error', (e as Error).message, 'error');
    }
  };

  const handleRemoveFromRail = (appId: string, appName: string) => {
    useConfirmStore.getState().showConfirm({
      title: 'Remove App from Rail',
      message: `Remove "${appName}" from your panel apps rail? (The .cntxt file will NOT be deleted)`,
      confirmLabel: 'Remove',
      variant: 'warning',
      onConfirm: () => {
        remove(appId, bridge.storage);
        addNotification('App Removed', `"${appName}" removed from rail`, 'info');
      }
    });
  };

  const handleDeleteAppAndFile = (appId: string, appPath: string, appName: string) => {
    useConfirmStore.getState().showConfirm({
      title: 'Delete App & File',
      message: `Permanently delete "${appName}" and remove its .cntxt file from disk? This cannot be undone.`,
      confirmLabel: 'Delete Permanently',
      variant: 'danger',
      onConfirm: async () => {
        try {
          if (bridge.fs.deleteFile) {
            await bridge.fs.deleteFile(appPath);
          }
        } catch (err) {
          console.warn('Failed to delete file on disk:', err);
        }
        await bridge.storage.removeItem(`cntxt_app_data_${appId}`);
        remove(appId, bridge.storage);
        addNotification('App Deleted', `Deleted "${appName}" and removed file`, 'info');
      }
    });
  };

  // Preflight analysis memoized on HTML content
  const preflight = useMemo(() => {
    return scanHtml(html || '');
  }, [html]);

  const hasValidHtml = Boolean(html && html.trim().length > 0);

  // Tab picker handler
  const handleSelectTab = (tab: (typeof tabs)[0]) => {
    const res = resolveHtml(tab.content, tab.title);
    if (res.ok) {
      setSource(
        { kind: 'tab', docId: tab.id, name: tab.title, content: tab.content },
        res.html,
        res.note
      );
    }
  };

  // File picker handler
  const handlePickFile = async () => {
    try {
      const file = await bridge.fs.openFile();
      if (!file) return;

      const res = resolveHtml(file.content, file.name);
      if (!res.ok) {
        const errReason = 'reason' in res ? res.reason : 'No HTML found in file';
        addNotification('Invalid HTML File', errReason, 'error');
        return;
      }

      setSource(
        { kind: 'file', path: file.path, name: file.name, content: file.content },
        res.html,
        res.note
      );
    } catch (e) {
      addNotification('File Error', (e as Error).message || 'Failed to open file', 'error');
    }
  };

  // Blueprint HTML loader handler
  const handleLoadBlueprintHtml = (
    appName: string,
    rawHtml: string,
    note: string,
    templateId?: string,
    description?: string
  ) => {
    let icon = 'Sparkles';
    if (templateId === 'note-scratchpad') icon = 'FileText';
    else if (templateId === 'task-runner') icon = 'CheckSquare';
    else if (templateId === 'quick-calc') icon = 'Calculator';
    else if (templateId === 'json-tool') icon = 'Code';
    else if (templateId === 'timer-pomodoro') icon = 'Clock';

    setSource(
      { kind: 'file', path: '', name: appName, content: rawHtml },
      rawHtml,
      note
    );

    setDetails({
      name: appName,
      description: description || '',
      icon,
    });
  };

  // Validation
  const nameTrimmed = details.name.trim();
  const isNameValid = nameTrimmed.length >= 1 && nameTrimmed.length <= 40;

  // Create submission
  const handleCreate = async () => {
    if (!html) return;
    setIsCreating(true);

    try {
      const result = await createPanelApp(
        {
          details,
          html,
          createdFrom: source?.kind === 'file' ? 'file' : 'tab',
        },
        bridge,
        workspacePath
      );

      addNotification(
        'Panel App Created',
        `"${result.manifest.name}" generated as ${result.filePath.split(/[/\\]/).pop()}`,
        'success'
      );

      reset();
      setActiveSidebarTab('panel-app');
    } catch (err) {
      console.error('[AppBuilderPanel] Creation failed:', err);
      addNotification('Creation Failed', (err as Error).message || 'Failed to create panel app', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--sidebar-bg)] select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-md bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shrink-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
            App Builder
          </span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          title="Close App Builder"
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher: Create App vs Manage Apps */}
      <div className="px-3 pt-2 pb-2 border-b border-[var(--border-subtle)] bg-[var(--sidebar-header-bg)] flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setPanelMode('create')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            panelMode === 'create'
              ? 'bg-[var(--accent-primary)] text-white shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create App</span>
        </button>
        <button
          type="button"
          onClick={() => setPanelMode('manage')}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            panelMode === 'manage'
              ? 'bg-[var(--accent-primary)] text-white shadow-2xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Manage Apps ({apps.length})</span>
        </button>
      </div>

      {panelMode === 'manage' ? (
        /* Installed Apps Management View */
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {apps.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed border-[var(--border-subtle)] rounded-xl space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center text-[var(--text-muted)]">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-[var(--text-primary)]">No Panel Apps Installed</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Create your first panel app from any HTML tab or standalone file.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelMode('create')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:opacity-95 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create App</span>
              </button>
            </div>
          ) : (
            apps.map((app) => (
              <div
                key={app.id}
                className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--card-bg)] hover:border-[var(--border-primary)] transition-all space-y-2.5 shadow-2xs"
              >
                {/* App Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[var(--card-secondary-bg)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 border border-[var(--border-subtle)]">
                      <AppIcon name={app.icon} size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                          {app.name}
                        </span>
                        <NetworkBadge offlineReady={app.network === 'offline'} />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] font-mono truncate" title={app.path}>
                        {app.path}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchApp(app.id)}
                    title="Open in Panel"
                    className="p-1.5 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Action Bar */}
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleClearData(app.id, app.name)}
                      title="Reset stored local data (clear local storage)"
                      className="px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenSource(app.path, app.name)}
                      title="Open and edit source file in CNTXT editor"
                      className="px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FileEdit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRevealFile(app.path)}
                      title="Reveal .cntxt file in File Explorer"
                      className="px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>Reveal</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveFromRail(app.id, app.name)}
                      title="Remove from sidebar rail without deleting the file"
                      className="px-2 py-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] cursor-pointer transition-colors"
                    >
                      Remove
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAppAndFile(app.id, app.path, app.name)}
                      title="Permanently delete app and remove .cntxt file from disk"
                      className="p-1 rounded-md text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Wizard Step Navigation Indicator */}
          <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]/40 flex items-center justify-between text-[11px] font-medium shrink-0">
            <button
              type="button"
              onClick={() => setStep('source')}
              className={`flex items-center gap-1 cursor-pointer transition-colors ${
                step === 'source'
                  ? 'text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Source</span>
            </button>

            <span className="text-[var(--border-primary)]">›</span>

            <button
              type="button"
              disabled={!hasValidHtml}
              onClick={() => hasValidHtml && setStep('details')}
              className={`flex items-center gap-1 transition-colors ${
                step === 'details'
                  ? 'text-[var(--accent-primary)] font-semibold'
                  : hasValidHtml
                  ? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'
                  : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Details</span>
            </button>

            <span className="text-[var(--border-primary)]">›</span>

            <button
              type="button"
              disabled={!hasValidHtml || !isNameValid}
              onClick={() => hasValidHtml && isNameValid && setStep('review')}
              className={`flex items-center gap-1 transition-colors ${
                step === 'review'
                  ? 'text-[var(--accent-primary)] font-semibold'
                  : hasValidHtml && isNameValid
                  ? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer'
                  : 'text-[var(--text-muted)] opacity-40 cursor-not-allowed'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Review</span>
            </button>
          </div>

          {/* Step Content Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === 'source' && (
              <SourceStep
                tabs={tabs}
                selectedTabId={source?.kind === 'tab' ? source.docId : null}
                onSelectTab={handleSelectTab}
                onPickFile={handlePickFile}
                onLoadBlueprintHtml={handleLoadBlueprintHtml}
                sourceNote={sourceNote}
                hasValidHtml={hasValidHtml}
                htmlLength={html?.length || 0}
              />
            )}

            {step === 'details' && (
              <DetailsStep
                name={details.name}
                icon={details.icon}
                description={details.description}
                network={details.network}
                panelWidth={details.panelWidth}
                onChangeName={(name) => setDetails({ name })}
                onChangeIcon={(icon) => setDetails({ icon })}
                onChangeDescription={(description) => setDetails({ description })}
                onChangeNetwork={(network) => setDetails({ network })}
                onChangePanelWidth={(panelWidth) => setDetails({ panelWidth })}
                error={!isNameValid && details.name.length > 0 ? 'Name must be between 1 and 40 characters' : undefined}
              />
            )}

            {step === 'review' && (
              <ReviewStep
                details={details}
                preflight={preflight}
                creating={isCreating}
                onCreate={handleCreate}
              />
            )}
          </div>

          {/* Footer Navigation Bar */}
          <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between shrink-0">
            <div>
              {step !== 'source' && (
                <button
                  type="button"
                  onClick={() => setStep(step === 'review' ? 'details' : 'source')}
                  className="h-8 px-3 rounded-lg border border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] text-xs text-[var(--text-secondary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div>
              {step === 'source' && (
                <button
                  type="button"
                  disabled={!hasValidHtml}
                  onClick={() => setStep('details')}
                  className={`h-8 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    hasValidHtml
                      ? 'bg-[var(--accent-primary)] text-white hover:opacity-95 shadow-2xs'
                      : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] cursor-not-allowed opacity-50 border border-[var(--border-subtle)]'
                  }`}
                >
                  <span>Next: Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {step === 'details' && (
                <button
                  type="button"
                  disabled={!isNameValid}
                  onClick={() => setStep('review')}
                  className={`h-8 px-3.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isNameValid
                      ? 'bg-[var(--accent-primary)] text-white hover:opacity-95 shadow-2xs'
                      : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] cursor-not-allowed opacity-50 border border-[var(--border-subtle)]'
                  }`}
                >
                  <span>Next: Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
