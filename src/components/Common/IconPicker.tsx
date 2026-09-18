import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { ALL_APP_ICONS } from '../../constants/iconCatalog';
import { AppIcon } from './AppIcon';

export interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
  className?: string;
  gridMaxHeight?: string;
  columnsClass?: string;
  showSelectedChip?: boolean;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  label = 'Select Icon',
  className = '',
  gridMaxHeight = 'max-h-32',
  columnsClass = 'grid-cols-8 sm:grid-cols-10 md:grid-cols-12',
  showSelectedChip = true
}) => {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_APP_ICONS;
    return ALL_APP_ICONS.filter(name => name.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className={`space-y-2 p-3 bg-[var(--card-secondary-bg)]/50 border border-[var(--border-primary)] rounded-lg ${className}`}>
      {/* Top Header: Label, Selected Preview, and Search Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            {label}
          </label>
          {showSelectedChip && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--accent-primary)] shadow-2xs">
              <AppIcon name={value} size={13} className="shrink-0 text-[var(--accent-primary)]" />
              <span className="truncate max-w-[120px]">{value}</span>
            </div>
          )}
        </div>

        {/* Real-time search filter */}
        <div className="relative w-full sm:w-44">
          <Search size={12} className="absolute left-2.5 top-2 text-[var(--text-muted)] pointer-events-none" />
          <input
            id="icon-picker-search-input"
            name="iconPickerSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${ALL_APP_ICONS.length} icons...`}
            className="w-full h-7 pl-7 pr-6 theme-input rounded-md text-[11px] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Visual Icon Grid (No categories, clean scrolling grid) */}
      <div
        className={`grid ${columnsClass} gap-1.5 ${gridMaxHeight} overflow-y-auto p-1.5 bg-[var(--app-bg)]/60 rounded-md border border-[var(--border-subtle)]`}
      >
        {filteredIcons.map((iconName) => {
          const isSelected = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              title={iconName}
              aria-label={iconName}
              onClick={() => onChange(iconName)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--accent-primary)] text-white shadow-xs scale-105 ring-2 ring-[var(--accent-primary)]/40 font-bold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
              }`}
            >
              <AppIcon name={iconName} size={14} />
            </button>
          );
        })}

        {filteredIcons.length === 0 && (
          <div className="col-span-full py-4 text-center text-xs text-[var(--text-muted)] space-y-1">
            <p>No icons matching &ldquo;{search}&rdquo;</p>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-[11px] text-[var(--accent-primary)] hover:underline"
            >
              Reset search
            </button>
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] px-0.5">
        <span>
          {search ? `${filteredIcons.length} of ${ALL_APP_ICONS.length} icons` : `${ALL_APP_ICONS.length} icons available`}
        </span>
        <span className="text-[9px] font-mono opacity-80">Click an icon to apply</span>
      </div>
    </div>
  );
};
