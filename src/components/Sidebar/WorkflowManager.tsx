import React, { useState, useMemo, useRef } from 'react';
import { 
  Workflow, 
  Bookmark, 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight, 
  Edit3, 
  CheckSquare, 
  Square, 
  Play
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge } from '../../adapters';
import { PinnedTab } from '../../contracts/data_shapes';
import { WorkflowIcon } from './WorkflowManager/WorkflowIcon';
import { WorkflowEditorModal } from './WorkflowManager/WorkflowEditorModal';

export const WorkflowManager: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { 
    workflows, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory,
    deleteWorkflow,
    duplicateWorkflow,
    toggleHideWorkflow,
    bulkDeleteWorkflows,
    bulkToggleHideWorkflows,
    toggleCategoryCollapse,
    isCategoryCollapsed
  } = useWorkflowStore();

  const { tabs, createTab, setActiveTabId } = useTabStore();
  const { addNotification } = useNotificationStore();

  // Modals & UI States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<PinnedTab | null>(null);
  const [showHidden, setShowHidden] = useState(true);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Click & Double-click timer ref for smart navigation
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // All distinct categories
  const categories = useMemo(() => {
    const set = new Set(workflows.map(w => w.category || 'General'));
    return ['All', ...Array.from(set)];
  }, [workflows]);

  // Filtered workflows based on search & category & visibility
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      if (!showHidden && w.isHidden) return false;
      const matchCat = selectedCategory === 'All' || (w.category || 'General') === selectedCategory;
      const matchSearch = !searchQuery.trim() || 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.content && w.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (w.filePath && w.filePath.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [workflows, selectedCategory, searchQuery, showHidden]);

  // Grouped by Category for Accordions
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, PinnedTab[]> = {};
    filteredWorkflows.forEach(w => {
      const cat = w.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(w);
    });
    return groups;
  }, [filteredWorkflows]);

  // Launching Logic: Handles Single Click (Smart Focus) vs Double Click (Fresh Copy)
  const launchWorkflowOrBookmark = async (item: PinnedTab, forceFreshCopy = false) => {
    if (item.type === 'bookmark') {
      // BOOKMARK LAUNCH LOGIC: Open local file from disk
      if (!item.filePath) {
        addNotification('Bookmark Error', `No file path specified for "${item.name}"`, 'error');
        return;
      }

      // Check if file is already open in a workspace tab
      const existingTab = tabs.find(t => t.filePath === item.filePath);
      if (existingTab && !forceFreshCopy) {
        setActiveTabId(existingTab.id);
        addNotification('Switched Tab', `Switched to ${item.name}`, 'info');
        return;
      }

      // Read real file from disk via runtime bridge
      try {
        const fileData = await bridge.fs.readFile(item.filePath);
        const fileName = item.filePath.split(/[/\\]/).pop() || item.name;
        const ext = fileName.split('.').pop()?.toLowerCase() || 'markdown';
        const lang = ext === 'json' ? 'json' : ext === 'js' || ext === 'ts' ? 'javascript' : 'markdown';

        createTab(fileName, fileData, lang as any, item.filePath, item.id);
        addNotification('Bookmark Opened', `Loaded ${fileName} from disk`, 'success');
      } catch (err: any) {
        addNotification('Bookmark Read Failed', `Could not read ${item.filePath}: ${err?.message || String(err)}`, 'error');
      }
    } else {
      // WORKFLOW BLUEPRINT LAUNCH LOGIC
      // If single-click and already open, focus it
      if (!forceFreshCopy) {
        const existingTab = tabs.find(t => t.pinnedTabId === item.id);
        if (existingTab) {
          setActiveTabId(existingTab.id);
          addNotification('Switched Tab', `Focused ${item.name}`, 'info');
          return;
        }
      }

      // Launch fresh tab from blueprint
      const title = item.name.endsWith('.md') ? item.name : `${item.name}.md`;
      createTab(title, item.content, 'markdown', null, item.id);
      addNotification('Workflow Launched', `Opened ${item.name} in workspace`, 'success');
    }
  };

  const handleCardClick = (item: PinnedTab) => {
    if (isBulkMode) {
      toggleSelectId(item.id);
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      launchWorkflowOrBookmark(item, false);
    }, 220);
  };

  const handleCardDoubleClick = (item: PinnedTab) => {
    if (isBulkMode) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    launchWorkflowOrBookmark(item, true);
  };

  const handleEdit = (item: PinnedTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWorkflow(item);
    setIsEditorOpen(true);
  };

  const handleOpenNew = () => {
    setEditingWorkflow(null);
    setIsEditorOpen(true);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDeleteWorkflows(Array.from(selectedIds));
    addNotification('Workflows Deleted', `Deleted ${selectedIds.size} items`, 'info');
    setSelectedIds(new Set());
    setIsBulkMode(false);
  };

  const handleBulkToggleHide = () => {
    if (selectedIds.size === 0) return;
    const items = workflows.filter(w => selectedIds.has(w.id));
    const allHidden = items.every(w => w.isHidden);
    bulkToggleHideWorkflows(Array.from(selectedIds), !allHidden);
    addNotification('Visibility Updated', `Updated ${selectedIds.size} items`, 'info');
    setSelectedIds(new Set());
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Header Toolbar */}
      <div className="p-3 border-b border-[var(--border-primary)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5">
            <Workflow size={13} className="text-[var(--accent-primary)]" />
            <span>Workflows & Bookmarks</span>
          </span>
          <div className="flex items-center gap-1">
            {/* Toggle show/hide disabled */}
            <button
              type="button"
              onClick={() => setShowHidden(!showHidden)}
              title={showHidden ? 'Hide disabled items' : 'Show disabled items'}
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors border border-[var(--border-primary)] ${
                showHidden 
                  ? 'bg-[var(--card-secondary-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]' 
                  : 'bg-[var(--card-bg)] text-[var(--text-muted)]'
              }`}
            >
              {showHidden ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>

            {/* Bulk mode toggle */}
            <button
              type="button"
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedIds(new Set());
              }}
              title="Bulk selection mode"
              className={`w-6 h-6 rounded flex items-center justify-center transition-colors border border-[var(--border-primary)] ${
                isBulkMode 
                  ? 'bg-[var(--accent-primary)] text-white' 
                  : 'bg-[var(--card-secondary-bg)] text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <CheckSquare size={12} />
            </button>

            {/* Add button */}
            <button
              type="button"
              onClick={handleOpenNew}
              title="Create new workflow blueprint or bookmark"
              className="w-6 h-6 theme-btn-primary rounded flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blueprints & bookmarks..."
            className="w-full h-7 pl-8 pr-2.5 theme-input rounded text-xs transition-colors"
          />
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-[var(--accent-primary)] text-white font-medium shadow-2xs' 
                  : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Bulk Action Controls Banner */}
        {isBulkMode && (
          <div className="p-2 bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] rounded-md flex items-center justify-between text-[11px] animate-in fade-in">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
            >
              {selectedIds.size === filteredWorkflows.length && filteredWorkflows.length > 0 ? (
                <CheckSquare size={13} className="text-[var(--accent-primary)]" />
              ) : (
                <Square size={13} />
              )}
              <span>{selectedIds.size} Selected</span>
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkToggleHide}
                title="Toggle visibility of selected"
                className="px-2 py-1 bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] disabled:opacity-40 border border-[var(--border-primary)] rounded text-[10px]"
              >
                Toggle Hide
              </button>
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={handleBulkDelete}
                title="Delete selected"
                className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 border border-red-500/30 rounded text-[10px]"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Accordion List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {Object.keys(groupedByCategory).length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
            <Workflow size={28} className="mx-auto opacity-30 text-[var(--text-muted)]" />
            <p className="text-xs">No workflows or bookmarks found</p>
            <button
              type="button"
              onClick={handleOpenNew}
              className="px-3 py-1.5 theme-btn-primary rounded text-xs font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>Create Blueprint</span>
            </button>
          </div>
        ) : (
          Object.entries(groupedByCategory).map(([categoryName, items]) => {
            const isCollapsed = isCategoryCollapsed(categoryName);

            return (
              <div key={categoryName} className="space-y-1">
                {/* Category Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleCategoryCollapse(categoryName)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors group"
                >
                  <div className="flex items-center gap-1.5 uppercase tracking-wider">
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                    <span>{categoryName}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] rounded-full font-mono">
                    {items.length}
                  </span>
                </button>

                {/* Items in Category */}
                {!isCollapsed && (
                  <div className="space-y-1.5 pl-1">
                    {items.map(item => {
                      const isSelected = selectedIds.has(item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleCardClick(item)}
                          onDoubleClick={() => handleCardDoubleClick(item)}
                          className={`theme-card p-2.5 rounded-lg border transition-all space-y-2 group shadow-2xs cursor-pointer ${
                            item.isHidden ? 'opacity-55' : ''
                          } ${
                            isSelected ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5' : ''
                          } hover:border-[var(--accent-primary)]/50`}
                        >
                          {/* Top Row: Icon, Title & Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isBulkMode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectId(item.id);
                                  }}
                                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                >
                                  {isSelected ? (
                                    <CheckSquare size={14} className="text-[var(--accent-primary)]" />
                                  ) : (
                                    <Square size={14} />
                                  )}
                                </button>
                              )}

                              <div className="w-6 h-6 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-primary)]">
                                <WorkflowIcon name={item.icon} type={item.type} size={14} />
                              </div>

                              <div className="min-w-0">
                                <span className="font-semibold text-[var(--text-primary)] truncate block text-xs">
                                  {item.name}
                                </span>
                                {item.type === 'bookmark' && item.filePath && (
                                  <span className="text-[10px] text-[var(--text-muted)] truncate block font-mono">
                                    {item.filePath}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {item.type === 'bookmark' ? (
                                <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-medium">
                                  Bookmark
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-medium">
                                  Workflow
                                </span>
                              )}
                              {item.isHidden && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-[var(--card-secondary-bg)] text-[var(--text-muted)] rounded font-medium">
                                  Hidden
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] text-[11px]">
                            {/* Left: Quick Launch */}
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  launchWorkflowOrBookmark(item, false);
                                }}
                                title="Single-click: Switch or Open; Double-click: Fresh Copy"
                                className="px-2 py-0.5 theme-btn-primary rounded flex items-center gap-1 font-medium text-[10px] shadow-xs active:scale-95"
                              >
                                <Play size={10} fill="currentColor" />
                                <span>Launch</span>
                              </button>
                            </div>

                            {/* Right: Micro-controls (Edit, Duplicate, Hide, Delete) */}
                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => handleEdit(item, e)}
                                title="Edit item details"
                                className="p-1 hover:text-[var(--accent-primary)] rounded hover:bg-[var(--card-hover-bg)]"
                              >
                                <Edit3 size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateWorkflow(item.id);
                                  addNotification('Duplicated', `Created copy of ${item.name}`, 'success');
                                }}
                                title="Duplicate workflow"
                                className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover-bg)]"
                              >
                                <Copy size={12} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleHideWorkflow(item.id);
                                }}
                                title={item.isHidden ? 'Show item' : 'Hide item'}
                                className="p-1 hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover-bg)]"
                              >
                                {item.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteWorkflow(item.id);
                                  addNotification('Deleted', `Removed "${item.name}"`, 'info');
                                }}
                                title="Delete item"
                                className="p-1 hover:text-[var(--status-error)] rounded hover:bg-[var(--card-hover-bg)]"
                              >
                                <Trash2 size={12} className="text-[var(--text-muted)] hover:text-[var(--status-error)]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Workflow Editor Modal */}
      <WorkflowEditorModal
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingWorkflow(null);
        }}
        editingWorkflow={editingWorkflow}
      />
    </div>
  );
};
