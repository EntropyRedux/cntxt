import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useRuntimeBridge } from '../../adapters';
import { FileExplorer } from './FileExplorer';
import { OutlinePanel } from './OutlinePanel';
import { TemplateManager } from './TemplateManager';
import { ActionManager } from './ActionManager';
import { WorkflowManager } from './WorkflowManager';
import { TokenAnalytics } from './TokenAnalytics';
import { FormulaPlayground } from './FormulaPlayground';
import { SettingsPanel } from './SettingsPanel';
import { 
  PanelRightClose, 
  FolderTree, 
  ListTree, 
  LayoutTemplate, 
  Terminal, 
  Workflow, 
  Coins, 
  Calculator, 
  Settings,
  Sparkles
} from 'lucide-react';

const STORAGE_KEY = 'contextpad_sidepanel_width';
const DEFAULT_DESKTOP_WIDTH = 340;

export const Sidebar: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { settings, toggleSidebar } = useSettingsStore();
  const panelRef = useRef<HTMLElement>(null);

  // Initialize width from bridge storage or screen dimensions
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        return Math.max(220, Math.round(window.innerWidth - 60));
      }
      if (window.innerWidth < 1024) {
        return 300;
      }
      return DEFAULT_DESKTOP_WIDTH;
    }
    return DEFAULT_DESKTOP_WIDTH;
  });

  useEffect(() => {
    bridge.storage.getItem(STORAGE_KEY).then(saved => {
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 180 && parsed <= 1200) {
          setWidth(parsed);
        }
      }
    }).catch(() => {});
  }, [bridge.storage]);

  const [isResizing, setIsResizing] = useState(false);

  // Clamp width whenever the window size changes
  useEffect(() => {
    const handleResize = () => {
      const maxAvailable = Math.max(200, window.innerWidth - 80);
      setWidth(prev => (prev > maxAvailable ? maxAvailable : prev));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset width to sensible default
  const handleResetWidth = useCallback(() => {
    const target = typeof window !== 'undefined' && window.innerWidth < 640
      ? Math.max(220, window.innerWidth - 80)
      : DEFAULT_DESKTOP_WIDTH;

    setWidth(target);
    bridge.storage.setItem(STORAGE_KEY, String(target)).catch(() => {});
  }, [bridge.storage]);

  // Drag resizer: Mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    setIsResizing(true);

    const rightEdge = panelRef.current 
      ? panelRef.current.getBoundingClientRect().right 
      : window.innerWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const newWidth = rightEdge - moveEvent.clientX;
      const containerWidth = window.innerWidth;
      const minWidth = Math.min(220, Math.max(160, Math.floor(containerWidth * 0.25)));
      const maxWidth = Math.max(minWidth, containerWidth - 80);
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setWidth(clamped);
      bridge.storage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [bridge.storage]);

  // Drag resizer: Touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsResizing(true);

    const rightEdge = panelRef.current 
      ? panelRef.current.getBoundingClientRect().right 
      : window.innerWidth;

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const clientX = moveEvent.touches[0].clientX;
      const newWidth = rightEdge - clientX;
      const containerWidth = window.innerWidth;
      const minWidth = Math.min(220, Math.max(160, Math.floor(containerWidth * 0.25)));
      const maxWidth = Math.max(minWidth, containerWidth - 60);
      const clamped = Math.max(minWidth, Math.min(maxWidth, newWidth));

      setWidth(clamped);
      bridge.storage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
    };

    const onTouchEnd = () => {
      setIsResizing(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
  }, []);

  if (!settings.showSidebar) {
    return null;
  }

  const getTabInfo = () => {
    switch (settings.activeSidebarTab) {
      case 'explorer':
        return { title: 'File Explorer', icon: FolderTree };
      case 'outline':
        return { title: 'Document Outline', icon: ListTree };
      case 'templates':
        return { title: 'Templates & Variables', icon: LayoutTemplate };
      case 'actions':
        return { title: 'Action Scripts', icon: Terminal };
      case 'workflows':
        return { title: 'Workflows', icon: Workflow };
      case 'tokens':
        return { title: 'Token Analytics', icon: Coins };
      case 'formulas':
        return { title: 'Formula Playground', icon: Calculator };
      case 'settings':
        return { title: 'Preferences', icon: Settings };
      default:
        return { title: 'Side Panel', icon: Sparkles };
    }
  };

  const renderContent = () => {
    switch (settings.activeSidebarTab) {
      case 'explorer':
        return <FileExplorer />;
      case 'outline':
        return <OutlinePanel />;
      case 'templates':
        return <TemplateManager />;
      case 'actions':
        return <ActionManager />;
      case 'workflows':
        return <WorkflowManager />;
      case 'tokens':
        return <TokenAnalytics />;
      case 'formulas':
        return <FormulaPlayground />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <TemplateManager />;
    }
  };

  const tabInfo = getTabInfo();
  const TabIcon = tabInfo.icon;

  return (
    <aside
      ref={panelRef}
      style={{ width: `${width}px` }}
      aria-label={tabInfo.title}
      className="theme-sidebar h-full flex flex-col relative shrink-0 z-10 select-none transition-none border-l border-[var(--border-primary)] bg-[var(--sidebar-bg)] shadow-xs"
    >
      {/* Left-edge Draggable Resizer Handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize side panel"
        title="Drag to resize · Double-click to reset"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleResetWidth}
        className={`absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-30 group flex items-center justify-center select-none touch-none ${
          isResizing ? 'cursor-col-resize' : ''
        }`}
      >
        {/* Continuous border highlight line */}
        <div
          className={`w-0.5 h-full transition-colors ${
            isResizing
              ? 'bg-[var(--accent-primary)]'
              : 'bg-transparent group-hover:bg-[var(--accent-primary)]/60'
          }`}
        />
        {/* Subtle center grip pill */}
        <div
          className={`absolute w-1 h-8 rounded-full transition-all pointer-events-none ${
            isResizing
              ? 'bg-[var(--accent-primary)] opacity-100 scale-110 shadow-xs'
              : 'bg-[var(--text-muted)] opacity-0 group-hover:opacity-60'
          }`}
        />
      </div>

      {/* Full-viewport transparent overlay shield active during drag */}
      {isResizing && (
        <div
          className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        />
      )}

      {/* Side Panel Header */}
      <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/80 backdrop-blur-xs shrink-0 text-xs select-none">
        <div className="flex items-center gap-2 min-w-0">
          <TabIcon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span className="font-semibold text-xs truncate text-[var(--text-primary)]">
            {tabInfo.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Width indicator / quick reset */}
          <button
            type="button"
            onClick={handleResetWidth}
            title={`Current width: ${Math.round(width)}px (Click to reset)`}
            aria-label="Reset panel width"
            className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] px-1.5 py-0.5 rounded transition-colors hidden sm:inline-flex items-center"
          >
            {Math.round(width)}px
          </button>

          {/* Close Panel Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            title="Close side panel"
            aria-label="Close side panel"
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors active:scale-95"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Panel View Content */}
      <div className="flex-1 h-full overflow-hidden">
        {renderContent()}
      </div>
    </aside>
  );
};
