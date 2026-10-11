import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  Copy,
  PlusSquare,
  Download,
  Filter,
  Check,
  Code,
  FileCode,
  CheckSquare
} from 'lucide-react';
import { useVariableExtractionModalStore } from '../../store/variableExtractionModalStore';
import { useTabStore } from '../../store/tabStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useRuntimeBridge } from '../../adapters';
import { parseVariableToken } from '../../services/editor/templateVariableService';

type ExtractionMode = 'answered' | 'rows_with_vars' | 'rows_without_vars' | 'selection';

export const VariableExtractionModal: React.FC = () => {
  const { isOpen, closeExtractionModal } = useVariableExtractionModalStore();
  const { tabs, activeTabId, createTab, insertTextAtCursor } = useTabStore();
  const { addNotification } = useNotificationStore();
  const bridge = useRuntimeBridge();

  const [mode, setMode] = useState<ExtractionMode>('answered');
  const [copied, setCopied] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const content = activeTab?.content || '';

  // Extract selected text if available
  const [selectedText, setSelectedText] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      const selection = window.getSelection()?.toString() || '';
      setSelectedText(selection);
      if (selection) {
        setMode('selection');
      }
    }
  }, [isOpen]);

  // Compute extraction results based on mode
  const extractedResult = useMemo(() => {
    if (!content && !selectedText) return '';

    const lines = content.split('\n');

    if (mode === 'answered') {
      // Find all [[{{varName:default|current}}]] or [[{{varName|current}}]] answered variables
      const answeredRegex = /\[\[\{\{([^}]+)\}\}\]\]/g;
      const answeredMap: Record<string, string> = {};
      let match: RegExpExecArray | null;

      while ((match = answeredRegex.exec(content)) !== null) {
        const raw = match[1];
        // Parse raw token e.g. "Name:Default|John Doe" or "Role|Admin"
        const pipeIdx = raw.indexOf('|');
        if (pipeIdx !== -1) {
          const keyPart = raw.slice(0, pipeIdx).trim();
          const valPart = raw.slice(pipeIdx + 1).trim();
          const cleanKey = keyPart.split(':')[0].trim();
          answeredMap[cleanKey] = valPart;
        }
      }

      // Also check standard {{varName}} with defaults
      const standardRegex = /\{\{([^}]+)\}\}/g;
      while ((match = standardRegex.exec(content)) !== null) {
        const parsed = parseVariableToken(match[1]);
        if (parsed.defaultValue && !answeredMap[parsed.cleanName]) {
          answeredMap[parsed.cleanName] = parsed.defaultValue;
        }
      }

      if (Object.keys(answeredMap).length === 0) {
        return '# No answered variables detected in active file.\n\nUse [[{{var:default|answered_value}}]] or {{var:default}} syntax.';
      }

      return Object.entries(answeredMap)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }

    if (mode === 'rows_with_vars') {
      const rowsWithVars = lines.filter(line => /\{\{[^}]+\}\}/.test(line));
      return rowsWithVars.length > 0
        ? rowsWithVars.join('\n')
        : '# No rows with {{variables}} found.';
    }

    if (mode === 'rows_without_vars') {
      const rowsWithoutVars = lines.filter(line => !/\{\{[^}]+\}\}/.test(line));
      return rowsWithoutVars.join('\n');
    }

    if (mode === 'selection') {
      if (!selectedText) {
        return '# No text currently selected in editor.';
      }
      return selectedText;
    }

    return '';
  }, [content, mode, selectedText]);

  if (!isOpen) return null;

  const handleCopy = () => {
    bridge.clipboard.writeText(extractedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('Copied', 'Extracted content copied to clipboard', 'success');
  };

  const handleInsertAtCursor = () => {
    if (!activeTab) return;
    insertTextAtCursor(activeTab.id, extractedResult);
    addNotification('Inserted', 'Inserted extracted text into document', 'success');
    closeExtractionModal();
  };

  const handleOpenInNewTab = () => {
    const baseName = activeTab?.title ? activeTab.title.replace(/\.[^/.]+$/, '') : 'Extracted';
    const newTabId = createTab(`${baseName}_extracted.md`, extractedResult, 'markdown');
    addNotification('Created New Tab', `${baseName}_extracted.md`, 'success');
    closeExtractionModal();
  };

  const handleExportBlueprint = async () => {
    const baseName = activeTab?.title ? activeTab.title.replace(/\.[^/.]+$/, '') : 'Document';
    const blueprintFileName = `${baseName}_blueprint.cntxt`;

    // Structure blueprint content with raw template and metadata
    const blueprintData = {
      format: 'CNTXT_BLUEPRINT_V1',
      sourceDoc: activeTab?.title || 'Untitled',
      exportedAt: new Date().toISOString(),
      content: content,
      extractedVariables: extractedResult
    };

    const blueprintString = JSON.stringify(blueprintData, null, 2);

    try {
      const savedPath = await bridge.fs.saveFileAs(blueprintFileName, blueprintString);
      if (savedPath) {
        addNotification('Blueprint Exported', `Saved as ${blueprintFileName}`, 'success');
        closeExtractionModal();
      }
    } catch (err: unknown) {
      addNotification('Export Failed', (err as Error)?.message || 'Could not export blueprint', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-[var(--modal-bg)] border border-[var(--modal-border)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-[var(--modal-header-bg)] border-b border-[var(--border-primary)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Filter className="w-5 h-5 text-[var(--accent-primary)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Variable Extractions & Blueprint Export
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Extract variables, rows, or export as reusable blueprint
              </p>
            </div>
          </div>
          <button
            onClick={closeExtractionModal}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-3 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] overflow-x-auto text-xs">
          <button
            onClick={() => setMode('answered')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${mode === 'answered'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Answered Variables
          </button>
          <button
            onClick={() => setMode('rows_with_vars')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${mode === 'rows_with_vars'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Code className="w-3.5 h-3.5" />
            Rows with Variables
          </button>
          <button
            onClick={() => setMode('rows_without_vars')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${mode === 'rows_without_vars'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Rows without Variables
          </button>
          <button
            onClick={() => setMode('selection')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${mode === 'selection'
                ? 'bg-[var(--accent-primary)] text-[var(--accent-contrast)] font-medium shadow-xs'
                : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Selected Text
          </button>
        </div>

        {/* Content Preview */}
        <div className="flex-1 p-4 overflow-y-auto bg-[var(--editor-bg)]">
          <textarea
            readOnly
            value={extractedResult}
            rows={14}
            className="w-full h-full min-h-[240px] font-mono text-xs bg-transparent text-[var(--text-primary)] resize-none focus:outline-none"
          />
        </div>

        {/* Actions Footer */}
        <div className="p-3 bg-[var(--modal-header-bg)] border-t border-[var(--border-primary)] flex items-center justify-between shrink-0">
          <button
            onClick={handleExportBlueprint}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--accent-primary)] border border-[var(--border-primary)] flex items-center gap-1.5 transition-colors"
            title="Export full template document as ${filename}_blueprint.cntxt"
          >
            <Download className="w-3.5 h-3.5" />
            Export as Blueprint (*_blueprint.cntxt)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleInsertAtCursor}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] flex items-center gap-1.5 transition-colors"
            >
              <PlusSquare className="w-3.5 h-3.5" />
              Insert at Cursor
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] hover:opacity-90 text-[var(--accent-contrast)] flex items-center gap-1.5 shadow-sm transition-opacity"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
