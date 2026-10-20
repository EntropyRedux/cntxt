import React from 'react';
import { Layers, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from '../Common/ErrorBoundary';

export interface ChunkNoticeBannerProps {
  isChunked: boolean;
  isTruncatedPreview?: boolean;
  sectionCount: number;
  totalSections: number;
  fileSizeKb: number;
  isDirty?: boolean;
  onOpenFullDocument: () => void;
  onReconfigureSections?: () => void;
}

export const ChunkNoticeBannerPresenter: React.FC<ChunkNoticeBannerProps> = ({
  isChunked,
  isTruncatedPreview = false,
  sectionCount,
  totalSections,
  fileSizeKb,
  isDirty = false,
  onOpenFullDocument,
  onReconfigureSections,
}) => {
  if (!isChunked) return null;

  return (
    <div
      data-testid="chunk-notice-banner"
      className="w-full bg-[var(--card-bg)] border-b border-[var(--border-primary)] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs select-none shrink-0 z-10 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`flex items-center justify-center w-5 h-5 rounded-md ${isTruncatedPreview ? 'bg-amber-500/15 text-amber-400' : 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]'} shrink-0`}>
          {isTruncatedPreview ? <AlertCircle className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
        </span>
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-[var(--text-primary)] truncate">
            {isTruncatedPreview ? 'Truncated Document Preview' : 'Focused Chunk View'}
          </span>
          <span className="text-[var(--text-muted)] text-[11px] hidden sm:inline">
            Viewing {sectionCount} of {totalSections || sectionCount} sections ({fileSizeKb} KB)
          </span>
          {isTruncatedPreview ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              Direct Save Locked (Read-Only)
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              Non-Destructive Splice
            </span>
          )}
          {isDirty && (
            <span className="text-[10px] font-mono text-[var(--status-warning)] shrink-0">
              ● Unsaved changes
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onReconfigureSections && (
          <button
            type="button"
            onClick={onReconfigureSections}
            className="px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors flex items-center gap-1"
            title="Choose which sections to load in chunk view"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden xs:inline">Select Sections</span>
          </button>
        )}
        <button
          type="button"
          onClick={onOpenFullDocument}
          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[var(--accent-primary)] text-[var(--accent-contrast)] hover:opacity-90 transition-opacity flex items-center gap-1 shadow-xs"
          title="Open entire document in editor"
        >
          <BookOpen className="w-3 h-3" />
          <span>Open Full Doc ({fileSizeKb} KB)</span>
        </button>
      </div>
    </div>
  );
};

export const ChunkNoticeBanner: React.FC<ChunkNoticeBannerProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Chunk Banner Error">
      <ChunkNoticeBannerPresenter {...props} />
    </ErrorBoundary>
  );
};
