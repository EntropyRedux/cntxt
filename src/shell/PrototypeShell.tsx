import React, { useState } from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellSidebar } from './ShellSidebar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { ShellStatusBar } from './ShellStatusBar';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { MobileAccessoryBar } from '../components/Mobile/MobileAccessoryBar';
import { MobileBottomNav } from '../components/Mobile/MobileBottomNav';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { AppUiEvents } from '../ui-contract/actionContract';
import { ShellMode } from '../ui-contract/appShellContract';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';
import { 
  Sparkles, 
  Variable, 
  Calculator, 
  Zap, 
  FileCode2, 
  Eye, 
  Split, 
  SlidersHorizontal 
} from 'lucide-react';

export interface PrototypeShellProps {
  events: AppUiEvents;
  shellMode: ShellMode;
  onShellModeChange: (mode: ShellMode) => void;
}

export const PrototypeShell: React.FC<PrototypeShellProps> = ({
  events,
  shellMode,
  onShellModeChange,
}) => {
  const { settings, toggleEditorMode, setActiveSidebarTab } = useSettingsStore();
  const { tabs, activeTabId } = useTabStore();
  const { openVariableModal } = useTemplateStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {/* 1. Header */}
      <ShellTitleBar 
        events={events}
        shellMode={shellMode}
        onShellModeChange={onShellModeChange}
      />

      {/* 2. Quick Access Accent Ribbon (Prototype Shell Feature) */}
      <div className="h-8 bg-[var(--titlebar-bg)]/80 border-b border-[var(--border-subtle)] px-3 flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Badge variant="accent" size="sm" dot>
            CNTXT Prototype Shell
          </Badge>

          <div className="h-3 w-px bg-[var(--border-subtle)] mx-1" />

          <button
            type="button"
            onClick={openVariableModal}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            <Variable className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Fill Variables</span>
            <kbd className="text-[9px] font-mono opacity-60">Alt+V</kbd>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('tokens')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Token Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSidebarTab('formulas')}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-500" />
            <span>Formulas</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleEditorMode}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            title="Toggle Live Rendered / Raw Markdown (Ctrl+M)"
          >
            {settings.editorMode === 'rendered' ? (
              <>
                <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Raw Markdown</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Rendered View</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Workspace Row */}
      <div className="flex-1 flex overflow-hidden relative">
        <ShellEditorContainer />
        <ShellSidebar />
        {settings.showActivityBar && <ActivityBar />}
      </div>

      {/* 4. Mobile Accessories & Status */}
      {activeTabId && <MobileAccessoryBar />}
      <ShellStatusBar />
      <MobileBottomNav />
    </div>
  );
};
