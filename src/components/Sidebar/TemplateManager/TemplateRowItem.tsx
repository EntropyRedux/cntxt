import React, { useState } from 'react';
import { 
  Play, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  Variable, 
  CheckSquare, 
  Square, 
  Copy, 
  Check 
} from 'lucide-react';
import { Template } from '../../../../contracts/data_shapes';
import { isSystemVariable, parseVariableToken } from '../../../services/editor/templateVariableService';
import { copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';

interface TemplateRowItemProps {
  template: Template;
  bulkMode: boolean;
  isSelected: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onToggleSelect: (id: string) => void;
  onUseTemplate: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onOpenVariableModal: (template: Template) => void;
}

export const TemplateRowItem: React.FC<TemplateRowItemProps> = ({
  template,
  bulkMode,
  isSelected,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onToggleSelect,
  onUseTemplate,
  onEdit,
  onDelete,
  onOpenVariableModal
}) => {
  const [localExpanded, setLocalExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyText(template.content);
      setIsCopied(true);
      useNotificationStore.getState().addNotification('Copied to Clipboard', `"${template.name}" copied`, 'success');
      setTimeout(() => setIsCopied(false), 1500);
    } catch {
      useNotificationStore.getState().addNotification('Copy Error', 'Failed to copy to clipboard', 'error');
    }
  };

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setLocalExpanded(prev => !prev);
    }
  };

  const hasCustomVariables = template.variables.some(v => !isSystemVariable(v));

  return (
    <div
      className={`theme-card p-2 rounded-md border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-xs transition-all group hover:border-[var(--accent-primary)]/50 ${
        template.isHidden ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      {/* Short Non-Expanded Primary Row: Title + Insert Play Button + Auto-hiding Actions */}
      <div className="flex items-center justify-between gap-1.5 min-w-0">
        {/* Left: Bulk Checkbox + Insert Play Button + Title + Var Badge */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {bulkMode && (
            <button
              type="button"
              onClick={() => onToggleSelect(template.id)}
              title={isSelected ? 'Deselect template' : 'Select template'}
              aria-label={isSelected ? 'Deselect template' : 'Select template'}
              className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0 cursor-pointer"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Quick Insert / Play Button (The designated insert trigger) */}
          <button
            type="button"
            onClick={() => onUseTemplate(template)}
            title={`Insert ${template.name} (Ctrl+Enter)`}
            aria-label={`Insert ${template.name}`}
            className="w-5.5 h-5.5 rounded flex items-center justify-center transition-all shadow-2xs theme-btn-primary cursor-pointer active:scale-95 shrink-0"
          >
            <Play className="w-2.5 h-2.5 fill-current" />
          </button>

          {/* Template Title (Clicking does NOT insert) */}
          <span 
            className="font-semibold text-[13px] text-[var(--text-primary)] truncate select-text cursor-default"
            title={`${template.name}${template.description ? ` — ${template.description}` : ''}`}
          >
            {template.name}
          </span>

          {/* Variable Count Expand Button */}
          {template.variables.length > 0 && (
            <button
              type="button"
              onClick={handleToggleExpand}
              title={isExpanded ? 'Collapse variables' : 'Expand variables'}
              aria-expanded={isExpanded}
              className="inline-flex items-center gap-0.5 text-[9.5px] px-1.5 py-0.2 rounded font-mono font-medium bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <span>{template.variables.length} {template.variables.length === 1 ? 'var' : 'vars'}</span>
              <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}

          {/* Hidden status indicator */}
          {template.isHidden && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] uppercase tracking-wider font-semibold shrink-0">
              Hidden
            </span>
          )}
        </div>

        {/* Right: Auto-Hiding Actions (Copy, Edit, Delete only - visible on hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 transition-opacity animate-in fade-in duration-100">
          {/* Copy to Clipboard Button */}
          <button
            type="button"
            onClick={handleCopyToClipboard}
            title={isCopied ? "Copied!" : "Copy to Clipboard"}
            aria-label={`Copy ${template.name} to clipboard`}
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
            onClick={() => onEdit(template)}
            title={`Edit ${template.name}`}
            aria-label={`Edit ${template.name}`}
            className="w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Edit2 size={12} />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            title={`Delete ${template.name}`}
            aria-label={`Delete ${template.name}`}
            className="w-5.5 h-5.5 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expanded Mode Drawer: Description, Variables & Secondary Controls */}
      {isExpanded && (
        <div className="pt-2 mt-1.5 border-t border-dashed border-[var(--border-subtle)] space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {template.description && (
            <p className="text-[11px] text-[var(--text-secondary)] italic">
              {template.description}
            </p>
          )}

          {template.variables.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              {template.variables.map((varName) => {
                const isSys = isSystemVariable(varName);
                const parsed = parseVariableToken(varName);

                return (
                  <span
                    key={varName}
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                      isSys
                        ? 'bg-[var(--card-secondary-bg)] border-[var(--border-subtle)] text-[var(--status-info)]'
                        : parsed.isRequired
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold'
                          : 'bg-[var(--card-bg)] border-[var(--border-primary)] text-[var(--accent-primary)]'
                    }`}
                    title={isSys ? `System Macro: Auto-replaced with ${varName}` : `Variable placeholder: ${varName}`}
                  >
                    <span className="opacity-60">{isSys ? '⚡' : '{{'}</span>
                    <span>{parsed.cleanName}</span>
                    <span className="opacity-60">{isSys ? '' : '}}'}</span>
                    {parsed.isRequired && <span className="text-rose-500 font-bold">*</span>}
                  </span>
                );
              })}
            </div>
          )}

          {/* Expanded Drawer Action Bar: Fill in Modal */}
          {hasCustomVariables && (
            <div className="flex items-center justify-end pt-1 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => onOpenVariableModal(template)}
                title="Open Variable Filler Modal"
                className="h-5 px-2 text-[10px] font-medium rounded flex items-center gap-1 bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-colors cursor-pointer shadow-2xs"
              >
                <Variable className="w-2.5 h-2.5" />
                <span>Fill in Modal</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
