import React from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellSidebar } from './ShellSidebar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { ShellStatusBar } from './ShellStatusBar';
import { ModularRibbon } from '../components/Ribbon/ModularRibbon';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { useSettingsStore } from '../store/settingsStore';
import { AppUiEvents } from '../ui-contract/actionContract';

export interface PrototypeShellProps {
  events: AppUiEvents;
}

export const PrototypeShell: React.FC<PrototypeShellProps> = ({
  events,
}) => {
  const { settings } = useSettingsStore();

  const isTouch = settings.touchOptimized;
  const showActivityBar = settings.showActivityBar !== false;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {/* 1. Header */}
      <ShellTitleBar 
        events={events}
      />

      {/* 2. Modular Ribbon Toolbox */}
      <ModularRibbon events={events} />

      {/* 3. Workspace Row: Left Rail aligns directly with TabBar row */}
      <div className="flex-1 flex overflow-hidden relative">
        {showActivityBar && !isTouch && <ActivityBar orientation="vertical" />}

        <div className="flex-1 flex overflow-hidden relative">
          <ShellEditorContainer />
          <ShellSidebar />
        </div>
      </div>

      {/* Touch Mode: Left rail buttons moved to the bottom, above status bar */}
      {showActivityBar && isTouch && (
        <ActivityBar orientation="bottom" />
      )}

      {/* 4. Status Bar */}
      <ShellStatusBar />
    </div>
  );
};
