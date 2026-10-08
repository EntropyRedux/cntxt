import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Variable } from 'lucide-react';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { useSettingsStore } from '../../store/settingsStore';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useNotificationStore } from '../../store/notificationStore';
import { editorRegistry } from '../../services/editor/editorRegistry';
import { useRuntimeBridge, isTouchDevice } from '../../adapters';

/**
 * Floating Draggable Edge-Anchoring FAB for Navigating and Filling {{variables}} in Touch Mode
 */
export const VariableFloatingNavigator: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { settings } = useSettingsStore();
  const { tabs, activeTabId } = useTabStore();
  const { openVariableModal } = useTemplateStore();
  const { addNotification } = useNotificationStore();

  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Edge-Anchored Position: 'left' or 'right' edge at vertical coordinate y (null initially for default bottom-right)
  const [anchor, setAnchor] = useState<{ edge: 'left' | 'right'; y: number | null }>({
    edge: 'right',
    y: null
  });
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);
  const activePointerIdRef = useRef<number | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionTimeRef = useRef<number>(0);

  const isTouch = settings.touchOptimized || settings.uiDensity === 'touch' || isTouchDevice();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Load saved edge anchor position from storage
  useEffect(() => {
    bridge.storage
      ?.getItem('contextpad_var_fab_pos')
      ?.then((saved) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (
              parsed &&
              (parsed.edge === 'left' || parsed.edge === 'right') &&
              typeof parsed.yRatio === 'number'
            ) {
              const parentH = containerRef.current?.parentElement?.clientHeight || window.innerHeight;
              const computedY = Math.max(16, Math.min(Math.round(parsed.yRatio * parentH), parentH - 64));
              setAnchor({ edge: parsed.edge, y: computedY });
              return;
            }
          } catch (e) {
            console.debug('[VariableFloatingNavigator] Failed to parse saved fab position:', e);
          }
        }
      })
      ?.catch((e) => {
        console.debug('[VariableFloatingNavigator] Failed to load fab position from storage:', e);
      });
  }, [bridge.storage]);

  // Keep anchored within container bounds on window/editor resize
  useEffect(() => {
    const handleResize = () => {
      const parent = containerRef.current?.parentElement;
      if (!parent) return;
      const h = parent.clientHeight;
      setAnchor((prev) => {
        if (prev.y === null) return prev;
        return {
          ...prev,
          y: Math.max(16, Math.min(prev.y, h - 64))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Parse all {{variable}} placeholders in active document
  const parsedVariables = useMemo(() => {
    if (!activeTab?.content) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: string[] = [];
    let m: RegExpExecArray | null;

    while ((m = regex.exec(activeTab.content)) !== null) {
      const isInsideInput =
        activeTab.content.slice(Math.max(0, m.index - 2), m.index) === '[[' &&
        activeTab.content.slice(m.index + m[0].length, m.index + m[0].length + 2) === ']]';
      if (!isInsideInput) {
        matches.push(m[1].trim());
      }
    }
    return matches;
  }, [activeTab?.content]);

  const variableCount = parsedVariables.length;

  // Clean up click timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    };
  }, []);

  // Unified Drag Initiation (works with PointerEvents, MouseEvents, and TouchEvents)
  const startDrag = (clientX: number, clientY: number, pointerId?: number, targetEl?: HTMLElement) => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;

    const btnRect = container.getBoundingClientRect();

    pointerStartPos.current = { x: clientX, y: clientY };
    pointerOffset.current = {
      x: clientX - btnRect.left,
      y: clientY - btnRect.top
    };
    hasMovedRef.current = false;
    setIsPressed(true);

    if (pointerId !== undefined && targetEl && typeof targetEl.setPointerCapture === 'function') {
      try {
        targetEl.setPointerCapture(pointerId);
        activePointerIdRef.current = pointerId;
      } catch (e) {
        console.debug('[VariableFloatingNavigator] setPointerCapture failed:', e);
      }
    }
  };

  // Unified Drag Movement
  const moveDrag = (clientX: number, clientY: number) => {
    const container = containerRef.current;
    const parent = container?.parentElement;
    if (!container || !parent) return;

    const dx = clientX - pointerStartPos.current.x;
    const dy = clientY - pointerStartPos.current.y;
    const dist = Math.hypot(dx, dy);

    if (!hasMovedRef.current && dist > 5) {
      hasMovedRef.current = true;
      setIsDragging(true);
    }

    if (hasMovedRef.current) {
      const parentRect = parent.getBoundingClientRect();
      const btnW = 44;
      const btnH = 44;

      // Position relative to parent container
      const rawX = clientX - parentRect.left - pointerOffset.current.x;
      const rawY = clientY - parentRect.top - pointerOffset.current.y;

      // Clamp inside parent container with 8px margin
      const clampedX = Math.max(8, Math.min(rawX, parentRect.width - btnW - 8));
      const clampedY = Math.max(8, Math.min(rawY, parentRect.height - btnH - 8));

      setDragPos({ x: clampedX, y: clampedY });
    }
  };

  // Unified Drag Completion & Edge Snapping
  const endDrag = (releasedElement?: HTMLElement) => {
    setIsPressed(false);

    if (activePointerIdRef.current !== null && releasedElement && typeof releasedElement.releasePointerCapture === 'function') {
      try {
        releasedElement.releasePointerCapture(activePointerIdRef.current);
      } catch (e) {
        console.debug('[VariableFloatingNavigator] releasePointerCapture failed:', e);
      }
      activePointerIdRef.current = null;
    }

    if (hasMovedRef.current && dragPos) {
      const parent = containerRef.current?.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      const parentW = parentRect?.width || window.innerWidth;
      const parentH = parentRect?.height || window.innerHeight;
      const btnW = 44;
      const btnH = 44;

      // Snap to nearest horizontal edge: left or right, keeping the placed vertical Y position
      const isCloserToLeft = (dragPos.x + btnW / 2) < (parentW / 2);
      const targetEdge: 'left' | 'right' = isCloserToLeft ? 'left' : 'right';
      const targetY = Math.max(12, Math.min(dragPos.y, parentH - btnH - 12));

      setAnchor({ edge: targetEdge, y: targetY });
      setDragPos(null);
      setIsDragging(false);

      // Persist edge anchor position
      bridge.storage
        ?.setItem(
          'contextpad_var_fab_pos',
          JSON.stringify({ edge: targetEdge, yRatio: targetY / Math.max(1, parentH) })
        )
        ?.catch((e) => {
          console.debug('[VariableFloatingNavigator] Failed to save fab position to storage:', e);
        });

      // Suppress tap/click after dragging
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
        hasMovedRef.current = false;
      }, 180);
      return;
    }

    setDragPos(null);
    setIsDragging(false);
    hasMovedRef.current = false;
  };

  // Pointer Event Handlers (Primary unified handler for mouse, touch, and stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only respond to main button
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    lastInteractionTimeRef.current = Date.now();
    startDrag(e.clientX, e.clientY, e.pointerId, e.currentTarget);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerIdRef.current !== null && activePointerIdRef.current !== e.pointerId) return;
    if (isDragging || hasMovedRef.current || isPressed) {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    endDrag(e.currentTarget);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    endDrag(e.currentTarget);
  };

  // Global window listeners while dragging to guarantee drag tracking even if pointer leaves element
  useEffect(() => {
    if (!isDragging) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      moveDrag(e.clientX, e.clientY);
    };

    const onGlobalPointerUp = () => {
      endDrag(buttonRef.current || undefined);
    };

    const onGlobalMouseMove = (e: MouseEvent) => {
      moveDrag(e.clientX, e.clientY);
    };

    const onGlobalMouseUp = () => {
      endDrag(buttonRef.current || undefined);
    };

    const onGlobalTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onGlobalTouchEnd = () => {
      endDrag(buttonRef.current || undefined);
    };

    window.addEventListener('pointermove', onGlobalPointerMove, { passive: false });
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('touchmove', onGlobalTouchMove, { passive: false });
    window.addEventListener('touchend', onGlobalTouchEnd);
    window.addEventListener('touchcancel', onGlobalTouchEnd);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('touchmove', onGlobalTouchMove);
      window.removeEventListener('touchend', onGlobalTouchEnd);
      window.removeEventListener('touchcancel', onGlobalTouchEnd);
    };
  }, [isDragging, dragPos]);

  // Fallback Mouse & Touch Event Handlers for older browsers or custom emulators
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (Date.now() - lastInteractionTimeRef.current < 150) return; // already handled by pointerdown
    if (e.button !== 0) return;
    lastInteractionTimeRef.current = Date.now();
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (Date.now() - lastInteractionTimeRef.current < 150) return; // already handled by pointerdown
    if (e.touches.length === 0) return;
    lastInteractionTimeRef.current = Date.now();
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.touches.length === 0) return;
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    endDrag(buttonRef.current || undefined);
  };

  // Variable Jump Action (Single Tap)
  const handleNavigateNext = () => {
    if (!activeTab) return;
    const view = editorRegistry.getView(activeTab.id);
    if (!view) return;

    const docText = view.state.doc.toString();
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: { from: number; to: number }[] = [];
    let m: RegExpExecArray | null;

    while ((m = regex.exec(docText)) !== null) {
      const isInsideInput =
        docText.slice(Math.max(0, m.index - 2), m.index) === '[[' &&
        docText.slice(m.index + m[0].length, m.index + m[0].length + 2) === ']]';
      if (!isInsideInput) {
        matches.push({ from: m.index, to: m.index + m[0].length });
      }
    }

    if (matches.length === 0) {
      addNotification(
        'Template Variables',
        'No {{variable}} placeholders found in active document - Double-tap to open form filler',
        'info'
      );
      return;
    }

    const selTo = Math.max(view.state.selection.main.anchor, view.state.selection.main.head);
    let target = matches.find((item) => item.from >= selTo);
    if (!target) {
      target = matches[0];
    }

    // Check if target variable requires scrolling in visible viewport
    const scroller = view.scrollDOM;
    let requiresScrolling = true;
    if (scroller) {
      const coords = view.coordsAtPos(target.from);
      const rect = scroller.getBoundingClientRect();
      if (
        coords &&
        coords.top >= rect.top + 30 &&
        coords.bottom <= rect.bottom - 60
      ) {
        requiresScrolling = false;
      }
    }

    // Dispatch selection with scroll effect
    view.dispatch({
      selection: EditorSelection.single(target.from, target.to),
      effects: [
        EditorView.scrollIntoView(target.from, {
          y: 'center',
          yMargin: 80,
          x: 'nearest'
        })
      ]
    });

    if (requiresScrolling && scroller) {
      requestAnimationFrame(() => {
        try {
          const lineBlock = view.lineBlockAt(target.from);
          const targetTop = Math.max(0, lineBlock.top - Math.floor(scroller.clientHeight / 2));
          if (Math.abs(scroller.scrollTop - targetTop) > 20) {
            scroller.scrollTo({
              top: targetTop,
              behavior: 'smooth'
            });
          }
        } catch (e) {
          console.debug('[VariableFloatingNavigator] Scroll navigation failed:', e);
        }
      });
    }

    view.focus();
  };

  const handleDoubleTapAction = () => {
    openVariableModal();
  };

  const handleClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current || hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const timeSinceLast = now - lastTapRef.current;

    if (timeSinceLast < 320 && timeSinceLast > 0) {
      // Double tap confirmed
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      handleDoubleTapAction();
    } else {
      lastTapRef.current = now;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        handleNavigateNext();
        clickTimeoutRef.current = null;
      }, 220);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (suppressClickRef.current || hasMovedRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleDoubleTapAction();
  };

  if (!isTouch || !activeTab) {
    return null;
  }

  // Positioning Style: Live follow during drag, smoothly snapped to edge when stationary
  const getContainerStyle = (): React.CSSProperties => {
    if (dragPos) {
      return {
        position: 'absolute',
        left: `${dragPos.x}px`,
        top: `${dragPos.y}px`,
        transition: 'none',
        zIndex: 50,
        touchAction: 'none',
        userSelect: 'none'
      };
    }

    if (anchor.y === null) {
      // Default initial position on lower right
      return {
        position: 'absolute',
        right: '12px',
        bottom: '16px',
        left: 'auto',
        transition: 'none',
        zIndex: 35,
        touchAction: 'none',
        userSelect: 'none'
      };
    }

    return {
      position: 'absolute',
      left: anchor.edge === 'left' ? '12px' : 'auto',
      right: anchor.edge === 'right' ? '12px' : 'auto',
      top: `${anchor.y}px`,
      bottom: 'auto',
      transition: isDragging
        ? 'none'
        : 'left 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2), right 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2), top 0.22s ease-out',
      zIndex: 35,
      touchAction: 'none',
      userSelect: 'none'
    };
  };

  return (
    <div
      ref={containerRef}
      style={getContainerStyle()}
      className="select-none touch-none pointer-events-auto"
    >
      <button
        ref={buttonRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title="Tap: Jump to next {{variable}} • Double-tap: Form fill • Drag: Reposition anywhere, snaps to edge"
        aria-label={`Variable navigation button. ${variableCount} variables in file, tap to jump to next variable, double-tap to open form filler, drag to reposition on edge`}
        className={`relative flex items-center justify-center w-11 h-11 rounded-full shadow-lg border backdrop-blur-md select-none touch-none transition-transform ${
          isDragging
            ? 'scale-110 shadow-2xl ring-2 ring-[var(--accent-primary)]/80 cursor-grabbing bg-[var(--card-bg)] text-[var(--accent-primary)] border-[var(--accent-primary)]'
            : isPressed
              ? 'scale-95 ring-1 ring-[var(--accent-primary)]/50 cursor-grabbing'
              : 'hover:scale-105 active:scale-95 cursor-grab'
        } ${
          variableCount > 0
            ? 'bg-[var(--card-bg)]/95 text-[var(--accent-primary)] border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)] shadow-[0_4px_14px_rgba(0,0,0,0.18)]'
            : 'bg-[var(--card-bg)]/90 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] shadow-md'
        }`}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        <Variable className="w-5 h-5 shrink-0 pointer-events-none stroke-[2.2]" />

        {/* Small badge showing variable count if > 0 */}
        {variableCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-primary)] text-white text-[9.5px] font-mono font-bold flex items-center justify-center shadow-xs pointer-events-none border border-white/20">
            {variableCount > 9 ? '9+' : variableCount}
          </span>
        )}
      </button>
    </div>
  );
};
