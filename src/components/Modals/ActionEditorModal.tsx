import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  X, 
  Save, 
  Code2,
  Play,
  Calculator,
  MousePointerClick,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Tag,
  Wand2
} from 'lucide-react';
import { useActionStore } from '../../store/actionStore';
import { useTabStore } from '../../store/tabStore';
import { useTemplateStore } from '../../store/templateStore';
import { useNotificationStore } from '../../store/notificationStore';
import { 
  FORMULA_FUNCTIONS, 
  getFormulaFunctionsByCategory, 
  FormulaFunctionInfo,
  FormulaEngine 
} from '../../services/formulaParser';
import { editorRegistry } from '../../services/editor/editorRegistry';

export const ActionEditorModal: React.FC = () => {
  const { 
    isActionEditorOpen, 
    closeActionEditor, 
    editingAction, 
    createAction, 
    updateAction
  } = useActionStore();

  const { activeTabId, tabs } = useTabStore();
  const { templates } = useTemplateStore();
  const { addNotification } = useNotificationStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Text Formatting');
  const [type, setType] = useState<'command' | 'button'>('command');
  const [codeType, setCodeType] = useState<'formula' | 'javascript'>('formula');
  const [selectionBehavior, setSelectionBehavior] = useState<'auto' | 'replace' | 'insert'>('auto');
  const [code, setCode] = useState('');
  
  // Formula Catalog State
  const [selectedFormulaCat, setSelectedFormulaCat] = useState('Text');
  const [formulaSearch, setFormulaSearch] = useState('');
  
  // Test Runner State
  const [testStatus, setTestStatus] = useState<{ success?: boolean; msg?: string; output?: string } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({});

  const formulaCategories = Object.keys(getFormulaFunctionsByCategory());

  useEffect(() => {
    if (editingAction) {
      setName(editingAction.name);
      setDescription(editingAction.description || '');
      setCategory(editingAction.category || 'Text Formatting');
      setType(editingAction.type || 'command');
      setSelectionBehavior(editingAction.selectionBehavior || 'auto');
      
      const isFormula = editingAction.codeType === 'formula' || editingAction.code?.startsWith('FORMULA:');
      setCodeType(isFormula ? 'formula' : 'javascript');
      setCode(isFormula ? editingAction.code.replace(/^FORMULA:/, '') : editingAction.code);
    } else {
      setName('');
      setDescription('');
      setCategory('Text Formatting');
      setType('command');
      setCodeType('formula');
      setSelectionBehavior('auto');
      setCode('UPPER(selection)');
    }
    setTestStatus(null);
    setErrors({});
  }, [editingAction, isActionEditorOpen]);

  if (!isActionEditorOpen) return null;

  // Insert formula function template into code
  const handleInsertFormulaFunction = (fn: FormulaFunctionInfo) => {
    const isTransform = /^(UPPER|LOWER|TITLE|TRIM|REVERSE|CAMEL|PASCAL|SNAKE|KEBAB|CONSTANT|BOLD|ITALIC|STRIKE|CODE|CODEBLOCK|QUOTE|HEADING|LINK|PARENTHESES|BRACKETS|BRACES|ANGLES|SINGLEQUOTE|DOUBLEQUOTE|SORT|SORTDESC|UNIQUE|NUMBERLIST|BULLETLIST|CHECKLIST|INDENT|UNINDENT|WRAP|PREFIX|SUFFIX|PAD|REPLACE)$/i.test(fn.name);
    const snippet = isTransform ? `${fn.name}(selection)` : `${fn.name}()`;
    setCode(snippet);
    if (!name.trim()) {
      setName(fn.description);
    }
    if (!description.trim()) {
      setDescription(`Executes ${fn.name} formula`);
    }
  };

  // Quick insert template snippet into JavaScript
  const handleInsertTemplateSnippet = (tmplId: string) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    const escaped = tmpl.content.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const snippet = `// Insert template: ${tmpl.name}\napi.insertAtCursor(\`${escaped}\`);\n`;
    setCode(prev => (prev ? `${prev}\n${snippet}` : snippet));
    if (!name.trim()) setName(`Insert ${tmpl.name}`);
  };

  // Test Run
  const handleTestRun = async () => {
    if (!code.trim()) {
      setErrors(prev => ({ ...prev, code: 'Action code is required to test' }));
      return;
    }
    setTestStatus({ msg: 'Testing action against active editor selection...' });

    try {
      if (codeType === 'formula') {
        const activeTab = tabs.find(t => t.id === activeTabId);
        const activeView = activeTabId ? editorRegistry.getView(activeTabId) : undefined;
        let docStr = activeTab?.content || '';
        let selectedText = '';
        let lineCount = 1;

        if (activeView) {
          docStr = activeView.state.doc.toString();
          lineCount = activeView.state.doc.lines;
          const sel = activeView.state.selection.main;
          if (!sel.empty) {
            selectedText = activeView.state.sliceDoc(sel.from, sel.to);
          }
        } else if (activeTabId) {
          selectedText = editorRegistry.getSelectedText(activeTabId);
          lineCount = docStr.split('\n').length;
        }

        const engine = new FormulaEngine({
          lineCount,
          charCount: docStr.length,
          wordCount: (docStr.trim().match(/\S+/g) || []).length,
          selectedText: selectedText || 'Sample Selected Text'
        });

        const res = engine.evaluate(code.trim());
        if (res.success) {
          setTestStatus({
            success: true,
            msg: `Evaluated successfully!`,
            output: String(res.value)
          });
        } else {
          setTestStatus({
            success: false,
            msg: res.error || 'Formula evaluation error'
          });
        }
      } else {
        const { executeInSandbox } = await import('../../services/actionSandbox');
        let capturedOutput = '';
        const mockApi = {
          getText: () => 'Sample Document Content',
          getSelection: () => 'Sample Selected Text',
          replaceSelection: (txt: string) => { capturedOutput = `[Replaced Selection]: ${txt}`; },
          wrapSelection: (pre: string, suf = pre) => { capturedOutput = `[Wrapped Selection]: ${pre}Sample Selected Text${suf}`; },
          insertAtCursor: (txt: string) => { capturedOutput = `[Inserted at Cursor]: ${txt}`; },
          insertText: (txt: string) => { capturedOutput = `[Inserted Text]: ${txt}`; },
          toast: (msg: string) => { capturedOutput = `[Toast]: ${msg}`; },
          notify: (msg: string) => { capturedOutput = `[Notify]: ${msg}`; }
        };

        const result = await executeInSandbox(code, mockApi);
        setTestStatus({
          success: true,
          msg: 'JavaScript executed cleanly in sandbox',
          output: capturedOutput || (result !== undefined ? String(result) : 'Done (No direct output)')
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        msg: err?.message || 'Execution error'
      });
    }
  };

  // Save or Update Action
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; code?: string } = {};
    if (!name.trim()) newErrors.name = 'Action name is required';
    if (!code.trim()) newErrors.code = 'Action code / expression cannot be empty';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addNotification('Validation Error', 'Please complete all required fields', 'warning');
      return;
    }
    setErrors({});

    const formattedCode = codeType === 'formula'
      ? (code.trim().startsWith('FORMULA:') ? code.trim() : `FORMULA:${code.trim()}`)
      : code.trim();

    if (editingAction) {
      updateAction(editingAction.id, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        type,
        codeType,
        selectionBehavior,
        code: formattedCode
      });
      addNotification('Action Updated', `Updated "${name}"`, 'success');
    } else {
      createAction({
        name: name.trim(),
        description: description.trim() || 'Custom user action',
        category: category.trim() || 'Text Formatting',
        type,
        codeType,
        selectionBehavior,
        code: formattedCode,
        enabled: true
      });
      addNotification('Action Created', `Created "${name}"`, 'success');
    }

    closeActionEditor();
  };

  const filteredFunctions = FORMULA_FUNCTIONS.filter(fn => {
    const matchesCat = !selectedFormulaCat || fn.category === selectedFormulaCat;
    const matchesSearch = !formulaSearch || 
      fn.name.toLowerCase().includes(formulaSearch.toLowerCase()) ||
      fn.description.toLowerCase().includes(formulaSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100 select-none">
      <div className="theme-modal w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--border-primary)] bg-[var(--card-bg)] text-[var(--text-primary)]">
        
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-container)] text-[var(--accent-primary)] flex items-center justify-center shadow-2xs">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight flex items-center gap-2">
                {editingAction ? `Edit Action: ${editingAction.name}` : 'CNTXT Action Builder'}
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[var(--card-secondary-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {codeType}
                </span>
              </h2>
              <span className="text-[11px] text-[var(--text-muted)]">
                Build text formatting transforms, dynamic formulas, or sandboxed automations
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={closeActionEditor}
            title="Close modal (Esc)"
            aria-label="Close modal"
            className="w-7 h-7 flex items-center justify-center hover:bg-[var(--card-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden text-xs">
          
          {/* Metadata Grid */}
          <div className="p-3.5 border-b border-[var(--border-primary)] bg-[var(--card-secondary-bg)] grid grid-cols-1 md:grid-cols-4 gap-3">
            
            {/* Action Name */}
            <div className="md:col-span-1 space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1">
                <Tag className="w-3 h-3 text-[var(--accent-primary)]" /> Action Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. UPPERCASE Selection"
                className={`w-full h-7 px-2.5 theme-input rounded text-xs ${errors.name ? 'border-[var(--status-error)]' : ''}`}
              />
              {errors.name && (
                <span className="text-[10px] text-[var(--status-error)] font-medium">
                  {errors.name}
                </span>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)]">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Text Formatting"
                className="w-full h-7 px-2.5 theme-input rounded text-xs"
              />
            </div>

            {/* Action Type: Command vs Button */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-[var(--accent-primary)]" /> Action Type
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--card-bg)] rounded border border-[var(--border-subtle)] h-7">
                <button
                  type="button"
                  onClick={() => setType('command')}
                  className={`text-[11px] font-medium rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    type === 'command'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Terminal className="w-3 h-3" /> Command
                </button>
                <button
                  type="button"
                  onClick={() => setType('button')}
                  className={`text-[11px] font-medium rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    type === 'button'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <MousePointerClick className="w-3 h-3" /> Button
                </button>
              </div>
            </div>

            {/* Engine: Formula vs JavaScript */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1">
                <Code2 className="w-3 h-3 text-[var(--accent-primary)]" /> Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-[var(--card-bg)] rounded border border-[var(--border-subtle)] h-7">
                <button
                  type="button"
                  onClick={() => {
                    setCodeType('formula');
                    if (code.startsWith('//') || code.includes('api.')) {
                      setCode('UPPER(selection)');
                    }
                  }}
                  className={`text-[11px] font-medium rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    codeType === 'formula'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Calculator className="w-3 h-3" /> Formula
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCodeType('javascript');
                    if (!code.startsWith('//') && !code.includes('api.')) {
                      setCode(`// Custom Sandboxed Action Script
const text = api.getSelection() || api.getText();
if (api.getSelection()) {
  api.replaceSelection(text.toUpperCase());
} else {
  api.insertAtCursor(text.toUpperCase());
}
api.toast('Executed successfully', 'success');`);
                    }
                  }}
                  className={`text-[11px] font-medium rounded flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    codeType === 'javascript'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Code2 className="w-3 h-3" /> JavaScript
                </button>
              </div>
            </div>

            {/* Description row and Selection Behavior */}
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)]">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / summary of what this action does (optional)..."
                className="w-full h-7 px-2.5 theme-input rounded text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-[var(--text-primary)] flex items-center justify-between">
                <span>Selection Behavior</span>
                <span className="text-[9px] text-[var(--text-muted)] font-normal">
                  {selectionBehavior === 'auto' ? 'Auto detect' : selectionBehavior === 'replace' ? 'Replaces text' : 'Keeps text'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-[var(--card-bg)] rounded border border-[var(--border-subtle)] h-7">
                <button
                  type="button"
                  onClick={() => setSelectionBehavior('auto')}
                  className={`text-[10px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                    selectionBehavior === 'auto'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Auto: Replaces if selection is transformed, inserts if new content"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionBehavior('replace')}
                  className={`text-[10px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                    selectionBehavior === 'replace'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Replace: Always replaces highlighted text with result"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionBehavior('insert')}
                  className={`text-[10px] font-medium rounded flex items-center justify-center transition-colors cursor-pointer ${
                    selectionBehavior === 'insert'
                      ? 'bg-[var(--accent-container)] text-[var(--accent-primary)] font-semibold shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Insert: Inserts next to selection without removing highlighted text"
                >
                  Insert
                </button>
              </div>
            </div>
          </div>

          {/* Main Workspace Area (Split between Catalog/Helpers and Code Editor) */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Sidebar: Formula Catalog or JS Helpers */}
            <div className="w-full md:w-80 border-r border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/40 flex flex-col overflow-hidden shrink-0">
              
              {codeType === 'formula' ? (
                <>
                  <div className="p-2.5 border-b border-[var(--border-primary)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[var(--accent-primary)]" /> Formula Catalog
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Click to insert
                      </span>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {formulaCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedFormulaCat(cat)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-colors cursor-pointer ${
                            selectedFormulaCat === cat
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Search filter */}
                    <input
                      type="text"
                      value={formulaSearch}
                      onChange={e => setFormulaSearch(e.target.value)}
                      placeholder="Search functions (e.g. bold, upper, sort)..."
                      className="w-full h-6 px-2 text-[11px] theme-input rounded"
                    />
                  </div>

                  {/* Function List */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {filteredFunctions.map(fn => (
                      <button
                        key={fn.name}
                        type="button"
                        onClick={() => handleInsertFormulaFunction(fn)}
                        className="w-full text-left p-2 rounded-md border border-[var(--border-subtle)] bg-[var(--card-bg)] hover:border-[var(--accent-primary)]/60 hover:bg-[var(--card-hover-bg)] transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <code className="font-mono font-bold text-[11px] text-[var(--accent-primary)] group-hover:underline">
                            {fn.name}
                          </code>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[var(--card-secondary-bg)] text-[var(--text-muted)]">
                            {fn.category}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                          {fn.description}
                        </p>
                        <span className="text-[9.5px] font-mono text-[var(--text-muted)] block mt-1">
                          {fn.example}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Context Variable Reference */}
                  <div className="p-2 border-t border-[var(--border-primary)] bg-[var(--card-secondary-bg)] text-[10px] space-y-1">
                    <span className="font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                      Active Context Keywords:
                    </span>
                    <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                      <span className="px-1 py-0.2 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[var(--accent-primary)]">selection</span>
                      <span className="px-1 py-0.2 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">lines</span>
                      <span className="px-1 py-0.2 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">chars</span>
                      <span className="px-1 py-0.2 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">words</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* JavaScript Helpers */}
                  <div className="p-3 border-b border-[var(--border-primary)] space-y-2">
                    <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      <FileCode className="w-3.5 h-3.5 text-[var(--accent-primary)]" /> Template Snippets
                    </span>
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          handleInsertTemplateSnippet(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="w-full h-7 px-2 theme-input rounded text-xs bg-[var(--card-bg)] cursor-pointer"
                    >
                      <option value="">Insert template snippet...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2 text-[11px] text-[var(--text-secondary)]">
                    <div className="space-y-1">
                      <span className="font-semibold text-[var(--text-primary)] block">Sandboxed API Methods:</span>
                      <ul className="space-y-1 font-mono text-[10px] text-[var(--text-muted)]">
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.getSelection()</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.replaceSelection(text)</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.wrapSelection(prefix, suffix)</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.insertAtCursor(text)</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.getText() / api.setText(text)</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.toast(message, type)</li>
                        <li className="p-1 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)]">api.copyToClipboard(text)</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Code Editor & Live Preview */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[var(--card-bg)]">
              <div className="px-3.5 py-2 border-b border-[var(--border-primary)] bg-[var(--sidebar-header-bg)]/20 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span className="font-mono flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                  {codeType === 'formula' ? (
                    <>
                      <Calculator className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      Formula Expression (e.g. UPPER(selection) or BOLD(selection))
                    </>
                  ) : (
                    <>
                      <Code2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                      JavaScript Code (Async Execution Scope)
                    </>
                  )}
                </span>
                <span className="font-mono text-[10px]">
                  {codeType === 'formula' ? 'Auto-evaluates on run' : 'ES2022 Sandboxed'}
                </span>
              </div>

              <textarea
                required
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors(prev => ({ ...prev, code: undefined }));
                }}
                placeholder={
                  codeType === 'formula'
                    ? 'UPPER(selection)'
                    : '// JavaScript code\nconst text = api.getSelection();\napi.replaceSelection(text.toUpperCase());'
                }
                className={`flex-1 w-full p-3 font-mono text-xs leading-relaxed bg-[var(--card-bg)] text-[var(--text-primary)] resize-none focus:outline-none border-0 ${
                  errors.code ? 'border-b border-[var(--status-error)]' : ''
                }`}
                spellCheck={false}
              />

              {errors.code && (
                <div className="px-3 py-1 bg-[var(--status-error)]/10 text-[var(--status-error)] text-[10.5px] font-medium border-t border-[var(--status-error)]/20">
                  {errors.code}
                </div>
              )}

              {/* Test Status Banner */}
              {testStatus && (
                <div className={`p-2.5 border-t border-[var(--border-primary)] text-xs flex items-start gap-2 ${
                  testStatus.success === true 
                    ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                    : testStatus.success === false
                      ? 'bg-[var(--status-error)]/10 text-[var(--status-error)]'
                      : 'bg-[var(--card-secondary-bg)] text-[var(--text-secondary)]'
                }`}>
                  {testStatus.success === true ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : testStatus.success === false ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="font-semibold block">{testStatus.msg}</span>
                    {testStatus.output && (
                      <div className="font-mono text-[11px] p-1.5 rounded bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-subtle)] truncate max-h-16 overflow-y-auto">
                        Output: {testStatus.output}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--sidebar-header-bg)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestRun}
                title="Test action against active document selection"
                aria-label="Test action"
                className="h-8 px-3 rounded-md flex items-center gap-1.5 text-xs font-medium bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] border border-[var(--border-primary)] transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5 text-[var(--status-success)] fill-current" />
                <span>Test Expression</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeActionEditor}
                className="h-8 px-3.5 rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="h-8 px-4 theme-btn-primary rounded-md flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingAction ? 'Update Action' : 'Save Action'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
