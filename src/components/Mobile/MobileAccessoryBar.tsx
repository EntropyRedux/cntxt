import React, { useState } from 'react';
import { 
  Heading1, 
  Heading2, 
  Bold, 
  Italic, 
  Code, 
  ListTodo, 
  List, 
  Quote, 
  Variable, 
  Calculator, 
  Slash, 
  Undo2, 
  Redo2, 
  Indent, 
  Outdent,
  ChevronUp,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { undo, redo, indentMore, indentLess } from '@codemirror/commands';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useSettingsStore } from '../../store/settingsStore';
import { editorRegistry } from '../../services/editor/editorRegistry';

export const MobileAccessoryBar: React.FC = () => {
  const { activeTabId } = useTabStore();
  const { openVariableModal } = useTemplateStore();
  const { settings } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isNarrowOrMobile, setIsNarrowOrMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      const isNarrow = window.innerWidth < 768;
      const isMobileDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      setIsNarrowOrMobile(isNarrow || isMobileDevice || settings.touchOptimized);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [settings.touchOptimized]);

  if (!settings.showMobileAccessoryBar) return null;

  const insertTextOrWrap = (before: string, after: string = '') => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      const selection = view.state.selection.main;
      const selectedText = view.state.sliceDoc(selection.from, selection.to);
      const replacement = `${before}${selectedText || ''}${after}`;
      
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: replacement
        },
        selection: {
          anchor: selectedText ? selection.from + replacement.length : selection.from + before.length
        }
      });
      view.focus();
    } else {
      // Fallback
      useTabStore.getState().insertTextAtCursor(activeTabId, `${before}${after}`);
    }
  };

  const handleUndo = () => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      undo(view);
      view.focus();
    }
  };

  const handleRedo = () => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      redo(view);
      view.focus();
    }
  };

  const handleIndent = () => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      indentMore(view);
      view.focus();
    } else {
      insertTextOrWrap('  ');
    }
  };

  const handleOutdent = () => {
    if (!activeTabId) return;
    const view = editorRegistry.getView(activeTabId);
    if (view) {
      indentLess(view);
      view.focus();
    }
  };

  const accessoryButtons = [
    {
      label: 'H1',
      icon: Heading1,
      title: 'Heading 1 (# )',
      action: () => insertTextOrWrap('# ')
    },
    {
      label: 'H2',
      icon: Heading2,
      title: 'Heading 2 (## )',
      action: () => insertTextOrWrap('## ')
    },
    {
      label: 'Bold',
      icon: Bold,
      title: 'Bold (**text**)',
      action: () => insertTextOrWrap('**', '**')
    },
    {
      label: 'Italic',
      icon: Italic,
      title: 'Italic (*text*)',
      action: () => insertTextOrWrap('*', '*')
    },
    {
      label: 'Code',
      icon: Code,
      title: 'Inline Code (`code`)',
      action: () => insertTextOrWrap('`', '`')
    },
    {
      label: '{{var}}',
      icon: Variable,
      title: 'Insert Template Variable',
      isAccent: true,
      action: () => insertTextOrWrap('{{', '}}')
    },
    {
      label: '{=}',
      icon: Calculator,
      title: 'Insert Inline Formula {=COUNT()}',
      isAccent: true,
      action: () => insertTextOrWrap('{=', '}')
    },
    {
      label: '/',
      icon: Slash,
      title: 'Trigger Slash Commands Menu',
      isAccent: true,
      action: () => insertTextOrWrap('/')
    },
    {
      label: 'Task',
      icon: ListTodo,
      title: 'Task Item (- [ ] )',
      action: () => insertTextOrWrap('- [ ] ')
    },
    {
      label: 'Bullet',
      icon: List,
      title: 'Bullet List (- )',
      action: () => insertTextOrWrap('- ')
    },
    {
      label: 'Quote',
      icon: Quote,
      title: 'Blockquote (> )',
      action: () => insertTextOrWrap('> ')
    },
    {
      label: 'Indent',
      icon: Indent,
      title: 'Indent (Tab)',
      action: handleIndent
    },
    {
      label: 'Outdent',
      icon: Outdent,
      title: 'Outdent (Shift+Tab)',
      action: handleOutdent
    },
    {
      label: 'Undo',
      icon: Undo2,
      title: 'Undo',
      action: handleUndo
    },
    {
      label: 'Redo',
      icon: Redo2,
      title: 'Redo',
      action: handleRedo
    }
  ];

  return (
    <div className="z-20 border-t border-[var(--border-primary)] bg-[var(--titlebar-bg)]/95 backdrop-blur-md shrink-0 select-none shadow-md">
      {/* Header toggle for compact view on small screens */}
      <div className="flex items-center justify-between px-2 py-0.5 border-b border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
        <div className="flex items-center gap-1 font-semibold uppercase tracking-wider text-[9px] text-[var(--text-secondary)]">
          <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" />
          <span>Quick Markdown & Prompt Bar</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => openVariableModal()}
            className="text-[var(--accent-primary)] hover:underline font-medium text-[10px]"
          >
            Fill Variables
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Touch Action Buttons Ribbon */}
      {isExpanded && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto no-scrollbar touch-pan-x">
          {accessoryButtons.map((btn, idx) => {
            const Icon = btn.icon;
            return (
              <button
                key={idx}
                onClick={btn.action}
                title={btn.title}
                aria-label={btn.title || btn.label}
                className={`h-9 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all shrink-0 active:scale-95 shadow-xs border ${
                  isNarrowOrMobile ? 'w-9 px-0' : 'px-2.5 min-w-[38px]'
                } ${
                  btn.isAccent
                    ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 hover:bg-[var(--accent-container)]/80'
                    : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isNarrowOrMobile && (
                  <span className="text-[11px] font-sans font-medium whitespace-nowrap hidden md:inline">
                    {btn.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
