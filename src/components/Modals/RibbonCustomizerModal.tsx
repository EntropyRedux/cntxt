import React, { useState } from 'react';
import { Modal } from '../../primitives/Modal';
import { Button } from '../../primitives/Button';
import { Badge } from '../../primitives/Badge';
import { Card } from '../../primitives/Card';
import { Input, Toggle } from '../../primitives/Input';
import { RibbonIcon, AVAILABLE_ICONS } from '../Ribbon/RibbonIcon';
import { useRibbonStore } from '../../store/ribbonStore';
import { useActionStore } from '../../store/actionStore';
import { useWorkflowStore } from '../../store/workflowStore';
import { useTemplateStore } from '../../store/templateStore';
import { RibbonItem, RibbonItemType } from '../../types';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Zap,
  Variable,
  Calculator,
  ListTree,
  FileText,
  FolderOpen,
  Eye,
  Braces,
  Play,
  Layers,
  Save,
  Command,
  Search,
  Check,
  Palette
} from 'lucide-react';

const COLOR_OPTIONS = [
  { label: 'Accent', value: 'accent', bg: 'bg-[var(--accent-primary)]' },
  { label: 'Amber', value: 'amber', bg: 'bg-amber-500' },
  { label: 'Emerald', value: 'emerald', bg: 'bg-emerald-500' },
  { label: 'Purple', value: 'purple', bg: 'bg-purple-500' },
  { label: 'Rose', value: 'rose', bg: 'bg-rose-500' },
  { label: 'Cyan', value: 'cyan', bg: 'bg-cyan-500' },
  { label: 'Blue', value: 'blue', bg: 'bg-blue-500' },
];

const BUILT_IN_TOOLS = [
  { id: 'variable-modal', label: 'Fill Variables', icon: 'Variable', color: 'accent', shortcut: 'Alt+V', desc: 'Opens dynamic variable replacement form' },
  { id: 'tokens', label: 'Token Inspector', icon: 'Zap', color: 'amber', desc: 'Inspects token consumption & model budget' },
  { id: 'formulas', label: 'Formulas', icon: 'Calculator', color: 'emerald', desc: 'Evaluates dynamic prompt calculations' },
  { id: 'outline', label: 'Outline', icon: 'ListTree', color: 'cyan', shortcut: 'Ctrl+Shift+O', desc: 'Navigates markdown document headings' },
  { id: 'templates', label: 'Templates', icon: 'FileText', color: 'purple', desc: 'Context prompt templates browser' },
  { id: 'explorer', label: 'File Explorer', icon: 'FolderOpen', color: 'blue', desc: 'Workspace files & document tree' },
  { id: 'toggle-view', label: 'Rendered View Toggle', icon: 'Eye', color: 'accent', shortcut: 'Ctrl+M', desc: 'Switches between live markdown preview and code editor' },
  { id: 'command-palette', label: 'Command Palette', icon: 'Command', color: 'purple', shortcut: 'Ctrl+K', desc: 'Quick launcher for all commands & actions' },
  { id: 'new-doc', label: 'New Document', icon: 'Plus', color: 'accent', shortcut: 'Ctrl+N', desc: 'Creates a new empty context prompt tab' },
  { id: 'save-file', label: 'Save Document', icon: 'Save', color: 'emerald', shortcut: 'Ctrl+S', desc: 'Saves current active document to disk' },
  { id: 'insert-image-modal', label: 'Insert Image', icon: 'Image', color: 'emerald', shortcut: 'Ctrl+V / Drag', desc: 'Insert local image or web URL, or paste directly' },
];

