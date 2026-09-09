import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'interactive' | 'accent' | 'outlined';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  isActive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  isActive,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    xs: 'p-1.5',
    sm: 'p-2.5',
    md: 'p-3.5',
    lg: 'p-5',
  };

  const variantStyles = {
    default: 'bg-[var(--card-bg)] border border-[var(--border-primary)] shadow-2xs',
    interactive: 'bg-[var(--card-bg)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 hover:bg-[var(--card-hover-bg)] cursor-pointer transition-all active:scale-[0.99] shadow-2xs',
    accent: 'bg-[var(--accent-container)] border border-[var(--accent-primary)]/30 text-[var(--text-primary)]',
    outlined: 'bg-transparent border border-[var(--border-primary)] hover:border-[var(--border-focus)]',
  };

  const activeStyles = isActive ? 'ring-1 ring-[var(--accent-primary)] border-[var(--accent-primary)] bg-[var(--card-hover-bg)]' : '';

  return (
    <div
      className={`rounded-lg ${paddingStyles[padding]} ${variantStyles[variant]} ${activeStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
