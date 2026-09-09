import React from 'react';
import { LucideIcon, X } from 'lucide-react';

export interface TabItemProps {
  id: string;
  title: string;
  isActive: boolean;
  isDirty?: boolean;
  isPinned?: boolean;
  icon?: LucideIcon;
  onClick: () => void;
  onClose?: (e: React.MouseEvent) => void;
  onAuxClick?: (e: React.MouseEvent) => void;
}

export const TabItem: React.FC<TabItemProps> = ({
  title,
  isActive,
  isDirty,
  isPinned,
  icon: Icon,
  onClick,
  onClose,
  onAuxClick
}) => {
  return (
    <div
      onClick={onClick}
      onAuxClick={onAuxClick}
      title={title}
      className={`group relative flex items-center gap-2 h-9 px-3 border-r border-[var(--border-subtle)] cursor-pointer select-none text-xs transition-colors shrink-0 max-w-[200px] ${
        isActive
          ? 'bg-[var(--editor-bg)] text-[var(--text-primary)] font-medium'
          : 'bg-[var(--tab-inactive-bg,var(--titlebar-bg))] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]'
      }`}
    >
      {/* Active Indicator Line */}
      {isActive && (
        <span className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--accent-primary)]" />
      )}

      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />}
      
      <span className="truncate">{title}</span>

      {/* Dirty indicator or close button */}
      <div className="flex items-center ml-auto shrink-0 w-4 h-4 justify-center">
        {isDirty && !isPinned ? (
          <span className="w-2 h-2 rounded-full bg-red-500 group-hover:hidden" />
        ) : null}

        {onClose && !isPinned && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose(e);
            }}
            className={`p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-primary)]/40 ${
              isDirty ? 'hidden group-hover:flex' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Close Tab"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export const TabStrip: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`flex items-center h-9 bg-[var(--titlebar-bg)] border-b border-[var(--border-primary)] overflow-x-auto no-scrollbar select-none shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
