import React from 'react';
import { LucideIcon, Search, X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  onClear?: () => void;
  inputSize?: 'sm' | 'md' | 'lg' | 'touch';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  icon: Icon,
  onClear,
  inputSize = 'sm',
  className = '',
  value,
  ...props
}, ref) => {
  const sizeStyles = {
    sm: 'h-7 px-2.5 text-xs rounded-md',
    md: 'h-8 px-3 text-xs rounded-md',
    lg: 'h-9 px-3.5 text-sm rounded-lg',
    touch: 'h-11 px-4 text-sm rounded-xl min-h-[44px]',
  };

  return (
    <div className="relative flex items-center w-full">
      {Icon && (
        <Icon className="absolute left-2.5 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none shrink-0" />
      )}
      <input
        ref={ref}
        value={value}
        className={`w-full bg-[var(--editor-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all ${
          Icon ? 'pl-8' : ''
        } ${onClear && value ? 'pr-8' : ''} ${sizeStyles[inputSize]} ${className}`}
        {...props}
      />
      {onClear && value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export interface SearchInputProps extends Omit<InputProps, 'icon'> {
  shortcut?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(({
  shortcut = '⌘K',
  className = '',
  ...props
}, ref) => {
  return (
    <div className="relative flex items-center w-full">
      <Search className="absolute left-2.5 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
      <Input
        ref={ref}
        className={`pl-8 pr-12 ${className}`}
        placeholder="Search..."
        {...props}
      />
      {shortcut && !props.value && (
        <span className="absolute right-2.5 pointer-events-none px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded">
          {shortcut}
        </span>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled
}) => {
  return (
    <label className={`flex items-start justify-between gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>}
          {description && <span className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-1 ${
          checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--border-primary)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
};
