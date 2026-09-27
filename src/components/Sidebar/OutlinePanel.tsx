import React, { useState, useMemo, useEffect } from 'react';
import { 
  ListTree, 
  Search, 
  Hash, 
  Code, 
  CheckSquare, 
  Square, 
  Table, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight,
  Filter,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge, querySelector } from '../../adapters';

interface OutlineItem {
  id: string;
  type: 'heading' | 'code' | 'task' | 'table';
  text: string;
  level?: number;
  lineNumber: number;
  completed?: boolean;
  language?: string;
}

export const OutlinePanel: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { tabs, activeTabId, insertTextAtCursor, updateTabContent } = useTabStore();
  const { settings } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  
  const [filterType, setFilterType] = useState<'all' | 'heading' | 'code' | 'task' | 'table'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedOutlineItem, setSelectedOutlineItem] = useState<OutlineItem | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const content = activeTab?.content || '';

  const isLiveSync = settings.enableLiveDomSync ?? settings.enableLiveMarkdownSync ?? true;
  const [syncedContent, setSyncedContent] = useState(content);

  useEffect(() => {
    if (isLiveSync) {
      setSyncedContent(content);
    }
  }, [content, isLiveSync]);

  const handleManualSync = () => {
    setSyncedContent(content);
    addNotification('Outline Synced', 'Document outline updated with latest content', 'info');
  };

  const isOutdated = !isLiveSync && content !== syncedContent;

  // Parse document content into structured outline items
  const outlineItems = useMemo<OutlineItem[]>(() => {
    const textToParse = isLiveSync ? content : syncedContent;
    if (!textToParse) return [];

    const lines = textToParse.split('\n');
    const items: OutlineItem[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockStartLine = 0;

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Check for code blocks ```
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim() || 'plaintext';
          codeBlockStartLine = lineNum;
        } else {
          items.push({
            id: `code-${codeBlockStartLine}`,
            type: 'code',
            text: `Code block (${codeBlockLang})`,
            lineNumber: codeBlockStartLine,
            language: codeBlockLang
          });
          inCodeBlock = false;
        }
        return;
      }

      if (inCodeBlock) return;

      // Check for Markdown Headings (# H1, ## H2, etc.)
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        items.push({
          id: `heading-${lineNum}`,
          type: 'heading',
          text,
          level,
          lineNumber: lineNum
        });
        return;
      }

      // Check for Task / Checklist Items (- [ ] or - [x])
      const taskMatch = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (taskMatch) {
        const completed = taskMatch[1].toLowerCase() === 'x';
        const text = taskMatch[2].trim();
        items.push({
          id: `task-${lineNum}`,
          type: 'task',
          text,
          lineNumber: lineNum,
          completed
        });
        return;
      }

      // Check for Markdown Tables (starts and ends with |)
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
        // Only add table once per table block (detect header row)
        const nextLine = lines[index + 1]?.trim() || '';
        if (nextLine.match(/^\|?\s*[-:]+[-| :]*\|?$/)) {
          const cells = trimmed
            .split('|')
            .map(c => c.trim())
            .filter(Boolean);
          const previewText = cells.slice(0, 3).join(' | ') + (cells.length > 3 ? ' ...' : '');
          items.push({
            id: `table-${lineNum}`,
            type: 'table',
            text: `Table: ${previewText || 'Data Table'}`,
            lineNumber: lineNum
          });
        }
      }
    });

    return items;
  }, [content]);

  // Filter & Search Items
  const filteredItems = useMemo(() => {
    return outlineItems.filter(item => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.text.toLowerCase().includes(q) || (item.language && item.language.toLowerCase().includes(q));
      }
      return true;
    });
  }, [outlineItems, filterType, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const headings = outlineItems.filter(i => i.type === 'heading').length;
    const tasks = outlineItems.filter(i => i.type === 'task');
    const tasksCompleted = tasks.filter(t => t.completed).length;
    const codeBlocks = outlineItems.filter(i => i.type === 'code').length;
    const tables = outlineItems.filter(i => i.type === 'table').length;

    return {
      headings,
      tasksTotal: tasks.length,
      tasksCompleted,
      taskProgress: tasks.length ? Math.round((tasksCompleted / tasks.length) * 100) : 0,
      codeBlocks,
      tables
    };
  }, [outlineItems]);

  const handleSelectItem = (item: OutlineItem) => {
    setSelectedOutlineItem(item);
    jumpToLine(item.lineNumber);
  };

  const jumpToLine = (lineNumber: number) => {
    const editor = querySelector('.cm-editor');
    if (editor) {
      editor.focus();
      // Scroll smoothly to estimated position
      const scroller = editor.querySelector('.cm-scroller');
      if (scroller) {
        const totalLines = content.split('\n').length || 1;
        const targetScroll = (lineNumber / totalLines) * scroller.scrollHeight;
        scroller.scrollTo({ top: Math.max(0, targetScroll - 80), behavior: 'smooth' });
      }
    }
    addNotification('Jumped to Outline Item', `Line ${lineNumber}`, 'info');
  };

  const copyTableOfContents = () => {
    const headings = outlineItems.filter(i => i.type === 'heading');
    if (headings.length === 0) {
      addNotification('No Headings', 'Document does not have headings to generate TOC', 'warning');
      return;
    }

    const toc = headings.map(h => {
      const indent = '  '.repeat(Math.max(0, (h.level || 1) - 1));
      const slug = h.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return `${indent}- [${h.text}](#${slug})`;
    }).join('\n');

    bridge.clipboard.writeText(`## Table of Contents\n\n${toc}\n`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('TOC Copied', 'Markdown Table of Contents copied to clipboard', 'success');
  };

  const insertTableOfContents = () => {
    if (!activeTab) return;
    const headings = outlineItems.filter(i => i.type === 'heading');
    if (headings.length === 0) {
      addNotification('No Headings', 'Document does not have headings to generate TOC', 'warning');
      return;
    }

    const toc = headings.map(h => {
      const indent = '  '.repeat(Math.max(0, (h.level || 1) - 1));
      const slug = h.text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return `${indent}- [${h.text}](#${slug})`;
    }).join('\n');

    insertTextAtCursor(activeTab.id, `## Table of Contents\n\n${toc}\n\n`);
    addNotification('TOC Inserted', 'Inserted Table of Contents into document', 'success');
  };

  return (
    <div className="theme-sidebar flex flex-col h-full select-none">
      {/* Overview Stats Bar */}
      {outlineItems.length > 0 && (
        <div className="px-3 py-1.5 bg-[var(--card-secondary-bg)] border-b border-[var(--border-primary)] text-[11px] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <span>{stats.headings} Headings</span>
            <span>•</span>
            <span>{stats.codeBlocks} Code</span>
            {stats.tasksTotal > 0 && (
              <>
                <span>•</span>
                <span className={stats.taskProgress === 100 ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}>
                  {stats.tasksCompleted}/{stats.tasksTotal} Tasks ({stats.taskProgress}%)
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Search & Filter Controls with Quick Actions */}
      <div className="p-2 border-b border-[var(--border-primary)] flex flex-col gap-1.5 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            id="outline-filter-input"
            name="outlineFilter"
            type="text"
            placeholder="Search outline symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full theme-input rounded-md pl-8 pr-2.5 py-1 text-xs placeholder-[var(--text-muted)] transition-colors"
          />
        </div>

        {/* Filter Pills & Actions Row */}
        <div className="flex items-center justify-between gap-1 pb-0.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'all', label: 'All', icon: Filter },
                { id: 'heading', label: 'Headings', icon: Hash },
                { id: 'code', label: 'Code', icon: Code },
                { id: 'task', label: 'Tasks', icon: CheckSquare },
                { id: 'table', label: 'Tables', icon: Table }
              ] as const
            ).map(tab => {
              const Icon = tab.icon;
              const isSelected = filterType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  title={tab.label}
                  aria-label={tab.label}
                  className={`w-6 h-6 rounded flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-0.5 shrink-0 border-l border-[var(--border-subtle)] pl-1.5 ml-1">
            {!isLiveSync && (
              <button
                onClick={handleManualSync}
                title={isOutdated ? "Sync outline with latest changes" : "Outline is up to date"}
                aria-label="Refresh Outline"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isOutdated 
                    ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30' 
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isOutdated ? 'animate-spin-slow' : ''}`} />
              </button>
            )}
            <button
              onClick={copyTableOfContents}
              title="Copy Table of Contents (TOC)"
              aria-label="Copy Table of Contents"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={insertTableOfContents}
              title="Insert TOC into Document"
              aria-label="Insert TOC into Document"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree / Symbol List (Full Panel Height) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)] flex flex-col items-center justify-center">
            <FileText className="w-8 h-8 mb-2 opacity-30 text-[var(--text-muted)]" />
            <p className="text-xs font-semibold text-[var(--text-primary)]">No outline symbols found</p>
            <p className="text-[11px] mt-1 text-[var(--text-muted)]">
              Add Markdown headings (# H1, ## H2), code blocks, or checklists to see structure here.
            </p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isSelected = selectedOutlineItem?.id === item.id;

            if (item.type === 'heading') {
              const level = item.level || 1;
              const indentPadding = (level - 1) * 12;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  style={{ paddingLeft: `${Math.max(6, indentPadding + 6)}px` }}
                  className={`w-full text-left py-1 pr-2 rounded flex items-center justify-between group transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] font-medium'
                      : 'hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-[11px] font-mono font-bold text-[var(--accent-primary)] shrink-0">
                      H{level}
                    </span>
                    <span className={`truncate text-[13px] ${level === 1 ? 'font-bold text-[var(--text-primary)]' : level === 2 ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {item.text}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-1">
                    :{item.lineNumber}
                  </span>
                </button>
              );
            }

            if (item.type === 'code') {
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between group transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30'
                      : 'hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate text-[var(--status-warning)]">
                    <Code className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[13px]">{item.text}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-1">
                    :{item.lineNumber}
                  </span>
                </button>
              );
            }

            if (item.type === 'task') {
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between group transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30'
                      : 'hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {item.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className={`truncate text-[13px] ${item.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {item.text}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-1">
                    :{item.lineNumber}
                  </span>
                </button>
              );
            }

            if (item.type === 'table') {
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full text-left px-2 py-1 rounded flex items-center justify-between group transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30'
                      : 'hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate text-[var(--status-info)]">
                    <Table className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[13px]">{item.text}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] opacity-60 group-hover:opacity-100 transition-colors shrink-0 ml-1">
                    :{item.lineNumber}
                  </span>
                </button>
              );
            }

            return null;
          })
        )}
      </div>
    </div>
  );
};
