import React, { useState, useEffect, useMemo } from 'react';
import { 
  Variable, 
  X, 
  Sparkles, 
  Copy, 
  RotateCcw
} from 'lucide-react';
import { useTemplateStore } from '../../store/templateStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import confetti from 'canvas-confetti';
import { useRuntimeBridge } from '../../adapters';

interface ParsedVar {
  raw: string; // e.g. "role:AI Architect"
  name: string; // e.g. "role"
  defaultValue: string; // e.g. "AI Architect"
}

export const VariableFillerModal: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { 
    isVariableModalOpen, 
    closeVariableModal, 
    activeTemplateForModal 
  } = useTemplateStore();

  const { tabs, activeTabId, updateTabContent, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const sourceText = activeTemplateForModal 
    ? activeTemplateForModal.content 
    : (activeTab?.content || '');

  // Extract variables with defaults
  const parsedVariables = useMemo<ParsedVar[]>(() => {
    if (!sourceText) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(sourceText.matchAll(regex));
    const seen = new Set<string>();
    const list: ParsedVar[] = [];

    matches.forEach(m => {
      const raw = m[1].trim();
      const parts = raw.split(':');
      const name = parts[0].trim();
      const defaultValue = parts.slice(1).join(':').trim();

      if (!seen.has(name)) {
        seen.add(name);
        list.push({ raw, name, defaultValue });
      }
    });

    return list;
  }, [sourceText]);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    parsedVariables.forEach(v => {
      initial[v.name] = v.defaultValue || '';
    });
    setValues(initial);
  }, [parsedVariables]);

  if (!isVariableModalOpen) return null;

  // Generated interpolated text
  const interpolatedResult = sourceText.replace(/\{\{([^}]+)\}\}/g, (match, raw) => {
    const name = raw.split(':')[0].trim();
    return values[name] !== undefined && values[name] !== '' 
      ? values[name] 
      : match;
  });

  const handleApplyToEditor = () => {
    if (!activeTab) return;

    if (activeTemplateForModal) {
      insertTextAtCursor(activeTab.id, interpolatedResult);
      addNotification('Template Inserted', activeTemplateForModal.name, 'success');
    } else {
      updateTabContent(activeTab.id, interpolatedResult);
      addNotification('Variables Injected', 'Document successfully updated', 'success');
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

        {/* Content Split: Form on Left, Live Preview on Right */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-primary)] overflow-hidden text-xs">
          {/* Variables Inputs List */}
          <div className="p-4 overflow-y-auto space-y-3 bg-[var(--card-bg)]">
            {parsedVariables.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-muted)]">
                <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30 text-[var(--text-muted)]" />
                <p>No `{'{{variable}}'}` placeholders found in current selection or template</p>
              </div>
            ) : (
              parsedVariables.map(v => (
                <div key={v.name} className="space-y-1">
                  <label className="text-[var(--text-primary)] font-medium font-mono text-[11px] flex items-center justify-between">
                    <span className="text-[var(--accent-primary)]">{'{{'}{v.name}{'}}'}</span>
                    {v.defaultValue && (
                      <button
                        type="button"
                        onClick={() => setValues(prev => ({ ...prev, [v.name]: v.defaultValue }))}
                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline"
                      >
                        Reset default
                      </button>
                    )}
                  </label>
                  {v.defaultValue.length > 50 || v.defaultValue.includes('\n') ? (
                    <textarea
                      rows={2}
                      value={values[v.name] || ''}
                      onChange={(e) => setValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                      placeholder={v.defaultValue || 'Enter value...'}
                      className="w-full p-2 theme-input rounded font-sans"
                    />
                  ) : (
                    <input
                      type="text"
                      value={values[v.name] || ''}
                      onChange={(e) => setValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                      placeholder={v.defaultValue || 'Enter value...'}
                      className="w-full h-7 px-2.5 theme-input rounded font-sans"
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
              parsedVariables.forEach(v => { resetObj[v.name] = v.defaultValue || ''; });
              setValues(resetObj);
            }}
            title="Reset Defaults"
            aria-label="Reset Defaults"
            className="w-8 h-8 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyResult}
              title="Copy Output"
              aria-label="Copy Output"
              className="w-8 h-8 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded flex items-center justify-center transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleApplyToEditor}
              title={activeTemplateForModal ? 'Insert Template' : 'Apply to Document'}
              aria-label={activeTemplateForModal ? 'Insert Template' : 'Apply to Document'}
              className="w-8 h-8 theme-btn-primary rounded flex items-center justify-center transition-colors shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
