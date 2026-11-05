import React, { useState } from 'react';
import { 
  Play, 
  Edit2, 
  Trash2, 
  Power, 
  CheckSquare, 
  Square, 
  Copy, 
  Check,
  Calculator,
  Code
} from 'lucide-react';
import { Action } from '../../../../contracts/data_shapes';
import { copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';

interface ActionCardItemProps {
  action: Action;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRunAction: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
}

export const ActionCardItem: React.FC<ActionCardItemProps> = ({
  action,
  bulkMode,
  isSelected,
  onToggleSelect,
  onRunAction,
  onEdit,
  onDelete,
  onToggleEnabled
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyText(action.code);
      setIsCopied(true);
      useNotificationStore.getState().addNotification('Copied', `"${action.name}" script copied`, 'success');
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      useNotificationStore.getState().addNotification('Copy Error', 'Failed to copy action code', 'error');
    }
  };

  const isButton = action.type === 'button';
  const isFormula = action.code && action.code.startsWith('FORMULA:');

  return (
    <div
      className={`theme-card p-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-xs transition-all flex flex-col justify-between group hover:border-[var(--accent-primary)]/60 hover:shadow-md relative min-h-[92px] ${
        action.enabled === false ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      {/* Top Header Row: Category Badge + Type Badge + Copy Action */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {bulkMode && (
            <button
              type="button"
              onClick={() => onToggleSelect(action.id)}
              title={isSelected ? 'Deselect action' : 'Select action'}
              aria-label={isSelected ? 'Deselect action' : 'Select action'}
              className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0 cursor-pointer mr-0.5"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg,#252528)] text-[var(--text-muted)] border border-[var(--border-subtle)] truncate max-w-[80px]">
            {action.category || 'General'}
          </span>

          {isFormula ? (
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Calculator className="w-2.5 h-2.5" />
              <span>Formula</span>
            </span>
          ) : isButton ? (
            <span className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9.5px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Code className="w-2.5 h-2.5" />
              <span>Button</span>
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleCopyToClipboard}
          title="Copy action code to clipboard"
          aria-label="Copy action code"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]"
        >
          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Middle: Title & 2-line Description/Snippet */}
      <div className="flex-1 min-w-0 mb-2">
        <div 
          onClick={() => onRunAction(action)}
          className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors truncate cursor-pointer"
          title={`Click to execute ${action.name}`}
        >
          {action.name}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-snug font-mono">
          {action.description || action.code.slice(0, 100)}
        </p>
      </div>

      {/* Bottom Footer: Run Button + Enable/Disable + Edit / Delete Controls */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] gap-1">
        <button
          type="button"
          onClick={() => onRunAction(action)}
          title={`Execute "${action.name}"`}
          className="h-6 px-2 rounded flex items-center gap-1 text-[11px] font-medium bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isFormula || isButton ? 'Insert' : 'Run'}</span>
        </button>

        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onToggleEnabled(action.id)}
            title={action.enabled !== false ? 'Disable action' : 'Enable action'}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors cursor-pointer ${
              action.enabled !== false 
                ? 'text-emerald-400 hover:bg-emerald-500/10' 
                : 'text-[var(--text-muted)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Power className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(action)}
            title="Edit action"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(action.id)}
            title="Delete action"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
