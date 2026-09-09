import React, { useState } from 'react';

export interface TooltipProps {
  content: string;
  shortcut?: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  children,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap px-2 py-1 bg-[var(--titlebar-bg)] text-[var(--text-primary)] text-[11px] font-medium border border-[var(--border-primary)] rounded shadow-lg flex items-center gap-1.5 animate-in fade-in-0 duration-100 ${positionStyles[position]}`}
        >
          <span>{content}</span>
          {shortcut && (
            <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--card-bg)] px-1 py-0.2 rounded border border-[var(--border-subtle)]">
              {shortcut}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
