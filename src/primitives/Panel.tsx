import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'elevated' | 'transparent';
  borderSide?: 'left' | 'right' | 'top' | 'bottom' | 'all' | 'none';
}

export const Panel: React.FC<PanelProps> = ({
  children,
  variant = 'default',
  borderSide = 'all',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[var(--sidebar-bg)]',
    subtle: 'bg-[var(--app-bg)]',
    elevated: 'bg-[var(--card-bg)] shadow-md',
    transparent: 'bg-transparent',
  };

  const borderStyles = {
    all: 'border border-[var(--border-primary)]',
    left: 'border-l border-[var(--border-primary)]',
    right: 'border-r border-[var(--border-primary)]',
    top: 'border-t border-[var(--border-primary)]',
    bottom: 'border-b border-[var(--border-primary)]',
    none: 'border-0',
  };

  return (
    <div
      className={`flex flex-col overflow-hidden ${variantStyles[variant]} ${borderStyles[borderSide]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface PanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  icon: Icon,
  actions,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`h-9 px-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 select-none bg-[var(--titlebar-bg)]/40 ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
        {title && (
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate tracking-tight">
            {title}
          </span>
        )}
        {children}
      </div>

      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </div>
  );
};

export const PanelBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`flex-1 overflow-y-auto p-3 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const PanelFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`p-2 border-t border-[var(--border-subtle)] bg-[var(--titlebar-bg)]/20 shrink-0 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
