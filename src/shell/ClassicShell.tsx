import React from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellSidebar } from './ShellSidebar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { ShellStatusBar } from './ShellStatusBar';
import { ModularRibbon } from '../components/Ribbon/ModularRibbon';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { useSettingsStore } from '../store/settingsStore';
import { AppUiEvents } from '../ui-contract/actionContract';

export interface ShellLayoutProps {
  events: AppUiEvents;
}

export const ClassicShell: React.FC<ShellLayoutProps> = ({
  events,
}) => {
  const { settings } = useSettingsStore();

  const isTouch = settings.touchOptimized;
  const showActivityBar = settings.showActivityBar !== false;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {/* 1. Desktop Title Bar */}
      <ShellTitleBar 
        events={events}
      />

      {/* 2. Modular Ribbon Toolbox */}
      <ModularRibbon events={events} />

      {/* 3. Workspace Row: Left Rail aligns directly with TabBar row */}
      <div className="flex-1 flex overflow-hidden relative">
        {showActivityBar && !isTouch && <ActivityBar orientation="vertical" />}

        {/* Central Workspace Column: Editor & Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          <ShellEditorContainer />
          <ShellSidebar />
        </div>
      </div>

      {/* Touch Mode: Left rail buttons moved to the bottom, positioned directly above the status bar without covering it */}
      {showActivityBar && isTouch && (
        <ActivityBar orientation="bottom" />
      )}

      {/* 3. Status Bar */}
      <ShellStatusBar />
    </div>
  );
};
