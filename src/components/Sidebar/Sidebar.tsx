import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { FileExplorer } from './FileExplorer';
import { OutlinePanel } from './OutlinePanel';
import { TemplateManager } from './TemplateManager';
import { ActionManager } from './ActionManager';
import { WorkflowManager } from './WorkflowManager';
import { TokenAnalytics } from './TokenAnalytics';
import { FormulaPlayground } from './FormulaPlayground';
import { SettingsPanel } from './SettingsPanel';
import { X, ChevronRight, PanelRightClose } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { settings, toggleSidebar } = useSettingsStore();
  const [width, setWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  if (!settings.showSidebar) {
    return null;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobileScreen) return;
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const activityBarWidth = settings.showActivityBar ? 48 : 0;
      const newWidth = Math.max(200, Math.min(600, window.innerWidth - moveEvent.clientX - activityBarWidth));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const getTabTitle = () => {
    switch (settings.activeSidebarTab) {
      case 'explorer': return 'File Explorer';
      case 'outline': return 'Document Outline';
      case 'templates': return 'Templates & Variables';
      case 'actions': return 'Action Scripts';
      case 'workflows': return 'Workflows';
      case 'tokens': return 'Token Analytics';
      case 'formulas': return 'Formula Playground';
      case 'settings': return 'Preferences & Themes';
      default: return 'Workspace Panel';
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

  // Mobile / Tablet Slide-Over Drawer
  if (isMobileScreen) {
    return (
      <>
        {/* Dimmed Backdrop */}
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        />

        {/* Slide-Over Drawer Container */}
        <aside
          role="dialog"
          aria-modal="true"
          aria-label={getTabTitle()}
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] max-w-[92vw] h-full theme-sidebar shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 ease-out"
        >
          {/* Mobile Drawer Header with Touch Dismiss */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[var(--text-primary)]">
                {getTabTitle()}
              </span>
            </div>

            <button
              onClick={toggleSidebar}
              aria-label="Close sidebar drawer"
              className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </aside>
      </>
    );
  }

  // Desktop Docked Sidebar
  return (
    <aside
      style={{ width: `${width}px` }}
      aria-label="Secondary Sidebar Navigation"
      className="theme-sidebar h-full flex flex-col relative shrink-0 z-10 select-none transition-none shadow-sm"
    >
      {/* Left-edge Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        aria-label="Resize sidebar"
        role="separator"
        className={`absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-[var(--accent-primary)]/50 transition-colors z-30 ${
          isResizing ? 'bg-[var(--accent-primary)] w-1.5' : ''
        }`}
      />

      {/* Tab Panel View */}
      <div className="flex-1 h-full overflow-hidden">
        {renderContent()}
      </div>
    </aside>
  );
};
