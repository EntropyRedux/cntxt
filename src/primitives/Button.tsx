import React from 'react';
import { 
  LucideIcon, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Edit, 
  RotateCcw, 
  Play, 
  Copy, 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  Upload, 
  ExternalLink, 
  Zap, 
  HelpCircle, 
  Eye, 
  Variable, 
  Split, 
  FileText 
} from 'lucide-react';

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

function getSmartIcon(icon?: LucideIcon, labelText?: string): LucideIcon {
  if (icon) return icon;
  if (!labelText) return Sparkles;
  
  const text = labelText.toLowerCase().trim();
  if (text.includes('done') || text.includes('save') || text.includes('apply') || text.includes('ok') || text.includes('confirm')) return Check;
  if (text.includes('cancel') || text.includes('close') || text.includes('dismiss')) return X;
  if (text.includes('add') || text.includes('new') || text.includes('create') || text.includes('pin')) return Plus;
  if (text.includes('delete') || text.includes('remove') || text.includes('clear')) return Trash2;
  if (text.includes('reset') || text.includes('restore')) return RotateCcw;
  if (text.includes('copy') || text.includes('duplicate')) return Copy;
  if (text.includes('edit') || text.includes('modify')) return Edit;
  if (text.includes('run') || text.includes('exec') || text.includes('play')) return Play;
  if (text.includes('search') || text.includes('find')) return Search;
  if (text.includes('upload') || text.includes('import')) return Upload;
  if (text.includes('help') || text.includes('info')) return HelpCircle;
  if (text.includes('view') || text.includes('preview')) return Eye;
  if (text.includes('var') || text.includes('form')) return Variable;
  if (text.includes('split')) return Split;
  if (text.includes('doc') || text.includes('file')) return FileText;
  if (text.includes('setting') || text.includes('config') || text.includes('custom')) return SlidersHorizontal;
  if (text.includes('token') || text.includes('budget')) return Zap;
  if (text.includes('launch') || text.includes('open')) return ExternalLink;
  
  return Sparkles;
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
    xs: 'w-6 h-6 p-0 text-[11px] rounded',
    sm: 'w-7 h-7 p-0 text-xs rounded-md',
    md: 'w-8 h-8 p-0 text-xs rounded-md',
    lg: 'w-9 h-9 p-0 text-sm rounded-lg',
    touch: 'w-11 h-11 p-0 text-sm rounded-xl min-w-[44px] min-h-[44px]',
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

  const computedAriaLabel = 
    (props['aria-label'] as string) || 
    (typeof children === 'string' ? children : undefined) || 
    (shortcut ? `Action (${shortcut})` : 'Button');
  const computedTitle = props.title || (shortcut ? `${computedAriaLabel} (${shortcut})` : computedAriaLabel);
  const ResolvedIcon = getSmartIcon(Icon, typeof children === 'string' ? children : computedAriaLabel);

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-label={computedAriaLabel}
      title={computedTitle}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${activeStyles} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <ResolvedIcon className="w-3.5 h-3.5 shrink-0" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