export const RibbonCustomizerModal: React.FC = () => {
  const {
    items,
    isCustomizerOpen,
    closeCustomizer,
    addItem,
    updateItem,
    removeItem,
    toggleItem,
    moveItemUp,
    moveItemDown,
    resetToDefaults
  } = useRibbonStore();

  const { actions } = useActionStore();
  const { workflows } = useWorkflowStore();
  const { templates } = useTemplateStore();

  const [activeTab, setActiveTab] = useState<'manage' | 'add_tools' | 'add_actions' | 'add_workflows' | 'add_templates' | 'custom'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Custom button creator state
  const [customLabel, setCustomLabel] = useState('');
  const [customIcon, setCustomIcon] = useState('Sparkles');
  const [customColor, setCustomColor] = useState('accent');
  const [customType, setCustomType] = useState<RibbonItemType>('tool');
  const [customTarget, setCustomTarget] = useState('variable-modal');
  const [customTooltip, setCustomTooltip] = useState('');
  const [customShortcut, setCustomShortcut] = useState('');

  if (!isCustomizerOpen) return null;

  const handleCreateCustomButton = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    addItem({
      label: customLabel.trim(),
      icon: customIcon,
      color: customColor,
      type: customType,
      targetId: customTarget,
      tooltip: customTooltip.trim() || undefined,
      shortcut: customShortcut.trim() || undefined,
      enabled: true,
      showLabel: false
    });

    // Reset and return to manage
    setCustomLabel('');
    setCustomTooltip('');
    setCustomShortcut('');
    setActiveTab('manage');
  };

  const isAlreadyInRibbon = (targetId: string, type: RibbonItemType) => {
    return items.some(i => i.targetId === targetId && i.type === type);
  };

  return (
    <Modal
      isOpen={isCustomizerOpen}
      onClose={closeCustomizer}
      title="Customize Modular Ribbon"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={resetToDefaults}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Reset to Defaults
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={closeCustomizer}
          >
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Live Ribbon Preview */}
        <div className="p-3 bg-[var(--titlebar-bg)]/80 border border-[var(--border-subtle)] rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Live Ribbon Preview</span>
            <span className="text-[10px] font-normal lowercase">{items.filter(i => i.enabled).length} active buttons</span>
          </div>

          <div className="h-8 bg-[var(--app-bg)] border border-[var(--border-primary)] rounded-md px-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <Badge variant="accent" size="xs" dot>
              CNTXT Ribbon
            </Badge>
            <div className="h-3 w-px bg-[var(--border-subtle)] mx-0.5" />

            {items.filter(i => i.enabled).map((item) => {
              const colorClass = 
                item.color === 'amber' ? 'text-amber-500' :
                item.color === 'emerald' ? 'text-emerald-500' :
                item.color === 'purple' ? 'text-purple-500' :
                item.color === 'rose' ? 'text-rose-500' :
                item.color === 'cyan' ? 'text-cyan-500' :
                item.color === 'blue' ? 'text-blue-500' :
                'text-[var(--accent-primary)]';

              const isIconOnly = item.showLabel === false;

              if (isIconOnly) {
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-center w-6 h-6 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] shrink-0 shadow-2xs"
                    title={item.label}
                  >
                    <RibbonIcon name={item.icon} className={`w-3 h-3 ${colorClass}`} />
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--card-bg)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap shrink-0 shadow-2xs"
                >
                  <RibbonIcon name={item.icon} className={`w-3 h-3 ${colorClass}`} />
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--app-bg)] px-1 rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--border-primary)] pb-2 overflow-x-auto no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            title={`Manage Buttons (${items.length})`}
            aria-label={`Manage Buttons (${items.length})`}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'manage'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add_tools')}
            title="Built-in Tools"
            aria-label="Built-in Tools"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'add_tools'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add_actions')}
            title={`Actions (${actions.length})`}
            aria-label={`Actions (${actions.length})`}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'add_actions'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add_workflows')}
            title={`Workflows (${workflows.length})`}
            aria-label={`Workflows (${workflows.length})`}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'add_workflows'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add_templates')}
            title={`Templates (${templates.length})`}
            aria-label={`Templates (${templates.length})`}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'add_templates'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            title="Custom Button Creator"
            aria-label="Custom Button Creator"
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              activeTab === 'custom'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Manage Current Buttons */}
        {activeTab === 'manage' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Reorder, enable/disable, or customize buttons in your ribbon</span>
              <Button
                variant="accent"
                size="xs"
                icon={Plus}
                onClick={() => setActiveTab('add_tools')}
              >
                Add Buttons
              </Button>
            </div>

            <div className="space-y-1.5">
              {items.map((item, index) => {
                const colorClass = 
                  item.color === 'amber' ? 'text-amber-500' :
                  item.color === 'emerald' ? 'text-emerald-500' :
                  item.color === 'purple' ? 'text-purple-500' :
                  item.color === 'rose' ? 'text-rose-500' :
                  item.color === 'cyan' ? 'text-cyan-500' :
                  item.color === 'blue' ? 'text-blue-500' :
                  'text-[var(--accent-primary)]';

                const isEditing = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border transition-all ${
                      item.enabled 
                        ? 'bg-[var(--card-bg)] border-[var(--border-subtle)]' 
                        : 'bg-[var(--app-bg)] border-[var(--border-primary)] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Left: Reorder arrows & Icon */}
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveItemUp(item.id)}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 hover:bg-[var(--card-hover-bg)]"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === items.length - 1}
                            onClick={() => moveItemDown(item.id)}
                            className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 hover:bg-[var(--card-hover-bg)]"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-7 h-7 rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <RibbonIcon name={item.icon} className={`w-3.5 h-3.5 ${colorClass}`} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {item.label}
                            </span>
                            <Badge size="xs" variant={item.type === 'tool' ? 'default' : item.type === 'action' ? 'accent' : 'outline'}>
                              {item.type}
                            </Badge>
                            {item.showLabel === false ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-bg)] text-[var(--text-muted)] border border-[var(--border-subtle)] font-medium">
                                Icon Only
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--app-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)] font-medium">
                                Icon + Text
                              </span>
                            )}
                          </div>
                          {item.tooltip && (
                            <p className="text-[11px] text-[var(--text-muted)] truncate">{item.tooltip}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.shortcut && (
                          <kbd className="hidden sm:inline-block text-[10px] font-mono text-[var(--text-muted)] bg-[var(--app-bg)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                            {item.shortcut}
                          </kbd>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingItemId(isEditing ? null : item.id)}
                          title={isEditing ? `Close configuration for ${item.label}` : `Edit configuration for ${item.label}`}
                          aria-label={isEditing ? `Close configuration for ${item.label}` : `Edit configuration for ${item.label}`}
                          className="w-7 h-7 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <Toggle
                          checked={item.enabled}
                          onChange={() => toggleItem(item.id)}
                          size="sm"
                        />

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove from Ribbon"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">Label</label>
                            <Input
                              value={item.label}
                              onChange={(e) => updateItem(item.id, { label: e.target.value })}
                              inputSize="sm"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">Color Theme</label>
                            <select
                              value={item.color || 'accent'}
                              onChange={(e) => updateItem(item.id, { color: e.target.value })}
                              className="w-full h-8 px-2 text-xs rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                            >
                              {COLOR_OPTIONS.map(c => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block mb-1">Icon</label>
                            <select
                              value={item.icon}
                              onChange={(e) => updateItem(item.id, { icon: e.target.value })}
                              className="w-full h-8 px-2 text-xs rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                            >
                              {AVAILABLE_ICONS.map(ic => (
                                <option key={ic} value={ic}>{ic}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded bg-[var(--app-bg)] border border-[var(--border-subtle)]">
                          <div>
                            <div className="text-xs font-medium text-[var(--text-primary)]">
                              Ribbon Button Display Style
                            </div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {item.showLabel === false 
                                ? 'Currently Icon Only (Compact icon button with hover tooltip)' 
                                : 'Currently showing Icon and Text label'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--text-secondary)]">Show text</span>
                            <Toggle
                              checked={item.showLabel !== false}
                              onChange={() => updateItem(item.id, { showLabel: item.showLabel === false ? true : false })}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Add Built-in Tools */}
        {activeTab === 'add_tools' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Click to pin core CNTXT tools and inspection panels directly to your ribbon:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BUILT_IN_TOOLS.map((tool) => {
                const added = isAlreadyInRibbon(tool.id, 'tool');

                return (
                  <Card
                    key={tool.id}
                    variant="default"
                    padding="sm"
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        <RibbonIcon name={tool.icon} className="w-4 h-4 text-[var(--accent-primary)]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{tool.label}</div>
                        <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{tool.desc}</div>
                      </div>
                    </div>

                    <Button
                      variant={added ? 'secondary' : 'primary'}
                      size="xs"
                      disabled={added}
                      icon={added ? Check : Plus}
                      onClick={() => {
                        addItem({
                          label: tool.label,
                          icon: tool.icon,
                          type: 'tool',
                          targetId: tool.id,
                          color: tool.color,
                          shortcut: tool.shortcut,
                          tooltip: tool.desc,
                          enabled: true
                        });
                        setActiveTab('manage');
                      }}
                    >
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Add Custom Actions */}
        {activeTab === 'add_actions' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Pin custom JavaScript prompt transformers and automated actions to your ribbon:
            </p>

            {actions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-primary)] rounded-lg">
                No custom actions created yet. Create one in the Actions sidebar!
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((act) => {
                  const added = isAlreadyInRibbon(act.id, 'action');

                  return (
                    <Card
                      key={act.id}
                      variant="default"
                      padding="sm"
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <Play className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">{act.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{act.description}</div>
                        </div>
                      </div>

                      <Button
                        variant={added ? 'secondary' : 'accent'}
                        size="xs"
                        disabled={added}
                        icon={added ? Check : Plus}
                        onClick={() => {
                          addItem({
                            label: act.name,
                            icon: act.icon || 'Sparkles',
                            type: 'action',
                            targetId: act.id,
                            color: 'rose',
                            shortcut: act.shortcut,
                            tooltip: act.description,
                            enabled: true
                          });
                          setActiveTab('manage');
                        }}
                      >
                        {added ? 'Pinned' : 'Pin to Ribbon'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Add Workflows */}
        {activeTab === 'add_workflows' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Pin full prompt blueprints and multi-step workflows to your ribbon:
            </p>

            {workflows.length === 0 ? (
              <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-primary)] rounded-lg">
                No workflows created yet.
              </div>
            ) : (
              <div className="space-y-2">
                {workflows.map((wf) => {
                  const added = isAlreadyInRibbon(wf.id, 'workflow');

                  return (
                    <Card
                      key={wf.id}
                      variant="default"
                      padding="sm"
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--text-primary)]">{wf.name}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">{wf.category}</div>
                        </div>
                      </div>

                      <Button
                        variant={added ? 'secondary' : 'accent'}
                        size="xs"
                        disabled={added}
                        icon={added ? Check : Plus}
                        onClick={() => {
                          addItem({
                            label: wf.name,
                            icon: wf.icon || 'Layers',
                            type: 'workflow',
                            targetId: wf.id,
                            color: 'purple',
                            tooltip: `Insert ${wf.name} blueprint`,
                            enabled: true
                          });
                          setActiveTab('manage');
                        }}
                      >
                        {added ? 'Pinned' : 'Pin to Ribbon'}
                      </Button>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Add Templates */}
        {activeTab === 'add_templates' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Pin prompt template shortcuts directly into your ribbon for fast insertion:
            </p>

            <div className="space-y-2">
              {templates.map((tpl) => {
                const added = isAlreadyInRibbon(tpl.id, 'template');

                return (
                  <Card
                    key={tpl.id}
                    variant="default"
                    padding="sm"
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-cyan-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{tpl.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)] line-clamp-1">{tpl.description}</div>
                      </div>
                    </div>

                    <Button
                      variant={added ? 'secondary' : 'accent'}
                      size="xs"
                      disabled={added}
                      icon={added ? Check : Plus}
                      onClick={() => {
                        addItem({
                          label: tpl.name,
                          icon: 'FileText',
                          type: 'template',
                          targetId: tpl.id,
                          color: 'cyan',
                          tooltip: `Insert template: ${tpl.name}`,
                          enabled: true
                        });
                        setActiveTab('manage');
                      }}
                    >
                      {added ? 'Pinned' : 'Pin to Ribbon'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 6: Custom Button Creator */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCreateCustomButton} className="space-y-3">
            <div className="p-3 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-lg space-y-3">
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Create Custom Ribbon Button</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Button Label <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Quick Summarize"
                    inputSize="sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Button Type
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as RibbonItemType)}
                    className="w-full h-8 px-2 text-xs rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    <option value="tool">Built-in Tool</option>
                    <option value="action">Custom Action</option>
                    <option value="workflow">Workflow Blueprint</option>
                    <option value="template">Template</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Icon
                  </label>
                  <select
                    value={customIcon}
                    onChange={(e) => setCustomIcon(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    {AVAILABLE_ICONS.map(ic => (
                      <option key={ic} value={ic}>{ic}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Accent Color
                  </label>
                  <select
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    className="w-full h-8 px-2 text-xs rounded-md bg-[var(--app-bg)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    {COLOR_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Tooltip Description
                  </label>
                  <Input
                    value={customTooltip}
                    onChange={(e) => setCustomTooltip(e.target.value)}
                    placeholder="Short description on hover"
                    inputSize="sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                    Keyboard Shortcut (Optional)
                  </label>
                  <Input
                    value={customShortcut}
                    onChange={(e) => setCustomShortcut(e.target.value)}
                    placeholder="e.g. Ctrl+Alt+S"
                    inputSize="sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  disabled={!customLabel.trim()}
                >
                  Create & Pin Button
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
