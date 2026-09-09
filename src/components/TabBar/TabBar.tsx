import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Pin, 
  Copy,
  ChevronDown,
  Layers,
  Search
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Tab } from '../../types';
import { addDocumentListener } from '../../adapters';

export const TabBar: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTabId, 
    closeTab, 
    closeOtherTabs, 
    createTab, 
    duplicateTab,
    togglePinTab,
    reorderTabs
  } = useTabStore();

  const { settings } = useSettingsStore();

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tab: Tab } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAllTabsDropdown, setShowAllTabsDropdown] = useState(false);
  const [tabFilterText, setTabFilterText] = useState('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view whenever activeTabId changes
  useEffect(() => {
    if (!activeTabRef.current || !scrollContainerRef.current) return;
    activeTabRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }, [activeTabId]);

  // Mouse wheel horizontal scroll handler for natural tab browsing
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      scrollContainerRef.current.scrollBy({
        left: e.deltaY * 1.2,
        behavior: 'auto'
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tab });
  };

  const getLanguageStrokeColor = (title: string, lang: string) => {
    if (title.endsWith('.md') || lang === 'markdown') return 'var(--status-success)';
    if (title.endsWith('.json') || lang === 'json') return 'var(--status-warning)';
    if (title.endsWith('.yaml') || title.endsWith('.yml')) return 'var(--accent-primary)';
    if (title.endsWith('.js') || title.endsWith('.ts') || lang === 'javascript' || lang === 'typescript') return 'var(--accent-primary)';
    if (title.endsWith('.py') || lang === 'python') return 'var(--status-info)';
    return 'var(--text-muted)';
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    reorderTabs(draggedIndex, targetIndex);
    setDraggedIndex(null);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAllTabsDropdown(false);
      }
    };
    if (showAllTabsDropdown) {
      return addDocumentListener('mousedown', handleOutsideClick);
    }
  }, [showAllTabsDropdown]);

  const filteredTabs = tabs.filter(t => 
    t.title.toLowerCase().includes(tabFilterText.toLowerCase()) ||
    t.content.toLowerCase().includes(tabFilterText.toLowerCase())
  );

  const isTouch = settings.touchOptimized;

  return (
    <nav 
      className={`theme-tabbar flex items-center select-none z-10 shrink-0 w-full relative transition-all ${
        isTouch ? 'h-11' : 'h-9'
      }`}
      aria-label="Editor tabs bar"
    >
      {/* Tabs Scrollable Strip */}
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex items-stretch flex-1 min-w-0 h-full overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId;
          const strokeColor = getLanguageStrokeColor(tab.title, tab.language);

          return (
            <div
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              draggable={!isTouch}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              className={`group flex items-center border-r border-[var(--border-primary)] text-xs gap-2 cursor-pointer shrink-0 relative transition-colors ${
                isTouch ? 'px-4 min-w-[130px] max-w-[240px]' : 'px-3.5 min-w-[120px] max-w-[220px]'
              } ${
                isActive 
                  ? 'theme-tab-active font-medium' 
                  : 'theme-tab-inactive'
              }`}
            >
              {/* Language / File Icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className="shrink-0">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>

              {/* Title */}
              <span className="truncate text-[12px] flex-1">
                {tab.title}
              </span>

              {/* Pin indicator */}
              {tab.isPinned && (
                <Pin className="w-2.5 h-2.5 text-[var(--status-warning)] shrink-0 fill-[var(--status-warning)] opacity-90" />
              )}

              {/* Dirty / Close button */}
              <div className="shrink-0 flex items-center justify-center w-5 h-5 ml-0.5">
                {tab.isDirty ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    title="Unsaved changes. Click to close."
                    className={`w-2.5 h-2.5 rounded-full bg-[var(--status-warning)] ${
                      isTouch ? '' : 'group-hover:hidden'
                    } transition-all`}
                  />
                ) : null}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  title="Close Tab (Ctrl+W)"
                  aria-label={`Close tab ${tab.title}`}
                  className={`p-1 rounded hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors active:scale-90 ${
                    tab.isDirty 
                      ? (isTouch ? 'hidden' : 'hidden group-hover:flex') 
                      : (isTouch ? 'opacity-80' : 'opacity-0 group-hover:opacity-100')
                  }`}
                >
                  <X className="w-3.5 h-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Tab Items End */}
      </div>

      {/* Anchored Tab Actions: Static New Tab + Tab Selection Drop-down */}
      <div className="relative shrink-0 flex items-center h-full border-l border-[var(--border-primary)] bg-[var(--tabbar-bg)] select-none">
        {/* Static + New Tab Button (compact and anchored) */}
        <button 
          onClick={() => createTab()}
          title="New Tab (Ctrl+N)"
          aria-label="New Document Tab"
          className={`h-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)] cursor-pointer transition-colors shrink-0 ${
            isTouch ? 'w-8' : 'w-7'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Subtle divider between static tab buttons */}
        <div className="h-3.5 w-px bg-[var(--border-primary)] opacity-70 shrink-0" />

        {/* Tab Selection Drop-down Button */}
        <button
          onClick={() => {
            setShowAllTabsDropdown(!showAllTabsDropdown);
            setTabFilterText('');
          }}
          title={`View all ${tabs.length} open tabs`}
          aria-label={`Open tabs list (${tabs.length} tabs)`}
          aria-expanded={showAllTabsDropdown}
          className={`h-full flex items-center justify-center gap-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)] transition-colors text-xs ${
            isTouch ? 'w-9' : 'w-7.5'
          }`}
        >
          <Layers className="w-3 h-3 text-[var(--accent-primary)]" />
          <ChevronDown className={`w-2.5 h-2.5 text-[var(--text-muted)] transition-transform duration-150 ${showAllTabsDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* All Tabs List Popover */}
        {showAllTabsDropdown && (
          <div
            ref={dropdownRef}
            className="theme-dropdown absolute right-0 top-full mt-1 w-72 max-h-96 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="p-2 border-b border-[var(--border-primary)] flex items-center gap-1.5 bg-[var(--sidebar-header-bg)]">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search open tabs..."
                value={tabFilterText}
                onChange={(e) => setTabFilterText(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
              />
              <span className="text-[10px] text-[var(--text-muted)] font-mono shrink-0">
                {filteredTabs.length}/{tabs.length}
              </span>
            </div>

            <div className="overflow-y-auto max-h-72 divide-y divide-[var(--border-primary)]">
              {filteredTabs.map((t) => {
                const isSelected = t.id === activeTabId;
                const strokeColor = getLanguageStrokeColor(t.title, t.language);
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setActiveTabId(t.id);
                      setShowAllTabsDropdown(false);
                    }}
                    className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className="shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="truncate">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {t.isPinned && (
                        <Pin className="w-2.5 h-2.5 text-[var(--status-warning)] fill-[var(--status-warning)]" />
                      )}
                      {t.isDirty && (
                        <span className="w-2 h-2 rounded-full bg-[var(--status-warning)]" title="Unsaved changes" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(t.id);
                        }}
                        title="Close Tab"
                        aria-label={`Close tab ${t.title}`}
                        className="p-1 rounded hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredTabs.length === 0 && (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  No matching tabs found
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tab Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setContextMenu(null)}
          />
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="theme-dropdown fixed z-50 min-w-[170px] rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95"
          >
            <button
              onClick={() => {
                closeTab(contextMenu.tab.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center justify-between text-[var(--text-primary)]"
            >
              <span>Close Tab</span>
              <span className="text-[10px] text-[var(--text-muted)] group-hover:text-white">Ctrl+W</span>
            </button>
            <button
              onClick={() => {
                closeOtherTabs(contextMenu.tab.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-primary)]"
            >
              Close Other Tabs
            </button>
            <div className="my-1 border-t border-[var(--border-primary)]" />
            <button
              onClick={() => {
                duplicateTab(contextMenu.tab.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)]"
            >
              <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Duplicate Tab</span>
            </button>
            <button
              onClick={() => {
                togglePinTab(contextMenu.tab.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)]"
            >
              <Pin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>{contextMenu.tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}</span>
            </button>
          </div>
        </>
      )}
    </nav>
  );
};
