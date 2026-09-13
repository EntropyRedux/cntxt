import React from 'react';
import { 
  Check, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  Laptop,
  Touchpad,
  SlidersHorizontal,
  Type,
  Layers,
  Activity,
  Cpu,
  Clock,
  FlaskConical
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useFormattingStore } from '../../store/formattingStore';
import { useRuntimeBridge } from '../../adapters';
import { ThemeName } from '../../types';
import { CURATED_FONTS, getCuratedFontByFamily, THEME_DEFAULT_FONTS } from '../../constants/fonts';

export const SettingsPanel: React.FC = () => {
  const bridge = useRuntimeBridge();
  const { settings, updateSettings, resetSettings, openFontSelector } = useSettingsStore();
  const { addNotification } = useNotificationStore();
  const { 
    isMultiRowExpanded, 
    setIsMultiRowExpanded, 
    openCustomizer,
    buttonSize,
    setButtonSize 
  } = useFormattingStore();

  const themes: { id: ThemeName; name: string; mode: 'light' | 'dark'; bg: string; accent: string; badge?: string }[] = [
    { 
      id: 'google-material-3', 
      name: 'Google Material 3', 
      mode: 'light', 
      bg: '#FFFFFF', 
      accent: '#0B57D0',
      badge: 'Material 3 Light' 
    },
    { 
      id: 'parchment', 
      name: 'Parchment', 
      mode: 'light', 
      bg: '#FAF6EE', 
      accent: '#9C522B',
      badge: 'Warm Linen' 
    },
    { 
      id: 'contextpad-dark', 
      name: 'ContextPad Dark+', 
      mode: 'dark', 
      bg: '#1E1E1E', 
      accent: '#007ACC' 
    },
    { 
      id: 'one-dark', 
      name: 'Atom One Dark', 
      mode: 'dark', 
      bg: '#282C34', 
      accent: '#61AFEF' 
    },
    { 
      id: 'dracula', 
      name: 'Dracula Purple', 
      mode: 'dark', 
      bg: '#282A36', 
      accent: '#BD93F9' 
    },
    { 
      id: 'nord', 
      name: 'Nord Arctic', 
      mode: 'dark', 
      bg: '#2E3440', 
      accent: '#88C0D0' 
    },
    { 
      id: 'monokai', 
      name: 'Monokai Pro', 
      mode: 'dark', 
      bg: '#2D2A2E', 
      accent: '#FFD866' 
    },
    { 
      id: 'github-dark', 
      name: 'GitHub Dark', 
      mode: 'dark', 
      bg: '#0D1117', 
      accent: '#58A6FF' 
    },
    { 
      id: 'solarized-dark', 
      name: 'Solarized Dark', 
      mode: 'dark', 
      bg: '#002B36', 
      accent: '#268BD2' 
    }
  ];

  const handleExportBackup = async () => {
    try {
      await bridge.fs.exportWorkspace();
      addNotification('Backup Exported', 'Full workspace JSON downloaded', 'success');
    } catch (e: any) {
      addNotification('Export Failed', e.message, 'error');
    }
  };

  const handleImportBackup = async () => {
    try {
      const file = await bridge.fs.openFile();
      if (!file) return;
      const json = JSON.parse(file.content);
      if (json.data && json.data.contextpad_settings) {
        updateSettings(json.data.contextpad_settings);
      } else if (json.settings) {
        updateSettings(json.settings);
      }
      await bridge.fs.importWorkspace(file.content);
      addNotification('Settings Restored', 'Configuration restored from backup', 'success');
    } catch (err: any) {
      addNotification('Import Error', 'Invalid backup format', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3 text-xs select-none theme-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-secondary)] text-[11px]">
          <span>Preferences & Themes</span>
        </div>
      </div>

      {/* Global Application Theme Engine */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Application Theme Engine</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-container)] text-[var(--on-accent-container)] font-semibold">
            {settings.theme === 'parchment' ? 'Parchment' : settings.theme === 'google-material-3' ? 'M3 Light' : 'Dark Mode'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Themes dynamically re-skin the entire application interface, toolbars, sidebars, modals, and editor typography.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {themes.map(t => {
            const isSelected = settings.theme === t.id;
            const themeDefaultFontFamily = THEME_DEFAULT_FONTS[t.id];
            const matchingFont = getCuratedFontByFamily(themeDefaultFontFamily);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  updateSettings({ theme: t.id, fontFamily: themeDefaultFontFamily });
                  addNotification('Theme & Font Applied', `Switched to ${t.name} (Font: ${matchingFont.name})`, 'info');
                }}
                title={`Theme: ${t.name} (Default Font: ${matchingFont.name})`}
                aria-label={`Select ${t.name} theme`}
                className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-container)]/30 ring-2 ring-[var(--accent-primary)]/40 shadow-xs' 
                    : 'border-[var(--border-primary)] bg-[var(--card-secondary-bg)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate flex items-center gap-1">
                    {t.mode === 'light' ? (
                      <Sun className="w-3 h-3 text-[#E68A00] shrink-0" />
                    ) : (
                      <Moon className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    )}
                    <span className="truncate">{t.name}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />}
                </div>

                <div className="text-[10px] text-[var(--text-muted)] truncate mb-1">
                  Font: <span className="text-[var(--text-secondary)] font-medium">{matchingFont.name}</span>
                </div>

                <div className="flex items-center justify-between mt-0.5">
                  <div className="flex items-center gap-1">
                    <div 
                      className="w-4 h-3.5 rounded-xs border border-[var(--border-primary)]" 
                      style={{ backgroundColor: t.bg }} 
                      title={`Background: ${t.bg}`}
                    />
                    <div 
                      className="w-4 h-3.5 rounded-xs" 
                      style={{ backgroundColor: t.accent }} 
                      title={`Accent: ${t.accent}`}
                    />
                  </div>
                  {t.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-tight text-[var(--accent-primary)] bg-[var(--accent-container)] px-1 py-0.2 rounded">
                      {t.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Touchscreen & Adaptive UI Optimization */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Touchscreen & Mobile Optimization</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            settings.touchOptimized 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)]' 
              : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
          }`}>
            {settings.touchOptimized ? 'Touch Active (44px+)' : 'Desktop Mode'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Adapt layout density, tap targets, mobile drawers, and virtual keyboard accessory toolbar for seamless desktop, tablet, and mobile workflows.
        </p>

        <div className="space-y-2.5 pt-1">
          {/* UI Density */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">UI Layout Density</span>
              <span className="text-[10px] text-[var(--text-muted)]">Spacing & target sizing</span>
            </div>
            <select
              value={settings.uiDensity === 'touch' ? 'touch' : 'desktop'}
              onChange={(e: any) => updateSettings({ 
                uiDensity: e.target.value,
                touchOptimized: e.target.value === 'touch'
              })}
              className="theme-input font-medium rounded px-2 py-1 text-xs text-[var(--accent-primary)] font-semibold"
            >
              <option value="desktop">Desktop Mode</option>
              <option value="touch">Touchscreen (Large 44px+)</option>
            </select>
          </div>

          {/* Quick Touch Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block">Touchscreen Friendly Mode</span>
              <span className="text-[10px] text-[var(--text-muted)]">Increases button & tab hit targets</span>
            </div>
            <input
              type="checkbox"
              checked={settings.touchOptimized}
              onChange={(e) => updateSettings({ 
                touchOptimized: e.target.checked,
                uiDensity: e.target.checked ? 'touch' : 'desktop'
              })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Mobile Markdown Accessory Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block">Mobile Virtual Keyboard Bar</span>
                <span className="text-[10px] text-[var(--text-muted)]">One-tap Markdown & prompt symbols</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showMobileAccessoryBar}
                onChange={(e) => updateSettings({ showMobileAccessoryBar: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
              />
            </div>
            {settings.showMobileAccessoryBar && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40">
                  <div>
                    <span className="text-xs text-[var(--text-primary)] block">Multi-row on narrow screens</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Show all buttons without horizontal scrolling</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isMultiRowExpanded}
                    onChange={(e) => setIsMultiRowExpanded(e.target.checked)}
                    className="accent-[var(--accent-primary)] rounded w-3.5 h-3.5 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40 pt-0.5">
                  <div>
                    <span className="text-xs text-[var(--text-primary)] block">Toolbar Button Size</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Compact, standard, or touch-friendly</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[var(--card-bg)] p-0.5 rounded border border-[var(--border-subtle)]">
                    {(['small', 'medium', 'large'] as const).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setButtonSize(sz)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                          buttonSize === sz
                            ? 'bg-[var(--accent-primary)] text-white font-semibold shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {sz === 'small' ? 'Sm' : sz === 'medium' ? 'Med' : 'Lrg'}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openCustomizer}
                  className="w-full mt-1 py-1.5 px-2.5 rounded-md text-xs font-medium bg-[var(--card-bg)] hover:bg-[var(--card-hover-bg)] text-[var(--accent-primary)] border border-[var(--border-subtle)] flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Customize Formatting Buttons</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace & Side Panel Layout */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Workspace & Panels</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            settings.sidebarOverlay 
              ? 'bg-[var(--accent-container)] text-[var(--on-accent-container)]' 
              : 'bg-[var(--card-secondary-bg)] text-[var(--text-muted)]'
          }`}>
            {settings.sidebarOverlay ? 'Overlay Active' : 'Docked (Pushes Editor)'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Configure how the right side panel displays relative to the editor surface.
        </p>

        <div className="space-y-2 pt-1">
          {/* Right Panel as Overlay Toggle */}
          <div className="flex items-center justify-between">
            <div className="pr-3">
              <span className="text-[var(--text-primary)] block font-medium">Right Panel as Overlay</span>
              <span className="text-[10px] text-[var(--text-muted)]">
                Display right panel as an overlay over the editor instead of pushing or resizing editor contents (does not overlay on left rail buttons)
              </span>
            </div>
            <input
              type="checkbox"
              id="toggle-sidebar-overlay"
              checked={!!settings.sidebarOverlay}
              onChange={(e) => updateSettings({ sidebarOverlay: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Editor & Typography */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Editor & Typography
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[var(--text-primary)] block font-medium">Editor Mode</span>
              <span className="text-[10px] text-[var(--text-muted)]">Active editing behavior</span>
            </div>
            <select
              value={settings.editorMode || 'rendered'}
              onChange={(e: any) => updateSettings({ editorMode: e.target.value })}
              className="theme-input font-medium rounded px-2 py-1 text-xs text-[var(--accent-primary)] font-semibold"
            >
              <option value="rendered">Live Rendered Markdown</option>
              <option value="raw">Raw Markdown</option>
            </select>
          </div>

          {/* Editor Font Family Selector */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[var(--text-primary)] block font-medium">Editor Font Family</span>
                <span className="text-[10px] text-[var(--text-muted)]">Scientifically curated typefaces</span>
              </div>
              <button
                type="button"
                onClick={openFontSelector}
                className="text-[10px] text-[var(--accent-primary)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                title="Open Scientific Font Studio"
              >
                <Type className="w-3 h-3" />
                <span>Font Studio</span>
              </button>
            </div>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="theme-input w-full font-medium rounded px-2 py-1.5 text-xs text-[var(--text-primary)]"
            >
              {CURATED_FONTS.map(f => (
                <option key={f.id} value={f.fontFamily}>
                  {f.name} ({f.badge})
                </option>
              ))}
            </select>
            {(() => {
              const activeFont = getCuratedFontByFamily(settings.fontFamily);
              const themeDefaultFont = THEME_DEFAULT_FONTS[settings.theme];
              const isThemeDefault = activeFont && activeFont.fontFamily === themeDefaultFont;
              return activeFont ? (
                <div className="text-[10px] text-[var(--text-muted)] bg-[var(--card-secondary-bg)] p-1.5 rounded border border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="truncate">{activeFont.researchFocus}</span>
                  {isThemeDefault ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0 ml-1 font-semibold">
                      Theme Default
                    </span>
                  ) : (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[var(--accent-container)] text-[var(--on-accent-container)] shrink-0 ml-1">
                      {activeFont.badge}
                    </span>
                  )}
                </div>
              ) : null;
            })()}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Editor Font Size</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={22}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-24 accent-[var(--accent-primary)]"
              />
              <span className="font-mono text-[var(--text-primary)] w-6 text-right font-medium">{settings.fontSize}px</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Word Wrap</span>
            <input
              type="checkbox"
              checked={settings.wordWrap}
              onChange={(e) => updateSettings({ wordWrap: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Line Numbers</span>
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(e) => updateSettings({ showLineNumbers: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Bracket Matching</span>
            <input
              type="checkbox"
              checked={settings.enableBracketMatching}
              onChange={(e) => updateSettings({ enableBracketMatching: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Auto Indent</span>
            <input
              type="checkbox"
              checked={settings.enableAutoIndent}
              onChange={(e) => updateSettings({ enableAutoIndent: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Live Preview Settings */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Live Preview Settings
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Preview Max Width</span>
            <select
              value={settings.previewMaxWidth}
              onChange={(e: any) => updateSettings({ previewMaxWidth: e.target.value })}
              className="theme-input rounded px-2 py-0.5 text-xs text-[var(--text-primary)]"
            >
              <option value="narrow">Narrow (600px)</option>
              <option value="standard">Standard (800px)</option>
              <option value="wide">Wide (1100px)</option>
              <option value="full">Full 100% Width</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Font Scale ({settings.previewFontScale}%)</span>
            <input
              type="range"
              min={80}
              max={150}
              step={5}
              value={settings.previewFontScale}
              onChange={(e) => updateSettings({ previewFontScale: Number(e.target.value) })}
              className="w-24 accent-[var(--accent-primary)]"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Show Table of Contents</span>
            <input
              type="checkbox"
              checked={settings.previewShowTOC}
              onChange={(e) => updateSettings({ previewShowTOC: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Token & AI Budget */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Token Budget & Warning
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-primary)]">Budget Warning Limit</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step={5000}
                value={settings.budgetThreshold}
                onChange={(e) => updateSettings({ budgetThreshold: Number(e.target.value) })}
                className="w-24 h-6 px-2 theme-input rounded font-mono text-[var(--status-warning)] text-xs text-right font-medium"
              />
              <span className="text-[10px] text-[var(--text-muted)]">tok</span>
            </div>
          </div>
        </div>
      </div>

      {/* Experimental Settings & Background Process Gating (Mandatory Invariant 4) */}
      <div className="p-3 theme-card rounded-lg space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Experimental Settings</span>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
              {settings.enableExperimentalSettings ? 'Enabled' : 'Disabled'}
            </span>
            <input
              type="checkbox"
              id="toggle-experimental-settings"
              checked={settings.enableExperimentalSettings ?? false}
              onChange={(e) => updateSettings({ enableExperimentalSettings: e.target.checked })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Unlock granular controls for background workers, asynchronous DOM sync, and performance optimization toggles.
        </p>

        {/* Toggles remain HIDDEN by default unless explicitly enabled by the user under Experimental Settings master toggle */}
        {!settings.enableExperimentalSettings ? (
          <div className="p-2 rounded bg-[var(--card-secondary-bg)] border border-dashed border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
            <span>Background process toggles are hidden. Standard background workers are active.</span>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-[var(--border-subtle)] animate-in fade-in duration-200">
            <div className="text-[10px] uppercase font-semibold text-[var(--accent-primary)] tracking-wider flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>Background Processes</span>
            </div>

            {/* 1. Live Token Estimator */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-[var(--text-primary)] block font-medium">Live Token Estimator</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                  Calculate token counts and model costs on every keystroke. Zero background computation or polling when toggled off.
                </span>
              </div>
              <input
                type="checkbox"
                id="toggle-live-token-estimator"
                checked={settings.enableLiveTokenEstimator ?? true}
                onChange={(e) => updateSettings({ enableLiveTokenEstimator: e.target.checked })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
              />
            </div>

            {/* 2. Document Autosave */}
            <div className="space-y-2 border-t border-[var(--border-subtle)] pt-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-[var(--text-primary)] block font-medium">Document Autosave</span>
                  <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                    Automatically persist open tabs and buffer edits to storage in the background.
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="toggle-enable-autosave"
                  checked={settings.enableAutosave ?? true}
                  onChange={(e) => updateSettings({ enableAutosave: e.target.checked })}
                  className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
                />
              </div>

              {settings.enableAutosave && (
                <div className="flex items-center justify-between pl-2 border-l-2 border-[var(--accent-primary)]/40 pt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[var(--accent-primary)]" />
                    <span>Autosave Interval ({settings.autosaveIntervalMs ?? 1000}ms)</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="range"
                      min={250}
                      max={5000}
                      step={250}
                      value={settings.autosaveIntervalMs ?? 1000}
                      onChange={(e) => updateSettings({ autosaveIntervalMs: Number(e.target.value) })}
                      className="w-20 accent-[var(--accent-primary)]"
                    />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] w-10 text-right">
                      {((settings.autosaveIntervalMs ?? 1000) / 1000).toFixed(1)}s
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Live Markdown DOM-Sync */}
            <div className="flex items-start justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
              <div>
                <span className="text-xs text-[var(--text-primary)] block font-medium">Live Markdown DOM-Sync</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-0.5">
                  Continuously synchronize editor changes with Markdown AST, LaTeX, Mermaid diagrams, and DOM preview in real-time.
                </span>
              </div>
              <input
                type="checkbox"
                id="toggle-live-dom-sync"
                checked={settings.enableLiveDomSync ?? settings.enableLiveMarkdownSync ?? true}
                onChange={(e) => updateSettings({ 
                  enableLiveDomSync: e.target.checked,
                  enableLiveMarkdownSync: e.target.checked
                })}
                className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer shrink-0 mt-0.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Storage & Backup */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Backup & Reset
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleExportBackup}
            title="Export Backup"
            aria-label="Export Backup"
            className="h-8 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center transition-colors font-medium"
          >
            <Download className="w-4 h-4 text-[var(--accent-primary)]" />
          </button>
          <button
            type="button"
            onClick={handleImportBackup}
            title="Import Backup"
            aria-label="Import Backup"
            className="h-8 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center transition-colors font-medium"
          >
            <Upload className="w-4 h-4 text-[var(--accent-primary)]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Reset all settings to default values?')) {
              resetSettings();
              addNotification('Settings Reset', 'Default settings restored', 'info');
            }
          }}
          title="Reset Settings to Default"
          aria-label="Reset Settings to Default"
          className="w-full h-8 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-md flex items-center justify-center transition-colors font-medium"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
