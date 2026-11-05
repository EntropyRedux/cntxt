import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../src/store/settingsStore';

describe('SettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
        showStatusBar: true,
        showLineNumbers: true,
        showBreadcrumb: true,
        showActivityBar: true,
        showSidebar: true,
        showRibbon: true,
        showMenuBar: true,
        showMobileAccessoryBar: true,
        activeSidebarTab: 'templates',
        showCodeBlockMarkers: true,
        showLivePreview: false,
        editorMode: 'rendered',
        fontSize: 14,
        wordWrap: true,
        editorMaxWidth: 'standard',
        editorPadding: 'normal',
        theme: 'contextpaddark',
        uiDensity: 'desktop',
        touchOptimized: false,
        sidebarOverlay: false,
        syntaxHighlighting: 'auto',
      },
    });
  });

  it('initializes with expected default settings', () => {
    const state = useSettingsStore.getState();
    expect(state.settings.fontSize).toBe(14);
    expect(state.settings.showLineNumbers).toBe(true);
    expect(state.settings.wordWrap).toBe(true);
    expect(state.settings.editorMaxWidth).toBe('standard');
    expect(state.settings.editorPadding).toBe('normal');
    expect(state.settings.theme).toBe('contextpaddark');
  });

  it('toggles word wrap using toggleWordWrap', () => {
    const store = useSettingsStore.getState();
    expect(store.settings.wordWrap).toBe(true);
    store.toggleWordWrap();
    expect(useSettingsStore.getState().settings.wordWrap).toBe(false);
    store.toggleWordWrap();
    expect(useSettingsStore.getState().settings.wordWrap).toBe(true);
  });

  it('updates editor width and padding presets', () => {
    const store = useSettingsStore.getState();
    store.updateSettings({ editorMaxWidth: 'wide', editorPadding: 'spacious' });
    const settings = useSettingsStore.getState().settings;
    expect(settings.editorMaxWidth).toBe('wide');
    expect(settings.editorPadding).toBe('spacious');
    store.updateSettings({ editorMaxWidth: 'full', editorPadding: 'compact' });
    const updated = useSettingsStore.getState().settings;
    expect(updated.editorMaxWidth).toBe('full');
    expect(updated.editorPadding).toBe('compact');
  });

  it('updates settings using updateSettings', () => {
    const store = useSettingsStore.getState();
    store.updateSettings({
      fontSize: 18,
      theme: 'light',
      showLineNumbers: false,
    });

    const settings = useSettingsStore.getState().settings;
    expect(settings.fontSize).toBe(18);
    expect(settings.theme).toBe('light');
    expect(settings.showLineNumbers).toBe(false);
  });

  it('resets settings to defaults using resetSettings', () => {
    const store = useSettingsStore.getState();
    store.updateSettings({
      fontSize: 24,
      showLineNumbers: false,
      wordWrap: false,
    });

    store.resetSettings();
    const settings = useSettingsStore.getState().settings;
    expect(settings.fontSize).toBe(14);
    expect(settings.showLineNumbers).toBe(true);
    expect(settings.wordWrap).toBe(true);
  });

  it('toggles sidebar visibility', () => {
    const store = useSettingsStore.getState();
    const initialState = store.settings.showSidebar;
    store.toggleSidebar();
    expect(useSettingsStore.getState().settings.showSidebar).toBe(!initialState);
    store.toggleSidebar();
    expect(useSettingsStore.getState().settings.showSidebar).toBe(initialState);
  });

  it('toggles ribbon visibility', () => {
    const store = useSettingsStore.getState();
    const initialState = store.settings.showRibbon;
    store.toggleRibbon();
    expect(useSettingsStore.getState().settings.showRibbon).toBe(!initialState);
    store.toggleRibbon();
    expect(useSettingsStore.getState().settings.showRibbon).toBe(initialState);
  });

  it('manages theme settings and auto-adapts font family', () => {
    const store = useSettingsStore.getState();
    store.setTheme('parchment');
    expect(useSettingsStore.getState().settings.theme).toBe('parchment');
    expect(useSettingsStore.getState().settings.fontFamily).toContain('Literata');

    store.setTheme('google-material-3');
    expect(useSettingsStore.getState().settings.theme).toBe('google-material-3');
    expect(useSettingsStore.getState().settings.fontFamily).toContain('Plus Jakarta Sans');

    store.setTheme('contextpad-dark');
    expect(useSettingsStore.getState().settings.theme).toBe('contextpad-dark');
    expect(useSettingsStore.getState().settings.fontFamily).toContain('JetBrains Mono');
  });

  it('toggles status bar visibility', () => {
    const store = useSettingsStore.getState();
    store.toggleStatusBar();
    expect(useSettingsStore.getState().settings.showStatusBar).toBe(false);
    store.toggleStatusBar();
    expect(useSettingsStore.getState().settings.showStatusBar).toBe(true);
  });

  it('toggles touch mode', () => {
    const store = useSettingsStore.getState();
    store.toggleTouchMode();
    expect(useSettingsStore.getState().settings.touchOptimized).toBe(true);
    expect(useSettingsStore.getState().settings.uiDensity).toBe('touch');
    store.toggleTouchMode();
    expect(useSettingsStore.getState().settings.touchOptimized).toBe(false);
  });

  it('manages editor mode', () => {
    const store = useSettingsStore.getState();
    store.setEditorMode('raw');
    expect(useSettingsStore.getState().settings.editorMode).toBe('raw');
    store.toggleEditorMode();
    expect(useSettingsStore.getState().settings.editorMode).toBe('rendered');
  });

  it('toggles activity bar', () => {
    const store = useSettingsStore.getState();
    store.toggleActivityBar();
    expect(useSettingsStore.getState().settings.showActivityBar).toBe(false);
    store.toggleActivityBar();
    expect(useSettingsStore.getState().settings.showActivityBar).toBe(true);
  });

  it('toggles menu bar', () => {
    const store = useSettingsStore.getState();
    store.toggleMenuBar();
    expect(useSettingsStore.getState().settings.showMenuBar).toBe(false);
    store.toggleMenuBar();
    expect(useSettingsStore.getState().settings.showMenuBar).toBe(true);
  });

  it('sets active sidebar tab', () => {
    const store = useSettingsStore.getState();
    store.setActiveSidebarTab('files');
    expect(useSettingsStore.getState().settings.activeSidebarTab).toBe('files');
    store.setActiveSidebarTab('templates');
    expect(useSettingsStore.getState().settings.activeSidebarTab).toBe('templates');
  });

  it('sets model', () => {
    const store = useSettingsStore.getState();
    store.setModel('gpt-4');
    expect(useSettingsStore.getState().settings.selectedModelId).toBe('gpt-4');
  });

  it('toggles mobile accessory bar', () => {
    const store = useSettingsStore.getState();
    const initialState = store.settings.showMobileAccessoryBar;
    store.toggleMobileAccessoryBar();
    expect(useSettingsStore.getState().settings.showMobileAccessoryBar).toBe(!initialState);
    store.toggleMobileAccessoryBar();
    expect(useSettingsStore.getState().settings.showMobileAccessoryBar).toBe(initialState);
  });

  it('toggles typing direction between top-to-bottom and bottom-to-up', () => {
    const store = useSettingsStore.getState();
    store.setTypingDirection('top-to-bottom');
    expect(useSettingsStore.getState().settings.typingDirection).toBe('top-to-bottom');

    store.toggleTypingDirection();
    expect(useSettingsStore.getState().settings.typingDirection).toBe('bottom-to-up');

    store.toggleTypingDirection();
    expect(useSettingsStore.getState().settings.typingDirection).toBe('top-to-bottom');

    store.setTypingDirection('bottom-to-up');
    expect(useSettingsStore.getState().settings.typingDirection).toBe('bottom-to-up');
  });

  it('updates syntax highlighting options (auto, markdown, headers, none)', () => {
    const store = useSettingsStore.getState();
    expect(store.settings.syntaxHighlighting).toBe('auto');

    store.updateSettings({ syntaxHighlighting: 'headers' });
    expect(useSettingsStore.getState().settings.syntaxHighlighting).toBe('headers');

    store.updateSettings({ syntaxHighlighting: 'markdown' });
    expect(useSettingsStore.getState().settings.syntaxHighlighting).toBe('markdown');

    store.updateSettings({ syntaxHighlighting: 'none' });
    expect(useSettingsStore.getState().settings.syntaxHighlighting).toBe('none');

    store.updateSettings({ syntaxHighlighting: 'auto' });
    expect(useSettingsStore.getState().settings.syntaxHighlighting).toBe('auto');
  });

  it('correctly gates isRestGatewayFeatureEnabled behind experimental master toggle and enableRestGateway', async () => {
    const { isRestGatewayFeatureEnabled } = await import('../src/store/settingsStore');

    // Defaults: experimental=false, restGateway=false -> disabled
    expect(isRestGatewayFeatureEnabled(useSettingsStore.getState().settings)).toBe(false);

    // Only master experimental toggle on -> still disabled
    useSettingsStore.getState().updateSettings({ enableExperimentalSettings: true, enableRestGateway: false });
    expect(isRestGatewayFeatureEnabled(useSettingsStore.getState().settings)).toBe(false);

    // Master on + rest gateway toggle on -> enabled
    useSettingsStore.getState().updateSettings({ enableExperimentalSettings: true, enableRestGateway: true });
    expect(isRestGatewayFeatureEnabled(useSettingsStore.getState().settings)).toBe(true);

    // Master toggle turned off -> disabled immediately
    useSettingsStore.getState().updateSettings({ enableExperimentalSettings: false });
    expect(isRestGatewayFeatureEnabled(useSettingsStore.getState().settings)).toBe(false);
  });
  it('resiliently recovers valid settings when stored JSON contains corrupted fields (V2-03)', async () => {
    const mockStorage = {
      getItem: async (key: string) => {
        if (key === 'contextpad_settings') {
          return JSON.stringify({
            fontSize: 'CORRUPTED_STRING_INSTEAD_OF_NUMBER',
            wordWrap: false,
            theme: 'dracula',
            showLineNumbers: false,
            deliverableWorkspaceSubfolder: 'Deliverables',
            autocompleteConfig: {
              enableKeywords: false,
              enableTemplates: true,
              enableFormulas: true,
              enableSlashCommands: false,
              minWordLength: 3
            }
          });
        }
        return null;
      },
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {}
    };

    await useSettingsStore.getState().initializeSettings(mockStorage as any);
    const settings = useSettingsStore.getState().settings;
    expect(settings.fontSize).toBe(14);
    expect(settings.wordWrap).toBe(false);
    expect(settings.theme).toBe('dracula');
    expect(settings.showLineNumbers).toBe(false);
    expect(settings.deliverableWorkspaceSubfolder).toBe('Deliverables');
    expect(settings.autocompleteConfig.enableKeywords).toBe(false);
  });

  it('resiliently recovers valid settings even when corrupted stored JSON contains prototype pollution keys (V3-01)', async () => {
    const mockStorage = {
      getItem: async (key: string) => {
        if (key === 'contextpad_settings') {
          return JSON.stringify({
            __proto__: { polluted: true },
            constructor: 'not-a-schema',
            toString: 12345,
            valueOf: null,
            fontSize: 'corrupted-string',
            wordWrap: false,
            theme: 'dracula'
          });
        }
        return null;
      },
      setItem: async () => {},
      removeItem: async () => {},
      clear: async () => {}
    };

    await useSettingsStore.getState().initializeSettings(mockStorage as any);
    const settings = useSettingsStore.getState().settings;
    expect(settings.fontSize).toBe(14); // recovered to default
    expect(settings.wordWrap).toBe(false); // successfully recovered
    expect(settings.theme).toBe('dracula'); // successfully recovered
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('toggles templateViewMode and actionViewMode between list and grid', () => {
    const store = useSettingsStore.getState();
    expect(store.settings.templateViewMode).toBeUndefined(); // or default 'list'
    expect(store.settings.actionViewMode).toBeUndefined();

    store.setTemplateViewMode('grid');
    expect(useSettingsStore.getState().settings.templateViewMode).toBe('grid');

    store.setTemplateViewMode('list');
    expect(useSettingsStore.getState().settings.templateViewMode).toBe('list');

    store.setActionViewMode('grid');
    expect(useSettingsStore.getState().settings.actionViewMode).toBe('grid');

    store.setActionViewMode('list');
    expect(useSettingsStore.getState().settings.actionViewMode).toBe('list');
  });
});
