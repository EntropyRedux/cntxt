import React, { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

export const ConfirmationModal: React.FC = () => {
  const { isOpen, options, isLoading, closeConfirm, triggerConfirm } = useConfirmStore();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-focus confirm button for rapid keyboard interaction
      const timer = setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeConfirm();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          triggerConfirm();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, closeConfirm, triggerConfirm]);

  if (!isOpen || !options) return null;

  const variant = options.variant || 'danger';
  const confirmLabel = options.confirmLabel || (variant === 'danger' ? 'Delete' : 'Confirm');
  const cancelLabel = options.cancelLabel || 'Cancel';

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-[var(--status-error)]" />,
          btnClass: 'bg-[var(--status-error)] text-white hover:opacity-90 shadow-sm active:scale-95',
          headerBg: 'bg-[var(--status-error)]/10 text-[var(--status-error)]',
          badgeBorder: 'border-[var(--status-error)]/20'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-5 h-5 text-[var(--status-warning)]" />,
          btnClass: 'bg-[var(--status-warning)] text-black hover:opacity-90 shadow-sm active:scale-95',
          headerBg: 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]',
          badgeBorder: 'border-[var(--status-warning)]/20'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-[var(--accent-primary)]" />,
          btnClass: 'bg-[var(--accent-primary)] text-white hover:opacity-90 shadow-sm active:scale-95',
          headerBg: 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]',
          badgeBorder: 'border-[var(--accent-primary)]/20'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeConfirm}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div 
        className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--border-primary)] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--sidebar-header-bg)]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${styles.headerBg} ${styles.badgeBorder}`}>
              {styles.icon}
            </div>
            <h3 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--text-primary)]">
              {options.title}
            </h3>
          </div>
          <button
            onClick={closeConfirm}
            disabled={isLoading}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="px-5 py-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {options.message}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--card-bg)]">
          <button
            type="button"
            onClick={closeConfirm}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg border border-[var(--border-primary)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={triggerConfirm}
            disabled={isLoading}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${styles.btnClass} ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
