import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, ChevronDown, Check, Settings2 } from 'lucide-react';
import { CategorySummary } from '../../../store/templateStore';
import { addWindowListener } from '../../../adapters';

interface CategorySelectorProps {
  value: string;
  categories: CategorySummary[] | string[];
  onChange: (value: string) => void;
  onOpenCategoryManager?: () => void;
  placeholder?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  categories,
  onChange,
  onOpenCategoryManager,
  placeholder = 'Select Category'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const categoryNames = useMemo(() => {
    return categories.map(c => typeof c === 'string' ? c : c.name);
  }, [categories]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    return addWindowListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (customValue.trim()) {
      onChange(customValue.trim().toUpperCase());
    }
    setIsAddingNew(false);
  };

  const handleCancelCustom = () => {
    setIsAddingNew(false);
    setCustomValue('');
  };

  if (isAddingNew) {
    return (
      <div className="flex items-center gap-1 w-full animate-in fade-in duration-150">
        <input
          id="custom-category-input"
          name="customCategory"
          autoFocus
          type="text"
          placeholder="New category name..."
          value={customValue}
          onChange={e => {
            const val = e.target.value.toUpperCase();
            setCustomValue(val);
            if (val.trim()) {
              onChange(val.trim());
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleCustomSubmit();
            if (e.key === 'Escape') handleCancelCustom();
          }}
          className="flex-1 h-7 px-2 text-xs theme-input rounded focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCustomSubmit}
          title="Confirm Category"
          aria-label="Confirm Category"
          className="w-7 h-7 flex items-center justify-center bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white rounded transition-colors shrink-0 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancelCustom}
          title="Cancel"
          aria-label="Cancel"
          className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const displayLabel = value || placeholder;

  return (
    <div ref={containerRef} className="flex items-center gap-1 w-full relative">
      <div className="relative flex-1">
        {/* Custom styled trigger button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full h-7 pl-2.5 pr-7 text-xs theme-input rounded flex items-center justify-between text-left cursor-pointer bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--accent-primary)] transition-colors focus:outline-none"
        >
          <span className={`truncate ${!value ? 'text-[var(--text-muted)]' : 'font-medium'}`}>
            {displayLabel}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-150 absolute right-2 top-1/2 -translate-y-1/2 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Custom Theme Dropdown Popover */}
        {isOpen && (
          <div
            role="listbox"
            className="theme-dropdown absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl bg-[var(--sidebar-bg)] border border-[var(--border-primary)] z-50 py-1 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 divide-y divide-[var(--border-subtle)]"
          >
            {/* Category Options */}
            <div className="py-0.5">
              {categoryNames.map(cat => {
                const isSelected = cat.toUpperCase() === value.toUpperCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(cat.toUpperCase());
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-3 h-3 text-[var(--accent-primary)] shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {/* Actions: + New Category and Manage Categories */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsAddingNew(true);
                  setCustomValue('');
                }}
                className="w-full px-2.5 py-1.5 text-left text-xs flex items-center gap-2 text-[var(--accent-primary)] hover:bg-[var(--accent-container)] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>+ NEW CATEGORY...</span>
              </button>

              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenCategoryManager();
                  }}
                  className="w-full px-2.5 py-1.5 text-left text-xs flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                  <span>Manage Categories...</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {onOpenCategoryManager && (
        <button
          type="button"
          onClick={onOpenCategoryManager}
          title="Manage Categories"
          aria-label="Manage Categories"
          className="w-7 h-7 flex items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors shrink-0 cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
