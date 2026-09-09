import React, { useState, useMemo } from 'react';
import { 
  Terminal, 
  Play, 
  Plus, 
  Search, 
  Trash2, 
  Copy, 
  Power, 
  Code,
  Download,
  Upload
} from 'lucide-react';
import { useActionStore } from '../../store/actionStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTemplateStore } from '../../store/templateStore';
import { FormulaEngine } from '../../services/formulaParser';
import { Action } from '../../types';

export const ActionManager: React.FC = () => {
  const { 
    actions, 
    searchQuery, 
    setSearchQuery, 
    selectedCategory, 
    setSelectedCategory,
    openActionEditor,
    deleteAction,
    duplicateAction,
    toggleActionEnabled,
    executeAction,
    isRunningAction,
    exportActions,
    importActions
  } = useActionStore();

  const { tabs, activeTabId, updateTabContent, createTab, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();
  const { openVariableModal } = useTemplateStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const categories = useMemo(() => {
    const set = new Set(actions.map(a => a.category));
    return ['All', ...Array.from(set)];
  }, [actions]);

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const matchCat = selectedCategory === 'All' || a.category === selectedCategory;
      const matchSearch = !searchQuery || 
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        a.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [actions, selectedCategory, searchQuery]);

  const handleRunAction = async (action: Action) => {
    if (!activeTab) {
      addNotification('No Active Document', 'Open or create a tab first', 'warning');
      return;
    }

    const formulaEngine = new FormulaEngine({
      lineCount: activeTab.content.split('\n').length,
      charCount: activeTab.content.length,
      wordCount: (activeTab.content.trim().match(/\S+/g) || []).length
    });

    const executionContext = {
      getText: () => activeTab.content,
      setText: (newText: string) => updateTabContent(activeTab.id, newText),
      getSelection: () => {
        const selection = window.getSelection()?.toString();
        return selection || '';
      },
      replaceSelection: (replacement: string) => {
        const selection = window.getSelection()?.toString();
        if (selection && activeTab.content.includes(selection)) {
          updateTabContent(activeTab.id, activeTab.content.replace(selection, replacement));
        } else {
          insertTextAtCursor(activeTab.id, replacement);
        }
      },
      insertText: (text: string) => {
        insertTextAtCursor(activeTab.id, text);
      },
      getCursor: () => ({ line: activeTab.cursorLine || 1, col: activeTab.cursorCol || 1 }),
      setCursor: (_line: number, _col: number) => {},
      toast: (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        addNotification(action.name, msg, type);
      },
      copyToClipboard: async (text: string) => {
        await navigator.clipboard.writeText(text);
        addNotification('Copied', 'Text copied to clipboard', 'success');
      },
      getClipboard: async () => {
        try {
          return await navigator.clipboard.readText();
        } catch {
          return '';
        }
      },
      openTab: (title: string, content: string, language = 'markdown') => {
        createTab(title, content, language as any);
      },
      openVariableModal: () => {
        openVariableModal();
      },
      evaluateFormula: (formula: string) => {
        const res = formulaEngine.evaluate(formula);
        return res.success ? res.value : null;
      }
    };

    await executeAction(action.id, executionContext);
  };

  const handleExport = () => {
    const json = exportActions();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextpad-actions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification('Export Complete', 'Actions JSON downloaded', 'success');
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
        const count = importActions(json);
        addNotification('Actions Imported', `Successfully imported ${count} action(s)`, 'success');
      } catch (err: any) {
        addNotification('Import Error', 'Invalid JSON file', 'error');
      }
    };
    input.click();
  };

  return (
    <div className="theme-sidebar flex flex-col h-full text-xs select-none">
      {/* Header & Controls */}
      <div className="p-3 border-b border-[var(--border-primary)] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px] flex items-center gap-1.5">
            Actions
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleImport}
              title="Import Actions JSON"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExport}
              title="Export Actions JSON"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => openActionEditor(null)}
              className="px-2 py-0.5 theme-btn-primary rounded font-medium flex items-center gap-1 transition-colors text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
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
            placeholder="Search actions & scripts..."
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

      {/* Action Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredActions.length === 0 ? (
          <div className="p-6 text-center text-[var(--text-muted)]">
            <Terminal className="w-6 h-6 mx-auto mb-2 opacity-40 text-[var(--text-muted)]" />
            <p>No actions found</p>
          </div>
        ) : (
          filteredActions.map(action => (
            <div
              key={action.id}
              className={`theme-card p-2.5 rounded transition-all space-y-2 group shadow-xs ${
                action.enabled ? '' : 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                    <span className="truncate">{action.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-[var(--card-secondary-bg)] text-[var(--accent-primary)] border border-[var(--border-primary)] rounded font-mono font-medium">
                      {action.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5">{action.description}</p>
                </div>

                <button
                  onClick={() => toggleActionEnabled(action.id)}
                  title={action.enabled ? 'Enabled' : 'Disabled'}
                  className={`p-1 rounded transition-colors ${
                    action.enabled ? 'text-[var(--status-success)] hover:bg-[var(--card-hover-bg)]' : 'text-[var(--text-muted)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Execution and Editor buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-primary)] text-[11px]">
                <button
                  onClick={() => handleRunAction(action)}
                  disabled={!action.enabled || isRunningAction}
                  className={`px-2.5 py-0.5 rounded font-medium flex items-center gap-1.5 transition-all shadow-xs ${
                    action.enabled 
                      ? 'theme-btn-primary cursor-pointer active:scale-95' 
                      : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute</span>
                </button>

                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openActionEditor(action)}
                    title="Edit Script Code"
                    className="p-1 hover:text-[var(--text-primary)] rounded"
                  >
                    <Code className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => duplicateAction(action.id)}
                    title="Duplicate Action"
                    className="p-1 hover:text-[var(--text-primary)] rounded"
                  >
                    <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => deleteAction(action.id)}
                    title="Delete Action"
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
