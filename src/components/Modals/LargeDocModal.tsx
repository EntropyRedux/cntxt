import { initializeChunkSession } from '../../services/chunkBufferService';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import React, { useState } from 'react';
import { AlertTriangle, BookOpen, CheckSquare, Square, FileText, X } from 'lucide-react';
import { useLargeDocModalStore } from '../../store/largeDocModalStore';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';

const LargeDocModalPresenter: React.FC = () => {
  const {
    isOpen,
    tabId,
    fileTitle,
    fileSizeKb,
    headings,
    rawContent,
    closeLargeDocModal
  } = useLargeDocModalStore();

  const { updateTabContent, updateTabMetadata, tabs } = useTabStore();
  const { settings } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  if (!isOpen) return null;

  const isTouch = settings.touchOptimized;

  const toggleSelectIndex = (idx: number) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleSelectAll = () => {
    if (selectedIndices.length === headings.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(headings.map((_, i) => i));
    }
  };

  const handleLoadSelectedSections = () => {
    if (!tabId || selectedIndices.length === 0) {
      addNotification('No Sections Selected', 'Please select at least one section or click Open Full Document', 'warning');
      return;
    }

    const { session, chunkContent } = initializeChunkSession(rawContent, selectedIndices, headings);

    updateTabContent(tabId, chunkContent, false);
    updateTabMetadata(tabId, {
      isTruncatedView: false,
      chunkSession: session,
      isLargeDoc: true,
      rawFullContent: rawContent,
      totalOriginalBytes: new Blob([rawContent]).size,
      isDirty: false
    });
    addNotification('Chunk Session Initialized', `Loaded ${selectedIndices.length} section(s). Non-destructive save enabled.`, 'info');
    closeLargeDocModal();
  };

  const handleOpenFullDocument = () => {
    if (tabId) {
      updateTabContent(tabId, rawContent, true);
      updateTabMetadata(tabId, {
        isTruncatedView: false,
        chunkSession: undefined,
        isLargeDoc: true,
        rawFullContent: undefined,
        totalOriginalBytes: new Blob([rawContent]).size,
        isDirty: false
      });
      addNotification('Full Document Loaded', `${fileTitle} (${fileSizeKb} KB)`, 'info');
    }
    closeLargeDocModal();
  };

  const handleClose = () => {
    if (tabId) {
      const activeTab = tabs.find(t => t.id === tabId);
      if (activeTab && (!activeTab.content || activeTab.content.trim() === '')) {
        updateTabContent(
          tabId,
          `# [Truncated View - Preview Mode] ${fileTitle}\n> ℹ️ Large document (${fileSizeKb} KB) — direct file save is locked to protect the full file on disk. Open full document to edit.`,
          true
        );
        updateTabMetadata(tabId, {
          isTruncatedView: true,
          rawFullContent: rawContent
        });
      }
    }
    closeLargeDocModal();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150 ${isTouch ? 'items-end sm:items-center' : ''}`}>
      <div 
        className={`w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col bg-[var(--modal-bg)] border border-[var(--modal-border)] ${isTouch ? 'rounded-t-2xl sm:rounded-xl' : 'rounded-xl'} shadow-2xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[var(--modal-header-bg)] border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[var(--status-warning)] shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Large Document Detected
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {fileTitle} ({fileSizeKb} KB) &mdash; Select sections to load or open full document
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content & Section Checklist */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          <div className="p-3 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg text-xs text-[var(--text-secondary)]">
            Loading very large markdown files all at once may impact rendering performance. You can select specific Table of Contents sections to open, or open the entire file.
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Document Sections ({headings.length} found)
            </span>
            {headings.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-[var(--accent-primary)] hover:underline font-medium"
              >
                {selectedIndices.length === headings.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {headings.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No markdown headings detected in this file.
            </div>
          ) : (
            <div className="max-h-60 sm:max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {headings.map((h, i) => {
                const isSelected = selectedIndices.includes(i);
                const indent = (h.level - 1) * 12;

                return (
                  <button
                    key={i}
                    onClick={() => toggleSelectIndex(i)}
                    style={{ paddingLeft: `${indent + (isTouch ? 12 : 8)}px` }}
                    className={`w-full text-left ${isTouch ? 'min-h-[44px] py-2.5' : 'py-1.5'} pr-2.5 rounded-lg text-xs flex items-center justify-between group transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium border border-[var(--accent-primary)]/30'
                        : 'bg-[var(--card-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                      )}
                      <span className="truncate">{h.text}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0 ml-2">
                      Line {h.lineNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-3 bg-[var(--modal-header-bg)] border-t border-[var(--border-primary)] flex items-center justify-between shrink-0 gap-2`}>
          <button
            onClick={handleOpenFullDocument}
            className={`px-3 ${isTouch ? 'min-h-[44px] py-2.5' : 'py-1.5'} rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors`}
          >
            Open Full Document ({fileSizeKb} KB)
          </button>

          <button
            onClick={handleLoadSelectedSections}
            disabled={selectedIndices.length === 0}
            className={`px-4 ${isTouch ? 'min-h-[44px] py-2.5' : 'py-1.5'} rounded-lg text-xs font-semibold bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-40 text-[var(--accent-contrast)] shadow-sm transition-opacity flex items-center gap-1.5`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Load Selected Sections ({selectedIndices.length})
          </button>
        </div>
      </div>
    </div>
  );
};


export const LargeDocModal: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Large Document Dialog Error">
      <LargeDocModalPresenter />
    </ErrorBoundary>
  );
};
