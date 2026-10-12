import React from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellSidebar } from './ShellSidebar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { ShellStatusBar } from './ShellStatusBar';
import { ModularRibbon } from '../components/Ribbon/ModularRibbon';
import { ActivityBar } from '../components/ActivityBar/ActivityBar';
import { WebHeader } from '../components/Header/WebHeader';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';
import { useRuntimeBridge } from '../adapters';
import { useSettingsStore } from '../store/settingsStore';
import { AppUiEvents } from '../ui-contract/actionContract';
import { OmniFloatingChat } from '../components/OmniTerminal/OmniFloatingChat';

export interface ShellLayoutProps {
  events: AppUiEvents;
  isHeaderHidden?: boolean;
  onOpenOnboarding?: () => void;
}

export const ClassicShell: React.FC<ShellLayoutProps> = ({
  events,
  isHeaderHidden = false,
  onOpenOnboarding,
}) => {
  const bridge = useRuntimeBridge();
  const isWeb = !bridge.window.isNative;
  const { settings } = useSettingsStore();

  const isTouch = settings.touchOptimized;
  const showActivityBar = settings.showActivityBar !== false;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {isWeb ? (
        <>
          <ErrorBoundary fallbackTitle="Web Header Error">
            <WebHeader
              events={events}
              isAutoHidden={isHeaderHidden}
              onOpenOnboarding={onOpenOnboarding}
            />
          </ErrorBoundary>
          {settings.showRibbon !== false && (
            <ErrorBoundary fallbackTitle="Ribbon Error">
              <ModularRibbon events={events} />
            </ErrorBoundary>
          )}
        </>
      ) : (
        <>
          {/* 1. Desktop Title Bar */}
          <ShellTitleBar events={events} />

          {/* 2. Modular Ribbon Toolbox */}
          <ErrorBoundary fallbackTitle="Ribbon Error">
            <ModularRibbon events={events} />
          </ErrorBoundary>
        </>
      )}

      {/* 3. Workspace Row: Left Rail aligns directly with TabBar row */}
      <div className="flex-1 flex overflow-hidden relative">
        {showActivityBar && !isTouch && <ActivityBar orientation="vertical" />}

        {/* Central Workspace Column: Editor & Sidebar */}
        <div className="flex-1 flex overflow-hidden relative">
          <ErrorBoundary fallbackTitle="Editor Container Error">
            <ShellEditorContainer />
          </ErrorBoundary>
          <ErrorBoundary fallbackTitle="Sidebar Error">
            <ShellSidebar />
          </ErrorBoundary>
        </div>
      </div>

      {/* Touch Mode: Left rail buttons moved to the bottom, positioned directly above the status bar without covering it */}
      {showActivityBar && isTouch && (
        <ActivityBar orientation="bottom" />
      )}

      {/* 3. Status Bar */}
      <ShellStatusBar />

      {/* 4. Omni Terminal Floating Overlay */}
      <ErrorBoundary fallbackTitle="Floating Chat Error">
        <OmniFloatingChat />
      </ErrorBoundary>
    </div>
  );
};
