import React, { useState, useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import { 
  Eye, 
  Copy, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  ListTree,
  RefreshCw,
  Pause
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { FormulaEngine } from '../../services/formulaParser';
import { renderLatex } from '../../services/mathRenderer';
import { renderMermaidDiagram } from '../../services/mermaidRenderer';
import { useRuntimeBridge, isDarkTheme } from '../../adapters';
import { highlightCodeSnippet } from '../../services/codeLanguages';

// Configure marked with custom code renderer using CodeMirror native syntax highlighting
marked.use({
  renderer: {
    code(token: any, langStr?: string) {
      const codeText = typeof token === 'string' ? token : (token?.text ?? '');
      const lang = typeof token === 'string' ? (langStr || '') : (token?.lang || '');
      const cleanLang = (lang || '').trim().split(/\s+/)[0];
      const highlighted = highlightCodeSnippet(codeText, cleanLang);
      return `<pre><code class="language-${cleanLang || 'text'}">${highlighted}</code></pre>`;
    }
  }
});

interface LivePreviewProps {
  content: string;
  tabTitle?: string;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ content }) => {
  const bridge = useRuntimeBridge();
  const { settings, updateSettings } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  const [copied, setCopied] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const isLiveSync = settings.enableLiveDomSync ?? settings.enableLiveMarkdownSync ?? true;
  const [syncedContent, setSyncedContent] = useState(content);

  useEffect(() => {
    if (isLiveSync) {
      setSyncedContent(content);
    }
  }, [content, isLiveSync]);

  const handleManualSync = () => {
    setSyncedContent(content);
    addNotification('Preview Synced', 'Live preview updated with latest content', 'info');
  };

  const isContentOutdated = !isLiveSync && content !== syncedContent;

  // 1. Evaluate custom inline formulas (e.g. {{lineCount}})
  const formulaEvaluated = useMemo(() => {
    const activeText = isLiveSync ? content : syncedContent;
    try {
      const formulaEngine = new FormulaEngine({
        lineCount: activeText.split('\n').length,
        charCount: activeText.length,
        wordCount: (activeText.trim().match(/\S+/g) || []).length
      });
      return formulaEngine.replaceInlineFormulas(activeText);
    } catch {
      return activeText;
    }
  }, [isLiveSync, content, syncedContent]);

  // 2. Pre-process LaTeX Math & Mermaid blocks before passing to marked
  const processedMarkdown = useMemo(() => {
    let md = formulaEvaluated;

    // Convert ```mermaid code blocks to interactive diagram container
    md = md.replace(/(```+|~~~+)mermaid\s*\n([\s\S]*?)\n\1/gi, (_, _fence, code) => {
      const encoded = encodeURIComponent(code.trim());
      return `\n\n<div class="live-preview-mermaid my-4 rounded-lg overflow-hidden border border-[var(--border-primary)] shadow-sm bg-[var(--card-bg)]" data-code="${encoded}"><div class="p-6 text-xs text-[var(--text-muted)] animate-pulse flex items-center justify-center">Rendering Mermaid diagram...</div></div>\n\n`;
    });

    // Convert ```latex / ```math / ```katex code blocks to display math
    md = md.replace(/(```+|~~~+)(?:latex|math|katex)\s*\n([\s\S]*?)\n\1/gi, (_, _fence, mathCode) => {
      const rendered = renderLatex(mathCode.trim(), true);
      return `\n\n<div class="cm-live-math-block my-4 select-none overflow-x-auto">${rendered.html}</div>\n\n`;
    });

    // Convert $$...$$ display math
    md = md.replace(/\$\$([\s\S]+?)\$\$/g, (_, mathCode) => {
      const rendered = renderLatex(mathCode.trim(), true);
      return `<div class="cm-live-math-block my-4 select-none overflow-x-auto">${rendered.html}</div>`;
    });

    // Convert $formula$ inline math (avoiding currency like $5 if spaced, only matching non-empty math)
    md = md.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)(?<!\$)\$(?!\$)/g, (_, formula) => {
      const rendered = renderLatex(formula.trim(), false);
      return `<span class="cm-live-math-inline">${rendered.html}</span>`;
    });

    return md;
  }, [formulaEvaluated]);

  // 3. Convert markdown to HTML with marked (GFM tables, breaks enabled)
  const renderedHtml = useMemo(() => {
    try {
      return marked.parse(processedMarkdown, { gfm: true, breaks: true }) as string;
    } catch {
      return processedMarkdown;
    }
  }, [processedMarkdown]);

  // 4. Asynchronously render Mermaid diagrams in preview
  useEffect(() => {
    if (!previewRef.current) return;
    const isDark = isDarkTheme();
    const mermaidContainers = previewRef.current.querySelectorAll<HTMLDivElement>('.live-preview-mermaid');

    mermaidContainers.forEach(async (container) => {
      const code = container.getAttribute('data-code');
      if (!code) return;
      try {
        const decoded = decodeURIComponent(code);
        const res = await renderMermaidDiagram(decoded, isDark);
        if (res.isError) {
          container.innerHTML = `
            <div class="p-3 text-xs text-red-400 bg-red-950/20 rounded border border-red-800/40 font-mono">
              <div class="font-bold mb-1">Mermaid Syntax Warning:</div>
              <div class="text-[11px] opacity-80">${res.error || 'Check diagram syntax'}</div>
            </div>`;
        } else {
          container.innerHTML = `
            <div class="flex items-center justify-between px-3 py-1.5 bg-[var(--codeblock-header-bg)] border-b border-[var(--border-subtle)] text-[11px] text-[#EC4899] font-medium">
              <span class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-[#EC4899] inline-block"></span>
                <span>Mermaid Diagram</span>
              </span>
            </div>
            <div class="p-4 flex justify-center items-center overflow-x-auto bg-[var(--editor-bg)]">
              ${res.svg}
            </div>`;
        }
      } catch (err) {
        console.warn('Failed to render preview mermaid diagram', err);
      }
    });
  }, [renderedHtml]);

  // Extract headings for Table of Contents
  const headings = useMemo(() => {
    const lines = formulaEvaluated.split('\n');
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
  }, [formulaEvaluated]);

  const handleCopyRendered = async () => {
    try {
      await bridge.clipboard.writeText(formulaEvaluated);
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

        {/* Sync Control */}
        {!isLiveSync && (
          <button
            type="button"
            onClick={handleManualSync}
            title={isContentOutdated ? 'Sync preview with latest editor changes' : 'Preview is up to date'}
            aria-label="Refresh Preview"
            className={`p-1.5 rounded-md flex items-center gap-1 text-[10px] font-medium transition-colors ${
              isContentOutdated
                ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                : 'hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isContentOutdated ? 'animate-spin-slow' : ''}`} />
            {isContentOutdated && <span>Sync</span>}
          </button>
        )}

        <button
          type="button"
          onClick={handleCopyRendered}
          title={copied ? 'Copied to Clipboard' : 'Copy Markdown'}
          aria-label={copied ? 'Copied to Clipboard' : 'Copy Rendered Markdown to Clipboard'}
          className="p-1.5 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md flex items-center justify-center transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
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
          ref={previewRef}
          className="flex-1 overflow-y-auto p-3 sm:p-5"
          style={{ fontSize: `${settings.previewFontScale}%` }}
        >
          <div className={`mx-auto ${getMaxWidthClass()} contextpad-preview-prose`}>
            {formulaEvaluated.trim() ? (
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
