import React from 'react';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'outline';
export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  dot,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-1.5 py-0.2 text-[9px] font-medium rounded',
    sm: 'px-2 py-0.5 text-[10px] font-medium rounded-md',
    md: 'px-2.5 py-1 text-xs font-medium rounded-md',
  };

  const variantStyles = {
    default: 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]',
    accent: 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border border-[var(--accent-primary)]/30',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border border-red-500/20',
    outline: 'bg-transparent text-[var(--text-secondary)] border border-[var(--border-primary)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-500'
              : variant === 'warning'
              ? 'bg-amber-500'
              : variant === 'error'
              ? 'bg-red-500'
              : 'bg-[var(--accent-primary)]'
          }`}
        />
      )}
      {children}
    </span>
  );
};
