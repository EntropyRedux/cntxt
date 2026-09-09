import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Sparkles, 
  Pin, 
  Trash2, 
  Copy, 
  ArrowUpRight, 
  Variable, 
  Download,
  Upload
} from 'lucide-react';
import { useTemplateStore } from '../../store/templateStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Template } from '../../types';

export const TemplateManager: React.FC = () => {
  const { 
    templates, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory,
    createTemplate,
    deleteTemplate,
    duplicateTemplate,
    togglePinTemplate,
    openVariableModal,
    exportTemplates,
    importTemplates
  } = useTemplateStore();

  const { tabs, activeTabId, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Prompt Engineering');
  const [newDesc, setNewDesc] = useState('');
  const [newContent, setNewContent] = useState('');

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(templates.map(t => t.category));
    return ['All', ...Array.from(set)];
  }, [templates]);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
      const matchSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleInsertTemplate = (template: Template) => {
    if (!activeTab) return;
    insertTextAtCursor(activeTab.id, template.content);
    addNotification('Template Inserted', template.name, 'success');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newContent.trim()) return;

    createTemplate({
      name: newName.trim(),
      description: newDesc.trim() || 'Custom prompt template',
      category: newCategory.trim() || 'General',
      content: newContent.trim(),
      isPinned: false
    });

    setNewName('');
    setNewDesc('');
    setNewContent('');
    setIsCreating(false);
    addNotification('Template Created', newName, 'success');
  };

  const handleExport = () => {
    const json = exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextpad-templates-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Export Complete', 'Templates JSON downloaded', 'success');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const count = importTemplates(json);
        addNotification('Templates Imported', `Successfully imported ${count} template(s)`, 'success');
      } catch (err: any) {
        addNotification('Import Error', 'Invalid JSON file', 'error');
      }
    };
    input.click();
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Search & Actions Bar */}
      <div className="p-3 border-b border-[var(--border-primary)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5">
            Templates
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleImport}
              title="Import Templates JSON"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExport}
              title="Export Templates JSON"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="px-2 py-0.5 theme-btn-primary rounded font-medium flex items-center gap-1 transition-colors text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates & variables..."
            className="w-full h-7 pl-8 pr-2.5 theme-input rounded text-xs transition-colors"
          />
        </div>

        {/* Category Pills */}
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

      {/* New Template Form Modal/Inline */}
      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-3 border-b border-[var(--border-primary)] bg-[var(--card-secondary-bg)] space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-[var(--text-primary)] font-semibold">
            <span>Create New Template</span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template Name (e.g. Few-Shot Classifier)"
            className="w-full h-7 px-2 theme-input rounded"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Category"
              className="h-7 px-2 theme-input rounded"
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Short Description"
              className="h-7 px-2 theme-input rounded"
            />
          </div>
          <textarea
            required
            rows={4}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Template text with {{variable}} placeholders..."
            className="w-full p-2 theme-input rounded font-mono text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-2.5 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 theme-btn-primary rounded font-medium"
            >
              Save Template
            </button>
          </div>
        </form>
      )}

      {/* Template Card List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredTemplates.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)]">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40 text-[var(--text-muted)]" />
            <p>No templates found</p>
          </div>
        ) : (
          filteredTemplates.map(tmpl => (
            <div
              key={tmpl.id}
              className="theme-card p-2.5 rounded transition-all space-y-2 group shadow-xs"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                    <span className="truncate">{tmpl.name}</span>
                    {tmpl.isPinned && <Pin className="w-3 h-3 text-[var(--status-warning)] shrink-0 fill-[var(--status-warning)]" />}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">{tmpl.description}</p>
                </div>
              </div>

              {/* Variable badges */}
              {tmpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tmpl.variables.slice(0, 4).map(v => (
                    <span
                      key={v}
                      className="px-1.5 py-0.2 bg-[var(--card-secondary-bg)] text-[var(--accent-primary)] border border-[var(--border-primary)] rounded text-[10px] font-mono flex items-center gap-0.5 font-medium"
                    >
                      <Variable className="w-2.5 h-2.5 opacity-70" />
                      {v.split(':')[0]}
                    </span>
                  ))}
                  {tmpl.variables.length > 4 && (
                    <span className="text-[10px] text-[var(--text-muted)] self-center">
                      +{tmpl.variables.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-primary)] text-[11px]">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openVariableModal(tmpl)}
                    title="Fill Variables & Insert"
                    className="px-2 py-0.5 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    <Variable className="w-3 h-3" />
                    <span>Fill & Insert</span>
                  </button>
                  <button
                    onClick={() => handleInsertTemplate(tmpl)}
                    title="Quick Insert Raw Template"
                    className="px-2 py-0.5 bg-[var(--accent-container)] text-[var(--accent-primary)] rounded font-medium flex items-center gap-1 transition-colors"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Insert</span>
                  </button>
                </div>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => duplicateTemplate(tmpl.id)}
                    title="Duplicate Template"
                    className="p-1 hover:text-[var(--text-primary)] rounded"
                  >
                    <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => togglePinTemplate(tmpl.id)}
                    title={tmpl.isPinned ? 'Unpin' : 'Pin to top'}
                    className="p-1 hover:text-[var(--status-warning)] rounded"
                  >
                    <Pin className={`w-3 h-3 ${tmpl.isPinned ? 'text-[var(--status-warning)] fill-[var(--status-warning)]' : 'text-[var(--text-muted)]'}`} />
                  </button>
                  <button
                    onClick={() => deleteTemplate(tmpl.id)}
                    title="Delete Template"
                    className="p-1 hover:text-[var(--status-error)] rounded"
                  >
                    <Trash2 className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--status-error)]" />
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
