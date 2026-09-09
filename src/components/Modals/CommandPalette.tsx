import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  FileText, 
  Terminal, 
  Workflow, 
  Settings, 
  Plus, 
  Save, 
  Calculator, 
  LayoutTemplate, 
  ListTree, 
  X, 
  Eye, 
  Code2,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useRibbonStore } from '../../store/ribbonStore';
import { useRuntimeBridge } from '../../adapters';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Commands' | 'Templates' | 'Actions' | 'Workflows' | 'Tabs';
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const bridge = useRuntimeBridge();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { tabs, activeTabId, setActiveTabId, createTab, saveCurrentTab } = useTabStore();
  const { templates, openVariableModal } = useTemplateStore();
  const { actions } = useActionStore();
  const { workflows } = useWorkflowStore();
  const { settings, toggleSidebar, toggleActivityBar, togglePreview, toggleEditorMode, setActiveSidebarTab } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isRendered = (settings.editorMode || 'rendered') === 'rendered';

  // Build items catalog
  const items: PaletteItem[] = [
    // Commands
    {
      id: 'cmd-toggle-editor-mode',
      title: isRendered ? 'Switch to Raw Markdown Mode' : 'Switch to Live Rendered Markdown Mode',
      subtitle: isRendered ? 'Show all raw syntax everywhere (Ctrl+M)' : 'Render formatted elements when cursor leaves row (Ctrl+M)',
      category: 'Commands',
      icon: isRendered ? Code2 : Eye,
      action: () => {
        toggleEditorMode();
        addNotification('Editor Mode', isRendered ? 'Switched to Raw Markdown' : 'Switched to Live Rendered Markdown', 'info');
      }
    },
    {
      id: 'cmd-new-tab',
      title: 'New Document Tab',
      subtitle: 'Create a blank markdown document (Ctrl+N)',
      category: 'Commands',
      icon: Plus,
      action: () => createTab()
    },
    {
      id: 'cmd-new-window',
      title: 'New Window',
      subtitle: 'Open a new ContextPad instance window (Ctrl+Shift+N)',
      category: 'Commands',
      icon: ExternalLink,
      action: async () => {
        try {
          await bridge.window.newWindow();
          addNotification('New Window', 'Opened new ContextPad window', 'info');
        } catch {
          addNotification('New Window', 'New window requested', 'info');
        }
      }
    },
    {
      id: 'cmd-save',
      title: 'Save Active Document',
      subtitle: 'Persist current document to IndexedDB',
      category: 'Commands',
      icon: Save,
      action: () => {
        saveCurrentTab();
        addNotification('Saved', 'Document saved', 'success');
      }
    },
    {
      id: 'cmd-var-modal',
      title: 'Fill Template Variables',
      subtitle: 'Scan document for {{placeholders}} and fill in values',
      category: 'Commands',
      icon: LayoutTemplate,
      action: () => openVariableModal()
    },
    {
      id: 'cmd-toggle-sidebar',
      title: 'Toggle Secondary Sidebar',
      subtitle: 'Show or hide the secondary utility sidebar panel',
      category: 'Commands',
      icon: ListTree,
      action: () => toggleSidebar()
    },
    {
      id: 'cmd-open-settings',
      title: 'Open Workspace Settings',
      subtitle: 'Configure themes, editor modes, font size, and AI budgets',
      category: 'Commands',
      icon: Settings,
      action: () => {
        setActiveSidebarTab('settings');
      }
    },
    {
      id: 'cmd-customize-formatting',
      title: 'Customize Markdown Formatting Buttons',
      subtitle: 'Add, remove, reorder, or create custom syntax formatting buttons',
      category: 'Commands',
      icon: SlidersHorizontal,
      action: () => {
        useFormattingStore.getState().openCustomizer();
      }
    },
    {
      id: 'cmd-customize-ribbon',
      title: 'Customize Modular Ribbon',
      subtitle: 'Add, remove, and arrange buttons in the top modular action ribbon',
      category: 'Commands',
      icon: SlidersHorizontal,
      action: () => {
        useRibbonStore.getState().openCustomizer();
      }
    },
    // Tabs list
    ...tabs.map(t => ({
      id: `tab-${t.id}`,
      title: `Switch to Tab: ${t.title}`,
      subtitle: `Open document (${t.language})`,
      category: 'Tabs' as const,
      icon: FileText,
      action: () => setActiveTabId(t.id)
    })),
    // Templates
    ...templates.map(tmpl => ({
      id: `tmpl-${tmpl.id}`,
      title: `Insert Template: ${tmpl.name}`,
      subtitle: tmpl.description,
      category: 'Templates' as const,
      icon: Sparkles,
      action: () => {
        const tab = tabs.find(t => t.id === activeTabId);
        if (tab) {
          useTabStore.getState().insertTextAtCursor(tab.id, tmpl.content);
          addNotification('Template Inserted', tmpl.name, 'success');
        }
      }
    })),
    // Actions
    ...actions.map(act => ({
      id: `act-${act.id}`,
      title: `Run Action: ${act.name}`,
      subtitle: act.description,
      category: 'Actions' as const,
      icon: Terminal,
      action: () => {
        useActionStore.getState().executeAction(act.id, {} as any);
      }
    })),
    // Workflows
    ...workflows.map(wf => ({
      id: `wf-${wf.id}`,
      title: `Launch Workflow: ${wf.name}`,
      subtitle: `Open ${wf.name} blueprint in a fresh editor tab`,
      category: 'Workflows' as const,
      icon: Workflow,
      action: () => {
        createTab(`${wf.name}.md`, wf.content, 'markdown');
      }
    }))
  ];

  // Filter items
  const filtered = items.filter(item => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q));
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="theme-modal w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search header */}
        <div className="p-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center gap-2.5">
          <Search className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, template, action, or switch tab..."
            className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)] text-xs">
              No matching commands or actions found
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2 rounded flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--accent-primary)] text-white' : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[var(--accent-primary)]'}`} />
                    <div className="truncate">
                      <div className="font-medium text-xs truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ml-2 ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-primary)]'
                  }`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard tips */}
        <div className="p-2 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>ContextPad Quick Switcher</span>
        </div>
      </div>
    </div>
  );
};
