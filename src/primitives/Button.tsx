import React from 'react';
import { LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'touch';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  shortcut?: string;
  isLoading?: boolean;
  isActive?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'secondary',
  size = 'sm',
  icon: Icon,
  iconPosition = 'left',
  shortcut,
  isLoading,
  isActive,
  className = '',
  disabled,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer';

  const sizeStyles: Record<ButtonSize, string> = {
    xs: 'h-6 px-2 text-[11px] rounded gap-1',
    sm: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
    md: 'h-8 px-3 text-xs rounded-md gap-2',
    lg: 'h-9 px-4 text-sm rounded-lg gap-2',
    touch: 'h-11 px-4 text-sm rounded-xl gap-2.5 min-w-[44px]',
  };

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] shadow-xs shadow-[var(--accent-primary)]/20',
    secondary: 'bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)] shadow-2xs',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]',
    outline: 'bg-transparent text-[var(--text-primary)] border border-[var(--border-primary)] hover:bg-[var(--card-hover-bg)]',
    danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    accent: 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border border-[var(--accent-primary)]/30 hover:bg-[var(--accent-container)]/80',
  };

  const activeStyles = isActive ? 'bg-[var(--card-hover-bg)] text-[var(--accent-primary)] border-[var(--accent-primary)]/50' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${activeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      
      {children && <span>{children}</span>}

      {!isLoading && Icon && iconPosition === 'right' && <Icon className="w-3.5 h-3.5 shrink-0" />}

      {shortcut && (
        <span className="ml-auto pl-2 text-[10px] font-mono text-[var(--text-muted)] opacity-70">
          {shortcut}
        </span>
      )}
    </button>
  );
});

Button.displayName = 'Button';
