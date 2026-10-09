import React from 'react';
import { Tab } from '../../contracts/data_shapes';
import { resolveHtml } from '../../features/panelApps/source/resolveHtml';
import { FileCode, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SourceStepProps {
  tabs: Tab[];
  selectedTabId: string | null;
  onSelectTab: (tab: Tab) => void;
  onPickFile: () => void;
  sourceNote: string | null;
  hasValidHtml: boolean;
  htmlLength: number;
}

export const SourceStep: React.FC<SourceStepProps> = ({
  tabs,
  selectedTabId,
  onSelectTab,
  onPickFile,
  sourceNote,
  hasValidHtml,
  htmlLength,
}) => {
  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
          Source Document
        </label>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Select an open document or pick an HTML file from your disk. CNTXT will extract the HTML into a standalone panel app.
        </p>
      </div>

      {/* Open Tabs List */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-[var(--text-muted)]">Open Tabs</div>
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {tabs.map((tab) => {
            const resolved = resolveHtml(tab.content, tab.title);
            const isSelected = selectedTabId === tab.id;
            const isCandidate = resolved.ok;

            return (
              <button
                key={tab.id}
                type="button"
                disabled={!isCandidate}
                onClick={() => onSelectTab(tab)}
                className={`w-full text-left p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-container)] text-[var(--text-primary)] shadow-xs'
                    : isCandidate
                    ? 'border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--app-bg)] opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                }`}
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`} />
                  <div className="truncate">
                    <div className="font-medium text-[11px] truncate">{tab.title}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {isCandidate ? (resolved.via === 'fence' ? 'Contains HTML code block' : 'Raw HTML document') : 'No HTML found'}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                )}
              </button>
            );
          })}

          {tabs.length === 0 && (
            <div className="p-4 text-center text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-lg">
              No open tabs
            </div>
          )}
        </div>
      </div>

      {/* Or File Pick */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onPickFile}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[var(--border-primary)] bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] transition-all cursor-pointer font-medium text-[11px]"
        >
          <Upload className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          <span>Browse File from Disk (.html, .cntxt)</span>
        </button>
      </div>

      {/* Source Validation Banner */}
      {hasValidHtml ? (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Valid HTML Source Selected</span>
          </div>
          <div className="text-[11px] text-emerald-300/80">
            {sourceNote || 'Ready to configure metadata and permissions.'} ({(htmlLength / 1024).toFixed(1)} KB)
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px]">Please select an HTML document or code block above to continue.</span>
        </div>
      )}
    </div>
  );
};
