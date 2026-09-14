import React, { useState, useMemo } from 'react';
import { Modal } from '../../primitives/Modal';
import { Button } from '../../primitives/Button';
import { Badge } from '../../primitives/Badge';
import { Input } from '../../primitives/Input';
import { RibbonIcon, AVAILABLE_ICONS } from '../Ribbon/RibbonIcon';
import { IconPicker } from '../Common/IconPicker';
import { useFormattingStore, PRESET_FORMATTING_BUTTONS } from '../../store/formattingStore';
import { useNotificationStore } from '../../store/notificationStore';
import { MarkdownFormatButton, MarkdownFormatType, FormattingButtonSize } from '../../types';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  Code2,
  Heading,
  List,
  Quote,
  Table,
  Link,
  Layers,
  Wand2,
  Info
} from 'lucide-react';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Presets' },
  { id: 'format', label: 'Text Styles' },
  { id: 'heading', label: 'Headings' },
  { id: 'list', label: 'Lists & Tasks' },
  { id: 'block', label: 'Blocks & Quotes' },
  { id: 'insert', label: 'Media & Tables' },
  { id: 'tool', label: 'Tools & Actions' },
];

export const FormattingCustomizerModal: React.FC = () => {
  const {
    buttons,
    isCustomizerOpen,
    closeCustomizer,
    addButton,
    addPresetButton,
    removeButton,
    toggleButton,
    updateButton,
    moveButtonUp,
    moveButtonDown,
    resetToDefaults,
    isMultiRowExpanded,
    setIsMultiRowExpanded,
    buttonSize,
    setButtonSize
  } = useFormattingStore();

  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<'manage' | 'presets' | 'custom'>('manage');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom button creator state
  const [customLabel, setCustomLabel] = useState('');
  const [customIcon, setCustomIcon] = useState('Sparkles');
  const [customType, setCustomType] = useState<MarkdownFormatType>('wrap');
  const [customPrefix, setCustomPrefix] = useState('**');
  const [customSuffix, setCustomSuffix] = useState('**');
  const [customTitle, setCustomTitle] = useState('');
  const [customIsAccent, setCustomIsAccent] = useState(false);

  const activeButtons = useMemo(() => buttons.filter(b => b.enabled), [buttons]);

  // Filtered preset buttons for library tab
  const filteredPresets = useMemo(() => {
    return PRESET_FORMATTING_BUTTONS.filter(preset => {
      const matchesCat = selectedCategory === 'all' || preset.category === selectedCategory;
      const matchesSearch = !searchQuery.trim() || 
        preset.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        preset.prefix.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isCustomizerOpen) return null;

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    addButton({
      label: customLabel.trim(),
      icon: customIcon,
      title: customTitle.trim() || `${customLabel.trim()} formatting`,
      prefix: customPrefix,
      suffix: customType === 'wrap' || customType === 'block' ? customSuffix : undefined,
      type: customType,
      isAccent: customIsAccent,
      enabled: true
    });

    addNotification('Formatting Button Created', `Added "${customLabel.trim()}" to markdown bar`, 'success');

    // Reset and return to manage tab
    setCustomLabel('');
    setCustomTitle('');
    setCustomPrefix('');
    setCustomSuffix('');
    setActiveTab('manage');
  };

  const handleReset = () => {
    resetToDefaults();
    addNotification('Reset Formatting Buttons', 'Restored default markdown formatting toolbar', 'info');
  };

  return (
    <Modal
      isOpen={isCustomizerOpen}
      onClose={closeCustomizer}
      title="Customize Markdown Formatting Buttons"
      subtitle="Add, remove, reorder, or create custom syntax formatting buttons"
      icon={SlidersHorizontal}
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={handleReset}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Restore default toolbar buttons"
          >
            Reset Defaults
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={closeCustomizer}
            title="Save and close"
          >
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        {/* Live Toolbar Preview */}
        <div className="p-3 bg-[var(--titlebar-bg)]/80 border border-[var(--border-subtle)] rounded-lg space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            <span>Live Toolbar Preview</span>
            <span className="text-[10px] font-normal lowercase">{activeButtons.length} buttons visible</span>
          </div>

          <div className="h-10 bg-[var(--app-bg)] border border-[var(--border-primary)] rounded-md px-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {activeButtons.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)] italic px-2">No buttons enabled. Add presets below.</span>
            ) : (
              activeButtons.map((item) => (
                <div
                  key={item.id}
                  className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-xs border shadow-2xs ${
                    item.isAccent
                      ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40 font-semibold'
                      : 'bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                  title={item.title || item.label}
                >
                  <RibbonIcon name={item.icon} className="w-3.5 h-3.5" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[var(--border-primary)] pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors font-medium ${
              activeTab === 'manage'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Active Buttons ({activeButtons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors font-medium ${
              activeTab === 'presets'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Preset Library</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors font-medium ${
              activeTab === 'custom'
                ? 'bg-[var(--card-bg)] text-[var(--accent-primary)] shadow-2xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Custom Button</span>
          </button>
        </div>

        {/* Tab 1: Manage Active Buttons (Reorder, Toggle, Remove) */}
        {activeTab === 'manage' && (
          <div className="space-y-3">
            {/* Multi-row layout option */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--app-bg)] border border-[var(--border-subtle)] shadow-2xs">
              <div className="flex items-start gap-2.5 min-w-0 pr-2">
                <div className="p-1.5 rounded-md bg-[var(--accent-container)]/50 text-[var(--accent-primary)] shrink-0 mt-0.5">
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label htmlFor="multi-row-toggle" className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer block">
                    Expand Toolbar into Multiple Rows
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                    Wraps quick formatting buttons into multiple rows on narrow screens so all available buttons are visible without horizontal scrolling.
                  </p>
                </div>
              </div>
              <input
                id="multi-row-toggle"
                type="checkbox"
                checked={isMultiRowExpanded}
                onChange={(e) => setIsMultiRowExpanded(e.target.checked)}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0"
              />
            </div>

            {/* Button Size Config */}
            <div className="p-2.5 rounded-lg bg-[var(--app-bg)] border border-[var(--border-subtle)] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                  <div className="p-1.5 rounded-md bg-[var(--accent-container)]/50 text-[var(--accent-primary)] shrink-0 mt-0.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] block">
                      Button Size
                    </span>
                    <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
                      Adjust the size of the quick formatting buttons for desktop density or mobile touch comfort
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-[var(--accent-primary)] bg-[var(--accent-container)]/40 px-2 py-0.5 rounded-full border border-[var(--accent-primary)]/30 shrink-0">
                  {buttonSize === 'small' ? 'Small · 28px' : buttonSize === 'large' ? 'Large · 44px' : 'Medium · 36px'}
                </span>
              </div>

              {/* Segmented Button Size Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-[var(--card-bg)] rounded-lg border border-[var(--border-subtle)]">
                {(['small', 'medium', 'large'] as const).map((size) => {
                  const isSelected = buttonSize === size;
                  const label = size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : 'Large';
                  const subtitle = size === 'small' ? '28px · Compact' : size === 'medium' ? '36px · Standard' : '44px · Touch';
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setButtonSize(size)}
                      className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-md transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-primary)] text-white shadow-xs font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)]'
                      }`}
                    >
                      <span className="text-xs font-medium">{label}</span>
                      <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                        {subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
              <span>Reorder, toggle, or remove formatting buttons from the toolbar</span>
              <Button
                variant="accent"
                size="xs"
                icon={Plus}
                onClick={() => setActiveTab('presets')}
              >
                Add From Presets
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
              {buttons.map((button, index) => (
                <div
                  key={button.id}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    button.enabled
                      ? 'bg-[var(--card-bg)] border-[var(--border-subtle)] shadow-2xs'
                      : 'bg-[var(--app-bg)]/60 border-dashed border-[var(--border-subtle)] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveButtonUp(button.id)}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:hover:text-[var(--text-muted)] transition-colors rounded hover:bg-[var(--card-hover-bg)]"
                        title="Move Left / Up"
                        aria-label="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === buttons.length - 1}
                        onClick={() => moveButtonDown(button.id)}
                        className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:hover:text-[var(--text-muted)] transition-colors rounded hover:bg-[var(--card-hover-bg)]"
                        title="Move Right / Down"
                        aria-label="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon & Label */}
                    <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${
                      button.isAccent
                        ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40'
                        : 'bg-[var(--titlebar-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                    }`}>
                      <RibbonIcon name={button.icon} className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                          {button.label}
                        </span>
                        {!button.isBuiltIn && (
                          <Badge variant="outline" size="xs">
                            Custom
                          </Badge>
                        )}
                        {button.isAccent && (
                          <Badge variant="accent" size="xs">
                            Accent
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate max-w-xs sm:max-w-md">
                        {button.title || button.prefix}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Syntax pill, Toggle, Remove */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {button.prefix && (
                      <span className="hidden sm:inline text-[10px] font-mono text-[var(--text-muted)] bg-[var(--app-bg)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
                        {button.prefix}...{button.suffix || ''}
                      </span>
                    )}

                    {/* Enable/Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleButton(button.id)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        button.enabled
                          ? 'bg-[var(--accent-primary)] text-[var(--button-primary-text,#fff)] shadow-2xs'
                          : 'bg-[var(--titlebar-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                      title={button.enabled ? 'Click to hide from toolbar' : 'Click to show in toolbar'}
                    >
                      {button.enabled ? 'Active' : 'Hidden'}
                    </button>

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => {
                        removeButton(button.id);
                        addNotification('Button Removed', `Removed "${button.label}" from toolbar`, 'info');
                      }}
                      className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title={button.isBuiltIn ? 'Remove / Hide button' : 'Permanently delete button'}
                      aria-label="Remove button"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Preset Library (Add formatting buttons) */}
        {activeTab === 'presets' && (
          <div className="space-y-3">
            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search formatting buttons (bold, h3, quote, table...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0 text-xs">
                {CATEGORY_TABS.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-[var(--accent-primary)] text-white font-medium shadow-2xs'
                        : 'bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const currentButton = buttons.find(b => b.id === preset.id);
                const isCurrentlyActive = currentButton?.enabled;

                return (
                  <div
                    key={preset.id}
                    className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                      isCurrentlyActive
                        ? 'bg-[var(--card-bg)] border-[var(--accent-primary)]/40 shadow-2xs'
                        : 'bg-[var(--card-bg)] border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${
                        preset.isAccent
                          ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)]/40'
                          : 'bg-[var(--titlebar-bg)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                      }`}>
                        <RibbonIcon name={preset.icon} className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-[var(--text-primary)] truncate">
                            {preset.label}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--app-bg)] px-1 rounded border border-[var(--border-subtle)]">
                            {preset.prefix}{preset.suffix || ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {preset.title}
                        </p>
                      </div>
                    </div>

                    {/* Add / Added Button */}
                    <div className="shrink-0">
                      {isCurrentlyActive ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Check}
                          onClick={() => {
                            removeButton(preset.id);
                            addNotification('Removed Button', `Removed "${preset.label}" from toolbar`, 'info');
                          }}
                          className="text-emerald-500 hover:text-red-500 hover:bg-red-500/10"
                          title="Click to remove from toolbar"
                        >
                          Added
                        </Button>
                      ) : (
                        <Button
                          variant="accent"
                          size="xs"
                          icon={Plus}
                          onClick={() => {
                            addPresetButton(preset.id);
                            addNotification('Added Button', `Added "${preset.label}" to toolbar`, 'success');
                          }}
                          title="Add to formatting toolbar"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Button Creator */}
        {activeTab === 'custom' && (
          <form onSubmit={handleCreateCustom} className="space-y-3.5 max-h-[46vh] overflow-y-auto pr-1">
            <div className="p-3 bg-[var(--titlebar-bg)]/60 border border-[var(--border-subtle)] rounded-lg flex items-start gap-2.5 text-xs text-[var(--text-muted)]">
              <Info className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <span>
                Create a custom formatting button to insert or wrap text with your own markdown tags,
                syntax delimiters (e.g. math `<span />`, spoilers, HTML callouts), or prompt directives.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button Label */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Button Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spoiler, Math, Tag"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md text-xs bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {/* Tooltip / Description */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Tooltip Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wrap in spoiler tag"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md text-xs bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>

            {/* Action Type */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Formatting Behavior
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                {[
                  { id: 'wrap', label: 'Wrap Selection', desc: 'prefix + text + suffix' },
                  { id: 'line-prefix', label: 'Line Prefix', desc: 'prefix at line start' },
                  { id: 'block', label: 'Code / Block', desc: 'multi-line container' },
                  { id: 'insert', label: 'Raw Insert', desc: 'insert snippet at cursor' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCustomType(t.id as MarkdownFormatType)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      customType === t.id
                        ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)] border-[var(--accent-primary)] font-semibold'
                        : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--border-primary)]'
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Prefix & Suffix Syntax */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  Prefix Delimiter <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={customType === 'line-prefix' ? 'e.g. > [!NOTE] ' : 'e.g. ** or $$ or <mark>'}
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md text-xs font-mono bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>

              {(customType === 'wrap' || customType === 'block') && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                    Suffix Delimiter
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ** or $$ or </mark>"
                    value={customSuffix}
                    onChange={(e) => setCustomSuffix(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md text-xs font-mono bg-[var(--card-bg)] border border-[var(--border-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                </div>
              )}
            </div>

            {/* Accent Style & Icon Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Icon & Visual Appearance
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customIsAccent}
                    onChange={(e) => setCustomIsAccent(e.target.checked)}
                    className="rounded accent-[var(--accent-primary)]"
                  />
                  <span>Highlight with Accent Color</span>
                </label>
              </div>

              {/* Unified Visual Icon Picker */}
              <IconPicker
                value={customIcon}
                onChange={setCustomIcon}
                label="Button Icon"
                gridMaxHeight="max-h-24"
              />
            </div>

            {/* Output Preview */}
            <div className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)]">Preview output:</span>
                <span className="font-mono bg-[var(--app-bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)] text-[var(--text-primary)]">
                  {customPrefix}selected_text{customType === 'wrap' || customType === 'block' ? customSuffix : ''}
                </span>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="sm"
                icon={Plus}
                disabled={!customLabel.trim() || !customPrefix}
              >
                Add to Formatting Bar
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
