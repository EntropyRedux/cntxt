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
  Touchpad
} from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useNotificationStore } from '../../store/notificationStore';
import { dbStorage } from '../../services/storage/IndexedDBStorage';
import { ThemeName } from '../../types';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const { addNotification } = useNotificationStore();

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
      const data = await dbStorage.exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contextpad-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification('Backup Exported', 'Full workspace JSON downloaded', 'success');
    } catch (e: any) {
      addNotification('Export Failed', e.message, 'error');
    }
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        if (json.settings) {
          updateSettings(json.settings);
          addNotification('Settings Restored', 'Configuration restored from backup', 'success');
        }
      } catch (err: any) {
        addNotification('Import Error', 'Invalid backup format', 'error');
      }
    };
    input.click();
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
            {settings.theme === 'google-material-3' ? 'M3 Light' : 'Dark Mode'}
          </span>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          Themes dynamically re-skin the entire application interface, toolbars, sidebars, modals, and editor typography.
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {themes.map(t => {
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-container)]/30 ring-2 ring-[var(--accent-primary)]/40 shadow-xs' 
                    : 'border-[var(--border-primary)] bg-[var(--card-secondary-bg)] hover:border-[var(--accent-primary)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
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

                <div className="flex items-center justify-between mt-1">
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
              value={settings.uiDensity || 'comfortable'}
              onChange={(e: any) => updateSettings({ 
                uiDensity: e.target.value,
                touchOptimized: e.target.value === 'touch'
              })}
              className="theme-input font-medium rounded px-2 py-1 text-xs text-[var(--accent-primary)] font-semibold"
            >
              <option value="compact">Compact (Dense Desktop)</option>
              <option value="comfortable">Comfortable (Standard)</option>
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
                uiDensity: e.target.checked ? 'touch' : 'comfortable'
              })}
              className="accent-[var(--accent-primary)] rounded w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Mobile Markdown Accessory Bar */}
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

      {/* Storage & Backup */}
      <div className="p-3 theme-card rounded-lg space-y-2.5 shadow-xs">
        <div className="font-bold text-[var(--text-primary)] text-[11px] uppercase tracking-wider">
          Backup & Reset
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportBackup}
            className="p-1.5 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors font-medium"
          >
            <Download className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Export Backup</span>
          </button>
          <button
            onClick={handleImportBackup}
            className="p-1.5 theme-card-secondary hover:bg-[var(--card-hover-bg)] rounded-md text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors font-medium"
          >
            <Upload className="w-3 h-3 text-[var(--accent-primary)]" />
            <span>Import Backup</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (confirm('Reset all settings to default values?')) {
              resetSettings();
              addNotification('Settings Reset', 'Default settings restored', 'info');
            }
          }}
          className="w-full p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-md flex items-center justify-center gap-1.5 transition-colors font-medium"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Settings to Default</span>
        </button>
      </div>
    </div>
  );
};
