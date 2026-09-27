import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ChevronUp,
  ChevronDown,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useFormattingStore } from '../../store/formattingStore';
import { executeFormatting } from '../../services/editor/formattingService';
import { RibbonIcon } from '../Ribbon/RibbonIcon';
import { useRuntimeBridge, isTouchDevice, useWindowDimensions, addWindowListener } from '../../adapters';
import { safePersist } from '../../services/storageHelper';

export const MobileAccessoryBar: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { width: windowWidth } = useWindowDimensions();
  const { activeTabId } = useTabStore();
  const { settings } = useSettingsStore();
  const { 
    buttons, 
    openCustomizer, 
    isMultiRowExpanded, 
    toggleExpandMultiRow,
    buttonSize 
  } = useFormattingStore();

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    bridge.storage.getItem('contextpad_accessory_bar_expanded').then(stored => {
      if (stored !== null) {
        setIsExpanded(stored === 'true');
      }
    }).catch(err => console.warn('[MobileAccessoryBar] Failed to load stored state', err));
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

  const [isNarrowOrMobile, setIsNarrowOrMobile] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const touchStartXRef = useRef(0);
  const touchHasDraggedRef = useRef(false);

  const activeButtons = useMemo(() => buttons.filter(b => b.enabled), [buttons]);
  const rafRef = useRef<number | null>(null);

  const checkOverflowAndScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      if (isMultiRowExpanded) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        return;
      }
      setHasOverflow(prev => {
        const threshold = prev ? -2 : 4;
        const overflowing = el.scrollWidth > el.clientWidth + threshold;
        return prev !== overflowing ? overflowing : prev;
      });
      setCanScrollLeft(prev => {
        const canScroll = el.scrollLeft > 2;
        return prev !== canScroll ? canScroll : prev;
      });
      setCanScrollRight(prev => {
        const canScroll = el.scrollLeft < el.scrollWidth - el.clientWidth - 2;
        return prev !== canScroll ? canScroll : prev;
      });
    }
  }, [isMultiRowExpanded]);

  useEffect(() => {
    const isNarrow = windowWidth < 768;
    const isMobileDevice = isTouchDevice();
    setIsNarrowOrMobile(isNarrow || isMobileDevice || settings.touchOptimized);

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
  }, [windowWidth, settings.touchOptimized, checkOverflowAndScroll, activeButtons.length, isMultiRowExpanded, buttonSize]);

  // Global mousemove and mouseup listeners for smooth drag-to-scroll even outside the element
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!isMouseDownRef.current || !scrollContainerRef.current || isMultiRowExpanded) return;
      const delta = e.clientX - startXRef.current;
      if (Math.abs(delta) > 4) {
        hasDraggedRef.current = true;
        setIsDragging(true);
      }
      if (hasDraggedRef.current) {
        scrollContainerRef.current.scrollLeft = startScrollLeftRef.current - delta;
        checkOverflowAndScroll();
      }
    };

    const handleWindowMouseUp = () => {
      if (isMouseDownRef.current) {
        isMouseDownRef.current = false;
        setIsDragging(false);
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
  }, [isMultiRowExpanded, checkOverflowAndScroll]);

  // Mouse drag-scroll handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMultiRowExpanded || !scrollContainerRef.current) return;
    if (e.button !== 0) return; // Only primary button

    isMouseDownRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.clientX;
    startScrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  // Touch scroll handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMultiRowExpanded) return;
    touchHasDraggedRef.current = false;
    if (e.touches.length > 0) {
      touchStartXRef.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isMultiRowExpanded) return;
    if (e.touches.length > 0) {
      const delta = Math.abs(e.touches[0].clientX - touchStartXRef.current);
      if (delta > 6) {
        touchHasDraggedRef.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchHasDraggedRef.current) {
      setTimeout(() => {
        touchHasDraggedRef.current = false;
      }, 100);
    }
  };

  // Intercept click on children if user performed a drag gesture
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current || touchHasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  // Horizontal mouse wheel scrolling for desktop mice
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isMultiRowExpanded || !scrollContainerRef.current) return;
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

  // Show the up/down expand button if buttons overflow, if on a narrow viewport, or if already expanded
  const shouldShowExpandButton = hasOverflow || isNarrowOrMobile || isMultiRowExpanded;

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
      divider: 'h-4'
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
      divider: 'h-5'
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
      divider: 'h-6'
    }
  }[buttonSize || 'medium'];

  return (
    <div className="z-20 border-t border-[var(--border-primary)] bg-[var(--titlebar-bg)]/95 backdrop-blur-md shrink-0 select-none shadow-md">
      <div className="flex items-start justify-between w-full relative">
        {/* Pinned Left Section: Toolbar collapse */}
        <div className={`flex items-center ${sizeStyles.containerPad} shrink-0 self-start`}>
          {/* Toggle chevron button: hides the entire bar */}
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

        {/* Center Section: Dynamic Markdown Formatting Buttons (Single-row scrollable OR Multi-row wrapped) */}
        <div className="relative flex-1 min-w-0 flex items-center">
          {/* Subtle Left Scroll Indicator: appears when scrolled right */}
          {!isMultiRowExpanded && canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--titlebar-bg)] to-transparent pointer-events-none z-10" />
          )}

          <div 
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClickCapture={handleClickCapture}
            onWheel={handleWheel}
            onScroll={checkOverflowAndScroll}
            onDragStart={(e) => e.preventDefault()}
            className={`flex-1 min-w-0 ${
              isMultiRowExpanded 
                ? `flex flex-wrap items-center ${sizeStyles.gap} ${sizeStyles.containerPad} max-h-56 overflow-y-auto no-scrollbar touch-pan-y` 
                : `flex items-center ${sizeStyles.gap} py-1.5 px-1 overflow-x-auto no-scrollbar touch-pan-x ${
                    isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
                  }`
            }`}
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain'
            }}
          >
            {activeButtons.map((btn) => {
              return (
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
              );
            })}

            {/* If no buttons are enabled, show an invitation button */}
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

          {/* Subtle Right Scroll Indicator: appears when there are hidden buttons to the right */}
          {!isMultiRowExpanded && canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--titlebar-bg)] to-transparent pointer-events-none z-10" />
          )}
        </div>

        {/* Persistent Pinned Right Section: Up/Down Expand/Collapse & Settings Button */}
        <div className={`flex items-center ${sizeStyles.gap} ${sizeStyles.containerPad} shrink-0 border-l border-[var(--border-subtle)] bg-[var(--titlebar-bg)]/95 backdrop-blur-md shadow-[-6px_0_12px_-3px_rgba(0,0,0,0.08)] self-start z-10`}>
          {/* Up/Down Button: Appears beside the config button to view hidden buttons / expand toolbar */}
          {shouldShowExpandButton && (
            <button
              type="button"
              onClick={toggleExpandMultiRow}
              title={
                isMultiRowExpanded 
                  ? "Collapse toolbar to single row" 
                  : "Expand toolbar to show all hidden formatting buttons"
              }
              aria-label={
                isMultiRowExpanded 
                  ? "Collapse toolbar to single row" 
                  : "Expand toolbar to show all hidden formatting buttons"
              }
              aria-expanded={isMultiRowExpanded}
              className={`${sizeStyles.accessoryBtn} flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-2xs border cursor-pointer ${
                isMultiRowExpanded
                  ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] border-[var(--accent-primary)]/40 font-semibold'
                  : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] border-[var(--border-primary)]'
              }`}
            >
              {isMultiRowExpanded ? (
                <ChevronDown className={`${sizeStyles.accessoryIcon} stroke-[2.2]`} />
              ) : (
                <ChevronUp className={`${sizeStyles.accessoryIcon} stroke-[2.2]`} />
              )}
            </button>
          )}

          {/* Settings / Config Button: Persistent at the rightmost location */}
          <button
            type="button"
            onClick={openCustomizer}
            title="Customize Markdown Formatting Buttons (Add, Remove, Reorder, Layout, Size)"
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
