import React from 'react';
import { TabBar } from '../components/TabBar/TabBar';
import { Editor } from '../components/Editor/Editor';
import { LivePreview } from '../components/Preview/LivePreview';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';
import { MobileAccessoryBar } from '../components/Mobile/MobileAccessoryBar';
import { VariableFloatingNavigator } from '../components/Editor/VariableFloatingNavigator';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../primitives/Button';

export interface ShellEditorContainerProps {
  className?: string;
  showAccessoryBar?: boolean;
}

export const ShellEditorContainer: React.FC<ShellEditorContainerProps> = ({
  className = '',
  showAccessoryBar
}) => {
  const { tabs, activeTabId, createTab } = useTabStore();
  const { settings } = useSettingsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isAccessoryBarVisible = showAccessoryBar !== undefined ? showAccessoryBar : (settings.showMobileAccessoryBar !== false);

  return (
    <main className={`flex-1 flex flex-col min-w-0 bg-[var(--editor-bg)] overflow-hidden relative z-0 ${className}`}>
      {/* Document Tab Bar */}
      <TabBar />

      {/* Editor Surface or Empty State */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab ? (
          <div className="w-full h-full overflow-hidden flex">
            <div className={`h-full overflow-hidden ${settings.showLivePreview ? 'w-1/2 border-r border-[var(--border-subtle)]' : 'w-full'}`}>
              <ErrorBoundary fallbackTitle="Editor Canvas Error">
                <Editor
                  key={activeTab.id}
                  tabId={activeTab.id}
                  content={activeTab.content}
                  language={activeTab.language}
                />
              </ErrorBoundary>
            </div>
            {settings.showLivePreview && (
              <div className="w-1/2 h-full overflow-hidden">
                <ErrorBoundary fallbackTitle="Live Preview Error">
                  <LivePreview content={activeTab.content} />
                </ErrorBoundary>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-muted)] p-6 text-center select-none">
            <div className="w-16 h-16 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-subtle)] flex items-center justify-center mb-4 shadow-xs">
              <FileText className="w-8 h-8 text-[var(--accent-primary)] opacity-60" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">No document open</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 mb-5 max-w-sm">
              Create a new document or open an existing file to start writing and refining context prompts.
            </p>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => createTab()}
              aria-label="Create New Document"
              title="Create New Document"
            />
          </div>
        )}

        {/* Floating Variable Navigator & Quick-Fill Button (Touch Mode) */}
        <VariableFloatingNavigator />
      </div>

      {/* Quick Markdown Formatting Toolbar */}
      {activeTab && isAccessoryBarVisible && <MobileAccessoryBar />}
    </main>
  );
};
