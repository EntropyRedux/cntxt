import React from 'react';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '', ...props }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center font-mono text-[10px] font-medium text-[var(--text-muted)] bg-[var(--editor-bg)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 shadow-2xs select-none ${className}`}
      {...props}
    >
      {children}
    </kbd>
  );
};
