import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Edit2, 
  Trash2, 
  Variable, 
  CheckSquare, 
  Square, 
  Copy, 
  Check 
} from 'lucide-react';
import { Template } from '../../../../contracts/data_shapes';
import { isSystemVariable } from '../../../services/editor/templateVariableService';
import { copyText } from '../../../adapters';
import { useNotificationStore } from '../../../store/notificationStore';

interface TemplateCardItemProps {
  template: Template;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onUseTemplate: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
  onOpenVariableModal: (template: Template) => void;
}

export const TemplateCardItem: React.FC<TemplateCardItemProps> = ({
  template,
  bulkMode,
  isSelected,
  onToggleSelect,
  onUseTemplate,
  onEdit,
  onDelete,
  onOpenVariableModal
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await copyText(template.content);
      setIsCopied(true);
      useNotificationStore.getState().addNotification('Copied', `"${template.name}" copied to clipboard`, 'success');
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 1500);
    } catch {
      useNotificationStore.getState().addNotification('Copy Error', 'Failed to copy template', 'error');
    }
  };

  const hasCustomVariables = template.variables.some(v => !isSystemVariable(v));

  return (
    <div
      className={`theme-card p-2.5 rounded-lg border border-[var(--border-primary)] bg-[var(--card-bg)] shadow-xs transition-all flex flex-col justify-between group hover:border-[var(--accent-primary)]/60 hover:shadow-md relative min-h-[92px] ${
        template.isHidden ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      {/* Top Header Row: Category Badge + Variable Indicator + Copy Action */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {bulkMode && (
            <button
              type="button"
              onClick={() => onToggleSelect(template.id)}
              title={isSelected ? 'Deselect template' : 'Select template'}
              aria-label={isSelected ? 'Deselect template' : 'Select template'}
              className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] shrink-0 cursor-pointer mr-0.5"
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg,#252528)] text-[var(--text-muted)] border border-[var(--border-subtle)] truncate max-w-[90px]">
            {template.category}
          </span>

          {hasCustomVariables && (
            <button
              type="button"
              onClick={() => onOpenVariableModal(template)}
              title="Has dynamic variables (Click to fill)"
              className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9.5px] font-mono font-bold bg-[var(--accent-container)] text-[var(--accent-primary)] hover:opacity-80 transition-opacity"
            >
              <Variable className="w-2.5 h-2.5" />
              <span>{template.variables.length}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopyToClipboard}
          title="Copy template content to clipboard"
          aria-label="Copy template content"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]"
        >
          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Middle: Title & 2-line Content/Description Snippet */}
      <div className="flex-1 min-w-0 mb-2">
        <div 
          role="button"
          tabIndex={0}
          onClick={() => onUseTemplate(template)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUseTemplate(template);
            }
          }}
          className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors truncate cursor-pointer focus:outline-none focus:underline"
          title={`Click to insert ${template.name}`}
        >
          {template.name}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 mt-0.5 leading-snug">
          {template.description || template.content.slice(0, 100)}
        </p>
      </div>

      {/* Bottom Footer: Insert / Run Button + Edit / Delete Controls */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border-subtle)] gap-1">
        <button
          type="button"
          onClick={() => onUseTemplate(template)}
          title={`Insert "${template.name}" into editor`}
          className="h-6 px-2 rounded flex items-center gap-1 text-[11px] font-medium bg-[var(--accent-container)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Insert</span>
        </button>

        <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(template)}
            title="Edit template"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(template.id)}
            title="Delete template"
            className="w-6 h-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
