import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Variable } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useNotificationStore } from '../../store/notificationStore';
import { editorRegistry } from '../../services/editor/editorRegistry';

export const VariableFloatingNavigator: React.FC = () => {
  const { settings } = useSettingsStore();
  const { tabs, activeTabId } = useTabStore();
  const { openVariableModal } = useTemplateStore();
  const { addNotification } = useNotificationStore();

  const [isPressed, setIsPressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number | null; y: number | null; dock: 'left' | 'right' }>({
    x: null,
    y: null,
    dock: 'right'
  });

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragRef = useRef({
    isDown: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    currentX: 0,
    currentY: 0,
    grabOffsetX: 0,
    grabOffsetY: 0,
    hasMoved: false,
    startTime: 0
  });

  const isTouch = settings.touchOptimized || settings.uiDensity === 'touch';
  const activeTab = tabs.find((t) => t.id === activeTabId);

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

  // Keep anchored to the chosen edge when editor container or window resizes
  useEffect(() => {
    const handleResize = () => {
      if (position.x === null || position.y === null) return;
      const btn = buttonRef.current;
      const parent = btn?.offsetParent as HTMLElement || btn?.parentElement;
      if (!parent || !btn) return;

      const pRect = parent.getBoundingClientRect();
      const snappedX = position.dock === 'left' ? 12 : Math.max(12, pRect.width - 48);
      const clampedY = Math.max(8, Math.min(pRect.height - 48, position.y));

      btn.style.transition = 'transform 0.2s ease-out';
      btn.style.transform = `translate3d(${snappedX}px, ${clampedY}px, 0)`;

      setPosition(prev => ({
        ...prev,
        x: snappedX,
        y: clampedY
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position.dock, position.x, position.y]);

  if (!isTouch || !activeTab) {
    return null;
  }

  const handleNavigateNext = () => {
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

    // Determine if the target variable requires scrolling to be present in the visible viewport
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

    // Dispatch selection + scroll via native view.dispatch spec
    view.dispatch({
      selection: { anchor: target.from, head: target.to },
      scrollIntoView: true
    });

    // If scrolling is required, ensure smooth centering in viewport
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
        } catch {
          // Handled by native view dispatch scrollIntoView
        }
      });
    }

    view.focus();
  };

  const handleDoubleTapAction = () => {
    openVariableModal();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only drag on primary pointer (left click or touch/stylus)
    if (e.button !== 0) return;
    e.stopPropagation();

    const btn = buttonRef.current;
    if (!btn) return;

    try {
      btn.setPointerCapture?.(e.pointerId);
    } catch {
      // Fallback
    }

    const btnRect = btn.getBoundingClientRect();
    const parent = (btn.offsetParent as HTMLElement) || btn.parentElement;
    const parentRect = parent ? parent.getBoundingClientRect() : btnRect;

    const initialX = btnRect.left - parentRect.left;
    const initialY = btnRect.top - parentRect.top;

    dragRef.current = {
      isDown: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX,
      initialY,
      currentX: initialX,
      currentY: initialY,
      grabOffsetX: e.clientX - btnRect.left,
      grabOffsetY: e.clientY - btnRect.top,
      hasMoved: false,
      startTime: Date.now()
    };

    setIsPressed(true);

    const onPointerMove = (ev: PointerEvent) => {
      if (!dragRef.current.isDown) return;

      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      // 5px threshold to separate drag from click
      if (!dragRef.current.hasMoved && Math.hypot(dx, dy) > 5) {
        dragRef.current.hasMoved = true;
        setIsDragging(true);
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
      }

      if (dragRef.current.hasMoved && btn) {
        ev.preventDefault();
        const pRect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
        const rawX = (ev.clientX - pRect.left) - dragRef.current.grabOffsetX;
        const rawY = (ev.clientY - pRect.top) - dragRef.current.grabOffsetY;

        const clampedX = Math.max(8, Math.min(pRect.width - 44, rawX));
        const clampedY = Math.max(8, Math.min(pRect.height - 44, rawY));

        dragRef.current.currentX = clampedX;
        dragRef.current.currentY = clampedY;

        // Instant 120fps direct transform update during active drag
        btn.style.transition = 'none';
        btn.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0)`;
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setIsPressed(false);
      const wasDown = dragRef.current.isDown;
      const wasMoved = dragRef.current.hasMoved;
      const curX = dragRef.current.currentX;
      const curY = dragRef.current.currentY;

      dragRef.current.isDown = false;
      setIsDragging(false);

      if (!wasDown) return;

      if (wasMoved && btn) {
        // Snap magnetically to the nearest horizontal edge (left: 12px, right: width - 48px)
        const pRect = parent ? parent.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
        const snapLeft = curX < pRect.width / 2;
        const snappedX = snapLeft ? 12 : Math.max(12, pRect.width - 48);

        btn.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
        btn.style.transform = `translate3d(${snappedX}px, ${curY}px, 0)`;

        setPosition({
          x: snappedX,
          y: curY,
          dock: snapLeft ? 'left' : 'right'
        });
        return;
      }

      // Tap handling (Single tap to scroll, Double tap to fill)
      const now = Date.now();
      const timeSinceLast = now - lastTapRef.current;

      if (timeSinceLast < 320 && timeSinceLast > 0) {
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

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: false });
    window.addEventListener('pointercancel', onPointerUp, { passive: false });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigateNext();
    }
  };

  const isCustomPositioned = position.x !== null && position.y !== null;

  const buttonStyle: React.CSSProperties = isCustomPositioned
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        touchAction: 'none',
        zIndex: 20
      }
    : {
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        touchAction: 'none',
        zIndex: 20
      };

  return (
    <button
      ref={buttonRef}
      type="button"
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      style={buttonStyle}
      title="Tap: Jump to next {{variable}} • Double-tap: Quick form fill • Drag to move and anchor to edges"
      aria-label={`Variable navigation button. ${variableCount} variables in file, tap to jump to next variable, double-tap to open form filler, drag to reposition`}
      className={`flex items-center justify-center w-9 h-9 rounded-full shadow-md border backdrop-blur-md transition-colors select-none cursor-grab active:cursor-grabbing ${
        isPressed ? 'ring-2 ring-[var(--accent-primary)]/40' : ''
      } ${
        isDragging ? 'shadow-xl opacity-95' : ''
      } ${
        variableCount > 0
          ? 'bg-[var(--card-bg)]/95 text-[var(--accent-primary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:bg-[var(--card-bg)]'
          : 'bg-[var(--card-bg)]/80 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] hover:bg-[var(--card-bg)]'
      }`}
    >
      <Variable className="w-4 h-4 shrink-0 pointer-events-none" />

      {/* Small badge showing variable count if > 0 */}
      {variableCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs pointer-events-none">
          {variableCount > 9 ? '9+' : variableCount}
        </span>
      )}
    </button>
  );
};
