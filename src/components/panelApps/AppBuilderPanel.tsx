import React, { useMemo } from 'react';
import { useBuilderStore } from '../../features/panelApps/state/builderStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge } from '../../adapters';
import { resolveHtml } from '../../features/panelApps/source/resolveHtml';
import { scanHtml } from '../../features/panelApps/preflight/scan';
import { createPanelApp } from '../../features/panelApps/services/createPanelApp';
import { useSettingsStore } from '../../store/settingsStore';
import { SourceStep } from './SourceStep';
import { DetailsStep } from './DetailsStep';
import { ReviewStep } from './ReviewStep';
import { X, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

export interface AppBuilderPanelProps {
  onClose?: () => void;
  workspacePath?: string | null;
}

export const AppBuilderPanel: React.FC<AppBuilderPanelProps> = ({ onClose, workspacePath }) => {
  const bridge = useRuntimeBridge();
  const { tabs } = useTabStore();
  const { addNotification } = useNotificationStore();
  const { setActiveSidebarTab } = useSettingsStore();

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
    </div>
  );
};
