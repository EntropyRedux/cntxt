import React from 'react';
import { useRibbonStore } from '../../store/ribbonStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useActionStore } from '../../store/actionStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useImageModalStore } from '../../store/imageModalStore';
import { executeFormatting } from '../../services/editor/formattingService';
import { FormulaEngine } from '../../services/formulaParser';
import { RibbonIcon } from './RibbonIcon';
import { AppUiEvents } from '../../ui-contract/actionContract';
import { useRuntimeBridge } from '../../adapters';
import { 
  SlidersHorizontal, 
  FileCode2, 
  Eye, 
  Plus, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export interface ModularRibbonProps {
  events?: AppUiEvents;
}

export const ModularRibbon: React.FC<ModularRibbonProps> = ({ events }) => {
  const bridge = useRuntimeBridge();
  const { items, openCustomizer } = useRibbonStore();
  const { settings, toggleEditorMode, setActiveSidebarTab } = useSettingsStore();
  const { tabs, activeTabId, createTab, updateTabContent, insertTextAtCursor } = useTabStore();
  const { templates, openVariableModal } = useTemplateStore();
  const { actions, executeAction } = useActionStore();
  const { workflows } = useWorkflowStore();
  const { addNotification } = useNotificationStore();
  const { openImageModal } = useImageModalStore();

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleButtonClick = (item: (typeof items)[0]) => {
    switch (item.type) {
      case 'tool': {
        switch (item.targetId) {
          case 'variable-modal':
            openVariableModal();
            break;
          case 'tokens':
            setActiveSidebarTab('tokens');
            break;
          case 'formulas':
            setActiveSidebarTab('formulas');
            break;
          case 'outline':
            setActiveSidebarTab('outline');
            break;
          case 'templates':
            setActiveSidebarTab('templates');
            break;
          case 'explorer':
            setActiveSidebarTab('explorer');
            break;
          case 'toggle-view':
            toggleEditorMode();
            break;
          case 'command-palette':
            events?.onOpenCommandPalette();
            break;
          case 'new-doc':
            createTab();
            break;
          case 'save-file':
            events?.onSaveFile();
            break;
          case 'insert-image-modal':
            openImageModal();
            break;
          default:
            break;
        }
        break;
      }

      case 'action': {
        if (!item.targetId || !activeTab) return;
        const formulaEngine = new FormulaEngine({
          lineCount: activeTab.content.split('\n').length,
          charCount: activeTab.content.length,
          wordCount: (activeTab.content.trim().match(/\S+/g) || []).length
        });

        executeAction(item.targetId, {
          getText: () => activeTab.content,
          setText: (newText: string) => updateTabContent(activeTab.id, newText),
          getSelection: () => window.getSelection()?.toString() || '',
          replaceSelection: (replacement: string) => {
            const sel = window.getSelection()?.toString();
            if (sel && activeTab.content.includes(sel)) {
              updateTabContent(activeTab.id, activeTab.content.replace(sel, replacement));
            } else {
              insertTextAtCursor(activeTab.id, replacement);
            }
          },
          insertText: (text: string) => {
            insertTextAtCursor(activeTab.id, text);
          },
          getCursor: () => ({ line: activeTab.cursorLine || 1, col: activeTab.cursorCol || 1 }),
          setCursor: () => {},
          toast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => {
            addNotification('Ribbon Action', msg, type || 'info');
          },
          copyToClipboard: async (text: string) => {
            await bridge.clipboard.writeText(text);
          },
          getClipboard: async () => {
            try {
              return await bridge.clipboard.readText();
            } catch {
              return '';
            }
          },
          openTab: (title: string, content: string, language?: string) => {
            createTab(title, content, (language || 'markdown') as any);
          },
          openVariableModal: () => {
            openVariableModal();
          },
          evaluateFormula: (f: string) => formulaEngine.evaluate(f).value
        });
        break;
      }

      case 'workflow': {
        if (!item.targetId || !activeTab) return;
        const wf = workflows.find(w => w.id === item.targetId);
        if (wf) {
          insertTextAtCursor(activeTab.id, `\n\n${wf.content}`);
          addNotification('Workflow Inserted', `Added ${wf.name} blueprint to document`, 'success');
        }
        break;
      }

      case 'template': {
        if (!item.targetId || !activeTab) return;
        const tpl = templates.find(t => t.id === item.targetId);
        if (tpl) {
          insertTextAtCursor(activeTab.id, `\n\n${tpl.content}`);
          addNotification('Template Inserted', `Added ${tpl.name} template`, 'success');
        }
        break;
      }

      case 'formatting': {
        const fmtButtons = useFormattingStore.getState().buttons;
        const fmtBtn = fmtButtons.find(b => b.id === item.targetId || b.id === item.id);
        if (fmtBtn) {
          executeFormatting(fmtBtn, activeTab?.id);
        }
        break;
      }

      default:
        break;
    }
  };

  // Exclude toggle-view from ribbon items since it is now permanently in the top bar
  const activeItems = items.filter(i => i.enabled && i.targetId !== 'toggle-view');

  return (
    <div className="h-8 bg-[var(--titlebar-bg)]/80 border-b border-[var(--border-subtle)] px-3 flex items-center justify-between text-xs shrink-0 select-none">
      {/* Dynamic Ribbon Buttons Scroll Area */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {activeItems.map((item) => {
          const colorClass = 
            item.color === 'amber' ? 'text-amber-500' :
            item.color === 'emerald' ? 'text-emerald-500' :
            item.color === 'purple' ? 'text-purple-500' :
            item.color === 'rose' ? 'text-rose-500' :
            item.color === 'cyan' ? 'text-cyan-500' :
            item.color === 'blue' ? 'text-blue-500' :
            'text-[var(--accent-primary)]';

          // If button is view toggle, show current dynamic state
          const isViewToggle = item.type === 'tool' && item.targetId === 'toggle-view';
          const isRendered = settings.editorMode === 'rendered';
          const dynamicLabel = isViewToggle 
            ? (isRendered ? 'Rendered View' : 'Raw Markdown') 
            : item.label;
          const tooltipText = [
            dynamicLabel,
            item.shortcut ? `(${item.shortcut})` : '',
            item.tooltip && item.tooltip !== dynamicLabel ? `— ${item.tooltip}` : ''
          ].filter(Boolean).join(' ');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleButtonClick(item)}
              title={tooltipText}
              aria-label={dynamicLabel}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0"
            >
              {isViewToggle ? (
                isRendered ? (
                  <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                )
              ) : (
                <RibbonIcon name={item.icon} className={`w-3.5 h-3.5 ${colorClass}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Ribbon Customizer Quick Access Button */}
      <div className="flex items-center gap-1 pl-2 border-l border-[var(--border-subtle)] shrink-0 ml-1">
        <button
          type="button"
          onClick={openCustomizer}
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0"
          title="Customize Ribbon (Add, reorder, or pin custom actions)"
          aria-label="Customize Ribbon"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
