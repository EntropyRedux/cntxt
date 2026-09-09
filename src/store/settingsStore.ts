import { create } from 'zustand';
import { ViewSettings } from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';

interface SettingsState {
  settings: ViewSettings;
  updateSettings: (updates: Partial<ViewSettings>) => void;
  toggleSidebar: () => void;
  toggleActivityBar: () => void;
  togglePreview: () => void;
  toggleEditorMode: () => void;
  setEditorMode: (mode: 'raw' | 'rendered') => void;
  toggleStatusBar: () => void;
  toggleTouchMode: () => void;
  toggleMobileAccessoryBar: () => void;
  setActiveSidebarTab: (tab: ViewSettings['activeSidebarTab']) => void;
  setTheme: (theme: ViewSettings['theme']) => void;
  setModel: (modelId: string) => void;
  resetSettings: () => void;
}

const isTouchDevice = typeof window !== 'undefined' 
  ? (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth < 768)
  : false;

const DEFAULT_SETTINGS: ViewSettings = {
  showStatusBar: true,
  showLineNumbers: true,
  showBreadcrumb: true,
  showActivityBar: true,
  showSidebar: true,
  activeSidebarTab: 'templates',
  showCodeBlockMarkers: true,
  showLivePreview: false,
  editorMode: 'rendered',
  previewEngine: 'integrated',
  previewTheme: 'match',
  previewMaxWidth: 'standard',
  previewFontScale: 100,
  previewContentMargin: 'normal',
  previewShowTOC: true,
  previewCustomCSS: '',
  previewSplitOrientation: 'horizontal',
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
  wordWrap: true,
  theme: 'contextpad-dark',
  enableBracketMatching: true,
  enableFoldGutter: true,
  enableAutoIndent: true,
  enableMarkdownRendering: true,
  showTokenStats: true,
  largeFileThreshold: 5000,
  parserMode: 'auto',
  enableAutocomplete: true,
  enableSpellCheck: false,
  spellCheckMode: 'built-in',
  enableCodeLinting: true,
  indexingScope: 'thorough',
  selectedModelId: DEFAULT_MODEL_ID,
  budgetThreshold: 32000,
  uiDensity: isTouchDevice ? 'touch' : 'comfortable',
  touchOptimized: isTouchDevice,
  showMobileAccessoryBar: true,
  autocompleteConfig: {
    enableKeywords: true,
    enableTemplates: true,
    enableFormulas: true,
    enableSlashCommands: true,
    minWordLength: 2
  },
  spellCheckConfig: {
    enabled: false,
    mode: 'built-in',
    language: 'en-US'
  },
  codeLintConfig: {
    enabled: true,
    jsonLint: true,
    markdownLint: true
  }
};

const STORAGE_KEY = 'contextpad_settings';

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: (() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  })(),

  updateSettings: (updates) => {
    const updated = { ...get().settings, ...updates };
    set({ settings: updated });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  },

  toggleSidebar: () => {
    const showSidebar = !get().settings.showSidebar;
    get().updateSettings({ showSidebar });
  },

  toggleActivityBar: () => {
    const showActivityBar = !get().settings.showActivityBar;
    if (!showActivityBar) {
      get().updateSettings({ showActivityBar: false, showSidebar: false });
    } else {
      get().updateSettings({ showActivityBar: true });
    }
  },

  togglePreview: () => {
    const showLivePreview = !get().settings.showLivePreview;
    get().updateSettings({ showLivePreview });
  },

  toggleEditorMode: () => {
    const current = get().settings.editorMode || 'rendered';
    const next = current === 'raw' ? 'rendered' : 'raw';
    get().updateSettings({ editorMode: next });
  },

  setEditorMode: (mode) => {
    get().updateSettings({ editorMode: mode });
  },

  toggleStatusBar: () => {
    const showStatusBar = !get().settings.showStatusBar;
    get().updateSettings({ showStatusBar });
  },

  toggleTouchMode: () => {
    const current = get().settings.touchOptimized;
    const next = !current;
    get().updateSettings({ 
      touchOptimized: next, 
      uiDensity: next ? 'touch' : 'comfortable' 
    });
  },

  toggleMobileAccessoryBar: () => {
    const show = !get().settings.showMobileAccessoryBar;
    get().updateSettings({ showMobileAccessoryBar: show });
  },

  setActiveSidebarTab: (tab) => {
    get().updateSettings({ activeSidebarTab: tab, showSidebar: true, showActivityBar: true });
  },

  setTheme: (theme) => {
    get().updateSettings({ theme });
  },

  setModel: (selectedModelId) => {
    get().updateSettings({ selectedModelId });
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {}
  }
}));
