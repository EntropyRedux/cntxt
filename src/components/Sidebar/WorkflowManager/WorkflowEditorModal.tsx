import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Workflow, 
  Bookmark, 
  X, 
  Save, 
  Search, 
  FolderOpen, 
  Sliders, 
  Check, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { PinnedTab } from '../../../contracts/data_shapes';
import { useWorkflowStore } from '../../../store/workflowStore';
import { useTabStore } from '../../../store/tabStore';
import { useNotificationStore } from '../../../store/notificationStore';
import { useRuntimeBridge, getBodyElement } from '../../../adapters';
import { 
  DEFAULT_WORKFLOW_ICON, 
  DEFAULT_BOOKMARK_ICON 
} from '../../../constants/iconCatalog';
import { WorkflowIcon } from './WorkflowIcon';
import { IconPicker } from '../../Common/IconPicker';

export interface WorkflowEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingWorkflow?: PinnedTab | null;
}

export const WorkflowEditorModal: React.FC<WorkflowEditorModalProps> = ({
  isOpen,
  onClose,
  editingWorkflow
}) => {
  const bridge = useRuntimeBridge();
  const { workflows, createWorkflow, updateWorkflow } = useWorkflowStore();
  const { tabs, activeTabId } = useTabStore();
  const { addNotification } = useNotificationStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<'workflow' | 'bookmark'>('workflow');
  const [category, setCategory] = useState('General');
  const [icon, setIcon] = useState<string>(DEFAULT_WORKFLOW_ICON);
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [sourceTabId, setSourceTabId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Existing categories for autocompletion
  const existingCategories = useMemo(() => {
    const cats = new Set(workflows.map(w => w.category).filter(Boolean));
    return Array.from(cats);
  }, [workflows]);

  // Prefill form when editing or opening
  useEffect(() => {
    if (!isOpen) return;

    if (editingWorkflow) {
      setName(editingWorkflow.name);
      setType(editingWorkflow.type || 'workflow');
      setCategory(editingWorkflow.category || 'General');
      setIcon(editingWorkflow.icon || (editingWorkflow.type === 'bookmark' ? DEFAULT_BOOKMARK_ICON : DEFAULT_WORKFLOW_ICON));
      setContent(editingWorkflow.content || '');
      setFilePath(editingWorkflow.filePath || '');
      setSourceTabId('');
      setError(null);
    } else {
      // Default new workflow
      const active = tabs.find(t => t.id === activeTabId);
      setName('');
      setType('workflow');
      setCategory('Workflows');
      setIcon(DEFAULT_WORKFLOW_ICON);
      setContent(active ? active.content : '# New Workflow Blueprint\n\nWrite your reusable prompt or document blueprint here.\n');
      setFilePath(active?.filePath || '');
      setSourceTabId(active ? active.id : '');
      setError(null);
    }
  }, [isOpen, editingWorkflow, activeTabId, tabs]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  const handleTypeChange = (newType: 'workflow' | 'bookmark') => {
    setType(newType);
    if (newType === 'bookmark' && icon === DEFAULT_WORKFLOW_ICON) {
      setIcon(DEFAULT_BOOKMARK_ICON);
    } else if (newType === 'workflow' && icon === DEFAULT_BOOKMARK_ICON) {
      setIcon(DEFAULT_WORKFLOW_ICON);
    }
  };

  // Populate from chosen tab
  const handleSourceTabChange = (tabId: string) => {
    setSourceTabId(tabId);
    if (!tabId) return;

    const source = tabs.find(t => t.id === tabId);
    if (source) {
      if (!name) setName(source.title.replace(/\.[^/.]+$/, ''));
      if (source.content) setContent(source.content);
      if (source.filePath) setFilePath(source.filePath);
    }
  };

  // Browse local disk for bookmark
  const handleBrowseDisk = async () => {
    try {
      const selected = await bridge.fs.openFile();

      if (selected && selected.path) {
        setFilePath(selected.path);
        if (!name) setName(selected.name.replace(/\.[^/.]+$/, ''));
        if (selected.content) setContent(selected.content);
      }
    } catch (err) {
      console.warn('File dialog cancelled or unavailable:', err);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this workflow item.');
      return;
    }

    if (type === 'bookmark' && !filePath.trim()) {
      setError('Please specify a valid file path for the bookmark.');
      return;
    }

    if (type === 'workflow' && !content.trim()) {
      setError('Please enter blueprint content for this workflow.');
      return;
    }

    setError(null);

    if (editingWorkflow) {
      updateWorkflow(editingWorkflow.id, {
        name: name.trim(),
        type,
        category: category.trim() || 'General',
        icon,
        content: content.trim(),
        filePath: type === 'bookmark' ? filePath.trim() : null
      });

      addNotification('Workflow Updated', `Updated "${name}"`, 'success');
    } else {
      createWorkflow({
        name: name.trim(),
        type,
        category: category.trim() || 'General',
        icon,
        content: content.trim(),
        filePath: type === 'bookmark' ? filePath.trim() : null
      });

      addNotification('Workflow Created', `Added "${name}" to ${category}`, 'success');
    }

    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="theme-modal border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden flex flex-col w-full max-w-2xl max-h-[90vh]"
        role="dialog"
        aria-labelledby="workflow-modal-title"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-primary)] flex items-center justify-between bg-[var(--card-secondary-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center border border-[var(--accent-primary)]/20">
              <WorkflowIcon name={icon} type={type} size={18} />
            </div>
            <div>
              <h3 id="workflow-modal-title" className="text-sm font-bold text-[var(--text-primary)]">
                {editingWorkflow ? 'Edit Workflow Item' : 'New Workflow Blueprint'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Create reusable prompt blueprints or quick local file bookmarks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Segmented Tabs) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Asset Type
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[var(--card-secondary-bg)] p-1 rounded-lg border border-[var(--border-primary)]">
              <button
                type="button"
                onClick={() => handleTypeChange('workflow')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-all ${
                  type === 'workflow'
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Workflow size={14} />
                <span>Workflow Blueprint</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('bookmark')}
                className={`py-2 px-3 rounded-md flex items-center justify-center gap-2 font-medium transition-all ${
                  type === 'bookmark'
                    ? 'bg-[var(--accent-primary)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Bookmark size={14} />
                <span>File Bookmark</span>
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] pt-0.5">
              {type === 'workflow' 
                ? 'Blueprints open in a workspace tab as a fresh drafting document with dirty tracking.'
                : 'Bookmarks link directly to an existing file on your local disk.'}
            </p>
          </div>

          {/* Name & Category Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Name <span className="text-[var(--status-error)]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={type === 'workflow' ? 'e.g. Prompt Evaluation Matrix' : 'e.g. System Guidelines'}
                className="w-full h-8 px-2.5 theme-input rounded-md text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Workflows, Development, Review"
                list="category-suggestions"
                className="w-full h-8 px-2.5 theme-input rounded-md text-xs"
              />
              <datalist id="category-suggestions">
                {existingCategories.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Unified Visual Icon Picker (No Categories, All Icons, Real-time Search) */}
          <IconPicker
            value={icon}
            onChange={setIcon}
            label="Visual Icon"
            gridMaxHeight="max-h-28"
          />

          {/* Tab Source Selector (Convenience Tool) */}
          {tabs.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} />
                <span>Quick Snapshot From Open Tab</span>
              </label>
              <select
                value={sourceTabId}
                onChange={(e) => handleSourceTabChange(e.target.value)}
                className="w-full h-8 px-2 theme-input rounded-md text-xs"
              >
                <option value="">-- Choose Tab to Snapshot (Optional) --</option>
                {tabs.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.filePath ? `(${t.filePath})` : '(in-memory)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bookmark File Path Selection */}
          {type === 'bookmark' && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1">
                <span>Disk File Path</span>
                <span className="text-[var(--status-error)]">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required={type === 'bookmark'}
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g. C:\Projects\Notes\architecture.md"
                  className="flex-1 h-8 px-2.5 theme-input rounded-md text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleBrowseDisk}
                  className="px-3 h-8 theme-btn-secondary border border-[var(--border-primary)] rounded-md flex items-center gap-1.5 shrink-0 text-xs hover:bg-[var(--card-hover-bg)]"
                >
                  <FolderOpen size={13} />
                  <span>Browse...</span>
                </button>
              </div>
            </div>
          )}

          {/* Workflow Blueprint Content */}
          {type === 'workflow' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Blueprint Content <span className="text-[var(--status-error)]">*</span>
                </label>
                <span className="text-[10px] text-[var(--text-muted)]">{content.length} characters</span>
              </div>
              <textarea
                required={type === 'workflow'}
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Document Title\n\nTemplate instructions..."
                className="w-full p-2.5 theme-input rounded-md font-mono text-xs leading-relaxed"
              />
            </div>
          )}

        </form>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border-primary)] bg-[var(--card-secondary-bg)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 theme-btn-secondary border border-[var(--border-primary)] rounded-md text-xs hover:bg-[var(--card-hover-bg)] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-1.5 theme-btn-primary rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save size={13} />
            <span>{editingWorkflow ? 'Update Item' : 'Create Item'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  const body = getBodyElement();
  if (body) {
    return createPortal(modalContent, body);
  }

  return modalContent;
};
