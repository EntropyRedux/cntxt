import React, { useState, useEffect, useMemo } from 'react';
import { 
  Variable, 
  X, 
  Sparkles, 
  Copy, 
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  Check,
  Info
} from 'lucide-react';
import { useTemplateStore } from '../../store/templateStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import confetti from 'canvas-confetti';
import { useRuntimeBridge } from '../../adapters';
import { parseVariableToken, ParsedVariableToken } from '../../services/editor/templateVariableService';

export const VariableFillerModal: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { 
    isVariableModalOpen, 
    closeVariableModal, 
    activeTemplateForModal 
  } = useTemplateStore();

  const { tabs, activeTabId, updateTabContent, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [validationError, setValidationError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [retainUnchangedAsVariables, setRetainUnchangedAsVariables] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const sourceText = activeTemplateForModal 
    ? activeTemplateForModal.content 
    : (activeTab?.content || '');

  // Extract variables with defaults and *required or |required marker support
  const parsedVariables = useMemo<ParsedVariableToken[]>(() => {
    if (!sourceText) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(sourceText.matchAll(regex));
    const seen = new Map<string, ParsedVariableToken>();

    matches.forEach(m => {
      const parsed = parseVariableToken(m[1]);
      if (!parsed.cleanName) return;

      if (!seen.has(parsed.cleanName)) {
        seen.set(parsed.cleanName, { ...parsed });
      } else {
        const existing = seen.get(parsed.cleanName)!;
        if (!existing.isRequired && parsed.isRequired) {
          existing.isRequired = true;
          existing.hasPipeModifier = existing.hasPipeModifier || parsed.hasPipeModifier;
          existing.hasAsterisk = existing.hasAsterisk || parsed.hasAsterisk;
        }
        if (!existing.defaultValue && parsed.defaultValue) {
          existing.defaultValue = parsed.defaultValue;
        }
      }
    });

    return Array.from(seen.values());
  }, [sourceText]);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    parsedVariables.forEach(v => {
      initial[v.cleanName] = v.defaultValue || '';
    });
    setValues(initial);
    setValidationError(null);
    setShowConfirmation(false);
  }, [parsedVariables, isVariableModalOpen]);

  // Compute interpolated text based on whether unchanged variables should be retained as placeholders
  const computeInterpolated = (retainUnchanged: boolean) => {
    return sourceText.replace(/\{\{([^}]+)\}\}/g, (match, raw) => {
      const parsed = parseVariableToken(raw);
      const currentVal = values[parsed.cleanName];

      if (currentVal === undefined) return match;

      if (retainUnchanged) {
        // If not changed from its original placeholder default, retain original placeholder
        const isModified = currentVal !== parsed.defaultValue;
        if (!isModified) {
          return match;
        }
      }

      return currentVal !== '' ? currentVal : match;
    });
  };

  const interpolatedResult = useMemo(() => {
    return computeInterpolated(retainUnchangedAsVariables);
  }, [sourceText, values, retainUnchangedAsVariables]);

  const { changedCount, unchangedCount } = useMemo(() => {
    let changed = 0;
    parsedVariables.forEach(v => {
      const currentVal = values[v.cleanName];
      if (currentVal !== undefined && currentVal !== v.defaultValue) {
        changed++;
      }
    });
    return { changedCount: changed, unchangedCount: parsedVariables.length - changed };
  }, [parsedVariables, values]);

  if (!isVariableModalOpen) return null;

  const handleApplyClick = () => {
    // 1. Validation check for missing required variables
    const missingRequired = parsedVariables.filter(
      v => v.isRequired && (!values[v.cleanName] || values[v.cleanName].trim() === '')
    );

    if (missingRequired.length > 0) {
      setValidationError(
        `Required variable missing: Please provide a value for ${missingRequired
          .map(v => {
            if (v.hasPipeModifier && !v.hasAsterisk) return `{{${v.cleanName}|required}}`;
            return `{{*${v.cleanName}}}`;
          })
          .join(', ')}`
      );
      setShowConfirmation(false);
      return;
    }

    // 2. Validation check for real changes
    const textWithoutRetain = computeInterpolated(false);
    const textWithRetain = computeInterpolated(true);
    const targetText = retainUnchangedAsVariables ? textWithRetain : textWithoutRetain;

    if (targetText === sourceText && textWithoutRetain === sourceText) {
      setValidationError(
        'Validation error: No real changes detected. Fill or modify at least one variable value to update'
      );
      setShowConfirmation(false);
      return;
    }

    // Clear any previous error and present confirmation warning
    setValidationError(null);
    setShowConfirmation(true);
  };

  const handleConfirmApply = () => {
    if (!activeTab) return;

    if (activeTemplateForModal) {
      insertTextAtCursor(activeTab.id, interpolatedResult);
      addNotification('Template Inserted', activeTemplateForModal.name, 'success');
    } else {
      updateTabContent(activeTab.id, interpolatedResult);
      addNotification('Variables Injected', 'Editor content successfully updated', 'success');
    }

    try {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch {}

    closeVariableModal();
  };

  const handleCopyResult = async () => {
    await bridge.clipboard.writeText(interpolatedResult);
    addNotification('Copied', 'Interpolated prompt copied to clipboard', 'success');
  };

  const updateValue = (cleanName: string, val: string) => {
    setValues(prev => ({ ...prev, [cleanName]: val }));
    if (validationError) setValidationError(null);
    if (showConfirmation) setShowConfirmation(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="theme-modal w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[var(--status-success)]/15 text-[var(--status-success)] flex items-center justify-center">
              <Variable className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-sm">
                {activeTemplateForModal ? `Fill Variables: ${activeTemplateForModal.name}` : 'Fill Document Variables'}
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">
                {parsedVariables.length} variable placeholder(s) detected
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeVariableModal}
            title="Close"
            aria-label="Close"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/30 flex items-start gap-2 text-red-600 dark:text-red-400 text-xs animate-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{validationError}</div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="p-0.5 hover:bg-red-500/20 rounded text-red-600 dark:text-red-400"
              title="Dismiss error"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Confirmation Warning Banner */}
        {showConfirmation && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-100 text-xs animate-in slide-in-from-top-1 duration-150">
            <div className="space-y-1.5 flex-1 pr-2">
              <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Confirm update: Ready to replace variables in your active editor.</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={retainUnchangedAsVariables}
                  onChange={(e) => setRetainUnchangedAsVariables(e.target.checked)}
                  className="rounded border-[var(--border-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[11px] font-medium text-[var(--text-primary)]">
                  Retain unchanged variables as <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-[var(--accent-container)] text-[var(--accent-primary)]">{'{{placeholders}}'}</span>
                </span>
              </label>
              <div className="text-[10px] text-[var(--text-muted)] pl-5">
                {retainUnchangedAsVariables ? (
                  <span>
                    <strong>{changedCount}</strong> modified variable{changedCount !== 1 ? 's' : ''} will be injected;{' '}
                    <strong>{unchangedCount}</strong> unchanged will remain as placeholders.
                  </span>
                ) : (
                  <span>
                    All <strong>{parsedVariables.length}</strong> variable placeholder{parsedVariables.length !== 1 ? 's' : ''} will be replaced with form values.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-2.5 py-1.5 rounded border border-amber-500/40 hover:bg-amber-500/20 font-medium text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm & Apply
              </button>
            </div>
          </div>
        )}

        {/* Content Split: Form on Left, Live Preview on Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-primary)] overflow-hidden text-xs">
          {/* Variables Inputs List */}
          <div className="p-4 overflow-y-auto space-y-3 bg-[var(--card-bg)]">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-primary)] text-[10px] text-[var(--text-muted)]">
              <span className="font-semibold uppercase tracking-wider">Variables</span>
              <span className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-[var(--text-muted)]">Required syntax:</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{'{{*var}}'}</span>
                <span>or</span>
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{'{{var|required}}'}</span>
              </span>
            </div>

            {parsedVariables.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
                <p>No `{'{{variable}}'}` placeholders found in current selection or template</p>
              </div>
            ) : (
              parsedVariables.map(v => (
                <div key={v.cleanName} className="space-y-1">
                  <label className="text-[var(--text-primary)] font-medium font-mono text-[11px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[var(--accent-primary)]">
                      <span>{'{{'}{v.cleanName}{'}}'}</span>
                      {v.isRequired && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-sans px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold border border-rose-500/20">
                          {v.hasPipeModifier && !v.hasAsterisk ? (
                            <>|required</>
                          ) : v.hasAsterisk && !v.hasPipeModifier ? (
                            <>*required</>
                          ) : (
                            <>required</>
                          )}
                        </span>
                      )}
                    </span>
                    {v.defaultValue && (
                      <button
                        type="button"
                        onClick={() => updateValue(v.cleanName, v.defaultValue)}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
                      >
                        Reset default
                      </button>
                    )}
                  </label>
                  {v.defaultValue.length > 50 || v.defaultValue.includes('\n') ? (
                    <textarea
                      rows={2}
                      value={values[v.cleanName] || ''}
                      onChange={(e) => updateValue(v.cleanName, e.target.value)}
                      placeholder={v.defaultValue || (v.isRequired ? 'Enter required value...' : 'Enter value...')}
                      className={`w-full p-2 theme-input rounded font-sans transition-colors ${
                        v.isRequired && (!values[v.cleanName] || values[v.cleanName].trim() === '')
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                          : ''
                      }`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[v.cleanName] || ''}
                      onChange={(e) => updateValue(v.cleanName, e.target.value)}
                      placeholder={v.defaultValue || (v.isRequired ? 'Enter required value...' : 'Enter value...')}
                      className={`w-full h-7 px-2.5 theme-input rounded font-sans transition-colors ${
                        v.isRequired && (!values[v.cleanName] || values[v.cleanName].trim() === '')
                          ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30'
                          : ''
                      }`}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Real-time Interpolated Preview */}
          <div className="p-4 bg-[var(--card-secondary-bg)] overflow-y-auto flex flex-col space-y-2">
            <span className="font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider block">
              Live Interpolated Preview
            </span>
            <div className="flex-1 p-3 bg-[var(--card-bg)] border border-[var(--border-primary)] rounded font-mono text-[var(--text-primary)] whitespace-pre-wrap overflow-y-auto text-[11px] leading-relaxed">
              {interpolatedResult}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              const resetObj: Record<string, string> = {};
              parsedVariables.forEach(v => { resetObj[v.cleanName] = v.defaultValue || ''; });
              setValues(resetObj);
              setValidationError(null);
              setShowConfirmation(false);
            }}
            title="Reset Defaults"
            aria-label="Reset Defaults"
            className="h-8 px-2.5 rounded flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-[11px]">Reset</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyResult}
              title="Copy Output"
              aria-label="Copy Output"
              className="h-8 px-3 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded flex items-center gap-1.5 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy</span>
            </button>

            <button
              type="button"
              onClick={handleApplyClick}
              title={activeTemplateForModal ? 'Insert Template' : 'Apply to Document'}
              aria-label={activeTemplateForModal ? 'Insert Template' : 'Apply to Document'}
              className="h-8 px-3.5 theme-btn-primary rounded flex items-center gap-1.5 transition-colors shadow-xs font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px]">{activeTemplateForModal ? 'Insert Template' : 'Apply Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
