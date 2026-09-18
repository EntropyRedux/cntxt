import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  CornerDownLeft, 
  SlidersHorizontal,
  Plus,
  Save,
  LayoutTemplate,
  ListTree,
  Settings,
  Type,
  FileText,
  Sparkles,
  Terminal,
  Workflow,
  ExternalLink,
  Code2,
  Eye,
  Columns,
  Layers,
  Smartphone,
  Check
} from 'lucide-react';
import { AppIcon } from '../Common/AppIcon';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useRibbonStore } from '../../store/ribbonStore';
import { useRuntimeBridge } from '../../adapters';

export type CommandCategory = 'All' | 'Commands' | 'Workflows' | 'Templates' | 'Actions' | 'Tabs';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Commands' | 'Templates' | 'Actions' | 'Workflows' | 'Tabs';
  icon: string;
  shortcut?: string;
  action: () => void;
}

const CATEGORIES: CommandCategory[] = ['All', 'Commands', 'Workflows', 'Templates', 'Actions', 'Tabs'];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const bridge = useRuntimeBridge();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { tabs, activeTabId, setActiveTabId, createTab, saveCurrentTab } = useTabStore();
  const { templates, openVariableModal } = useTemplateStore();
  const { actions } = useActionStore();
  const { workflows } = useWorkflowStore();
  const { 
    settings, 
    toggleSidebar, 
    toggleActivityBar, 
    togglePreview, 
    toggleEditorMode, 
    setActiveSidebarTab, 
    openFontSelector,
    toggleRibbon,
    toggleMenuBar,
    toggleStatusBar,
    toggleTouchMode
  } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('All');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const isRendered = (settings.editorMode || 'rendered') === 'rendered';

  // Build items catalog
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [
      // Commands
      {
        id: 'cmd-toggle-editor-mode',
        title: isRendered ? 'Switch to Raw Markdown Mode' : 'Switch to Live Rendered Markdown Mode',
        subtitle: isRendered ? 'Show raw syntax markers everywhere' : 'Render formatted elements when cursor leaves row',
        category: 'Commands',
        icon: isRendered ? 'Code2' : 'Eye',
        shortcut: 'Ctrl+M',
        action: () => {
          toggleEditorMode();
          addNotification('Editor Mode', isRendered ? 'Switched to Raw Markdown' : 'Switched to Live Rendered Markdown', 'info');
        }
      },
      {
        id: 'cmd-new-tab',
        title: 'New Document Tab',
        subtitle: 'Create a blank markdown document',
        category: 'Commands',
        icon: 'Plus',
        shortcut: 'Ctrl+N',
        action: () => createTab()
      },
      {
        id: 'cmd-new-window',
        title: 'New ContextPad Window',
        subtitle: 'Open an independent application window',
        category: 'Commands',
        icon: 'ExternalLink',
        shortcut: 'Ctrl+Shift+N',
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
        subtitle: 'Persist current document to local workspace',
        category: 'Commands',
        icon: 'Save',
        shortcut: 'Ctrl+S',
        action: () => {
          saveCurrentTab();
          addNotification('Saved', 'Document saved successfully', 'success');
        }
      },
      {
        id: 'cmd-var-modal',
        title: 'Fill Template Variables',
        subtitle: 'Scan active document for {{placeholders}} and fill in values',
        category: 'Commands',
        icon: 'LayoutTemplate',
        shortcut: 'Alt+V',
        action: () => openVariableModal()
      },
      {
        id: 'cmd-toggle-preview',
        title: settings.showLivePreview ? 'Close Live Preview Pane' : 'Open Live Preview Split Pane',
        subtitle: 'Toggle synchronized side-by-side HTML preview',
        category: 'Commands',
        icon: 'Columns',
        action: () => togglePreview()
      },
      {
        id: 'cmd-toggle-sidebar',
        title: 'Toggle Secondary Sidebar',
        subtitle: 'Show or hide the secondary utility sidebar panel',
        category: 'Commands',
        icon: 'ListTree',
        shortcut: 'Ctrl+B',
        action: () => toggleSidebar()
      },
      {
        id: 'cmd-toggle-ribbon',
        title: settings.showRibbon !== false ? 'Hide Modular Ribbon' : 'Show Modular Ribbon',
        subtitle: 'Toggle visibility of the quick action top ribbon bar',
        category: 'Commands',
        icon: 'PanelTop',
        shortcut: 'Ctrl+Shift+R',
        action: () => toggleRibbon()
      },
      {
        id: 'cmd-toggle-menubar',
        title: (settings.showMenuBar ?? true) ? 'Hide Menu Bar' : 'Show Menu Bar',
        subtitle: 'Toggle visibility of the File, Edit, View, Tools menu bar',
        category: 'Commands',
        icon: 'Menu',
        shortcut: 'Alt+M',
        action: () => toggleMenuBar()
      },
      {
        id: 'cmd-toggle-touch',
        title: settings.touchOptimized ? 'Disable Touch Ergonomics' : 'Enable Touch Ergonomics',
        subtitle: 'Optimize padding, larger hit targets, and mobile accessory buttons',
        category: 'Commands',
        icon: 'Smartphone',
        action: () => {
          toggleTouchMode();
          addNotification('Touch Mode', settings.touchOptimized ? 'Desktop layout restored' : 'Touch ergonomics enabled', 'info');
        }
      },
      {
        id: 'cmd-open-settings',
        title: 'Open Workspace Settings',
        subtitle: 'Configure themes, editor font size, density, and AI parameters',
        category: 'Commands',
        icon: 'Settings',
        action: () => {
          setActiveSidebarTab('settings');
        }
      },
      {
        id: 'cmd-customize-formatting',
        title: 'Customize Markdown Formatting Buttons',
        subtitle: 'Add, remove, reorder, or create custom syntax formatting buttons',
        category: 'Commands',
        icon: 'SlidersHorizontal',
        action: () => {
          useFormattingStore.getState().openCustomizer();
        }
      },
      {
        id: 'cmd-customize-ribbon',
        title: 'Customize Modular Ribbon',
        subtitle: 'Add, remove, and arrange buttons in the top modular action ribbon',
        category: 'Commands',
        icon: 'Sliders',
        action: () => {
          useRibbonStore.getState().openCustomizer();
        }
      },
      {
        id: 'cmd-editor-font-studio',
        title: 'Select Editor Font & Typography Studio',
        subtitle: 'Curated monospace and visual ergonomics fonts for eye comfort',
        category: 'Commands',
        icon: 'Type',
        action: () => {
          openFontSelector();
        }
      },

      // Tabs
      ...tabs.map(t => ({
        id: `tab-${t.id}`,
        title: `Switch to Tab: ${t.title}`,
        subtitle: `${t.language.toUpperCase()} • ${t.filePath ? t.filePath : 'Draft Buffer'}`,
        category: 'Tabs' as const,
        icon: 'FileText',
        action: () => setActiveTabId(t.id)
      })),

      // Workflows
      ...workflows.map(wf => ({
        id: `wf-${wf.id}`,
        title: `Launch Workflow: ${wf.name}`,
        subtitle: `${wf.category || 'Workflows'} • Open blueprint in a fresh editor tab`,
        category: 'Workflows' as const,
        icon: wf.icon || (wf.type === 'bookmark' ? 'Bookmark' : 'Workflow'),
        action: () => {
          createTab(`${wf.name}.md`, wf.content, 'markdown');
          addNotification('Workflow Launched', `Opened "${wf.name}"`, 'success');
        }
      })),

      // Templates
      ...templates.map(tmpl => ({
        id: `tmpl-${tmpl.id}`,
        title: `Insert Template: ${tmpl.name}`,
        subtitle: `${tmpl.category || 'General'} • ${tmpl.description || 'Insert text snippet at cursor'}`,
        category: 'Templates' as const,
        icon: 'Sparkles',
        action: () => {
          const tab = tabs.find(t => t.id === activeTabId);
          if (tab) {
            useTabStore.getState().insertTextAtCursor(tab.id, tmpl.content);
            addNotification('Template Inserted', tmpl.name, 'success');
          } else {
            createTab(`${tmpl.name}.md`, tmpl.content, 'markdown');
          }
        }
      })),

      // Actions
      ...actions.map(act => ({
        id: `act-${act.id}`,
        title: `Run Action: ${act.name}`,
        subtitle: `${act.category || 'General'} • ${act.description || (act.type === 'button' ? 'UI Button' : 'Command Action')}`,
        category: 'Actions' as const,
        icon: 'Terminal',
        action: () => {
          useActionStore.getState().executeAction(act.id);
        }
      }))
    ];

    return items;
  }, [
    isRendered, 
    tabs, 
    templates, 
    actions, 
    workflows, 
    settings, 
    activeTabId, 
    bridge, 
    createTab, 
    saveCurrentTab, 
    setActiveTabId, 
    toggleEditorMode, 
    openVariableModal, 
    toggleSidebar, 
    toggleActivityBar, 
    togglePreview, 
    toggleRibbon, 
    toggleMenuBar,
    toggleStatusBar, 
    toggleTouchMode, 
    setActiveSidebarTab, 
    openFontSelector, 
    addNotification
  ]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<CommandCategory, number> = {
      All: allItems.length,
      Commands: 0,
      Workflows: 0,
      Templates: 0,
      Actions: 0,
      Tabs: 0
    };
    allItems.forEach(item => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      }
    });
    return counts;
  }, [allItems]);

  // Filter items based on active category and query
  const filtered = useMemo(() => {
    return allItems.filter(item => {
      if (activeCategory !== 'All' && item.category !== activeCategory) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase().trim();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [allItems, activeCategory, query]);

  // Ensure selectedIndex is within valid bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeCategory, query]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

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

  if (!isOpen) return null;

  const getCategoryBadgeStyle = (category: PaletteItem['category'], isSelected: boolean) => {
    if (isSelected) {
      return 'bg-white/20 text-white border border-white/30';
    }
    switch (category) {
      case 'Workflows':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30';
      case 'Templates':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'Actions':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'Commands':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      case 'Tabs':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30';
      default:
        return 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]';
    }
  };

  const getCategoryIconBoxStyle = (category: PaletteItem['category'], isSelected: boolean) => {
    if (isSelected) {
      return 'bg-white/20 text-white';
    }
    switch (category) {
      case 'Workflows':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'Templates':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'Actions':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'Commands':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'Tabs':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20';
      default:
        return 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-6 sm:pt-16 p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-100 touch-manipulation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-label="Command Palette"
      aria-modal="true"
    >
      <div className="theme-modal w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[75vh] border border-[var(--border-primary)] bg-[var(--sidebar-bg)] animate-in zoom-in-95 duration-100">
        {/* Search Header */}
        <div className="p-3 sm:p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center gap-2.5 shrink-0">
          <Search className="w-5 h-5 text-[var(--accent-primary)] shrink-0 ml-1" />
          <input
            id="command-palette-search-input"
            name="commandPaletteSearch"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeCategory === 'All' 
                ? 'Type a command, template, action, workflow, or tab...'
                : `Search in ${activeCategory}...`
            }
            className="w-full bg-transparent text-sm sm:text-[15px] font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none h-9"
          />

          {/* Clear Search Input Button (Touch-Friendly) */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              title="Clear search"
              aria-label="Clear search input"
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Close Modal Button (Touch-Friendly) */}
          <button
            type="button"
            onClick={onClose}
            title="Close (ESC)"
            aria-label="Close command palette"
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors active:scale-95 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Chips Bar (Touch-Optimized Horizontal Scroll) */}
        <div className="px-3 py-2 border-b border-[var(--border-subtle)] bg-[var(--card-secondary-bg)]/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x shrink-0">
          {CATEGORIES.map(cat => {
            const isCurrent = activeCategory === cat;
            const count = categoryCounts[cat] || 0;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setActiveCategory(cat);
                  inputRef.current?.focus();
                }}
                className={`px-3 py-1.5 min-h-[34px] rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition-all cursor-pointer select-none active:scale-95 ${
                  isCurrent
                    ? 'theme-btn-primary shadow-xs font-semibold'
                    : 'bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-subtle)]'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isCurrent
                    ? 'bg-black/20 text-white'
                    : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List (Touch-Friendly Rows & Momentum Scroll) */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-2.5 space-y-1 touch-pan-y"
        >
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Search className="w-5 h-5" />
              </div>
              <div className="font-medium text-sm text-[var(--text-primary)]">
                No matching results found
              </div>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                No items match &ldquo;{query}&rdquo; in {activeCategory}. Try adjusting your keywords or switch to &ldquo;All&rdquo;.
              </p>
              {activeCategory !== 'All' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('All');
                    inputRef.current?.focus();
                  }}
                  className="mt-2 px-3 py-1.5 theme-btn-secondary text-xs rounded-md font-medium border border-[var(--border-primary)]"
                >
                  Show All Categories ({allItems.length})
                </button>
              )}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const badgeStyle = getCategoryBadgeStyle(item.category, isSelected);
              const iconBoxStyle = getCategoryIconBoxStyle(item.category, isSelected);

              return (
                <div
                  key={item.id}
                  ref={el => { itemRefs.current[idx] = el; }}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`min-h-[50px] px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] select-none ${
                    isSelected
                      ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                      : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  {/* Left: AppIcon & Titles */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${iconBoxStyle}`}>
                      <AppIcon name={item.icon} size={16} />
                    </div>

                    <div className="min-w-0">
                      <div className="font-medium text-xs sm:text-[13px] truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className={`text-[11px] truncate mt-0.5 ${
                          isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'
                        }`}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Shortcut Key (if available) & Category Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium shadow-2xs ${
                        isSelected 
                          ? 'bg-black/20 text-white' 
                          : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 shadow-2xs ${badgeStyle}`}>
                      {item.category}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-3.5 py-2.5 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] text-[11px] text-[var(--text-muted)] flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] font-mono text-[10px]">↑↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] font-mono text-[10px]">↵</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg)] border border-[var(--border-subtle)] font-mono text-[10px]">ESC</kbd>
              <span>Close</span>
            </span>
          </div>

          <div className="sm:hidden text-[10px] text-[var(--text-muted)]">
            Tap item to launch or insert
          </div>

          <div className="text-[10px] font-medium text-[var(--text-muted)]">
            {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </div>
        </div>
      </div>
    </div>
  );
};
