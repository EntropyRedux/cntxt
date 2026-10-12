import React, { Suspense, lazy, useEffect } from 'react';
import { TabBar } from '../components/TabBar/TabBar';
import { ErrorBoundary } from '../components/Common/ErrorBoundary';
import { MobileAccessoryBar } from '../components/Mobile/MobileAccessoryBar';
import { VariableFloatingNavigator } from '../components/Editor/VariableFloatingNavigator';
import { EditorSkeleton } from '../components/Editor/EditorSkeleton';
import { useTabStore } from '../store/tabStore';
import { useSettingsStore } from '../store/settingsStore';
import { useRuntimeBridge } from '../adapters';
import { FileText, Plus } from 'lucide-react';
import { Button } from '../primitives/Button';

// ── Lazy chunks ──────────────────────────────────────────────────────────────
// Editor and LivePreview are split into their own async chunks so CodeMirror
// and heavy engines are excluded from the synchronous main bundle. The shell chrome
// (TitleBar, Ribbon, TabBar, StatusBar) paints immediately; the skeleton
// shimmers for ~200–400 ms while the CM chunk downloads and executes.
const Editor = lazy(() =>
  import('../components/Editor/Editor').then(m => ({ default: m.Editor }))
);
const TerminalView = lazy(() =>
  import('../components/Terminal/TerminalView').then(m => ({ default: m.TerminalView }))
);
// ─────────────────────────────────────────────────────────────────────────────

export interface ShellEditorContainerProps {
  className?: string;
  showAccessoryBar?: boolean;
}

export const ShellEditorContainer: React.FC<ShellEditorContainerProps> = ({
  className = '',
  showAccessoryBar
}) => {
  const bridge = useRuntimeBridge();
  const isWeb = !bridge.window.isNative;
  const { tabs, activeTabId, createTab, isHydrating } = useTabStore();
  const { settings } = useSettingsStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const isAccessoryBarVisible = showAccessoryBar !== undefined ? showAccessoryBar : (settings.showMobileAccessoryBar !== false);

  // Defer heavy module loading (Mermaid / KaTeX) until AFTER the app UI has fully rendered,
  // and ONLY if the active tab document actually contains diagrams or math!
  useEffect(() => {
    if (!activeTab?.content) return;
    const content = activeTab.content;

    const hasMermaid = /(```+|~~~+)mermaid\b/i.test(content);
    const hasMath = /\$\$|(?<!\$)\$(?!\$)[^\$\n]+?(?<!\$)\$(?!\$)|(```+|~~~+)(?:latex|math|katex)\b/i.test(content);

    if (!hasMermaid && !hasMath) return;

    // Load after the initial UI paint has finished without blocking the main thread
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (hasMermaid) import('../services/mermaidRenderer').then(m => m.initializeMermaid());
          if (hasMath) import('../services/mathRenderer').then(m => m.getKatex());
        }, { timeout: 3000 });
      } else {
        if (hasMermaid) import('../services/mermaidRenderer').then(m => m.initializeMermaid());
        if (hasMath) import('../services/mathRenderer').then(m => m.getKatex());
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeTab?.id, activeTab?.content]);

  return (
    <main className={`flex-1 flex flex-col min-w-0 bg-[var(--editor-bg)] overflow-hidden relative z-0 ${className}`}>
      {/* Document Tab Bar (Option A: hidden on Web, active on Desktop/Android) */}
      {!isWeb && <TabBar />}

      {/* Editor Surface or Empty State */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {activeTab ? (
          activeTab.tabType === 'terminal' ? (
            <div className="w-full h-full overflow-hidden min-h-0">
              <ErrorBoundary fallbackTitle="Terminal Canvas Error">
                <Suspense fallback={<EditorSkeleton />}>
                  <TerminalView defaultChannelId={activeTab.channelId || activeTab.id} />
                </Suspense>
              </ErrorBoundary>
            </div>
          ) : (
            <div className="w-full h-full overflow-hidden min-h-0">
              <div className="h-full overflow-hidden min-h-0 w-full">
                <ErrorBoundary fallbackTitle="Editor Canvas Error">
                  <Suspense fallback={<EditorSkeleton />}>
                    <Editor
                      tabId={activeTab.id}
                      content={activeTab.content}
                      language={activeTab.language}
                    />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>
          )
        ) : isHydrating ? (
          /* Cold-start: show skeleton while IPC loads saved tabs.
             The LCP element becomes a shell chrome element (TitleBar/TabBar)
             that paints immediately, not div.cm-line at ~16s. */
          <EditorSkeleton />
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
