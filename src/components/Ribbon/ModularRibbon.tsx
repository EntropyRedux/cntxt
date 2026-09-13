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
import { useRuntimeBridge, getSelectionText } from '../../adapters';
import { 
  SlidersHorizontal, 
  FileCode2, 
  Eye, 
  Plus, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export interface ModularRibbonProps {
  events?: AppUiEvents;
}

export const ModularRibbon: React.FC<ModularRibbonProps> = ({ events }) => {
  const bridge = useRuntimeBridge();
  const { items, openCustomizer } = useRibbonStore();
  const { settings, toggleRibbon, toggleEditorMode, setActiveSidebarTab } = useSettingsStore();
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
          getSelection: () => getSelectionText(),
          replaceSelection: (replacement: string) => {
            const sel = getSelectionText();
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

  if (!settings.showRibbon) {
    return (
      <button
        type="button"
        id="modular-ribbon-expand-btn"
        onClick={toggleRibbon}
        title="Open Modular Ribbon (Ctrl+Shift+R)"
        aria-label="Open Modular Ribbon"
        className="fixed top-[46px] left-2.5 sm:left-3 z-40 w-6 h-6 rounded-full bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-2xs flex items-center justify-center transition-all active:scale-95 group cursor-pointer"
      >
        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 stroke-[2.2]" />
      </button>
    );
  }

  return (
    <div 
      id="modular-ribbon"
      className="h-8.5 bg-[var(--titlebar-bg)] border-b border-[var(--border-primary)] px-2 flex items-center justify-between text-xs shrink-0 select-none transition-all duration-150"
    >
      {/* Left Chevron (collapses ribbon) & Dynamic Ribbon Buttons Scroll Area */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
        <button
          type="button"
          id="modular-ribbon-collapse-btn"
          onClick={toggleRibbon}
          title="Collapse Modular Ribbon (Ctrl+Shift+R)"
          aria-label="Collapse Modular Ribbon"
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>

        <div className="h-3.5 w-px bg-[var(--border-subtle)] mx-0.5 shrink-0" />

        {activeItems.map((item) => {
          const colorClass = 
            item.color === 'amber' ? 'text-amber-700 dark:text-amber-400' :
            item.color === 'emerald' ? 'text-emerald-700 dark:text-emerald-400' :
            item.color === 'purple' ? 'text-purple-700 dark:text-purple-400' :
            item.color === 'rose' ? 'text-rose-700 dark:text-rose-400' :
            item.color === 'cyan' ? 'text-teal-700 dark:text-teal-400' :
            item.color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
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
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--text-primary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 font-medium cursor-pointer"
            >
              {isViewToggle ? (
                isRendered ? (
                  <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2]" />
                ) : (
                  <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.2]" />
                )
              ) : (
                <RibbonIcon name={item.icon} className={`w-3.5 h-3.5 ${colorClass}`} strokeWidth={2.2} />
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
          className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-hover-bg)] active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Customize Ribbon (Add, reorder, or pin custom actions)"
          aria-label="Customize Ribbon"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
};
