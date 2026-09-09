import React from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellSidebar } from './ShellSidebar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { ShellStatusBar } from './ShellStatusBar';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { MobileAccessoryBar } from '../components/Mobile/MobileAccessoryBar';
import { MobileBottomNav } from '../components/Mobile/MobileBottomNav';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { AppUiEvents } from '../ui-contract/actionContract';
import { ShellMode } from '../ui-contract/appShellContract';

export interface ShellLayoutProps {
  events: AppUiEvents;
  shellMode: ShellMode;
  onShellModeChange: (mode: ShellMode) => void;
}

export const ClassicShell: React.FC<ShellLayoutProps> = ({
  events,
  shellMode,
  onShellModeChange,
}) => {
  const { settings } = useSettingsStore();
  const { activeTabId } = useTabStore();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {/* 1. Desktop Title Bar */}
      <ShellTitleBar 
        events={events}
        shellMode={shellMode}
        onShellModeChange={onShellModeChange}
      />

      {/* 2. Workspace Row */}
      <div className="flex-1 flex overflow-hidden relative">
        <ShellEditorContainer />
        <ShellSidebar />
        {settings.showActivityBar && <ActivityBar />}
      </div>

      {/* 3. Mobile Accessory & Navigation */}
      {activeTabId && <MobileAccessoryBar />}
      <ShellStatusBar />
      <MobileBottomNav />
    </div>
  );
};
