import { create } from 'zustand';
import { ViewSettings } from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';
import { IStorageBridge, IPlatformBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';

let activeStorage: IStorageBridge | null = null;

interface SettingsState {
  settings: ViewSettings;
  initializeSettings: (storage?: IStorageBridge, platform?: IPlatformBridge) => Promise<void>;
  updateSettings: (updates: Partial<ViewSettings>) => void;
  toggleSidebar: () => void;
  toggleActivityBar: () => void;
  toggleRibbon: () => void;
  setRibbonVisible: (visible: boolean) => void;
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
  uiDensity: 'comfortable',
  touchOptimized: false,
  showMobileAccessoryBar: true,
  showRibbon: true,
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  initializeSettings: async (storage?: IStorageBridge, platform?: IPlatformBridge) => {
    if (storage) {
      activeStorage = storage;
    }

    let initialSettings = { ...DEFAULT_SETTINGS };
    if (platform?.isTouch) {
      initialSettings.uiDensity = 'touch';
      initialSettings.touchOptimized = true;
    }

    if (activeStorage) {
      try {
        const stored = await activeStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
          initialSettings = { ...initialSettings, ...JSON.parse(stored) };
        }
      } catch (e) {
        console.warn('Failed to load stored settings:', e);
      }
    }

    set({ settings: initialSettings });
  },

  updateSettings: (updates) => {
    const updated = { ...get().settings, ...updates };
    set({ settings: updated });
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated)).catch(() => {});
    }
  },

  toggleSidebar: () => {
    const showSidebar = !get().settings.showSidebar;
    get().updateSettings({ showSidebar });
  },

  toggleActivityBar: () => {
    const showActivityBar = !get().settings.showActivityBar;
    get().updateSettings({ showActivityBar });
  },

  toggleRibbon: () => {
    const showRibbon = !get().settings.showRibbon;
    get().updateSettings({ showRibbon });
  },

  setRibbonVisible: (showRibbon: boolean) => {
    get().updateSettings({ showRibbon });
  },

  togglePreview: () => {
    const showLivePreview = !get().settings.showLivePreview;
    get().updateSettings({ showLivePreview });
  },

  toggleEditorMode: () => {
    const nextMode = get().settings.editorMode === 'rendered' ? 'raw' : 'rendered';
    get().updateSettings({ editorMode: nextMode });
  },

  setEditorMode: (mode: 'raw' | 'rendered') => {
    get().updateSettings({ editorMode: mode });
  },

  toggleStatusBar: () => {
    const showStatusBar = !get().settings.showStatusBar;
    get().updateSettings({ showStatusBar });
  },

  toggleTouchMode: () => {
    const next = !get().settings.touchOptimized;
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
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS)).catch(() => {});
    }
  }
}));
