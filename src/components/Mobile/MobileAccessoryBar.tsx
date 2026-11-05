import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Plus,
  GripHorizontal
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useFormattingStore } from '../../store/formattingStore';
import { executeFormatting } from '../../services/editor/formattingService';
import { RibbonIcon } from '../Ribbon/RibbonIcon';
import { useRuntimeBridge, isTouchDevice, useWindowDimensions, addWindowListener } from '../../adapters';
import { safePersist } from '../../services/storageHelper';

const STORAGE_HEIGHT_KEY = 'contextpad_formatting_toolbar_height';
const MIN_SINGLE_ROW_HEIGHT = 44;
const MAX_TOOLBAR_HEIGHT = 280;
const EXPANDED_DEFAULT_HEIGHT = 120;

export const MobileAccessoryBar: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { width: windowWidth } = useWindowDimensions();
  const { activeTabId } = useTabStore();
  const { settings } = useSettingsStore();
  const { 
    buttons, 
    openCustomizer, 
    buttonSize 
  } = useFormattingStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [toolbarHeight, setToolbarHeight] = useState<number>(MIN_SINGLE_ROW_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);

  // Load persisted visibility and custom height
  useEffect(() => {
    bridge.storage.getItem('contextpad_accessory_bar_expanded').then(stored => {
      if (stored !== null) {
        setIsExpanded(stored === 'true');
      }
    }).catch(err => console.warn('[MobileAccessoryBar] Failed to load stored state', err));

    bridge.storage.getItem(STORAGE_HEIGHT_KEY).then(storedHeight => {
      if (storedHeight) {
        const parsed = parseInt(storedHeight, 10);
        if (!isNaN(parsed) && parsed >= MIN_SINGLE_ROW_HEIGHT && parsed <= MAX_TOOLBAR_HEIGHT) {
          setToolbarHeight(parsed);
        }
      }
    }).catch(err => console.warn('[MobileAccessoryBar] Failed to load stored height', err));
  }, [bridge.storage]);

  useEffect(() => {
    if (settings.showMobileAccessoryBar) {
      setIsExpanded(true);
    }
  }, [settings.showMobileAccessoryBar]);

  const handleToggleExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
    safePersist(bridge.storage, 'contextpad_accessory_bar_expanded', String(expanded), 'accessory bar state');
  };

  const isMultiRow = toolbarHeight > 56;

  // Horizontal scroll tracking (when in single-row mode)
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchHasDraggedRef = useRef(false);

  // Vertical resize tracking (drag handle)
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(MIN_SINGLE_ROW_HEIGHT);

  const activeButtons = useMemo(() => buttons.filter(b => b.enabled), [buttons]);
  const rafRef = useRef<number | null>(null);

  const checkOverflowAndScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      if (isMultiRow) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }
      setCanScrollLeft(el.scrollLeft > 2);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
    }
  }, [isMultiRow]);

  useEffect(() => {
    const scheduleCheck = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        checkOverflowAndScroll();
      });
    };

    scheduleCheck();

    const el = scrollContainerRef.current;
    let observer: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        scheduleCheck();
      });
      observer.observe(el);
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (observer) observer.disconnect();
    };
  }, [windowWidth, checkOverflowAndScroll, activeButtons.length, toolbarHeight, buttonSize]);

  // Global mousemove and mouseup listeners for both vertical resize and horizontal drag-scroll
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      // 1. Handle Vertical Resize
      if (isResizingRef.current) {
        const deltaY = startYRef.current - e.clientY; // Dragging UP increases height
        const newHeight = Math.min(
          MAX_TOOLBAR_HEIGHT,
          Math.max(MIN_SINGLE_ROW_HEIGHT, startHeightRef.current + deltaY)
        );
        setToolbarHeight(newHeight);
        return;
      }

      // 2. Handle Horizontal Scroll Dragging (single row only)
      if (isMouseDownRef.current && scrollContainerRef.current && !isMultiRow) {
        const delta = e.clientX - startXRef.current;
        if (Math.abs(delta) > 4) {
          hasDraggedRef.current = true;
          setIsDraggingScroll(true);
        }
        if (hasDraggedRef.current) {
          scrollContainerRef.current.scrollLeft = startScrollLeftRef.current - delta;
          checkOverflowAndScroll();
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        // Persist final height
        setToolbarHeight(current => {
          safePersist(bridge.storage, STORAGE_HEIGHT_KEY, String(current), 'formatting toolbar height');
          return current;
        });
      }

      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setIsDraggingScroll(false);
        if (hasDraggedRef.current) {
          setTimeout(() => {
            hasDraggedRef.current = false;
          }, 80);
        }
      }
    };

    const removeMove = addWindowListener('mousemove', handleWindowMouseMove);
    const removeUp = addWindowListener('mouseup', handleWindowMouseUp);
    return () => {
      removeMove();
      removeUp();
    };
  }, [bridge.storage, isMultiRow, checkOverflowAndScroll]);

  // Touch resize listener on window
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isResizingRef.current && e.touches.length > 0) {
        const clientY = e.touches[0].clientY;
        const deltaY = startYRef.current - clientY;
        const newHeight = Math.min(
          MAX_TOOLBAR_HEIGHT,
          Math.max(MIN_SINGLE_ROW_HEIGHT, startHeightRef.current + deltaY)
        );
        setToolbarHeight(newHeight);
      }
    };

    const handleTouchEnd = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        setToolbarHeight(current => {
          safePersist(bridge.storage, STORAGE_HEIGHT_KEY, String(current), 'formatting toolbar height');
          return current;
        });
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [bridge.storage]);

  // Resize Drag Handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = toolbarHeight;
  };

  const handleTouchResizeStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isResizingRef.current = true;
      setIsResizing(true);
      startYRef.current = e.touches[0].clientY;
      startHeightRef.current = toolbarHeight;
    }
  };

  const handleDoubleClickHandle = () => {
    // Toggle between single-row compact and comfortable 2/3-row height
    const targetHeight = isMultiRow ? MIN_SINGLE_ROW_HEIGHT : EXPANDED_DEFAULT_HEIGHT;
    setToolbarHeight(targetHeight);
    safePersist(bridge.storage, STORAGE_HEIGHT_KEY, String(targetHeight), 'formatting toolbar height');
  };

  // Single-row horizontal mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMultiRow || !scrollContainerRef.current) return;
    if (e.button !== 0) return;

    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMultiRow) return;
    touchHasDraggedRef.current = false;
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchScrollMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMultiRow) return;
    if (e.touches.length > 0) {
      const delta = Math.abs(e.touches[0].clientX - touchStartXRef.current);
      if (delta > 6) {
        touchHasDraggedRef.current = true;
      }
    }
  };

  const handleTouchScrollEnd = () => {
    if (touchHasDraggedRef.current) {
      setTimeout(() => {
        touchHasDraggedRef.current = false;
      }, 100);
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current || touchHasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isMultiRow || !scrollContainerRef.current) return;
    if (e.deltaY !== 0 || e.deltaX !== 0) {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      scrollContainerRef.current.scrollLeft += delta;
      checkOverflowAndScroll();
    }
  };

  if (!settings.showMobileAccessoryBar) return null;

  if (!isExpanded) {
    return (
      <button
        type="button"
        id="markdown-formatting-expand-btn"
        onClick={() => handleToggleExpanded(true)}
        title="Show Markdown Formatting quick buttons"
        aria-label="Show Markdown Formatting quick buttons"
        className="absolute bottom-2.5 left-2.5 z-30 w-8 h-8 rounded-full bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--card-hover-bg)] shadow-md flex items-center justify-center transition-all active:scale-95 cursor-pointer"
      >
        <ChevronUp className="w-4 h-4" />
      </button>
    );
  }

  const sizeStyles = {
    small: {
      btn: 'w-7 h-7 rounded-md text-[10px]',
      icon: 'w-3.5 h-3.5',
      accessoryBtn: 'w-7 h-7 rounded-md',
      accessoryIcon: 'w-3.5 h-3.5',
      addBtn: 'h-7 px-2 text-[10px] rounded-md gap-1',
      addIcon: 'w-3 h-3',
      containerPad: 'p-1',
      gap: 'gap-1',
    },
    medium: {
      btn: 'w-9 h-9 rounded-lg text-xs',
      icon: 'w-4 h-4',
      accessoryBtn: 'w-9 h-9 rounded-lg',
      accessoryIcon: 'w-4 h-4',
      addBtn: 'h-9 px-3 text-xs rounded-lg gap-1.5',
      addIcon: 'w-3.5 h-3.5',
      containerPad: 'p-1.5',
      gap: 'gap-1.5',
    },
    large: {
      btn: 'w-11 h-11 rounded-xl text-sm',
      icon: 'w-5 h-5',
      accessoryBtn: 'w-11 h-11 rounded-xl',
      accessoryIcon: 'w-5 h-5',
      addBtn: 'h-11 px-3.5 text-sm rounded-xl gap-2',
      addIcon: 'w-4 h-4',
      containerPad: 'p-2',
      gap: 'gap-2',
    }
  }[buttonSize || 'medium'];

  return (
    <div className={`z-20 border-t border-[var(--border-primary)] bg-[var(--titlebar-bg)]/95 backdrop-blur-md shrink-0 select-none shadow-md flex flex-col transition-[height] duration-75 ${
      isResizing ? 'cursor-ns-resize' : ''
    }`}>
      {/* Interactive Drag-to-Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        onTouchStart={handleTouchResizeStart}
        onDoubleClick={handleDoubleClickHandle}
        title="Drag up/down to adjust toolbar height. Double-click to toggle compact/expanded."
        className="w-full h-2.5 -mt-1 flex items-center justify-center cursor-ns-resize group hover:bg-[var(--accent-container)]/30 transition-colors shrink-0"
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border-primary)] group-hover:bg-[var(--accent-primary)] group-hover:w-16 transition-all shadow-2xs" />
      </div>

      {/* Main Formatting Toolbar Content */}
      <div 
        className="flex items-center justify-between w-full relative"
        style={{ height: `${toolbarHeight}px` }}
      >
        {/* Left Side: Collapse Button */}
        <div className={`flex items-center ${sizeStyles.containerPad} shrink-0 self-start`}>
          <button
            type="button"
            id="markdown-formatting-collapse-btn"
            onClick={() => handleToggleExpanded(false)}
            title="Hide Markdown Formatting quick buttons"
            aria-label="Hide Markdown Formatting quick buttons"
            aria-expanded={true}
            className={`${sizeStyles.accessoryBtn} flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] shrink-0 transition-colors border border-[var(--border-primary)] active:scale-95 shadow-2xs cursor-pointer`}
          >
            <ChevronDown className={`${sizeStyles.accessoryIcon} stroke-[2.2]`} />
          </button>
        </div>

        {/* Center Section: Responsive Button Area (Single-Row or Multi-Row Grid based on Height) */}
        <div className="relative flex-1 min-w-0 h-full flex items-center">
          {/* Scroll gradients (only visible when in single row mode) */}
          {!isMultiRow && canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--titlebar-bg)] to-transparent pointer-events-none z-10" />
          )}

          <div 
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchScrollMove}
            onTouchEnd={handleTouchScrollEnd}
            onClickCapture={handleClickCapture}
            onWheel={handleWheel}
            onScroll={checkOverflowAndScroll}
            onDragStart={(e) => e.preventDefault()}
            className={`w-full h-full flex ${sizeStyles.gap} ${sizeStyles.containerPad} ${
              isMultiRow 
                ? 'flex-wrap items-center content-start overflow-y-auto no-scrollbar touch-pan-y' 
                : `flex-nowrap items-center overflow-x-auto no-scrollbar touch-pan-x ${
                    isDraggingScroll ? 'cursor-grabbing select-none' : 'cursor-grab'
                  }`
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: isMultiRow ? 'auto' : 'contain'
            }}
          >
            {activeButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                draggable={false}
                onClick={() => executeFormatting(btn, activeTabId || undefined)}
                title={btn.title || btn.label}
                aria-label={btn.title || btn.label}
                className={`${sizeStyles.btn} flex items-center justify-center font-bold transition-all shrink-0 active:scale-95 shadow-2xs border select-none cursor-pointer ${
                  btn.isAccent
                    ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 hover:bg-[var(--accent-container)]/80'
                    : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] hover:border-[var(--text-secondary)] hover:text-[var(--accent-primary)]'
                }`}
              >
                <RibbonIcon name={btn.icon} className={`${sizeStyles.icon} shrink-0 pointer-events-none stroke-[2.2]`} strokeWidth={2.2} />
              </button>
            ))}

            {activeButtons.length === 0 && (
              <button
                type="button"
                onClick={openCustomizer}
                className={`${sizeStyles.addBtn} flex items-center text-[var(--text-muted)] hover:text-[var(--accent-primary)] bg-[var(--card-bg)] border border-dashed border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all shrink-0`}
              >
                <Plus className={`${sizeStyles.addIcon} text-[var(--accent-primary)] pointer-events-none`} />
                <span>Add Markdown Buttons</span>
              </button>
            )}
          </div>

          {!isMultiRow && canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--titlebar-bg)] to-transparent pointer-events-none z-10" />
          )}
        </div>

        {/* Right Side: Customize Settings */}
        <div className={`flex items-center ${sizeStyles.gap} ${sizeStyles.containerPad} shrink-0 border-l border-[var(--border-subtle)] bg-[var(--titlebar-bg)]/95 backdrop-blur-md shadow-[-6px_0_12px_-3px_rgba(0,0,0,0.08)] self-start z-10`}>
          <button
            type="button"
            onClick={openCustomizer}
            title="Customize Markdown Formatting Buttons (Add, Remove, Reorder, Size)"
            aria-label="Customize Markdown Formatting Buttons"
            className={`${sizeStyles.accessoryBtn} flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] shrink-0 transition-colors border border-dashed border-[var(--border-primary)] active:scale-95 shadow-2xs group cursor-pointer`}
          >
            <SlidersHorizontal className={`${sizeStyles.accessoryIcon} stroke-[2.2] transition-transform group-hover:rotate-45`} />
          </button>
        </div>
      </div>
    </div>
  );
};
