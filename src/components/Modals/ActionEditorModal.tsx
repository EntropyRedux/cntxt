import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  Save, 
  Code2
} from 'lucide-react';
import { useActionStore } from '../../store/actionStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';

export const ActionEditorModal: React.FC = () => {
  const { 
    isActionEditorOpen, 
    closeActionEditor, 
    editingAction, 
    createAction, 
    updateAction
  } = useActionStore();

  const { tabs, activeTabId } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Custom');
  const [type, setType] = useState<'command' | 'button'>('command');
  const [code, setCode] = useState('');
  const [testStatus, setTestStatus] = useState<{ success?: boolean; msg?: string } | null>(null);

  useEffect(() => {
    if (editingAction) {
      setName(editingAction.name);
      setDescription(editingAction.description);
      setCategory(editingAction.category);
      setType(editingAction.type);
      setCode(editingAction.code);
    } else {
      setName('');
      setDescription('');
      setCategory('Custom');
      setType('command');
      setCode(`// Custom Sandboxed ContextPad Action Script
const text = api.getSelection() || api.getText();

// Perform string or data transformation
const transformed = text.toUpperCase();

// Update active document or selection
if (api.getSelection()) {
  api.replaceSelection(transformed);
} else {
  api.setText(transformed);
}

api.toast('Action executed successfully!', 'success');`);
    }
    setTestStatus(null);
  }, [editingAction, isActionEditorOpen]);

  if (!isActionEditorOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (editingAction) {
      updateAction(editingAction.id, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        type,
        code: code.trim()
      });
      addNotification('Action Updated', name, 'success');
    } else {
      createAction({
        name: name.trim(),
        description: description.trim() || 'Custom script',
        category: category.trim() || 'Custom',
        type,
        code: code.trim(),
        enabled: true
      });
      addNotification('Action Created', name, 'success');
    }

    closeActionEditor();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="theme-modal w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[var(--status-success)]/15 text-[var(--status-success)] flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)] text-sm">
                {editingAction ? `Edit Action: ${editingAction.name}` : 'Create Action Script'}
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">
                Executes in an isolated JavaScript sandbox with safe `api` bindings
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeActionEditor}
            title="Close"
            aria-label="Close"
            className="p-1 hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden text-xs">
          <div className="p-4 border-b border-[var(--border-primary)] grid grid-cols-1 md:grid-cols-3 gap-3 bg-[var(--card-secondary-bg)]">
            <div>
              <label className="text-[var(--text-primary)] font-medium block mb-1">Action Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Format Table to JSON"
                className="w-full h-7 px-2.5 theme-input rounded"
              />
            </div>

            <div>
              <label className="text-[var(--text-primary)] font-medium block mb-1">Category & Type</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category"
                  className="h-7 px-2 theme-input rounded"
                />
                <select
                  value={type}
                  onChange={(e: any) => setType(e.target.value)}
                  className="h-7 px-2 theme-input rounded"
                >
                  <option value="command">Command Palette</option>
                  <option value="button">Toolbar Button</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[var(--text-primary)] font-medium block mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of what script does"
                className="w-full h-7 px-2.5 theme-input rounded"
              />
            </div>
          </div>

          {/* Script Code Editor */}
          <div className="flex-1 flex flex-col p-4 bg-[var(--card-bg)] overflow-hidden space-y-2">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-primary)] font-mono text-[11px] flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                JavaScript Code (Sandboxed API: api.getText(), api.setText(), api.toast(), api.openTab())
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">ES2022 Async Function</span>
            </div>

            <textarea
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 w-full p-3 theme-input rounded font-mono text-[var(--syntax-tag)] text-xs leading-relaxed resize-none"
              spellCheck={false}
            />
          </div>

          {/* Footer Controls */}
          <div className="p-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
            <div className="text-[11px] text-[var(--text-muted)]">
              {testStatus && (
                <span className={testStatus.success ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'}>
                  ● {testStatus.msg}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeActionEditor}
                title="Cancel"
                aria-label="Cancel"
                className="w-8 h-8 rounded flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <button
                type="submit"
                title="Save Action"
                aria-label="Save Action"
                className="w-8 h-8 theme-btn-primary rounded flex items-center justify-center transition-colors shadow-xs"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
