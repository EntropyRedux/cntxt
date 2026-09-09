import React, { useState, useMemo } from 'react';
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
  Layers,
  Save,
  X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { PinnedTab } from '../../types';

export const WorkflowManager: React.FC = () => {
  const { 
    workflows, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory,
    createWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    toggleHideWorkflow
  } = useWorkflowStore();

  const { createTab, tabs, activeTabId } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'workflow' | 'bookmark'>('workflow');
  const [category, setCategory] = useState('Workflows');
  const [content, setContent] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId);

  const categories = useMemo(() => {
    const set = new Set(workflows.map(w => w.category));
    return ['All', ...Array.from(set)];
  }, [workflows]);

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const matchCat = selectedCategory === 'All' || w.category === selectedCategory;
      const matchSearch = !searchQuery || w.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [workflows, selectedCategory, searchQuery]);

  const handleLaunchWorkflow = (item: PinnedTab) => {
    createTab(
      item.type === 'workflow' ? `${item.name}.md` : item.name,
      item.content,
      'markdown',
      item.filePath || null
    );
    addNotification('Launched', `Opened ${item.name} in new tab`, 'success');
  };

  const handleCreateFromActiveTab = () => {
    if (!activeTab) return;
    setName(activeTab.title.replace(/\.[^/.]+$/, ''));
    setContent(activeTab.content);
    setIsCreating(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createWorkflow({
      name: name.trim(),
      type,
      category: category.trim() || 'General',
      icon: type === 'workflow' ? 'Workflow' : 'Bookmark',
      content: content.trim() || '# ' + name
    });

    setName('');
    setContent('');
    setIsCreating(false);
    addNotification('Created', `${name} added to ${type}s`, 'success');
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-primary)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5">
            Workflows
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateFromActiveTab}
              title="Snapshot Current Tab as Workflow"
              aria-label="Snapshot Current Tab as Workflow"
              className="w-6 h-6 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded flex items-center justify-center transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              title="New Workflow Blueprint"
              aria-label="New Workflow Blueprint"
              className="w-6 h-6 theme-btn-primary rounded flex items-center justify-center transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blueprints & bookmarks..."
            className="w-full h-7 pl-8 pr-2.5 theme-input rounded text-xs transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded transition-colors ${
                selectedCategory === cat 
                  ? 'bg-[var(--accent-primary)] text-white font-medium' 
                  : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Creation form modal */}
      {isCreating && (
        <form onSubmit={handleSubmit} className="p-3 border-b border-[var(--border-primary)] bg-[var(--card-secondary-bg)] space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-[var(--text-primary)] font-semibold">
            <span>New Snapshot Blueprint</span>
            <button type="button" onClick={() => setIsCreating(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
          </div>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workflow / Blueprint Name"
            className="w-full h-7 px-2 theme-input rounded"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="h-7 px-2 theme-input rounded"
            >
              <option value="workflow">Workflow Blueprint</option>
              <option value="bookmark">Quick Bookmark</option>
            </select>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="h-7 px-2 theme-input rounded"
            />
          </div>
          <textarea
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Snapshot blueprint document content..."
            className="w-full p-2 theme-input rounded font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              title="Cancel"
              aria-label="Cancel"
              className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--card-hover-bg)]"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              type="submit"
              title="Save Blueprint"
              aria-label="Save Blueprint"
              className="w-7 h-7 flex items-center justify-center theme-btn-primary rounded font-medium"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredWorkflows.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)]">
            <Workflow className="w-6 h-6 mx-auto mb-2 opacity-40 text-[var(--text-muted)]" />
            <p>No workflows found</p>
          </div>
        ) : (
          filteredWorkflows.map(item => (
            <div
              key={item.id}
              className={`theme-card p-2.5 rounded transition-all space-y-2 group shadow-xs ${
                item.isHidden ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {item.type === 'workflow' ? (
                    <Workflow className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  ) : (
                    <Bookmark className="w-4 h-4 text-[var(--status-warning)] shrink-0 fill-[var(--status-warning)]/20" />
                  )}
                  <span className="font-semibold text-[var(--text-primary)] truncate">{item.name}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-primary)] rounded font-medium">
                  {item.category}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-primary)] text-[11px]">
                <button
                  type="button"
                  onClick={() => handleLaunchWorkflow(item)}
                  title={`Launch ${item.name} in tab`}
                  aria-label={`Launch ${item.name} in tab`}
                  className="w-6 h-6 theme-btn-primary rounded flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => duplicateWorkflow(item.id)}
                    title={`Duplicate ${item.name}`}
                    aria-label={`Duplicate ${item.name}`}
                    className="p-1 hover:text-[var(--text-primary)] rounded"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHideWorkflow(item.id)}
                    title={item.isHidden ? `Unhide ${item.name}` : `Hide ${item.name}`}
                    aria-label={item.isHidden ? `Unhide ${item.name}` : `Hide ${item.name}`}
                    className="p-1 hover:text-[var(--text-primary)] rounded"
                  >
                    {item.isHidden ? <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" /> : <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteWorkflow(item.id)}
                    title={`Delete ${item.name}`}
                    aria-label={`Delete ${item.name}`}
                    className="p-1 hover:text-[var(--status-error)] rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--status-error)]" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
