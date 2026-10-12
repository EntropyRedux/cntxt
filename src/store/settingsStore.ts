import { create } from 'zustand';
import { ViewSettings } from '../types';
import { DEFAULT_MODEL_ID } from '../constants/models';
import { THEME_DEFAULT_FONTS } from '../constants/fonts';
import { IStorageBridge, IPlatformBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';
import { clearMermaidCache } from '../services/mermaidRenderer';

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
  toggleMenuBar: () => void;
  toggleEditorMode: () => void;
  setEditorMode: (mode: 'raw' | 'rendered') => void;
  toggleWordWrap: () => void;
  toggleStatusBar: () => void;
  toggleTouchMode: () => void;
  toggleMobileAccessoryBar: () => void;
  toggleTypingDirection: () => void;
  setTypingDirection: (direction: 'top-to-bottom' | 'bottom-to-up') => void;
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
  showRibbon: true,
  showMenuBar: true,
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
  fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', 'Fira Code Variable', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
  wordWrap: true,
  typingDirection: 'top-to-bottom',
  syntaxHighlighting: 'auto',
  editorMaxWidth: 'standard',
  editorPadding: 'normal',
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
  enableExperimentalSettings: false,
  enableLiveTokenEstimator: true,
  enableAutosave: true,
  enableLiveDomSync: true,
  enableLiveMarkdownSync: true,
  enableTerminalBus: false,
  enableOmniTerminal: false,
  isOmniFloating: false,
  autosaveIntervalMs: 1000,
  enableLargeDocDetection: true,
  largeDocThresholdKb: 500,
  largeDocThresholdLines: 10000,
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
  },
  autoAdaptFontToTheme: true,
  isFontCustomizedByUser: false
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
      initialSettings.largeDocThresholdKb = 150;
      initialSettings.largeDocThresholdLines = 2500;
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

    // On cold start, if the user hasn't explicitly customized their font, ensure the font matches the theme's curated default
    // On cold start, if autoAdaptFontToTheme is true (default), ensure font matches the theme's curated default
    const shouldAutoAdaptOnColdStart = initialSettings.autoAdaptFontToTheme !== false;
    if (shouldAutoAdaptOnColdStart && initialSettings.theme) {
      const themeDefault = THEME_DEFAULT_FONTS[initialSettings.theme];
      if (themeDefault && (!initialSettings.isFontCustomizedByUser || initialSettings.autoAdaptFontToTheme)) {
        initialSettings.fontFamily = themeDefault;
      }
    }

    set({ settings: initialSettings });
  },

  updateSettings: (updates) => {
    const current = get().settings;
    let fontFamilyToApply = updates.fontFamily;
    
    // When changing themes, auto-adapt font to that theme's default fitting font unless autoAdaptFontToTheme is explicitly disabled
    if (updates.theme && updates.theme !== current.theme) {
      const shouldAutoAdapt = updates.autoAdaptFontToTheme ?? current.autoAdaptFontToTheme ?? true;
      if (shouldAutoAdapt && !updates.fontFamily) {
        const themeDefault = THEME_DEFAULT_FONTS[updates.theme];
        if (themeDefault) {
          fontFamilyToApply = themeDefault;
        }
      }
      clearMermaidCache();
    }

    if (updates.fontFamily && updates.fontFamily !== current.fontFamily) {
      const activeTheme = updates.theme || current.theme;
      const themeDefault = THEME_DEFAULT_FONTS[activeTheme];
      if (updates.fontFamily !== themeDefault) {
        updates.isFontCustomizedByUser = true;
      } else {
        updates.isFontCustomizedByUser = false;
      }
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

  toggleMenuBar: () => {
    const showMenuBar = !(get().settings.showMenuBar ?? true);
    get().updateSettings({ showMenuBar });
  },

  toggleEditorMode: () => {
    const nextMode = get().settings.editorMode === 'rendered' ? 'raw' : 'rendered';
    get().updateSettings({ editorMode: nextMode });
  },

  setEditorMode: (mode: 'raw' | 'rendered') => {
    get().updateSettings({ editorMode: mode });
  },

  toggleWordWrap: () => {
    const wordWrap = !get().settings.wordWrap;
    get().updateSettings({ wordWrap });
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

  toggleTypingDirection: () => {
    const nextDirection = get().settings.typingDirection === 'bottom-to-up' ? 'top-to-bottom' : 'bottom-to-up';
    get().updateSettings({ typingDirection: nextDirection });
  },

  setTypingDirection: (typingDirection) => {
    get().updateSettings({ typingDirection });
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

/**
 * Gate helper: Omni Terminal is only active when all three toggles are enabled:
 * 1. Experimental Settings master toggle
 * 2. Terminal Shells & Multi-Agent Bus toggle
 * 3. Omni Terminal Mission Control toggle
 */
export function isOmniTerminalFeatureEnabled(settings: ViewSettings): boolean {
  return Boolean(
    settings.enableExperimentalSettings &&
    settings.enableTerminalBus &&
    settings.enableOmniTerminal
  );
}

