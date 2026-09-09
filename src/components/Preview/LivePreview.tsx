import React, { useState, useMemo } from 'react';
import { marked } from 'marked';
import { 
  Eye, 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  ListTree
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { FormulaEngine } from '../../services/formulaParser';

interface LivePreviewProps {
  content: string;
  tabTitle: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ content, tabTitle }) => {
  const { settings, updateSettings } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(false);

  // Evaluate inline formulas in real-time for live preview rendering
  const processedMarkdown = useMemo(() => {
    try {
      const formulaEngine = new FormulaEngine({
        lineCount: content.split('\n').length,
        charCount: content.length,
        wordCount: (content.trim().match(/\S+/g) || []).length
      });
      return formulaEngine.replaceInlineFormulas(content);
    } catch {
      return content;
    }
  }, [content]);

  // Convert markdown to HTML with marked
  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(processedMarkdown, { gfm: true, breaks: true }) as string;
    } catch {
      return processedMarkdown;
    }
  }, [processedMarkdown]);

  // Extract headings for Table of Contents
  const headings = useMemo(() => {
    const lines = processedMarkdown.split('\n');
    const result: { level: number; text: string; id: string }[] = [];
    for (const line of lines) {
      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        result.push({ level, text, id });
      }
    }
    return result;
  }, [processedMarkdown]);

  const handleCopyRendered = async () => {
    try {
      await navigator.clipboard.writeText(processedMarkdown);
      setCopied(true);
      addNotification('Copied', 'Evaluated markdown copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e: any) {
      addNotification('Copy Failed', e.message, 'error');
    }
  };

  const getMaxWidthClass = () => {
    switch (settings.previewMaxWidth) {
      case 'narrow': return 'max-w-[640px]';
      case 'standard': return 'max-w-[840px]';
      case 'wide': return 'max-w-[1100px]';
      case 'full': return 'max-w-none';
      default: return 'max-w-none';
    }
  };

  return (
    <div className="theme-preview flex flex-col h-full select-text overflow-hidden relative group">
      {/* Sleek Floating Controls (top-right of preview pane) */}
      <div 
        aria-label="Preview controls"
        className="absolute top-3 right-4 z-20 flex items-center gap-1 bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-primary)] rounded-lg p-1 opacity-80 group-hover:opacity-100 hover:opacity-100 transition-opacity shadow-lg"
      >
        {headings.length > 0 && (
          <button
            onClick={() => setShowToc(!showToc)}
            title="Document Outline / Table of Contents"
            aria-label="Toggle Document Table of Contents Outline"
            aria-pressed={showToc}
            className={`p-1.5 rounded-md transition-colors ${
              showToc ? 'bg-[var(--accent-primary)] text-white' : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => updateSettings({ previewFontScale: Math.max(80, settings.previewFontScale - 5) })}
          title="Zoom Out"
          aria-label="Zoom Out Preview Font"
          className="p-1.5 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => updateSettings({ previewFontScale: Math.min(150, settings.previewFontScale + 5) })}
          title="Zoom In"
          aria-label="Zoom In Preview Font"
          className="p-1.5 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-px bg-[var(--border-primary)] mx-0.5" />

        <button
          onClick={handleCopyRendered}
          title="Copy Markdown"
          aria-label="Copy Rendered Markdown to Clipboard"
          className="px-2 py-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md flex items-center gap-1.5 text-xs transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-[var(--status-success)]" /> : <Copy className="w-3 h-3 text-[var(--text-muted)]" />}
          <span className="text-[11px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {/* Main Preview Container with optional TOC */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table of Contents Drawer */}
        {showToc && headings.length > 0 && (
          <div className="w-60 border-r border-[var(--border-primary)] bg-[var(--sidebar-bg)] p-4 overflow-y-auto shrink-0 select-none">
            <div className="text-[11px] font-semibold uppercase text-[var(--text-secondary)] mb-3 tracking-wider flex items-center gap-1.5">
              <ListTree className="w-3.5 h-3.5" />
              <span>Outline</span>
            </div>
            <div className="space-y-1.5">
              {headings.map((h, i) => (
                <a
                  key={i}
                  href={`#${h.id}`}
                  style={{ paddingLeft: `${(h.level - 1) * 10}px` }}
                  className="block text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] truncate transition-colors py-0.5"
                >
                  {h.text}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Rendered Prose Content */}
        <div 
          className="flex-1 overflow-y-auto p-3 sm:p-5"
          style={{ fontSize: `${settings.previewFontScale}%` }}
        >
          <div className={`mx-auto ${getMaxWidthClass()} contextpad-preview-prose`}>
            {processedMarkdown.trim() ? (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] text-xs">
                <Eye className="w-8 h-8 mb-2 opacity-25" />
                <p>Start writing markdown to see live rendered preview...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
