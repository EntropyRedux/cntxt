import React, { useState } from 'react';
import { 
  Play, 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  CheckSquare, 
  Square, 
  Copy, 
  Check 
} from 'lucide-react';
import { Action } from '../../../../contracts/data_shapes';
import { copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';

interface ActionRowItemProps {
  action: Action;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRunAction: (action: Action) => void;
  onEdit: (action: Action) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
}

export const ActionRowItem: React.FC<ActionRowItemProps> = ({
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
      useNotificationStore.getState().addNotification('Copied to Clipboard', `"${action.name}" script copied`, 'success');
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      useNotificationStore.getState().addNotification('Copy Error', 'Failed to copy to clipboard', 'error');
    }
  };

  const isButton = action.type === 'button';
  const isFormula = action.code && action.code.startsWith('FORMULA:');

  return (
    <div
      className={`theme-card p-2 rounded-md border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-xs transition-all group hover:border-[var(--accent-primary)]/50 ${
        action.enabled === false ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      {/* Primary Row: Name + Badges + Run/Insert Play Button + Auto-hiding Actions */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        {/* Left: Bulk Checkbox + Run/Insert Button + Title + Badges */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {bulkMode && (
            <button
              type="button"
              onClick={() => onToggleSelect(action.id)}
              title={isSelected ? 'Deselect action' : 'Select action'}
              aria-label={isSelected ? 'Deselect action' : 'Select action'}
              className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0 cursor-pointer"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Run (Play) or Insert (Plus) Action Button */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onRunAction(action)}
            disabled={action.enabled === false}
            title={
              action.enabled === false
                ? 'Action is disabled'
                : isButton
                  ? `Insert [[action:${action.id}]] into editor`
                  : `Execute ${action.name}`
            }
            aria-label={isButton ? `Insert ${action.name}` : `Execute ${action.name}`}
            className={`w-5.5 h-5.5 rounded flex items-center justify-center transition-all shadow-2xs shrink-0 ${
              action.enabled === false
                ? 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)] cursor-not-allowed'
                : 'theme-btn-primary cursor-pointer active:scale-95'
            }`}
          >
            {isButton ? (
              <Plus className="w-3 h-3" />
            ) : (
              <Play className="w-2.5 h-2.5 fill-current" />
            )}
          </button>

          {/* Action Title */}
          <span 
            className="font-semibold text-[13px] text-[var(--text-primary)] truncate select-text cursor-default"
            title={`${action.name}${action.description ? ` — ${action.description}` : ''}`}
          >
            {action.name}
          </span>


          {/* Type Badge: BTN vs CMD */}
          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-medium shrink-0 shadow-2xs ${
            isButton
              ? 'bg-[var(--accent-container)] text-[var(--accent-primary)]'
              : 'bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
          }`}>
            {isButton ? 'BTN' : 'CMD'}
          </span>

          {/* Formula Indicator */}
          {isFormula && (
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
              fx
            </span>
          )}

          {/* Disabled status indicator */}
          {action.enabled === false && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] uppercase tracking-wider font-semibold shrink-0">
              Disabled
            </span>
          )}
        </div>

        {/* Right: Auto-Hiding Actions (Copy, Edit, Pin, Power, Delete - visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 transition-opacity animate-in fade-in duration-100">
          {/* Copy Script Button */}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            title={isCopied ? "Copied Script!" : "Copy to Clipboard"}
            aria-label={`Copy ${action.name} script to clipboard`}
            className="w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            {isCopied ? (
              <Check size={12} className="text-[var(--status-success)]" />
            ) : (
              <Copy size={12} />
            )}
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEdit(action)}
            title={`Edit ${action.name}`}
            aria-label={`Edit ${action.name}`}
            className="w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Edit2 size={12} />
          </button>


          {/* Power / Toggle Enabled */}
          <button
            type="button"
            onClick={() => onToggleEnabled(action.id)}
            title={action.enabled !== false ? 'Disable Action' : 'Enable Action'}
            aria-label={action.enabled !== false ? `Disable ${action.name}` : `Enable ${action.name}`}
            className={`w-5.5 h-5.5 flex items-center justify-center rounded transition-colors cursor-pointer ${
              action.enabled !== false
                ? 'text-[var(--status-success)] hover:bg-[var(--card-hover-bg)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
            }`}
          >
            <Power size={12} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(action.id)}
            title={`Delete ${action.name}`}
            aria-label={`Delete ${action.name}`}
            className="w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Description Snippet (if available) */}
      {action.description && (
        <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-1 italic select-text">
          {action.description}
        </p>
      )}
    </div>
  );
};
