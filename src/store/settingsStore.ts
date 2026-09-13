import { create } from 'zustand';
import { ViewSettings } from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';
import { THEME_DEFAULT_FONTS } from '../constants/fonts';
import { IStorageBridge, IPlatformBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';

let activeStorage: IStorageBridge | null = null;

interface SettingsState {
  settings: ViewSettings;
  isFontSelectorOpen: boolean;
  openFontSelector: () => void;
  closeFontSelector: () => void;
  initializeSettings: (storage?: IStorageBridge, platform?: IPlatformBridge) => Promise<void>;
  updateSettings: (updates: Partial<ViewSettings>) => void;
  toggleSidebar: () => void;
  toggleSidebarOverlay: () => void;
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
  uiDensity: 'desktop',
  touchOptimized: false,
  sidebarOverlay: false,
  showMobileAccessoryBar: true,
  showRibbon: true,
  enableExperimentalSettings: false,
  enableLiveTokenEstimator: true,
  enableAutosave: true,
  enableLiveDomSync: true,
  enableLiveMarkdownSync: true,
  autosaveIntervalMs: 1000,
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
  isFontSelectorOpen: false,
  openFontSelector: () => set({ isFontSelectorOpen: true }),
  closeFontSelector: () => set({ isFontSelectorOpen: false }),

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
          const parsed = JSON.parse(stored);
          if (parsed.uiDensity === 'comfortable' || parsed.uiDensity === 'compact') {
            parsed.uiDensity = 'desktop';
          }
          initialSettings = { ...initialSettings, ...parsed };
        }
      } catch (e) {
        console.warn('Failed to load stored settings:', e);
      }
    }

    set({ settings: initialSettings });
  },

  updateSettings: (updates) => {
    const current = get().settings;
    let fontFamilyToApply = updates.fontFamily;
    
    // When changing themes, switch to that theme's default fitting font if font isn't explicitly provided
    if (updates.theme && updates.theme !== current.theme && !updates.fontFamily) {
      fontFamilyToApply = THEME_DEFAULT_FONTS[updates.theme] || current.fontFamily;
    }

    if (updates.enableLiveDomSync !== undefined && updates.enableLiveMarkdownSync === undefined) {
      updates.enableLiveMarkdownSync = updates.enableLiveDomSync;
    } else if (updates.enableLiveMarkdownSync !== undefined && updates.enableLiveDomSync === undefined) {
      updates.enableLiveDomSync = updates.enableLiveMarkdownSync;
    }

    const updated = { 
      ...current, 
      ...updates,
      ...(fontFamilyToApply ? { fontFamily: fontFamilyToApply } : {})
    };
    set({ settings: updated });
    if (activeStorage) {
      safePersist(activeStorage, STORAGE_KEYS.SETTINGS, JSON.stringify(updated), 'settings');
    }
  },

  toggleSidebar: () => {
    const showSidebar = !get().settings.showSidebar;
    get().updateSettings({ showSidebar });
  },

  toggleSidebarOverlay: () => {
    const sidebarOverlay = !get().settings.sidebarOverlay;
    get().updateSettings({ sidebarOverlay });
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
      uiDensity: next ? 'touch' : 'desktop' 
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
      safePersist(activeStorage, STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS), 'reset settings');
    }
  }
}));
