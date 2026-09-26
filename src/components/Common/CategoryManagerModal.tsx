import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, Tag } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

export interface CategorySummaryItem {
  name: string;
  count: number;
}

export interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  categories: CategorySummaryItem[];
  onAddCategory: (name: string) => boolean | void;
  onRenameCategory: (oldName: string, newName: string) => boolean | void;
  onDeleteCategory: (category: string, fallbackCategory?: string) => boolean | void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  title = 'Manage Categories',
  categories,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory
}) => {
  const { showConfirm } = useConfirmStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty');
      return;
    }
    if (categories.some(c => c.name === trimmed)) {
      setErrorMsg('Category already exists');
      return;
    }
    setErrorMsg('');
    onAddCategory(trimmed);
    setNewCategoryName('');
  };

  const startRename = (catName: string) => {
    setEditingCategory(catName);
    setEditValue(catName);
    setErrorMsg('');
  };

  const handleSaveRename = (oldName: string) => {
    const trimmed = editValue.trim().toUpperCase();
    if (!trimmed || trimmed === oldName) {
      setEditingCategory(null);
      return;
    }
    if (categories.some(c => c.name === trimmed && c.name !== oldName)) {
      setErrorMsg(`A category named "${trimmed}" already exists`);
      return;
    }
    setErrorMsg('');
    onRenameCategory(oldName, trimmed);
    setEditingCategory(null);
  };

  const handleDelete = (cat: CategorySummaryItem) => {
    const isGeneral = cat.name === 'GENERAL';
    if (isGeneral) {
      setErrorMsg('The default "GENERAL" category cannot be deleted.');
      return;
    }

    const message = cat.count > 0 
      ? `Category "${cat.name}" contains ${cat.count} item${cat.count > 1 ? 's' : ''}. Deleting it will safely reassign all items to "GENERAL". Proceed?`
      : `Are you sure you want to delete category "${cat.name}"?`;

    showConfirm({
      title: `Delete Category: ${cat.name}`,
      message,
      confirmLabel: 'Delete & Reassign',
      variant: 'danger',
      onConfirm: () => {
        onDeleteCategory(cat.name, 'GENERAL');
      }
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--sidebar-header-bg)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Create, rename, or reorder categories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Category Section */}
        <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--app-bg)]/40">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => {
                setNewCategoryName(e.target.value.toUpperCase());
                setErrorMsg('');
              }}
              className="flex-1 px-3 py-1.5 text-xs theme-input rounded-lg border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-3 py-1.5 bg-[var(--accent-primary)] text-white text-xs font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          {errorMsg && (
            <p className="mt-2 text-[11px] text-[var(--status-error)] font-medium">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Category List */}
        <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)] p-2">
          {categories.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No categories configured
            </div>
          ) : (
            categories.map((cat) => {
              const isEditing = editingCategory === cat.name;

              return (
                <div 
                  key={cat.name}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors group"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 mr-2">
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(cat.name);
                          if (e.key === 'Escape') setEditingCategory(null);
                        }}
                        className="flex-1 px-2 py-1 text-xs theme-input rounded border border-[var(--accent-primary)] bg-[var(--card-bg)] text-[var(--text-primary)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(cat.name)}
                        className="p-1 rounded bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-mono">
                        {cat.count}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => startRename(cat.name)}
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--card-bg)] transition-colors"
                        title="Rename category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {cat.name !== 'GENERAL' && (
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--card-bg)] transition-colors"
                          title="Delete category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--sidebar-header-bg)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
