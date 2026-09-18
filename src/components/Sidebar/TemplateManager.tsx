import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronsUpDown, 
  ChevronsDownUp, 
  MousePointerClick, 
  Trash2, 
  CheckSquare, 
  Square, 
  Eye, 
  EyeOff, 
  Star,
  ChevronDown, 
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check, 
  FileText, 
  X,
  Save,
  Sparkles
} from 'lucide-react';
import { useTemplateStore } from '../../store/templateStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Template } from '../../contracts/data_shapes';
import { editorRegistry } from '../../services/editor/editorRegistry';
import { processTemplateVariables, extractTemplateVariables } from '../../services/editor/templateVariableService';
import { CategorySelector } from './TemplateManager/CategorySelector';
import { TemplateRowItem } from './TemplateManager/TemplateRowItem';

const QUICK_MACRO_TOKENS = [
  { label: 'Selection', token: '{{SELECTION}}', description: 'Selected editor text' },
  { label: 'Date', token: '{{DATE}}', description: 'Current date YYYY-MM-DD' },
  { label: 'Time', token: '{{TIME}}', description: 'Current time HH:mm' },
  { label: 'Cursor', token: '{{CURSOR}}', description: 'Cursor landing position' },
  { label: 'Clipboard', token: '{{CLIPBOARD}}', description: 'Clipboard text' },
  { label: 'Prompt', token: '{{prompt:Variable}}', description: 'Interactive prompt variable' },
];

