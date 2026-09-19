import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRibbonStore } from '../../store/ribbonStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useImageModalStore } from '../../store/imageModalStore';
import { executeFormatting } from '../../services/editor/formattingService';
import { executeActionById } from '../../services/actionExecutor';
import { RibbonIcon } from './RibbonIcon';
import { AppUiEvents } from '../../ui-contract/actionContract';
import { useRuntimeBridge } from '../../adapters';
import { RibbonItem } from '../../types';
import { 
  SlidersHorizontal, 
  FileCode2, 
  Eye, 
  ChevronDown, 
  ChevronUp, 
  Type, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Minus, 
  EyeOff 
} from 'lucide-react';

export interface ModularRibbonProps {
  events?: AppUiEvents;
}

export const ModularRibbon: React.FC<ModularRibbonProps> = ({ events }) => {
  const bridge = useRuntimeBridge();
  const { 
    items, 
    openCustomizer, 
    toggleItemLabel, 
    moveItemUp, 
    moveItemDown, 
    removeItem, 
    addSeparator 
  } = useRibbonStore();
  const { settings, toggleRibbon, toggleEditorMode, setActiveSidebarTab } = useSettingsStore();
  const { openVariableModal } = useTemplateStore();
  const { addNotification } = useNotificationStore();
  const { openImageModal } = useImageModalStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: RibbonItem | null;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isMultiRow, setIsMultiRow] = useState(false);

  const isTouch = settings.touchOptimized || settings.uiDensity === 'touch';

  // Close context menu on outside click or escape
  useEffect(() => {
    if (!contextMenu) return;

    const handleOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('contextmenu', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('contextmenu', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, item: RibbonItem | null) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 210;
    const menuHeight = item ? 240 : 130;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);

    setContextMenu({ x, y, item });
  };

  const handleButtonClick = async (item: RibbonItem, e?: React.MouseEvent) => {
    if (item.type === 'separator') return;

    const { tabs, activeTabId, createTab, setActiveTabId, insertTextAtCursor } = useTabStore.getState();
    const activeTab = tabs.find(t => t.id === activeTabId);
    const { templates } = useTemplateStore.getState();
    const { workflows } = useWorkflowStore.getState();

    switch (item.type) {
      case 'tool': {
        switch (item.targetId) {
          case 'variable-modal':
            openVariableModal();
            break;
          case 'tokens':
            setActiveSidebarTab('tokens');
            break;
          case 'outline':
            setActiveSidebarTab('outline');
            break;
          case 'templates':
            setActiveSidebarTab('templates');
            break;
          case 'explorer':
            setActiveSidebarTab('explorer');
            break;
          case 'toggle-view':
            toggleEditorMode();
            break;
          case 'command-palette':
            events?.onOpenCommandPalette();
            break;
          case 'new-doc':
            createTab();
            break;
          case 'save-file':
            events?.onSaveFile();
            break;
          case 'insert-image-modal':
            openImageModal();
            break;
          default:
            break;
        }
        break;
      }

      case 'action': {
        if (!item.targetId || !activeTab) return;
        executeActionById(item.targetId);
        break;
      }

      case 'workflow': {
        if (!item.targetId) return;
        const wf = workflows.find(w => w.id === item.targetId);
        if (!wf) {
          addNotification('Workflow Not Found', 'Target workflow or bookmark could not be found', 'error');
          return;
        }

        // Alt/Shift click: insert blueprint/content into active document at cursor
        if ((e?.altKey || e?.shiftKey) && activeTab) {
          insertTextAtCursor(activeTab.id, `\n\n${wf.content || ''}`);
          addNotification('Workflow Inserted', `Inserted ${wf.name} blueprint into active document`, 'success');
          return;
        }

        if (wf.type === 'bookmark') {
          if (!wf.filePath) {
            addNotification('Bookmark Error', `No file path specified for "${wf.name}"`, 'error');
            return;
          }

          // Check if file is already open in a workspace tab
          const existingTab = tabs.find(t => t.filePath === wf.filePath);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            addNotification('Switched Tab', `Switched to ${wf.name}`, 'info');
            return;
          }

          // Read real file from disk via runtime bridge
          try {
            const fileData = await bridge.fs.readFile(wf.filePath);
            const fileName = wf.filePath.split(/[/\\]/).pop() || wf.name;
            const ext = fileName.split('.').pop()?.toLowerCase() || 'markdown';
            const lang = ext === 'json' ? 'json' : ext === 'js' || ext === 'ts' ? 'javascript' : 'markdown';

            createTab(fileName, fileData, lang as any, wf.filePath, wf.id);
            addNotification('Bookmark Opened', `Loaded ${fileName} from disk`, 'success');
          } catch (err: any) {
            addNotification('Bookmark Read Failed', `Could not read ${wf.filePath}: ${err?.message || String(err)}`, 'error');
          }
        } else {
          // Workflow blueprint: switch to existing tab or open new
          const existingTab = tabs.find(t => t.pinnedTabId === wf.id);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            addNotification('Switched Tab', `Focused ${wf.name}`, 'info');
            return;
          }

          const title = wf.name.endsWith('.md') ? wf.name : `${wf.name}.md`;
          createTab(title, wf.content || '', 'markdown', null, wf.id);
          addNotification('Workflow Launched', `Opened ${wf.name} in workspace`, 'success');
        }
        break;
      }

      case 'template': {
        if (!item.targetId || !activeTab) return;
        const tpl = templates.find(t => t.id === item.targetId);
        if (tpl) {
          insertTextAtCursor(activeTab.id, `\n\n${tpl.content}`);
          addNotification('Template Inserted', `Added ${tpl.name} template`, 'success');
        }
        break;
      }

      case 'formatting': {
        const fmtButtons = useFormattingStore.getState().buttons;
        const fmtBtn = fmtButtons.find(b => b.id === item.targetId || b.id === item.id);
        if (fmtBtn) {
          executeFormatting(fmtBtn, activeTab?.id);
        }
        break;
      }

      case 'command': {
        switch (item.targetId) {
          case 'command-palette':
            events?.onOpenCommandPalette();
            break;
          case 'shortcuts':
            events?.onOpenShortcuts();
            break;
          default:
            break;
        }
        break;
      }

      default:
        break;
    }
  };

  const handleButtonDoubleClick = (item: RibbonItem) => {
    if (item.type === 'workflow') {
      const { workflows } = useWorkflowStore.getState();
      const { createTab } = useTabStore.getState();
      const wf = workflows.find(w => w.id === item.targetId);
      if (wf && wf.type !== 'bookmark') {
        const title = wf.name.endsWith('.md') ? wf.name : `${wf.name}.md`;
        createTab(title, wf.content || '', 'markdown', null, wf.id);
        addNotification('Workflow Launched', `Opened fresh copy of ${wf.name}`, 'success');
      }
    }
  };

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'amber': return 'text-amber-600 dark:text-amber-400';
      case 'emerald': return 'text-emerald-600 dark:text-emerald-400';
      case 'purple': return 'text-purple-600 dark:text-purple-400';
      case 'rose': return 'text-rose-600 dark:text-rose-400';
      case 'cyan': return 'text-teal-600 dark:text-teal-400';
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-[var(--accent-primary)]';
    }
  };

  // Exclude toggle-view from ribbon items since it is now permanently in the top bar
  const activeItems = useMemo(
    () => items.filter(i => i.enabled && i.targetId !== 'toggle-view'),
    [items]
  );

  const checkOverflow = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const el = scrollContainerRef.current;
    if (isMultiRow) {
      setHasOverflow(prev => (prev ? false : prev));
      return;
    }

    setHasOverflow(prev => {
      // 10px hysteresis band: 8px to turn on, -2px to turn off.
      // Prevents threshold fluttering / oscillation near border widths.
      const threshold = prev ? -2 : 8;
      const isOverflowing = el.scrollWidth > el.clientWidth + threshold;
      return prev !== isOverflowing ? isOverflowing : prev;
    });
  }, [isMultiRow]);

  // Detect horizontal overflow in single-row mode (must execute before any early return to satisfy Rules of Hooks)
  useEffect(() => {
    if (!settings.showRibbon) return;

    const scheduleCheck = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        checkOverflow();
      });
    };

    scheduleCheck();

    const resizeObserver = new ResizeObserver(() => {
      scheduleCheck();
    });

    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }

    window.addEventListener('resize', scheduleCheck);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [items, isMultiRow, settings.showRibbon, checkOverflow]);

  // Clean collapse: Return null when ribbon is hidden (toggled via top bar or Ctrl+Shift+R)
  if (!settings.showRibbon) {
    return null;
  }

  return (
    <div 
      id="modular-ribbon"
      data-shell-ribbon
      onContextMenu={(e) => handleContextMenu(e, null)}
      className={`${
        isMultiRow 
          ? 'h-auto min-h-[34px] py-1' 
          : (isTouch ? 'h-10.5' : 'h-8.5')
      } bg-[var(--titlebar-bg)] border-b border-[var(--titlebar-border)] px-2 flex items-start sm:items-center justify-between text-xs shrink-0 select-none transition-all duration-150`}
    >
      {/* Down Chevron (expands to multi-row if overflowing/clicked) & Dynamic Ribbon Buttons Area */}
      <div 
        ref={scrollContainerRef}
        className={`flex items-center gap-1 ${
          isMultiRow 
            ? 'flex-wrap py-0.5' 
            : 'overflow-x-auto no-scrollbar flex-nowrap py-0.5'
        } min-w-0 flex-1`}
      >
        <button
          type="button"
          id="modular-ribbon-expand-btn"
          onClick={() => setIsMultiRow(prev => !prev)}
          title={
            isMultiRow 
              ? "Collapse ribbon to single row" 
              : hasOverflow 
                ? "Expand modular ribbon (more icons available)" 
                : "Expand modular ribbon into multiple rows"
          }
          aria-label={isMultiRow ? "Collapse ribbon to single row" : "Expand ribbon into multiple rows"}
          className={`${
            isTouch ? 'w-8 h-8' : 'w-6 h-6'
          } flex items-center justify-center rounded transition-all shrink-0 cursor-pointer active:scale-95 ${
            isMultiRow
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] shadow-2xs'
              : hasOverflow
                ? 'text-[var(--accent-primary)] bg-[var(--accent-container)]/40 hover:bg-[var(--accent-container)]/70'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
          }`}
        >
          {isMultiRow ? (
            <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
          )}
        </button>

        <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {activeItems.map((item) => {
          // 1. Separator divider
          if (item.type === 'separator') {
            return (
              <div
                key={item.id}
                onContextMenu={(e) => handleContextMenu(e, item)}
                className={`w-px bg-[var(--border-subtle)] mx-1 shrink-0 ${isTouch ? 'h-6' : 'h-4'}`}
                title="Separator (Right-click to move or remove)"
              />
            );
          }

          const colorClass = getColorClass(item.color);

          // If button is view toggle, show current dynamic state
          const isViewToggle = item.type === 'tool' && item.targetId === 'toggle-view';
          const isRendered = settings.editorMode === 'rendered';
          const dynamicLabel = isViewToggle 
            ? (isRendered ? 'Rendered View' : 'Raw Markdown') 
            : item.label;

          const tooltipText = [
            dynamicLabel,
            item.shortcut ? `(${item.shortcut})` : '',
            item.type === 'workflow' ? '(Click to open/focus, Alt+Click to insert, Double-click for fresh copy)' : '',
            item.tooltip && item.tooltip !== dynamicLabel ? `— ${item.tooltip}` : ''
          ].filter(Boolean).join(' ');

          const isIconOnly = item.showLabel === false;

          // 2. Icon + Text Capsule Button
          if (!isIconOnly) {
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => handleButtonClick(item, e)}
                onDoubleClick={() => handleButtonDoubleClick(item)}
                onContextMenu={(e) => handleContextMenu(e, item)}
                title={tooltipText}
                aria-label={dynamicLabel}
                className={`flex items-center gap-1.5 px-2 rounded-md font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 cursor-pointer ${
                  isTouch ? 'h-9 text-xs' : 'h-7 text-xs'
                }`}
              >
                {isViewToggle ? (
                  isRendered ? (
                    <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2] shrink-0" />
                  ) : (
                    <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2] shrink-0" />
                  )
                ) : (
                  <RibbonIcon name={item.icon} className={`w-3.5 h-3.5 ${colorClass} shrink-0`} strokeWidth={2.2} />
                )}
                <span className="truncate max-w-[120px]">{dynamicLabel}</span>
              </button>
            );
          }

          // 3. Compact Icon-Only Button
          return (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleButtonClick(item, e)}
              onDoubleClick={() => handleButtonDoubleClick(item)}
              onContextMenu={(e) => handleContextMenu(e, item)}
              title={tooltipText}
              aria-label={dynamicLabel}
              className={`flex items-center justify-center rounded-md text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 font-medium cursor-pointer ${
                isTouch ? 'w-9 h-9' : 'w-7 h-7'
              }`}
            >
              {isViewToggle ? (
                isRendered ? (
                  <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2]" />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2]" />
                )
              ) : (
                <RibbonIcon name={item.icon} className={`w-3.5 h-3.5 ${colorClass}`} strokeWidth={2.2} />
              )}
            </button>
          );
        })}
      </div>

      {/* Ribbon Customizer Quick Access Button */}
      <div className={`flex items-center gap-1 pl-2 border-l border-[var(--border-subtle)] shrink-0 ml-1 ${isMultiRow ? 'self-start mt-0.5' : ''}`}>
        <button
          type="button"
          onClick={openCustomizer}
          className={`${
            isTouch ? 'w-8 h-8' : 'w-6 h-6'
          } flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 cursor-pointer`}
          title="Customize Ribbon (Add, reorder, or pin custom actions)"
          aria-label="Customize Ribbon"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>

      {/* In-Place Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 theme-dropdown min-w-[200px] py-1 rounded-lg shadow-2xl border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)] text-xs animate-in fade-in zoom-in-95 duration-75 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.item && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-wider border-b border-[var(--border-subtle)] mb-1 flex items-center justify-between">
                <span className="truncate max-w-[130px]">{contextMenu.item.label}</span>
                <span className="opacity-70">{contextMenu.item.type}</span>
              </div>

              {contextMenu.item.type !== 'separator' && (
                <button
                  type="button"
                  onClick={() => {
                    toggleItemLabel(contextMenu.item!.id);
                    setContextMenu(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
                >
                  <Type className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>{contextMenu.item.showLabel ? 'Show Icon Only' : 'Show Icon + Text'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  moveItemUp(contextMenu.item!.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Move Left</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  moveItemDown(contextMenu.item!.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span>Move Right</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  removeItem(contextMenu.item!.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Ribbon</span>
              </button>

              <div className="my-1 border-t border-[var(--border-subtle)]" />
            </>
          )}

          <button
            type="button"
            onClick={() => {
              addSeparator();
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Add Separator</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openCustomizer();
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center gap-2 hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span>Customize Ribbon...</span>
          </button>

          <div className="my-1 border-t border-[var(--border-subtle)]" />

          <button
            type="button"
            onClick={() => {
              toggleRibbon();
              setContextMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span>Hide Ribbon</span>
            </span>
            <span className="text-[10px] font-mono opacity-60">Ctrl+Shift+R</span>
          </button>
        </div>
      )}
    </div>
  );
};
