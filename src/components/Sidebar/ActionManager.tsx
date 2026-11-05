import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronsUpDown, 
  ChevronsDownUp, 
  Trash2, 
  CheckSquare, 
  Square, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Terminal, 
  Play, 
  X, 
  Save, 
  MousePointerClick, 
  Calculator, 
  Code, 
  Power,
  LayoutList,
  LayoutGrid
} from 'lucide-react';
import { useActionStore } from '../../store/actionStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTemplateStore } from '../../store/templateStore';
import { Action } from '../../contracts/data_shapes';
import { FormulaEngine, getFormulaFunctionsByCategory, FormulaFunctionInfo } from '../../services/formulaParser';
import { CategorySelector } from './TemplateManager/CategorySelector';
import { ActionRowItem } from './ActionManager/ActionRowItem';
import { ActionCardItem } from './ActionManager/ActionCardItem';
import { useSettingsStore } from '../../store/settingsStore';
import { CategoryManagerModal } from '../Common/CategoryManagerModal';
import { useConfirmStore } from '../../store/confirmStore';
import { useRuntimeBridge, getSelectionText } from '../../adapters';
import { executeActionById } from '../../services/actionExecutor';

export const ActionManager: React.FC = () => {
  const bridge = useRuntimeBridge();
  const {
    actions,
    collapsedCategories,
    toggleCategoryCollapse,
    collapseAllCategories,
    expandAllCategories,
    moveCategory,
    showHidden,
    toggleShowHidden,
    bulkMode,
    toggleBulkMode,
    selectedActionIds,
    toggleSelection,
    clearSelection,
    createAction,
    updateAction,
    renameActionId,
    deleteAction,
    deleteActionsBulk,
    toggleActionEnabled,
    toggleActionsEnabledBulk,
    executeAction,
    isRunningAction,
    addCategory,
    renameCategory,
    deleteCategory,
    getAllCategories
  } = useActionStore();

  const { showConfirm } = useConfirmStore();
  const { tabs, activeTabId, updateTabContent, createTab, insertTextAtCursor } = useTabStore();
  const { templates, getVisibleTemplates, openVariableModal } = useTemplateStore();
  const { addNotification } = useNotificationStore();
  const { settings, setActionViewMode } = useSettingsStore();
  const actionViewMode = settings.actionViewMode || 'list';

  // Category Manager modal state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Category filter state
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement>(null);

  // Modernized in-panel form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'GENERAL',
    type: 'command' as 'button' | 'command',
    codeType: 'javascript' as 'formula' | 'javascript',
    code: '',
    selectionBehavior: 'auto' as 'auto' | 'replace' | 'insert',
    enabled: true
  });

  // Formula builder state
  const [selectedFormulaCategory, setSelectedFormulaCategory] = useState<string>('');
  const [selectedFormulaFunction, setSelectedFormulaFunction] = useState<string>('');

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Formula functions grouped by category
  const formulaFunctionsByCategory = useMemo(() => getFormulaFunctionsByCategory(), []);
  const formulaCategories = Object.keys(formulaFunctionsByCategory).sort();
  const functionsInSelectedCategory: FormulaFunctionInfo[] = selectedFormulaCategory 
    ? formulaFunctionsByCategory[selectedFormulaCategory] || [] 
    : [];

  const selectedFunctionInfo = useMemo(() => {
    if (!selectedFormulaFunction) return null;
    for (const fns of Object.values(formulaFunctionsByCategory)) {
      const found = fns.find(f => f.name === selectedFormulaFunction);
      if (found) return found;
    }
    return null;
  }, [selectedFormulaFunction, formulaFunctionsByCategory]);

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

  const allCategories = useMemo(() => getAllCategories(), [actions, getAllCategories]);

  // Filter actions based on search, category filter, and showHidden
  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      if (!showHidden && action.enabled === false) return false;
      if (selectedCategoryFilter !== 'All' && action.category !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = action.name.toLowerCase().includes(q);
        const matchesDesc = (action.description || '').toLowerCase().includes(q);
        const matchesCat = (action.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [actions, showHidden, selectedCategoryFilter, searchQuery]);

  // Group filtered actions by category, respecting category ordering and normalizing case
  const groupedActions = useMemo(() => {
    const groups = new Map<string, { displayName: string; actions: Action[] }>();

    // Initialize all existing categories so order is preserved
    allCategories.forEach(cat => {
      groups.set(cat.name.toUpperCase(), { displayName: cat.name, actions: [] });
    });

    filteredActions.forEach(action => {
      const rawCat = action.category || 'General';
      const key = rawCat.toUpperCase();
      if (!groups.has(key)) {
        groups.set(key, { displayName: rawCat, actions: [] });
      }
      groups.get(key)!.actions.push(action);
    });

    // Remove empty categories when filtering by search or category
    return Array.from(groups.values())
      .filter(g => g.actions.length > 0)
      .map(g => [g.displayName, g.actions] as [string, Action[]]);
  }, [filteredActions, allCategories]);

  const areAllCategoriesCollapsed = useMemo(() => {
    if (groupedActions.length === 0) return false;
    return groupedActions.every(([catName]) => 
      collapsedCategories.some(c => c.toLowerCase() === catName.toLowerCase())
    );
  }, [groupedActions, collapsedCategories]);

  // Toggle expand / collapse all categories
  const handleToggleAllCategories = () => {
    if (areAllCategoriesCollapsed) {
      expandAllCategories();
    } else {
      collapseAllCategories();
    }
  };

  // Execution handler
  const handleRunAction = async (action: Action) => {
    if (action.type === 'button') {
      if (!activeTab) {
        addNotification('No Active Document', 'Open or create a tab first', 'warning');
        return;
      }
      insertTextAtCursor(activeTab.id, `[[action:${action.id}]]`);
      addNotification('Button Inserted', `Inserted widget for "${action.name}"`, 'success');
      return;
    }

    await executeActionById(action.id);
  };

  // Open Form for Adding New Action
  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      id: '',
      name: '',
      description: '',
      category: selectedCategoryFilter !== 'All' ? selectedCategoryFilter : 'GENERAL',
      type: 'command',
      codeType: 'javascript',
      code: '',
      selectionBehavior: 'auto',
      enabled: true
    });
    setSelectedFormulaCategory('');
    setSelectedFormulaFunction('');
    setShowForm(true);
  };

  // Open Form for Editing Existing Action
  const handleEdit = (action: Action) => {
    const isFormula = action.code.startsWith('FORMULA:');
    setEditingId(action.id);
    setFormData({
      id: action.id,
      name: action.name,
      description: action.description || '',
      category: action.category || 'GENERAL',
      type: action.type || 'command',
      codeType: isFormula ? 'formula' : 'javascript',
      code: isFormula ? action.code.slice(8) : action.code,
      selectionBehavior: action.selectionBehavior || 'auto',
      enabled: action.enabled !== false
    });
    setSelectedFormulaCategory('');
    setSelectedFormulaFunction('');
    setShowForm(true);
  };

  // Synchronize external trigger (from menu or command palette) with in-panel form
  const editingAction = useActionStore(s => s.editingAction);
  const isActionEditorOpen = useActionStore(s => s.isActionEditorOpen);

  useEffect(() => {
    if (editingAction) {
      handleEdit(editingAction);
      useActionStore.getState().closeActionEditor();
    } else if (isActionEditorOpen) {
      handleOpenAddForm();
      useActionStore.getState().closeActionEditor();
    }
  }, [editingAction, isActionEditorOpen]);

  // Save or Update Action
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      addNotification('Validation Error', 'Name and code are required', 'warning');
      return;
    }

    const codeToStore = formData.codeType === 'formula' 
      ? (formData.code.startsWith('FORMULA:') ? formData.code : `FORMULA:${formData.code}`) 
      : formData.code;

    if (editingId) {
      if (formData.id && formData.id !== editingId) {
        const renamed = renameActionId(editingId, formData.id);
        if (!renamed) {
          addNotification('ID Conflict', 'An action with this ID already exists', 'error');
          return;
        }
      }

      updateAction(formData.id || editingId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.trim().toUpperCase(),
        type: formData.type,
        codeType: formData.codeType,
        code: codeToStore,
        selectionBehavior: formData.selectionBehavior,
        enabled: formData.enabled
      });
      addNotification('Action Updated', `Updated "${formData.name}"`, 'success');
    } else {
      createAction({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category.trim().toUpperCase(),
        type: formData.type,
        codeType: formData.codeType,
        code: codeToStore,
        selectionBehavior: formData.selectionBehavior,
        enabled: formData.enabled
      });
      addNotification('Action Created', `Created "${formData.name}"`, 'success');
    }

    setShowForm(false);
    setEditingId(null);
  };

  // Apply Formula from Formula Builder
  const handleApplyFormula = () => {
    if (!selectedFormulaFunction) return;
    const isTransform = /^(UPPER|LOWER|TITLE|TRIM|REVERSE|CAMEL|PASCAL|SNAKE|KEBAB|CONSTANT|BOLD|ITALIC|STRIKE|CODE|CODEBLOCK|QUOTE|HEADING|LINK|PARENTHESES|BRACKETS|BRACES|ANGLES|SINGLEQUOTE|DOUBLEQUOTE|SORT|SORTDESC|UNIQUE|NUMBERLIST|BULLETLIST|CHECKLIST|INDENT|UNINDENT|WRAP|PREFIX|SUFFIX|PAD|REPLACE)$/i.test(selectedFormulaFunction);
    const formulaStr = isTransform ? `${selectedFormulaFunction}(selection)` : `${selectedFormulaFunction}()`;
    setFormData(prev => ({
      ...prev,
      code: formulaStr,
      name: prev.name || selectedFunctionInfo?.description || selectedFormulaFunction,
      description: prev.description || `Executes ${selectedFormulaFunction} formula`
    }));
  };

  // Quick Add Template into JavaScript
  const handleQuickAddTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const escaped = template.content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const snippet = `// Insert template: ${template.name}\napi.insertAtCursor(\`${escaped}\`);\n`;
    setFormData(prev => ({
      ...prev,
      name: prev.name || `Insert ${template.name}`,
      description: prev.description || `Inserts the "${template.name}" template`,
      code: prev.code ? `${prev.code}\n${snippet}` : snippet,
      category: prev.category === 'GENERAL' ? template.category : prev.category
    }));
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedActionIds.length === 0) return;
    const count = selectedActionIds.length;
    showConfirm({
      title: `Delete ${count} Actions`,
      message: `Are you sure you want to delete ${count} selected action script(s)? This action cannot be undone.`,
      confirmLabel: `Delete ${count} Actions`,
      variant: 'danger',
      onConfirm: () => {
        deleteActionsBulk(selectedActionIds);
        clearSelection();
        addNotification('Bulk Delete', `Deleted ${count} action(s)`, 'success');
      }
    });
  };

  const handleDeleteAction = (id: string, name?: string) => {
    showConfirm({
      title: 'Delete Action Script',
      message: `Are you sure you want to delete action "${name || id}"? This action cannot be undone.`,
      confirmLabel: 'Delete Action',
      variant: 'danger',
      onConfirm: () => {
        deleteAction(id);
        addNotification('Action Deleted', name || id, 'info');
      }
    });
  };

  const handleBulkToggleEnabled = () => {
    if (selectedActionIds.length === 0) return;
    const selectedIdSet = new Set(selectedActionIds);
    const selectedActions = actions.filter(a => selectedIdSet.has(a.id));
    const anyDisabled = selectedActions.some(a => a.enabled === false);
    toggleActionsEnabledBulk(selectedActionIds, anyDisabled);
    addNotification('Bulk Status', `${anyDisabled ? 'Enabled' : 'Disabled'} ${selectedActionIds.length} action(s)`, 'info');
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Action Controls Toolbar */}
      <div className="p-2 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/60 flex items-center justify-between gap-1 shrink-0">
        {/* Left Toolbar Items: Add New, Search Toggle, Category Filter, Expand/Collapse All */}
        <div className="flex items-center gap-1">
          {/* New Action Toggle */}
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingId(null);
              } else {
                handleOpenAddForm();
              }
            }}
            title={showForm ? "Cancel New Action" : "New Action"}
            aria-label={showForm ? "Cancel New Action" : "New Action"}
            className={`w-6 h-6 rounded flex items-center justify-center transition-all shadow-2xs cursor-pointer ${
              showForm 
                ? 'bg-[var(--accent-primary)] text-white' 
                : 'theme-btn-primary active:scale-95'
            }`}
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>

          {/* Search Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(prev => !prev);
              if (isSearchOpen) setSearchQuery('');
            }}
            title={isSearchOpen ? "Close Search" : "Search Actions"}
            aria-label={isSearchOpen ? "Close Search" : "Search Actions"}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              isSearchOpen || searchQuery
                ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Category Filter Dropdown Button */}
          <div className="relative" ref={categoryFilterRef}>
            <button
              type="button"
              onClick={() => setIsCategoryFilterOpen(prev => !prev)}
              title={`Filter by category (${selectedCategoryFilter})`}
              aria-label={`Filter by category (${selectedCategoryFilter})`}
              className={`h-6 px-1.5 flex items-center gap-1 rounded text-[11px] transition-colors cursor-pointer ${
                selectedCategoryFilter !== 'All'
                  ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span className="max-w-[70px] truncate">{selectedCategoryFilter}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-70" />
            </button>

            {/* Category Filter Dropdown Menu */}
            {isCategoryFilterOpen && (
              <div className="absolute left-0 top-7 z-50 min-w-[140px] max-h-56 overflow-y-auto rounded-md shadow-lg border border-[var(--border-primary)] bg-[var(--card-bg)] p-1 animate-in fade-in duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('All');
                    setIsCategoryFilterOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer ${
                    selectedCategoryFilter === 'All'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium'
                      : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">{actions.length}</span>
                </button>
                <div className="h-px bg-[var(--border-subtle)] my-1" />
                {allCategories.map(cat => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.name);
                      setIsCategoryFilterOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between cursor-pointer ${
                      selectedCategoryFilter === cat.name
                        ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0 ml-2">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expand / Collapse All Categories Button */}
          <button
            type="button"
            onClick={handleToggleAllCategories}
            title={areAllCategoriesCollapsed ? "Expand all categories" : "Collapse all categories"}
            aria-label={areAllCategoriesCollapsed ? "Expand all categories" : "Collapse all categories"}
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            {areAllCategoriesCollapsed ? (
              <ChevronsUpDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronsDownUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Right Toolbar Items: Bulk Mode, Show/Hide Disabled */}
        <div className="flex items-center gap-1">
          {/* View Mode Toggle: List vs Card Grid */}
          <button
            type="button"
            onClick={() => setActionViewMode(actionViewMode === 'grid' ? 'list' : 'grid')}
            title={actionViewMode === 'grid' ? 'Switch to Detailed List View' : 'Switch to Cards Grid View'}
            aria-label={actionViewMode === 'grid' ? 'Switch to Detailed List View' : 'Switch to Cards Grid View'}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              actionViewMode === 'grid'
                ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            {actionViewMode === 'grid' ? <LayoutGrid size={14} /> : <LayoutList size={14} />}
          </button>

          {/* Bulk Mode Toggle */}
          <button
            type="button"
            onClick={toggleBulkMode}
            title={bulkMode ? "Exit Bulk Selection" : "Bulk Select Mode"}
            aria-label={bulkMode ? "Exit Bulk Selection" : "Bulk Select Mode"}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              bulkMode
                ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            {bulkMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          </button>

          {/* Show / Hide Disabled Toggle */}
          <button
            type="button"
            onClick={toggleShowHidden}
            title={showHidden ? "Hide Disabled Actions" : "Show Disabled Actions"}
            aria-label={showHidden ? "Hide Disabled Actions" : "Show Disabled Actions"}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              showHidden
                ? 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                : 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
            }`}
          >
            {showHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Bulk Action Header Bar (when active) */}
      {bulkMode && (
        <div className="px-3 py-1.5 bg-[var(--accent-container)]/30 border-b border-[var(--border-primary)] flex items-center justify-between animate-in fade-in duration-150 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--accent-primary)]">
              {selectedActionIds.length} selected
            </span>
            {selectedActionIds.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={selectedActionIds.length === 0}
              onClick={handleBulkToggleEnabled}
              title="Toggle Enable/Disable"
              aria-label="Toggle Enable/Disable"
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={selectedActionIds.length === 0}
              onClick={handleBulkDelete}
              title="Delete Selected"
              aria-label="Delete Selected"
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--card-hover-bg)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Expandable Search Bar */}
      {isSearchOpen && (
        <div className="p-2 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/40 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="relative">
            <Search className="w-3 h-3 text-[var(--text-muted)] absolute left-2.5 top-2" />
            <input
              id="action-search-input"
              name="actionSearch"
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search actions by name, category, or script..."
              className="w-full h-7 pl-7 pr-7 text-xs theme-input rounded focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inline Modernized Add/Edit Form (No modal!) */}
      {showForm && (
        <form 
          onSubmit={handleSaveForm}
          className="p-3 border-b border-[var(--border-primary)] bg-[var(--card-bg)] space-y-2.5 shadow-inner animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs text-[var(--accent-primary)] flex items-center gap-1">
              <Terminal className="w-3.5 h-3.5" />
              {editingId ? 'Edit Action' : 'Create New Action'}
            </span>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Type Selector: Command vs Button */}
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'command' }))}
              className={`h-6 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                formData.type === 'command'
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Terminal className="w-3 h-3" /> Command
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'button' }))}
              className={`h-6 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                formData.type === 'button'
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <MousePointerClick className="w-3 h-3" /> Button
            </button>
          </div>

          {/* Code Type Selector: Formula vs JavaScript */}
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, codeType: 'formula' }))}
              className={`h-6 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                formData.codeType === 'formula'
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calculator className="w-3 h-3" /> Formula
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, codeType: 'javascript' }))}
              className={`h-6 text-[11px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                formData.codeType === 'javascript'
                  ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code className="w-3 h-3" /> JavaScript
            </button>
          </div>

          {/* Formula Builder (when formula is selected) */}
          {formData.codeType === 'formula' && (
            <div className="p-2 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                Formula Builder
              </span>
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={selectedFormulaCategory}
                  onChange={e => {
                    setSelectedFormulaCategory(e.target.value);
                    setSelectedFormulaFunction('');
                  }}
                  className="h-6 px-1.5 text-xs theme-input rounded bg-[var(--card-bg)] text-[var(--text-primary)] cursor-pointer"
                >
                  <option value="">Category...</option>
                  {formulaCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <select
                  disabled={!selectedFormulaCategory}
                  value={selectedFormulaFunction}
                  onChange={e => setSelectedFormulaFunction(e.target.value)}
                  className="h-6 px-1.5 text-xs theme-input rounded bg-[var(--card-bg)] text-[var(--text-primary)] disabled:opacity-40 cursor-pointer"
                >
                  <option value="">Function...</option>
                  {functionsInSelectedCategory.map(fn => (
                    <option key={fn.name} value={fn.name}>{fn.name}</option>
                  ))}
                </select>
              </div>

              {selectedFunctionInfo && (
                <div className="text-[10.5px] text-[var(--text-secondary)] space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                  <p>{selectedFunctionInfo.description}</p>
                  <div className="flex items-center justify-between gap-1">
                    <code className="text-[10px] font-mono text-[var(--accent-primary)]">
                      {selectedFunctionInfo.example}
                    </code>
                    <button
                      type="button"
                      onClick={handleApplyFormula}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer"
                    >
                      Apply {selectedFunctionInfo.name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Add Template (when javascript is selected) */}
          {formData.codeType === 'javascript' && (
            <div className="p-1.5 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[10.5px] text-[var(--text-muted)] shrink-0">Quick Add Template:</span>
              <select
                onChange={e => {
                  if (e.target.value) {
                    handleQuickAddTemplate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="h-6 px-1.5 text-xs theme-input rounded bg-[var(--card-bg)] text-[var(--text-primary)] flex-1 cursor-pointer truncate"
              >
                <option value="">Select template snippet...</option>
                {getVisibleTemplates().map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name Input */}
          <input
            id="action-name-input"
            name="actionName"
            type="text"
            placeholder="Action Name..."
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full h-7 px-2 text-xs theme-input rounded focus:outline-none"
          />

          {/* Description Textarea */}
          <textarea
            id="action-description-textarea"
            name="actionDescription"
            rows={2}
            placeholder="Description (optional summary)..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 text-xs theme-input rounded focus:outline-none resize-y"
          />

          {/* Category Selector */}
          <CategorySelector
            value={formData.category}
            categories={allCategories}
            onChange={val => setFormData({ ...formData, category: val })}
            onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
            placeholder="Select Category"
          />

          {/* Selection Behavior */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
              <span>Selection Behavior</span>
              <span className="text-[9px] font-normal normal-case text-[var(--text-muted)]">
                {formData.selectionBehavior === 'auto' ? 'Auto detect' : formData.selectionBehavior === 'replace' ? 'Replaces text' : 'Keeps text'}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-[var(--card-secondary-bg)] rounded border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, selectionBehavior: 'auto' }))}
                className={`h-6 text-[10.5px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                  formData.selectionBehavior === 'auto'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Auto: Replaces if selection is transformed, inserts if new content"
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, selectionBehavior: 'replace' }))}
                className={`h-6 text-[10.5px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                  formData.selectionBehavior === 'replace'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Replace: Always replaces highlighted text with result"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, selectionBehavior: 'insert' }))}
                className={`h-6 text-[10.5px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                  formData.selectionBehavior === 'insert'
                    ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-2xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Insert: Inserts next to selection without removing highlighted text"
              >
                Insert
              </button>
            </div>
          </div>

          {/* Code Textarea */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
              <span>{formData.codeType === 'formula' ? 'Formula Expression' : 'JavaScript Code'}</span>
              <span className="text-[9px] font-normal normal-case text-[var(--text-muted)]">
                {formData.codeType === 'formula' ? 'e.g. UPPER(selection)' : 'Safe sandbox: api.insertAtCursor(text)'}
              </span>
            </label>
            <textarea
              id="action-code-textarea"
              name="actionCode"
              rows={5}
              placeholder={formData.codeType === 'formula' ? 'UPPER(selection)' : '// Action JavaScript\napi.insertAtCursor("Hello world!");'}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value })}
              className="w-full p-2 text-xs font-mono theme-input rounded focus:outline-none resize-y"
            />
          </div>

          {/* Action Buttons: Save / Cancel */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-2.5 py-1 text-xs rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs font-medium rounded theme-btn-primary flex items-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {editingId ? 'Update Action' : 'Save Action'}
            </button>
          </div>
        </form>
      )}

      {/* Main Collapsible Category Accordion List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {groupedActions.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)] space-y-2">
            <Terminal className="w-8 h-8 mx-auto opacity-30 text-[var(--text-muted)]" />
            <p className="font-medium text-xs">No actions found</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {searchQuery ? 'Try adjusting your search filter' : 'Create an action to automate workflows'}
            </p>
          </div>
        ) : (
          groupedActions.map(([categoryName, categoryActions], index) => {
            const isCollapsed = collapsedCategories.some(c => c.toLowerCase() === categoryName.toLowerCase());
            const isFirst = index === 0;
            const isLast = index === groupedActions.length - 1;

            return (
              <div 
                key={categoryName}
                className="rounded-lg border border-[var(--border-primary)] bg-[var(--card-secondary-bg)]/40 overflow-hidden shadow-2xs"
              >
                {/* Category Header */}
                <div 
                  className="flex items-center justify-between px-2.5 py-1.5 bg-[var(--card-bg)]/80 hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer select-none group border-b border-[var(--border-subtle)]"
                  onClick={() => toggleCategoryCollapse(categoryName)}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className="font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] truncate">
                      {categoryName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0">
                      {categoryActions.length}
                    </span>
                  </div>

                  {/* Move Category Up / Down controls */}
                  <div 
                    className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveCategory(categoryName, 'up')}
                      title="Move category up"
                      aria-label="Move category up"
                      className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveCategory(categoryName, 'down')}
                      title="Move category down"
                      aria-label="Move category down"
                      className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Category Action Rows */}
                {!isCollapsed && (
                  actionViewMode === 'grid' ? (
                    <div className="p-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[var(--sidebar-bg)]/50">
                      {categoryActions.map(action => (
                        <ActionCardItem
                          key={action.id}
                          action={action}
                          bulkMode={bulkMode}
                          isSelected={selectedActionIds.includes(action.id)}
                          onToggleSelect={toggleSelection}
                          onRunAction={handleRunAction}
                          onEdit={handleEdit}
                          onDelete={(actionId) => handleDeleteAction(actionId, action.name)}
                          onToggleEnabled={toggleActionEnabled}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-1.5 space-y-1.5 bg-[var(--sidebar-bg)]/50">
                      {categoryActions.map(action => (
                        <ActionRowItem
                          key={action.id}
                          action={action}
                          bulkMode={bulkMode}
                          isSelected={selectedActionIds.includes(action.id)}
                          onToggleSelect={toggleSelection}
                          onRunAction={handleRunAction}
                          onEdit={handleEdit}
                          onDelete={(actionId) => handleDeleteAction(actionId, action.name)}
                          onToggleEnabled={toggleActionEnabled}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })
        )}
      </div>

      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        title="Manage Action Categories"
        categories={allCategories}
        onAddCategory={addCategory}
        onRenameCategory={renameCategory}
        onDeleteCategory={deleteCategory}
      />
    </div>
  );
};
