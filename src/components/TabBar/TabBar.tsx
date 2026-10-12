import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Plus, 
  X, 
  Copy,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Search,
  FolderOpen,
  Clipboard,
  Terminal
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Tab } from '../../types';
import { addDocumentListener, addWindowListener, useRuntimeBridge } from '../../adapters';
import { resolveHtml } from '../../features/panelApps/source/resolveHtml';
import { useBuilderStore } from '../../features/panelApps/state/builderStore';

export const TabBar: React.FC = () => {
  const { 
    tabs, 
    activeTabId, 
    setActiveTabId, 
    closeTab, 
    closeOtherTabs, 
    createTab, 
    duplicateTab,
    closeTabsToRight,
    reorderTabs
  } = useTabStore();

  const bridge = useRuntimeBridge();
  const { settings } = useSettingsStore();

  const scrollTabs = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth'
    });
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tab: Tab } | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showAllTabsDropdown, setShowAllTabsDropdown] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [tabFilterText, setTabFilterText] = useState('');
  const [isAutoHidden, setIsAutoHidden] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  // Check if tabs overflow container width to autohide scroll buttons
  const checkOverflow = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setHasOverflow(el.scrollWidth > el.clientWidth + 2);
  }, []);

  // Reset search state whenever dropdown closes
  useEffect(() => {
    if (!showAllTabsDropdown) {
      setIsSearchOpen(false);
      setTabFilterText('');
    }
  }, [showAllTabsDropdown]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const floatingButtonRef = useRef<HTMLButtonElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);
  const activeTouchTabRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Scroll active tab into view whenever activeTabId changes
  useEffect(() => {
    if (!activeTabRef.current || !scrollContainerRef.current) return;
    activeTabRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
    checkOverflow();
  }, [activeTabId, checkOverflow]);

  // Observe container size and tabs length to update overflow state
  useEffect(() => {
    checkOverflow();
    const el = scrollContainerRef.current;
    if (!el) return;

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => checkOverflow());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [checkOverflow, tabs.length]);

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
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIdx = sourceIndexStr !== '' ? parseInt(sourceIndexStr, 10) : draggedIndex;
    if (sourceIdx !== null && !isNaN(sourceIdx) && sourceIdx !== targetIndex) {
      reorderTabs(sourceIdx, targetIndex);
    }
    setDraggedIndex(null);
  };

  // Close dropdown on outside click or touch
  useEffect(() => {
    const handleOutsideClick = (e: Event) => {
      const target = e.target as Node;
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        (!floatingButtonRef.current || !floatingButtonRef.current.contains(target))
      ) {
        setShowAllTabsDropdown(false);
      }
    };
    if (showAllTabsDropdown) {
      const removeMouseDown = addDocumentListener('mousedown', handleOutsideClick);
      const removeTouchStart = addDocumentListener('touchstart', handleOutsideClick);
      return () => {
        removeMouseDown();
        removeTouchStart();
      };
    }
  }, [showAllTabsDropdown]);

  const isTouch = settings.touchOptimized || settings.uiDensity === 'touch';

  // In touch mode, scroll the active tab item into view when the dropdown opens
  useEffect(() => {
    if (showAllTabsDropdown && isTouch && activeTouchTabRef.current) {
      activeTouchTabRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [showAllTabsDropdown, isTouch]);

  // Auto-hide floating button on touch mode during typing, scrolling, or editor interaction
  useEffect(() => {
    if (!isTouch) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const triggerActivity = () => {
      // Don't auto-hide when the tabs dropdown popover is currently open
      if (showAllTabsDropdown) return;

      setIsAutoHidden(true);
      if (timer) clearTimeout(timer);

      // Restore button visibility after 2 seconds of typing/scrolling inactivity
      timer = setTimeout(() => {
        setIsAutoHidden(false);
      }, 2000);
    };

    const handleKeyDown = () => triggerActivity();
    const handleScroll = () => triggerActivity();
    const handleTouchMove = () => triggerActivity();

    const unsubKey = addWindowListener('keydown', handleKeyDown, { passive: true });
    const unsubScroll = addWindowListener('scroll', handleScroll, { capture: true, passive: true });
    const unsubTouch = addWindowListener('touchmove', handleTouchMove, { capture: true, passive: true });

    return () => {
      if (timer) clearTimeout(timer);
      unsubKey();
      unsubScroll();
      unsubTouch();
    };
  }, [isTouch, showAllTabsDropdown]);

  const filteredTabs = tabs.filter(t => 
    t.title.toLowerCase().includes(tabFilterText.toLowerCase()) ||
    t.content.toLowerCase().includes(tabFilterText.toLowerCase())
  );

  const displayTabs = isSearchOpen && tabFilterText.trim() ? filteredTabs : tabs;

  // In touch mode, hide the horizontal tabs row to maximize editor area space,
  // and render the tab selection dropdown as an elegant, auto-hiding floating action button.
  if (isTouch) {
    return (
      <>
        {/* Invisible gesture hot-zone: Tapping or hovering near the top-right reveals the tab button instantly */}
        <div 
          className="absolute top-0 right-0 w-36 h-12 z-20 pointer-events-auto"
          onMouseEnter={() => setIsAutoHidden(false)}
          onTouchStart={() => setIsAutoHidden(false)}
        />

        <div 
          className={`absolute top-2.5 right-3.5 z-20 select-none transition-all duration-300 ease-out ${
            isAutoHidden && !showAllTabsDropdown
              ? 'opacity-0 -translate-y-2 pointer-events-none'
              : 'opacity-70 hover:opacity-100 focus-within:opacity-100 translate-y-0'
          }`}
          onMouseEnter={() => setIsAutoHidden(false)}
          onTouchStart={() => setIsAutoHidden(false)}
        >
          {/* Floating Tab Selection Dropdown Button */}
          <button
            ref={floatingButtonRef}
            type="button"
            onClick={() => {
              setIsAutoHidden(false);
              setShowAllTabsDropdown(!showAllTabsDropdown);
              setTabFilterText('');
            }}
            title={`Tab selection: ${activeTab ? activeTab.title : 'No document'} (${tabs.length} open tabs)`}
            aria-label="Open tab selection menu"
            aria-expanded={showAllTabsDropdown}
            className={`flex items-center gap-2 h-9 px-3 rounded-full shadow-md border backdrop-blur-md transition-all cursor-pointer ${
              showAllTabsDropdown
                ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)]/30 opacity-100'
                : 'bg-[var(--card-bg)]/90 text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 active:scale-95'
            }`}
          >
          {activeTab ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={getLanguageStrokeColor(activeTab.title, activeTab.language)}
              strokeWidth="2"
              className="shrink-0"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          ) : (
            <Layers className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          )}

          <span className="text-xs font-semibold max-w-[120px] sm:max-w-[180px] truncate">
            {activeTab ? activeTab.title : 'Tabs (0)'}
          </span>

          {activeTab?.isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-[var(--status-warning)] shrink-0 animate-pulse"
              title="Unsaved changes"
            />
          )}

          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--app-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] shrink-0 font-medium">
            {tabs.length}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-150 shrink-0 ${
              showAllTabsDropdown ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Tab Selection Popover */}
        {showAllTabsDropdown && (
          <div
            ref={dropdownRef}
            className="theme-dropdown absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-4.5rem)] rounded-2xl shadow-2xl border border-[var(--border-primary)] bg-[var(--sidebar-bg)] z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          >
            {/* Popover Header: Title & New Tab (Search removed in touch mode to maximize space and usability) */}
            <div className="px-3.5 py-2.5 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--sidebar-header-bg)] shrink-0 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">Open Tabs</span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded-full bg-[var(--app-bg)] border border-[var(--border-subtle)] font-medium shrink-0">
                  {tabs.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    createTab();
                    setShowAllTabsDropdown(false);
                  }}
                  title="New Tab"
                  aria-label="New Document Tab"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New</span>
                </button>
              </div>
            </div>

            {/* List of tabs with visible touch-friendly scrollbar and vertical scrolling */}
            <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y divide-y divide-[var(--border-primary)] custom-touch-scrollbar max-h-[60vh]">
              {tabs.map((t) => {
                const isSelected = t.id === activeTabId;
                const strokeColor = getLanguageStrokeColor(t.title, t.language);
                return (
                  <div
                    key={t.id}
                    ref={isSelected ? activeTouchTabRef : undefined}
                    onClick={() => {
                      setActiveTabId(t.id);
                      setShowAllTabsDropdown(false);
                    }}
                    className={`flex items-center justify-between px-3.5 py-3 min-h-[44px] text-xs cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] active:bg-[var(--card-hover-bg)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2"
                        className="shrink-0"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span className="truncate text-xs sm:text-sm">{t.title}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {t.isDirty && (
                        <span className="w-2 h-2 rounded-full bg-[var(--status-warning)] mr-1" title="Unsaved changes" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(t.id);
                        }}
                        title="Close Tab"
                        aria-label={`Close tab ${t.title}`}
                        className="p-1.5 rounded-lg hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {displayTabs.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  {tabs.length === 0 ? 'No open tabs' : 'No matching tabs found'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

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
        onScroll={checkOverflow}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={(e) => {
          if (e.target === scrollContainerRef.current) {
            handleDrop(e, tabs.length - 1);
          }
        }}
        className={`flex items-stretch flex-1 min-w-0 h-full overflow-x-auto no-scrollbar scroll-smooth touch-pan-x ${
          !settings.showRibbon && (!settings.showActivityBar || isTouch) ? 'pl-10' : ''
        }`}
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
              onDragEnter={handleDragEnter}
              onDrop={(e) => handleDrop(e, idx)}
              onDragEnd={() => setDraggedIndex(null)}
              onClick={() => setActiveTabId(tab.id)}
              onContextMenu={(e) => handleContextMenu(e, tab)}
              className={`group flex items-center border-r border-[var(--border-primary)] text-xs gap-2 cursor-pointer shrink-0 relative transition-all ${
                draggedIndex === idx ? 'opacity-40 scale-95 border-dashed border-[var(--accent-primary)]' : ''
              } ${
                isTouch ? 'px-4 min-w-[130px] max-w-[240px]' : 'px-3.5 min-w-[120px] max-w-[220px]'
              } ${
                isActive 
                  ? 'theme-tab-active font-medium' 
                  : 'theme-tab-inactive'
              }`}
            >
              {/* Language / File Icon */}
              {tab.tabType === 'terminal' ? (
                <Terminal className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" className="shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}

              {/* Title */}
              <span className="truncate text-[12px] flex-1">
                {tab.title}
              </span>

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

      {/* Anchored Tab Actions: Scroll Controls + Static New Tab + Tab Selection Drop-down */}
      <div className="relative shrink-0 flex items-center h-full border-l border-[var(--border-primary)] bg-[var(--tabbar-bg)] select-none z-20">
        {/* Scroll Buttons autohide when tabs fit within viewport */}
        {hasOverflow && (
          <>
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollTabs('left');
              }}
              title="Scroll Tabs Left"
              aria-label="Scroll Tabs Left"
              className="h-full px-1.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollTabs('right');
              }}
              title="Scroll Tabs Right"
              aria-label="Scroll Tabs Right"
              className="h-full px-1.5 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--tab-hover-bg)] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <div className="h-3.5 w-px bg-[var(--border-primary)] opacity-70 shrink-0" />
          </>
        )}

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
            {/* Popover Header: Title, Search Button & New Tab */}
            <div className="px-3 py-2 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--sidebar-header-bg)] shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">Open Tabs</span>
                <span className="text-[10px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded-full bg-[var(--app-bg)] border border-[var(--border-subtle)] font-medium shrink-0">
                  {displayTabs.length}{displayTabs.length !== tabs.length ? `/${tabs.length}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(prev => {
                      if (prev) setTabFilterText('');
                      return !prev;
                    });
                  }}
                  title={isSearchOpen ? "Close search" : "Search tabs"}
                  aria-label={isSearchOpen ? "Close search" : "Search tabs"}
                  aria-expanded={isSearchOpen}
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    isSearchOpen 
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]/30'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    createTab();
                    setShowAllTabsDropdown(false);
                  }}
                  title="New Tab (Ctrl+N)"
                  aria-label="New Document Tab"
                  className="p-1 rounded text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Collapsible Search Input (never auto-focused upon opening dropdown) */}
            {isSearchOpen && (
              <div className="px-2.5 py-1.5 border-b border-[var(--border-primary)] flex items-center gap-1.5 bg-[var(--card-bg)] shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                <input
                  id="tab-filter-input"
                  name="tabFilter"
                  type="text"
                  placeholder="Filter open tabs..."
                  value={tabFilterText}
                  onChange={(e) => setTabFilterText(e.target.value)}
                  className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
                />
                {tabFilterText && (
                  <button
                    type="button"
                    onClick={() => setTabFilterText('')}
                    title="Clear filter"
                    aria-label="Clear filter"
                    className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="overflow-y-auto max-h-72 divide-y divide-[var(--border-primary)]">
              {displayTabs.map((t) => {
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

              {displayTabs.length === 0 && (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  {tabs.length === 0 ? 'No open tabs' : 'No matching tabs found'}
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
            <button
              onClick={() => {
                closeTabsToRight(contextMenu.tab.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white text-[var(--text-primary)]"
            >
              Close Tabs to the Right
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
            {resolveHtml(contextMenu.tab.content, contextMenu.tab.title).ok && (
              <button
                onClick={() => {
                  const resolved = resolveHtml(contextMenu.tab.content, contextMenu.tab.title);
                  useBuilderStore.getState().start({
                    kind: 'tab',
                    docId: contextMenu.tab.id,
                    name: contextMenu.tab.title,
                    content: resolved.ok ? resolved.html : contextMenu.tab.content,
                  });
                  useSettingsStore.getState().setActiveSidebarTab('app-builder');
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)]"
              >
                <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)] group-hover:text-white" />
                <span>Set as panel app</span>
              </button>
            )}
            {contextMenu.tab.filePath && (
              <>
                <div className="my-1 border-t border-[var(--border-primary)]" />
                <button
                  onClick={() => {
                    bridge.clipboard.writeText(contextMenu.tab.filePath || '');
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <Clipboard className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Copy File Path</span>
                </button>
                <button
                  onClick={() => {
                    const filePath = contextMenu.tab.filePath;
                    if (filePath) {
                      if (bridge.openFileExplorer) {
                        bridge.openFileExplorer(filePath);
                      }
                    }
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-[var(--accent-primary)] hover:text-white flex items-center gap-2 text-[var(--text-primary)]"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Reveal in File Explorer</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </nav>
  );
};
