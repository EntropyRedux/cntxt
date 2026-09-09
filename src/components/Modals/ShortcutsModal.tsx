import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Navigation & Workspace',
      items: [
        { key: 'Ctrl / Cmd + M', desc: 'Toggle Editor Mode (Raw Markdown / Live Rendered Markdown)' },
        { key: 'Ctrl / Cmd + B', desc: 'Hide / Show Right Rail & Sidebar Navigation' },
        { key: 'Ctrl / Cmd + Shift + O', desc: 'Open Document Outline & TOC Inspector' },
        { key: 'Ctrl / Cmd + K', desc: 'Open Command Palette & Quick Switcher' },
        { key: 'Ctrl / Cmd + N', desc: 'Create New Document Tab' },
        { key: 'Ctrl / Cmd + Shift + N', desc: 'Open New ContextPad Window' },
        { key: 'Ctrl / Cmd + W', desc: 'Close Active Document Tab' },
        { key: 'Ctrl + PageUp / PageDown', desc: 'Cycle through Previous / Next Document Tab' },
        { key: 'Ctrl / Cmd + S', desc: 'Save Active Document to Storage' },
        { key: 'Esc', desc: 'Close active modal / popup' }
      ]
    },
    {
      title: 'Prompt & Template Writing',
      items: [
        { key: '/', desc: 'Trigger Slash Commands menu on empty line' },
        { key: '{{variable}}', desc: 'Define variable placeholder with optional default' },
        { key: 'Ctrl + Alt + V', desc: 'Open Variable Filler modal for active document' },
        { key: '{=FORMULA()}', desc: 'Inline dynamic formula evaluation' }
      ]
    },
    {
      title: 'Editor Editing & Formatting',
      items: [
        { key: 'Ctrl / Cmd + F', desc: 'Find & Search within active document' },
        { key: 'Ctrl / Cmd + H', desc: 'Replace within active document' },
        { key: 'Ctrl / Cmd + Z', desc: 'Undo last change' },
        { key: 'Ctrl / Cmd + Y', desc: 'Redo last change' },
        { key: 'Tab / Shift + Tab', desc: 'Indent or outdent text block' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="theme-modal w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-sm">Keyboard Shortcuts & Commands</h2>
              <span className="text-[11px] text-[var(--text-muted)]">ContextPad desktop-first workflow acceleration</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs bg-[var(--card-bg)]">
          {shortcutGroups.map((grp, idx) => (
            <div key={idx} className="space-y-2">
              <span className="font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider block">
                {grp.title}
              </span>
              <div className="space-y-1">
                {grp.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-2 theme-card rounded"
                  >
                    <span className="text-[var(--text-primary)]">{item.desc}</span>
                    <kbd className="px-2 py-0.5 bg-[var(--card-secondary-bg)] border border-[var(--border-primary)] text-[var(--accent-primary)] font-mono text-[11px] rounded shadow-xs font-semibold">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>ContextPad v1.10.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 theme-btn-primary font-medium rounded transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