export const TemplateManager: React.FC = () => {
  const { 
    templates,
    collapsedCategories,
    toggleCategoryCollapse,
    moveCategory,
    showHidden,
    toggleShowHidden,
    bulkMode,
    toggleBulkMode,
    selectedTemplateIds,
    toggleSelection,
    clearSelection,
    createTemplate,
    updateTemplate,
    renameTemplateId,
    deleteTemplate,
    deleteTemplatesBulk,
    duplicateTemplate,
    toggleTemplatesVisibilityBulk,
    openVariableModal,
    getAllCategories
  } = useTemplateStore();

  const { tabs, activeTabId, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  // Expand all state (tracks which template variable drawers are expanded)
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<Set<string>>(new Set());
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  // Modernized inline form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'GENERAL',
    content: ''
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Close category dropdown on click outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (categoryFilterRef.current && !categoryFilterRef.current.contains(e.target as Node)) {
        setIsCategoryFilterOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Categories list from store
  const categoriesSummary = getAllCategories();

  // Group templates by category with filters applied
  const groupedTemplates = useMemo(() => {
    const acc: Record<string, Template[]> = {};
    const query = searchQuery.trim().toLowerCase();

    templates.forEach(t => {
      // Visibility filter
      if (!showHidden && t.isHidden) return;

      // Category filter
      const cat = (t.category || 'GENERAL').toUpperCase();
      if (selectedCategoryFilter !== 'All' && cat !== selectedCategoryFilter.toUpperCase()) {
        return;
      }

      // Search filter
      if (query) {
        const matchName = t.name.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchContent = t.content.toLowerCase().includes(query);
        const matchCat = cat.toLowerCase().includes(query);
        const matchVars = t.variables.some(v => v.toLowerCase().includes(query));
        if (!matchName && !matchDesc && !matchContent && !matchCat && !matchVars) {
          return;
        }
      }

      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
    });

    // Sort items within each category: Pinned first, then alphabetical
    Object.keys(acc).forEach(cat => {
      acc[cat].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return acc;
  }, [templates, showHidden, selectedCategoryFilter, searchQuery]);

  // Sorted category names based on store categoryOrder
  const sortedCategories = useMemo(() => {
    return categoriesSummary
      .map(c => c.name)
      .filter(name => groupedTemplates[name] && groupedTemplates[name].length > 0);
  }, [categoriesSummary, groupedTemplates]);

  // --- Handlers ---

  const handleOpenAddForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      category: selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'GENERAL',
      content: ''
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (tmpl: Template) => {
    setFormData({
      id: tmpl.id,
      name: tmpl.name,
      description: tmpl.description || '',
      category: tmpl.category,
      content: tmpl.content
    });
    setEditingId(tmpl.id);
    setShowForm(true);
  };

  const handleInsertMacroToken = (token: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData(prev => ({ ...prev, content: prev.content + token }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = formData.content;
    const updated = current.substring(0, start) + token + current.substring(end);
    setFormData(prev => ({ ...prev, content: updated }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;

    if (editingId) {
      if (formData.id.trim() && formData.id.trim() !== editingId) {
        const renamed = renameTemplateId(editingId, formData.id.trim());
        if (!renamed) {
          addNotification('Rename Error', 'A template with this ID already exists.', 'error');
          return;
        }
      }

      updateTemplate(formData.id.trim() || editingId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        content: formData.content
      });
      addNotification('Template Updated', formData.name, 'success');
    } else {
      createTemplate({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        content: formData.content
      });
      addNotification('Template Created', formData.name, 'success');
    }

    setShowForm(false);
    setEditingId(null);
  };

  const handleUseTemplate = (template: Template) => {
    if (!activeTabId) {
      addNotification('Insert Template', 'No active document open', 'warning');
      return;
    }

    const insertedInView = editorRegistry.insertTemplateAtCursor(activeTabId, template.content);
    if (!insertedInView) {
      const currentSelection = activeTab?.content.slice(activeTab.selectionFrom || 0, activeTab.selectionTo || 0) || '';
      const processed = processTemplateVariables(template.content, currentSelection);
      insertTextAtCursor(activeTabId, processed.content);
    }

    addNotification('Template Inserted', template.name, 'success');
  };

  const handleAddSelection = () => {
    if (!activeTabId) {
      addNotification('Add Selection', 'No active document open', 'warning');
      return;
    }

    const selectedText = editorRegistry.getSelectedText(activeTabId) ||
      (activeTab ? activeTab.content.slice(activeTab.selectionFrom || 0, activeTab.selectionTo || 0) : '');

    if (!selectedText.trim()) {
      addNotification('Add Selection', 'Please select text in the editor first', 'warning');
      return;
    }

    setFormData({
      id: '',
      name: '',
      description: 'Created from editor selection',
      category: selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'GENERAL',
      content: selectedText
    });
    setEditingId(null);
    setShowForm(true);
    addNotification('Selection Captured', 'Template form populated with selected text', 'info');
  };

  const handleToggleExpandAll = () => {
    if (!isAllExpanded) {
      // 1. Expand all categories (remove any collapsed states)
      useTemplateStore.setState({ collapsedCategories: [] });
      // 2. Expand all template rows that have variables
      const allWithVars = templates.filter(t => t.variables && t.variables.length > 0).map(t => t.id);
      setExpandedTemplateIds(new Set(allWithVars));
      setIsAllExpanded(true);
    } else {
      // Collapse all template variable drawers
      setExpandedTemplateIds(new Set());
      setIsAllExpanded(false);
    }
  };

  const handleToggleRowExpand = (templateId: string) => {
    setExpandedTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(templateId)) {
        next.delete(templateId);
      } else {
        next.add(templateId);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selectedTemplateIds.length === 0) return;
    const count = selectedTemplateIds.length;
    if (window.confirm(`Delete ${count} selected template(s)? This action cannot be undone.`)) {
      deleteTemplatesBulk(selectedTemplateIds);
      clearSelection();
      addNotification('Bulk Delete', `Deleted ${count} template(s)`, 'info');
    }
  };

  const handleBulkToggleVisibility = () => {
    if (selectedTemplateIds.length === 0) return;
    const selected = templates.filter(t => selectedTemplateIds.includes(t.id));
    const anyHidden = selected.some(t => t.isHidden);
    toggleTemplatesVisibilityBulk(selectedTemplateIds, !anyHidden);
    addNotification('Visibility Updated', `Updated visibility for ${selected.length} templates`, 'info');
  };

  const totalTemplatesCount = templates.length;
  const detectedVars = extractTemplateVariables(formData.content);

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* 1. ContextPad Single-Row Manager Toolbar */}
      <div className="p-2 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg,#1a1a1a)] space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          {!bulkMode ? (
            /* Normal Mode Action Buttons */
            <div className="flex items-center gap-1 min-w-0">
              {/* Add Template */}
              <button
                type="button"
                onClick={handleOpenAddForm}
                title="Add Template"
                aria-label="Add Template"
                className="w-6.5 h-6.5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus size={15} />
              </button>

              {/* Add Selection */}
              <button
                type="button"
                onClick={handleAddSelection}
                title="Create Template from Selected Text"
                aria-label="Create Template from Selected Text"
                className="w-6.5 h-6.5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <MousePointerClick size={14} />
              </button>

              {/* Filter by Category Dropdown Button */}
              <div className="relative" ref={categoryFilterRef}>
                <button
                  type="button"
                  onClick={() => setIsCategoryFilterOpen(prev => !prev)}
                  title={`Filter by Category (Current: ${selectedCategoryFilter})`}
                  aria-label="Filter by Category"
                  aria-expanded={isCategoryFilterOpen}
                  className={`h-6.5 px-2 flex items-center gap-1 rounded text-xs transition-all cursor-pointer shrink-0 ${
                    selectedCategoryFilter !== 'All'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <Filter size={13} />
                  <span className="max-w-[70px] truncate text-[11px]">
                    {selectedCategoryFilter}
                  </span>
                  <ChevronDown size={11} className={`transition-transform duration-150 ${isCategoryFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Categories Dropdown Menu */}
                {isCategoryFilterOpen && (
                  <div 
                    className="absolute left-0 top-full mt-1 w-48 bg-[var(--dropdown-bg,#222)] border border-[var(--border-primary,#444)] rounded-md shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--border-subtle)]">
                      Filter by Category
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryFilter('All');
                        setIsCategoryFilterOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedCategoryFilter === 'All'
                          ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                          : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                      }`}
                    >
                      <span>All Categories</span>
                      {selectedCategoryFilter === 'All' && <Check size={12} className="text-[var(--accent-primary)]" />}
                    </button>

                    {categoriesSummary.map(cat => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryFilter(cat.name);
                          setIsCategoryFilterOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-xs text-left flex items-center justify-between transition-colors cursor-pointer ${
                          selectedCategoryFilter === cat.name
                            ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                            : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                        }`}
                      >
                        <span className="truncate">{cat.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-[var(--text-muted)] px-1 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)]">
                            {cat.count}
                          </span>
                          {selectedCategoryFilter === cat.name && <Check size={12} className="text-[var(--accent-primary)]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Expand All / Collapse All Templates in One Button */}
              <button
                type="button"
                onClick={handleToggleExpandAll}
                title={isAllExpanded ? "Collapse All Templates" : "Expand All Templates"}
                aria-label={isAllExpanded ? "Collapse All Templates" : "Expand All Templates"}
                className={`w-6.5 h-6.5 flex items-center justify-center rounded transition-all cursor-pointer shrink-0 ${
                  isAllExpanded 
                    ? 'bg-[var(--accent-container)] text-[var(--accent-primary)]' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                {isAllExpanded ? <ChevronsDownUp size={14} /> : <ChevronsUpDown size={14} />}
              </button>

              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(prev => !prev)}
                title={isSearchOpen ? "Close Search" : "Search Templates"}
                aria-label="Search Templates"
                className={`w-6.5 h-6.5 flex items-center justify-center rounded transition-all cursor-pointer shrink-0 ${
                  isSearchOpen || searchQuery 
                    ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-bold' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <Search size={14} />
              </button>
            </div>
          ) : (
            /* Bulk Mode Action Buttons */
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={handleBulkDelete}
                title="Delete Selected Templates"
                aria-label="Delete Selected Templates"
                className="w-6.5 h-6.5 flex items-center justify-center rounded text-rose-500 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Trash2 size={14} />
              </button>

              <button
                type="button"
                onClick={handleBulkToggleVisibility}
                title="Toggle Visibility for Selected"
                aria-label="Toggle Visibility for Selected"
                className="w-6.5 h-6.5 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Eye size={14} />
              </button>

              <span className="text-[11px] font-medium text-[var(--accent-primary)] truncate ml-1">
                {selectedTemplateIds.length} selected
              </span>
            </div>
          )}

          {/* Right Controls: Show/Hide Hidden + Bulk Toggle */}
          <div className="flex items-center gap-1 ml-auto shrink-0">
            <button
              type="button"
              onClick={toggleShowHidden}
              title={showHidden ? 'Hide hidden templates' : 'Show hidden templates'}
              aria-label={showHidden ? 'Hide hidden templates' : 'Show hidden templates'}
              className={`w-6.5 h-6.5 flex items-center justify-center rounded transition-all cursor-pointer ${
                showHidden 
                  ? 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]' 
                  : 'text-[var(--text-muted)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            <button
              type="button"
              onClick={toggleBulkMode}
              title={bulkMode ? 'Exit Selection Mode' : 'Enter Selection Mode'}
              aria-label={bulkMode ? 'Exit Selection Mode' : 'Enter Selection Mode'}
              className={`w-6.5 h-6.5 flex items-center justify-center rounded transition-all cursor-pointer ${
                bulkMode 
                  ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-bold' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
            </button>
          </div>
        </div>

        {/* Conditional Animated Search Bar Row */}
        {(isSearchOpen || searchQuery) && (
          <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-2 pointer-events-none" />
              <input
                id="template-search-input"
                name="templateSearch"
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates & variables..."
                className="w-full h-7 pl-8 pr-7 text-xs theme-input rounded focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                title="Close Search"
                className="absolute right-2 top-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Modernized Inline Add / Edit Form (Remains inside the panel, no popup modal) */}
      {showForm && (
        <form 
          onSubmit={handleFormSubmit}
          className="p-3 m-2 border border-[var(--border-primary)] bg-[var(--card-bg)] rounded-lg space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] pb-1 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-[var(--accent-primary)]" />
              <span>{editingId ? 'Edit Template' : 'New Template'}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5 rounded cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div>
            <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-0.5">
              Template Name <span className="text-[var(--status-error)]">*</span>
            </label>
            <input
              id="template-name-input"
              name="templateName"
              type="text"
              required
              autoFocus
              placeholder="e.g. Executive Summary"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-7 px-2.5 text-xs theme-input rounded focus:outline-none"
            />
          </div>

          {editingId && (
            <div>
              <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-0.5">
                Template ID
              </label>
              <input
                id="template-id-input"
                name="templateId"
                type="text"
                placeholder="Unique ID identifier"
                value={formData.id}
                onChange={e => setFormData({ ...formData, id: e.target.value })}
                className="w-full h-7 px-2.5 text-[11px] font-mono theme-input rounded focus:outline-none opacity-80"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-0.5">
                Category
              </label>
              <CategorySelector
                value={formData.category}
                categories={categoriesSummary}
                onChange={val => setFormData({ ...formData, category: val })}
                placeholder="Select Category"
              />
            </div>
            <div>
              <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-0.5">
                Description
              </label>
              <input
                id="template-description-input"
                name="templateDescription"
                type="text"
                placeholder="Optional summary"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-7 px-2.5 text-xs theme-input rounded focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)] mb-1">
              <span className="font-semibold text-[var(--text-secondary)]">Template Content *</span>
              <span className="font-mono text-[9.5px]">Markdown & Macros</span>
            </div>

            {/* Quick-insert dynamic macro chips */}
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              {QUICK_MACRO_TOKENS.map(chip => (
                <button
                  key={chip.token}
                  type="button"
                  onClick={() => handleInsertMacroToken(chip.token)}
                  title={`${chip.description} - Click to insert`}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono bg-[var(--card-secondary-bg)] hover:bg-[var(--accent-container)] text-[var(--text-secondary)] hover:text-[var(--accent-primary)] border border-[var(--border-subtle)] transition-all cursor-pointer shadow-2xs"
                >
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            <textarea
              id="template-content-textarea"
              name="templateContent"
              ref={textareaRef}
              required
              rows={5}
              placeholder="Template content with {{SELECTION}}, {{DATE}}, {{TIME}}, {{CURSOR}} or {{variables}}..."
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              className="w-full p-2.5 text-xs font-mono theme-input rounded focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-[var(--text-muted)]">
              {detectedVars.length > 0 ? `${detectedVars.length} variables detected` : 'Supports {{macro}} & {{prompts}}'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-2.5 h-6.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 h-6.5 text-xs font-medium theme-btn-primary rounded flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Save size={13} />
                <span>{editingId ? 'Update' : 'Add'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Original ContextPad Collapsible Category Accordion List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {sortedCategories.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
            <FileText size={40} className="mx-auto opacity-30" />
            <p className="text-xs font-medium">
              {totalTemplatesCount === 0 
                ? 'No templates in library' 
                : selectedCategoryFilter !== 'All'
                  ? `No templates in "${selectedCategoryFilter}"`
                  : 'No matching templates found'}
            </p>
            {totalTemplatesCount === 0 ? (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="mt-1 px-3 py-1 text-xs text-[var(--accent-primary)] bg-[var(--accent-container)] rounded hover:opacity-90 transition-opacity cursor-pointer font-medium"
              >
                Create your first template
              </button>
            ) : selectedCategoryFilter !== 'All' ? (
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('All')}
                className="mt-1 px-3 py-1 text-xs text-[var(--accent-primary)] bg-[var(--accent-container)] rounded hover:opacity-90 transition-opacity cursor-pointer font-medium"
              >
                Show all categories
              </button>
            ) : null}
          </div>
        ) : (
          sortedCategories.map(category => {
            const items = groupedTemplates[category] || [];
            const isCollapsed = collapsedCategories.includes(category);

            return (
              <div key={category} className="border-b border-[var(--border-subtle)] last:border-b-0">
                {/* ContextPad Collapsible Category Header */}
                <div
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer select-none"
                  onClick={() => toggleCategoryCollapse(category)}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-[var(--text-muted)] shrink-0">
                      {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </span>
                    <span className="font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)] truncate">
                      {category}
                    </span>
                  </div>

                  {/* Right: Reorder arrows + count badge */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => moveCategory(category, 'up')}
                      title="Move Category Up"
                      aria-label="Move Category Up"
                      className="w-4.5 h-4.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors cursor-pointer"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(category, 'down')}
                      title="Move Category Down"
                      aria-label="Move Category Down"
                      className="w-4.5 h-4.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)] transition-colors cursor-pointer"
                    >
                      <ArrowDown size={11} />
                    </button>

                    <span className="min-w-4 h-4 px-1 rounded-full text-[10px] font-semibold bg-[var(--card-bg)] text-[var(--text-muted)] flex items-center justify-center border border-[var(--border-subtle)] ml-1">
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Category Items: Rendered as lighter card containers */}
                {!isCollapsed && (
                  <div className="p-1.5 space-y-1 bg-[var(--sidebar-bg)]">
                    {items.map(template => (
                      <TemplateRowItem
                        key={template.id}
                        template={template}
                        bulkMode={bulkMode}
                        isSelected={selectedTemplateIds.includes(template.id)}
                        isExpanded={expandedTemplateIds.has(template.id)}
                        onToggleExpand={() => handleToggleRowExpand(template.id)}
                        onToggleSelect={toggleSelection}
                        onUseTemplate={handleUseTemplate}
                        onEdit={handleEdit}
                        onDelete={deleteTemplate}
                        onOpenVariableModal={openVariableModal}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
