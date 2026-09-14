import React, { useState, useMemo } from 'react';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import { CategorySummary } from '../../../store/templateStore';

interface CategorySelectorProps {
  value: string;
  categories: CategorySummary[] | string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  categories,
  onChange,
  placeholder = 'Select Category'
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const categoryNames = useMemo(() => {
    return categories.map(c => typeof c === 'string' ? c : c.name);
  }, [categories]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '___NEW___') {
      setIsAddingNew(true);
      setCustomValue('');
    } else {
      onChange(val.toUpperCase());
    }
  };

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
          autoFocus
          type="text"
          placeholder="New category name..."
          value={customValue}
          onChange={e => setCustomValue(e.target.value.toUpperCase())}
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

  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={handleSelectChange}
        className="w-full h-7 pl-2.5 pr-7 text-xs theme-input rounded appearance-none cursor-pointer bg-[var(--card-bg)] text-[var(--text-primary)] focus:outline-none"
      >
        <option value="" disabled>{placeholder}</option>
        {categoryNames.map(cat => (
          <option key={cat} value={cat} className="bg-[var(--card-bg)] text-[var(--text-primary)]">
            {cat}
          </option>
        ))}
        <option value="___NEW___" className="bg-[var(--card-bg)] text-[var(--accent-primary)] font-semibold">
          + NEW CATEGORY...
        </option>
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
};
