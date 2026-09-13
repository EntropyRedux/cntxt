import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Variable } from 'lucide-react';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
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

  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<any>(null);

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
          // Handled by EditorView.scrollIntoView
        }
      });
    }

    view.focus();
  };

  const handleDoubleTapAction = () => {
    openVariableModal();
  };

  const handleClick = (e: React.MouseEvent) => {
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
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleDoubleTapAction();
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 select-none">
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        title="Tap: Jump to next {{variable}} • Double-tap: Quick form fill"
        aria-label={`Variable navigation button. ${variableCount} variables in file, tap to jump to next variable, double-tap to open form filler`}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full shadow-md border backdrop-blur-md transition-all cursor-pointer ${
          isPressed ? 'scale-90 ring-2 ring-[var(--accent-primary)]/40' : 'active:scale-95'
        } ${
          variableCount > 0
            ? 'bg-[var(--card-bg)]/95 text-[var(--accent-primary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)]/70 hover:bg-[var(--card-bg)]'
            : 'bg-[var(--card-bg)]/80 text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-primary)] hover:bg-[var(--card-bg)]'
        }`}
      >
        <Variable className="w-4 h-4 shrink-0" />

        {/* Small badge showing variable count if > 0 */}
        {variableCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-[var(--accent-primary)] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs pointer-events-none">
            {variableCount > 9 ? '9+' : variableCount}
          </span>
        )}
      </button>
    </div>
  );
};
