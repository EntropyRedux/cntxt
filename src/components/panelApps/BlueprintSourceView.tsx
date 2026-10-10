import React, { useState, useMemo } from 'react';
import { BUILTIN_TEMPLATES, BlueprintTemplate } from '../../features/panelApps/blueprint/templates';
import { BlueprintAnswers } from '../../features/panelApps/blueprint/answers';
import { buildArchetypePrompt } from '../../features/panelApps/blueprint/promptBuilder';
import { extractHtmlFromReply } from '../../features/panelApps/import/extractReply';
import { useNotificationStore } from '../../store/notificationStore';
import { useConfirmStore } from '../../store/confirmStore';
import { useTabStore } from '../../store/tabStore';
import { useRuntimeBridge } from '../../adapters';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  FileCode,
  Lightbulb,
  Hammer,
  FileText
} from 'lucide-react';

export interface BlueprintSourceViewProps {
  onLoadHtml: (appName: string, html: string, note: string, templateId?: string, description?: string) => void;
  hasValidHtml: boolean;
  selectedTemplateId: string | null;
}

export const BlueprintSourceView: React.FC<BlueprintSourceViewProps> = ({
  onLoadHtml,
  hasValidHtml: _hasValidHtml,
  selectedTemplateId: initialTemplateId,
}) => {
  const bridge = useRuntimeBridge();
  const { addNotification } = useNotificationStore();
  const { tabs, activeTabId, createTab, updateTabContent, updateTabMetadata, setActiveTabId } = useTabStore();

  const [selectedTemplate, setSelectedTemplate] = useState<BlueprintTemplate | null>(
    BUILTIN_TEMPLATES.find((t) => t.id === initialTemplateId) || BUILTIN_TEMPLATES[0]
  );
  const [isCustomizing, setIsCustomizing] = useState(true);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isPromptEdited, setIsPromptEdited] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [pastedReply, setPastedReply] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [promptTabId, setPromptTabId] = useState<string | null>(null);

  // Editable answers state initialized from active template
  const [answers, setAnswers] = useState<BlueprintAnswers>(
    selectedTemplate?.answers || BUILTIN_TEMPLATES[0].answers
  );

  const generatedPrompt = useMemo(() => buildArchetypePrompt(answers), [answers]);
  const activePrompt = isPromptEdited ? customPrompt : generatedPrompt;

  const openPromptTab = useMemo(
    () => tabs.find((t) => (promptTabId && t.id === promptTabId) || t.title.startsWith('[Prompt]')),
    [tabs, promptTabId]
  );
  const isTabOpen = Boolean(openPromptTab);
  const effectivePromptTabId = openPromptTab?.id || promptTabId;

  const activeEditorTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId && t.id !== effectivePromptTabId),
    [tabs, activeTabId, effectivePromptTabId]
  );

  const handleSelectTemplate = (template: BlueprintTemplate) => {
    setSelectedTemplate(template);
    setAnswers(template.answers);
    setIsPromptEdited(false);
    setCustomPrompt('');
    setParseError(null);
  };

  const handleCopyPrompt = async () => {
    try {
      await bridge.clipboard.writeText(activePrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
      addNotification('Prompt Copied', 'Paste into Claude, ChatGPT, Gemini, or DeepSeek', 'info');
    } catch (e) {
      addNotification('Copy Failed', 'Could not copy prompt to clipboard', 'error');
    }
  };

  const handleResetPrompt = () => {
    setCustomPrompt(generatedPrompt);
    setIsPromptEdited(false);
    addNotification('Prompt Reset', 'Reset to generated archetype prompt', 'info');
  };

  const handleOpenPromptTab = () => {
    const archetypeLabel = selectedTemplate?.name || 'Blueprint';
    const tabTitle = `[Prompt] ${archetypeLabel} - ${answers.appName || 'Draft'}.md`;

    // 1. If we have a tracked tab ID or any tab titled with [Prompt], reuse and focus it
    const existingPromptTab = tabs.find(
      (t) => t.id === promptTabId || t.title.startsWith('[Prompt]')
    );

    if (existingPromptTab) {
      setPromptTabId(existingPromptTab.id);
      setActiveTabId(existingPromptTab.id);
      // Synchronize latest active prompt content and title
      updateTabContent(existingPromptTab.id, activePrompt);
      updateTabMetadata(existingPromptTab.id, { title: tabTitle });
      addNotification('Prompt Tab Reused', `Updated and focused "${tabTitle}"`, 'info');
      return;
    }

    // 2. Otherwise create a new prompt tab
    const newTabId = createTab(tabTitle, activePrompt, 'markdown');
    setPromptTabId(newTabId);
    addNotification('Prompt Opened in Tab', `Live prompt ready in editor tab "${tabTitle}"`, 'success');
  };

  const handleResyncFromTab = () => {
    const tabToSync = openPromptTab || tabs.find((t) => t.id === promptTabId);
    if (!tabToSync) {
      addNotification('Tab Not Found', 'The prompt tab was closed. Click "Open in Tab" to recreate it.', 'warning');
      setPromptTabId(null);
      return;
    }

    setPromptTabId(tabToSync.id);
    setCustomPrompt(tabToSync.content);
    setIsPromptEdited(true);
    addNotification('Resynced from Tab', 'Adopted editor tab contents as active prompt override', 'success');
  };

  const handlePushFormToTab = () => {
    const tabToPush = openPromptTab || tabs.find((t) => t.id === promptTabId);
    if (!tabToPush) {
      setPromptTabId(null);
      return;
    }

    const pushTab = () => {
      setPromptTabId(tabToPush.id);
      updateTabContent(tabToPush.id, generatedPrompt);
      setCustomPrompt(generatedPrompt);
      setIsPromptEdited(false);
      addNotification('Tab Updated', 'Pushed updated form prompt to editor tab', 'info');
    };

    if (isPromptEdited && tabToPush.content !== generatedPrompt) {
      useConfirmStore.getState().showConfirm({
        title: 'Overwrite Manual Changes',
        message: 'The editor tab contains manual changes. Overwrite with the regenerated form prompt?',
        confirmLabel: 'Overwrite',
        variant: 'warning',
        onConfirm: pushTab,
      });
      return;
    }

    pushTab();
  };

  const handleImportFromActiveTab = () => {
    if (!activeEditorTab || !activeEditorTab.content.trim()) {
      addNotification('No Content', 'Active editor tab has no content to import', 'warning');
      return;
    }

    const cleanedName = activeEditorTab.title.replace(/\.[^.]+$/, '');
    setAnswers({
      ...answers,
      existingHtml: activeEditorTab.content,
      appName: answers.appName === 'Adapted Web App' || !answers.appName ? cleanedName : answers.appName,
    });
    addNotification('Imported from Active Tab', `Loaded ${activeEditorTab.content.length} characters from "${activeEditorTab.title}"`, 'success');
  };

  const handleExtractPastedReply = () => {
    setParseError(null);
    if (!pastedReply.trim()) {
      setParseError('Please paste an AI response containing an HTML block.');
      return;
    }

    const res = extractHtmlFromReply(pastedReply);
    if (!res || !res.html.trim()) {
      setParseError('No valid HTML code block or <!DOCTYPE html> found in pasted text.');
      return;
    }

    onLoadHtml(
      answers.appName || 'My AI App',
      res.html,
      res.isTruncated ? 'Imported from AI (Truncated HTML warning)' : 'Imported from AI Blueprint',
      selectedTemplate?.id,
      answers.purpose
    );
    addNotification('AI Code Imported', `Extracted ${(res.html.length / 1024).toFixed(1)} KB HTML payload`, 'success');
  };

  const getArchetypeIcon = (id: string) => {
    switch (id) {
      case 'build':
        return <Hammer className="w-4 h-4 text-emerald-400" />;
      case 'brainstorm':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'adapt':
        return <FileCode className="w-4 h-4 text-cyan-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />;
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <label className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
          Blueprint Prompt Archetypes
        </label>
        <p className="text-[11px] text-[var(--text-secondary)]">
          Select a prompt archetype to build a new app, brainstorm concepts, or adapt existing HTML into the CNTXT architecture.
        </p>
      </div>

      {/* Archetypes Selector Grid */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-[var(--text-muted)]">Select Archetype</div>
        <div className="grid grid-cols-1 gap-1.5">
          {BUILTIN_TEMPLATES.map((tmpl) => {
            const isSelected = selectedTemplate?.id === tmpl.id;
            return (
              <div
                key={tmpl.id}
                onClick={() => handleSelectTemplate(tmpl)}
                className={`p-2.5 rounded-lg border flex items-start justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-container)] text-[var(--text-primary)] shadow-xs'
                    : 'border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-secondary)]'
                }`}
              >
                <div className="flex items-start gap-2.5 truncate flex-1">
                  <div className="mt-0.5 shrink-0">{getArchetypeIcon(tmpl.id)}</div>
                  <div className="truncate flex-1">
                    <div className="font-medium text-[11px] flex items-center gap-1.5 text-[var(--text-primary)]">
                      <span>{tmpl.name}</span>
                      <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[var(--card-bg)] text-[var(--text-muted)] uppercase tracking-wider border border-[var(--border-subtle)]">
                        {tmpl.archetype}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                      {tmpl.description}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Archetype Form & Sync Controls */}
      {selectedTemplate && (
        <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-[11.5px] text-[var(--text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Prompt: {selectedTemplate.name}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="text-[10.5px] text-[var(--accent-primary)] hover:underline flex items-center gap-0.5 cursor-pointer mr-1"
              >
                <span>{isCustomizing ? 'Hide Form' : 'Show Form'}</span>
                {isCustomizing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => setShowPromptEditor(!showPromptEditor)}
                className="text-[10.5px] text-[var(--accent-primary)] hover:underline flex items-center gap-0.5 cursor-pointer mr-1"
              >
                <span>{showPromptEditor ? 'Hide Text' : 'View Text'}</span>
                {showPromptEditor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={handleCopyPrompt}
                className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-primary)] bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--text-primary)] font-medium text-[10.5px] cursor-pointer transition-colors shadow-xs"
              >
                {copiedPrompt ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editor Tab Sync Bar */}
          <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-secondary)] truncate">
              <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              {isTabOpen ? (
                <span className="truncate">
                  Tab Synced: <strong className="text-[var(--text-primary)] font-medium">Prompt Tab Active</strong>
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">Open in editor tab for live markdown editing</span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isTabOpen ? (
                <>
                  <button
                    type="button"
                    onClick={handleResyncFromTab}
                    title="Adopt manual edits made in the editor tab"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] border border-[var(--border-primary)] text-[10px] text-[var(--text-primary)] cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Resync from Tab</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushFormToTab}
                    title="Push current builder form answers into the editor tab"
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[10px] cursor-pointer"
                  >
                    <span>Update Tab</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenPromptTab}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white text-[10px] font-medium cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Open in Tab</span>
                </button>
              )}
            </div>
          </div>

          {/* Archetype-Specific Form Customizer */}
          {isCustomizing && (
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2.5 text-[11px]">
              {/* Build Archetype Fields */}
              {selectedTemplate.archetype === 'build' && (
                <>
                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={answers.appName}
                      onChange={(e) => setAnswers({ ...answers, appName: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      Purpose & Functionality
                    </label>
                    <textarea
                      rows={2}
                      value={answers.purpose}
                      onChange={(e) => setAnswers({ ...answers, purpose: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      Inputs, Outputs & Key Controls
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Textarea, word counter, clear and copy buttons"
                      value={answers.inputsOutputs}
                      onChange={(e) => setAnswers({ ...answers, inputsOutputs: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                        Persistence Mode
                      </label>
                      <select
                        value={answers.persistence}
                        onChange={(e) => setAnswers({ ...answers, persistence: e.target.value as BlueprintAnswers['persistence'] })}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-[var(--text-primary)] outline-none text-[11px]"
                      >
                        <option value="file">File-backed (.cntxt)</option>
                        <option value="native">Browser LocalStorage</option>
                        <option value="none">None (Session only)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                        Theme Engine
                      </label>
                      <select
                        value={answers.themeMode}
                        onChange={(e) => setAnswers({ ...answers, themeMode: e.target.value as BlueprintAnswers['themeMode'] })}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2 py-1 text-[var(--text-primary)] outline-none text-[11px]"
                      >
                        <option value="cntxt">Sync with CNTXT (14 tokens)</option>
                        <option value="custom">Custom styling</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Brainstorm Archetype Fields */}
              {selectedTemplate.archetype === 'brainstorm' && (
                <>
                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      Focus Topic / Problem Space
                    </label>
                    <textarea
                      rows={2}
                      value={answers.brainstormTopic || ''}
                      onChange={(e) => setAnswers({ ...answers, brainstormTopic: e.target.value })}
                      placeholder="e.g. Markdown table generator, regex workbench, focus timer for writing..."
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)] resize-none"
                    />
                  </div>

                  <p className="text-[10.5px] text-[var(--text-muted)]">
                    This prompt guides an AI model to analyze the 320–480px sidebar constraints and propose 3 tailored panel app concepts with specific state and layout recommendations.
                  </p>
                </>
              )}

              {/* Adapt Archetype Fields */}
              {selectedTemplate.archetype === 'adapt' && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block">
                      Existing HTML Application Code
                    </label>

                    {activeEditorTab && activeEditorTab.content.trim() && (
                      <button
                        type="button"
                        onClick={handleImportFromActiveTab}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FileCode className="w-3 h-3" />
                        <span>Load from active tab: {activeEditorTab.title}</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={4}
                    value={answers.existingHtml || ''}
                    onChange={(e) => setAnswers({ ...answers, existingHtml: e.target.value })}
                    placeholder="Paste existing HTML/JS/CSS code here (or click above to import from active editor tab)..."
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] font-mono text-[10px] outline-none focus:border-[var(--accent-primary)] resize-y leading-relaxed"
                  />

                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={answers.appName}
                      onChange={(e) => setAnswers({ ...answers, appName: e.target.value })}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-[10.5px] text-[var(--text-muted)] font-medium block mb-1">
                      State to Persist (Optional)
                    </label>
                    <input
                      type="text"
                      value={answers.targetStateDescription || ''}
                      onChange={(e) => setAnswers({ ...answers, targetStateDescription: e.target.value })}
                      placeholder="e.g. Form fields, checklist items, history log"
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-1 text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapsible Prompt Text Inspector */}
          {showPromptEditor && (
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-[10.5px] text-[var(--text-secondary)]">
                  <span>Assembled Prompt ({activePrompt.length} chars)</span>
                  {isPromptEdited && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                      Edited Override
                    </span>
                  )}
                </div>
                {isPromptEdited && (
                  <button
                    type="button"
                    onClick={handleResetPrompt}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Reset to Form
                  </button>
                )}
              </div>
              <textarea
                rows={8}
                value={activePrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  setIsPromptEdited(true);
                }}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded px-2.5 py-2 text-[var(--text-primary)] font-mono text-[10px] outline-none focus:border-[var(--accent-primary)] resize-y leading-relaxed"
                placeholder="System prompt markdown..."
              />
            </div>
          )}
        </div>
      )}

      {/* Paste AI Response Accordion / Input */}
      <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card-secondary-bg)] space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-purple-400" />
            <span>Paste AI Response</span>
          </label>
          <span className="text-[10px] text-[var(--text-muted)]">Raw markdown or HTML code block</span>
        </div>

        <textarea
          rows={3}
          value={pastedReply}
          onChange={(e) => {
            setPastedReply(e.target.value);
            setParseError(null);
          }}
          placeholder="Paste AI reply here (e.g. ```html <!DOCTYPE html> ... ```)..."
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md px-2.5 py-1.5 text-[var(--text-primary)] font-mono text-[11px] outline-none focus:border-[var(--accent-primary)] resize-none"
        />

        {parseError && (
          <div className="text-[10.5px] text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleExtractPastedReply}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-medium text-[11px] cursor-pointer shadow-xs transition-colors"
        >
          <span>Extract & Load HTML from Reply</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
