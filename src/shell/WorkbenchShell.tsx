import React, { useState } from 'react';
import { ShellTitleBar } from './ShellTitleBar';
import { ShellStatusBar } from './ShellStatusBar';
import { ShellEditorContainer } from './ShellEditorContainer';
import { useSettingsStore } from '../store/settingsStore';
import { useTabStore } from '../store/tabStore';
import { useTemplateStore } from '../store/templateStore';
import { useActionStore } from '../store/actionStore';
import { useNotificationStore } from '../store/notificationStore';
import { FormulaEngine } from '../services/formulaParser';
import { AppUiEvents } from '../ui-contract/actionContract';
import { ShellMode } from '../ui-contract/appShellContract';
import { TokenAnalytics } from '../components/Sidebar/TokenAnalytics';
import { Card } from '../primitives/Card';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { 
  Sliders, 
  Variable, 
  Zap, 
  Play, 
  FileText, 
  Layers, 
  Sparkles,
  ChevronRight,
  Calculator
} from 'lucide-react';

export interface WorkbenchShellProps {
  events: AppUiEvents;
  shellMode: ShellMode;
  onShellModeChange: (mode: ShellMode) => void;
}

export const WorkbenchShell: React.FC<WorkbenchShellProps> = ({
  events,
  shellMode,
  onShellModeChange,
}) => {
  const { tabs, activeTabId } = useTabStore();
  const { templates, openVariableModal } = useTemplateStore();
  const { actions, executeAction } = useActionStore();
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'tokens' | 'variables' | 'actions'>('tokens');

  const activeTab = tabs.find(t => t.id === activeTabId);

  // Extract variables in current content
  const detectedVariables = React.useMemo(() => {
    if (!activeTab?.content) return [];
    const matches = activeTab.content.matchAll(/\{\{([^}]+)\}\}/g);
    const set = new Set<string>();
    for (const match of matches) {
      if (match[1]?.trim()) {
        set.add(match[1].trim());
      }
    }
    return Array.from(set);
  }, [activeTab?.content]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden select-none bg-[var(--app-bg)] font-sans">
      {/* 1. Header */}
      <ShellTitleBar 
        events={events}
        shellMode={shellMode}
        onShellModeChange={onShellModeChange}
      />

      {/* 2. Workbench Top Banner */}
      <div className="h-9 bg-[var(--titlebar-bg)]/90 border-b border-[var(--border-subtle)] px-4 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="accent" size="sm" dot>
            AI Prompt Workbench
          </Badge>
          <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
            Optimized for LLM context generation, token optimization & formula testing
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="accent"
            size="xs"
            icon={Variable}
            onClick={openVariableModal}
          >
            Fill Variables
          </Button>
        </div>
      </div>

      {/* 3. Main Split View: Editor on Left, Dedicated Prompt Tools on Right */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Editor */}
        <ShellEditorContainer className="border-r border-[var(--border-primary)]" />

        {/* Workbench Dedicated Right Panel */}
        <aside className="w-80 lg:w-96 h-full bg-[var(--sidebar-bg)] flex flex-col shrink-0 overflow-hidden border-l border-[var(--border-primary)]">
          {/* Panel Selector Tabs */}
          <div className="flex items-center h-10 border-b border-[var(--border-primary)] bg-[var(--titlebar-bg)]/40 px-2 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('tokens')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeWorkbenchTab === 'tokens'
                  ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Tokens & Budget</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('variables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeWorkbenchTab === 'variables'
                  ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Variable className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Variables ({detectedVariables.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveWorkbenchTab('actions')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeWorkbenchTab === 'actions'
                  ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-emerald-500" />
              <span>Actions</span>
            </button>
          </div>

          {/* Workbench Body */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeWorkbenchTab === 'tokens' && (
              <div className="h-full">
                <TokenAnalytics />
              </div>
            )}

            {activeWorkbenchTab === 'variables' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                    Detected Template Tags
                  </h3>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={openVariableModal}
                  >
                    Open Form
                  </Button>
                </div>

                {detectedVariables.length === 0 ? (
                  <div className="p-4 text-center rounded-lg border border-dashed border-[var(--border-primary)] text-[var(--text-muted)] text-xs">
                    No <code className="text-[var(--accent-primary)] font-mono">{`{{variable}}`}</code> tags detected in current document.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detectedVariables.map((v, i) => (
                      <Card key={i} variant="default" padding="sm" className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                          <span className="font-mono text-xs font-medium text-[var(--text-primary)]">
                            {v}
                          </span>
                        </div>
                        <Badge variant="accent" size="xs">
                          {`{{${v}}}`}
                        </Badge>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeWorkbenchTab === 'actions' && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                  Prompt Transformations & Automations
                </h3>
                {actions.map((act) => (
                  <Card
                    key={act.id}
                    variant="interactive"
                    padding="sm"
                    onClick={() => {
                      if (!activeTab) return;
                      const formulaEngine = new FormulaEngine({
                        lineCount: activeTab.content.split('\n').length,
                        charCount: activeTab.content.length,
                        wordCount: (activeTab.content.trim().match(/\S+/g) || []).length
                      });
                      executeAction(act.id, {
                        getText: () => activeTab.content,
                        setText: (newText: string) => useTabStore.getState().updateTabContent(activeTab.id, newText),
                        getSelection: () => window.getSelection()?.toString() || '',
                        replaceSelection: (replacement: string) => {
                          const selection = window.getSelection()?.toString();
                          if (selection && activeTab.content.includes(selection)) {
                            useTabStore.getState().updateTabContent(activeTab.id, activeTab.content.replace(selection, replacement));
                          } else {
                            useTabStore.getState().insertTextAtCursor(activeTab.id, replacement);
                          }
                        },
                        insertText: (text: string) => {
                          useTabStore.getState().insertTextAtCursor(activeTab.id, text);
                        },
                        getCursor: () => ({ line: activeTab.cursorLine || 1, col: activeTab.cursorCol || 1 }),
                        setCursor: (_line: number, _col: number) => {},
                        toast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => {
                          useNotificationStore.getState().addNotification('Action Output', msg, type || 'info');
                        },
                        copyToClipboard: async (text: string) => {
                          await navigator.clipboard.writeText(text);
                        },
                        getClipboard: async () => {
                          try {
                            return await navigator.clipboard.readText();
                          } catch {
                            return '';
                          }
                        },
                        openTab: (title: string, content: string, language?: string) => {
                          useTabStore.getState().createTab(title, content, (language || 'markdown') as any);
                        },
                        openVariableModal: () => {
                          useTemplateStore.getState().openVariableModal();
                        },
                        evaluateFormula: (f: string) => formulaEngine.evaluate(f).value
                      });
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Play className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
                      <div>
                        <div className="text-xs font-medium text-[var(--text-primary)]">{act.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{act.description}</div>
                      </div>
                    </div>
                    {act.shortcut && <Badge size="xs">{act.shortcut}</Badge>}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* 4. Status Bar */}
      <ShellStatusBar />
    </div>
  );
};
