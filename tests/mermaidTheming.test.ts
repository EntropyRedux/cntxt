import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getMermaidThemeConfig, 
  applyThemeTokensToElement, 
  THEMES, 
  ThemeTokens 
} from '../theme/index';
import { ThemeName } from '../contracts/data_shapes';
import { isDarkTheme } from '../src/adapters/domHelper';
import { 
  initializeMermaid, 
  renderMermaidDiagram, 
  clearMermaidCache 
} from '../src/services/mermaidRenderer';

function createMockElement() {
  const attrs: Record<string, string> = {};
  const props: Record<string, string> = {};
  return {
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    getAttribute: (k: string) => attrs[k] || null,
    removeAttribute: (k: string) => { delete attrs[k]; },
    style: {
      setProperty: (k: string, v: string) => { props[k] = v; },
      getPropertyValue: (k: string) => props[k] || ''
    }
  } as unknown as HTMLElement;
}

describe('Mermaid Theming Engine Integration', () => {
  beforeEach(() => {
    clearMermaidCache();
    const mockDocElement = createMockElement();
    (globalThis as any).document = {
      documentElement: mockDocElement,
      createElement: () => createMockElement(),
      body: createMockElement()
    };
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  it('generates customized, valid Mermaid theme variables for all 10 themes', () => {
    const themeNames: ThemeName[] = [
      'google-material-3',
      'parchment',
      'contextpad-dark',
      'one-dark',
      'dracula',
      'nord',
      'monokai',
      'github-dark',
      'github-light',
      'solarized-dark'
    ];

    for (const name of themeNames) {
      const config = getMermaidThemeConfig(name);
      expect(config.theme).toBe('base');
      expect(config.primaryColor).toBeTruthy();
      expect(config.primaryTextColor).toBeTruthy();
      expect(config.primaryBorderColor).toBeTruthy();
      expect(config.lineColor).toBeTruthy();
      expect(config.edgeLabelBackground).toBeTruthy();
      expect(config.labelTextColor).toBeTruthy();
      expect(config.fontFamily).toContain('Plus Jakarta Sans');
      expect(typeof config.darkMode).toBe('boolean');
    }
  });

  it('configures google-material-3 light theme with soft container nodes and dark blue text', () => {
    const m3 = getMermaidThemeConfig('google-material-3');
    expect(m3.darkMode).toBe(false);
    expect(m3.primaryColor).toBe('#D3E3FD'); // Material 3 accent container
    expect(m3.primaryTextColor).toBe('#041E49'); // Material 3 on-accent container
    expect(m3.primaryBorderColor).toBe('#0B57D0');
    expect(m3.lineColor).toBe('#0B57D0');
    expect(m3.edgeLabelBackground).toBe('#FFFFFF'); // Crisp white pill
    expect(m3.labelTextColor).toBe('#1F1F1F');
  });

  it('configures parchment light theme with warm sepia tones', () => {
    const parchment = getMermaidThemeConfig('parchment');
    expect(parchment.darkMode).toBe(false);
    expect(parchment.primaryColor).toBe('#EFEAD8');
    expect(parchment.primaryTextColor).toBe('#2C2518');
    expect(parchment.primaryBorderColor).toBe('#8C5E24');
    expect(parchment.lineColor).toBe('#8C5E24');
    expect(parchment.edgeLabelBackground).toBe('#FCFAF2');
  });

  it('configures dracula dark theme with signature neon colors', () => {
    const dracula = getMermaidThemeConfig('dracula');
    expect(dracula.darkMode).toBe(true);
    expect(dracula.primaryColor).toBe('#343746');
    expect(dracula.primaryTextColor).toBe('#F8F8F2');
    expect(dracula.primaryBorderColor).toBe('#BD93F9');
    expect(dracula.lineColor).toBe('#8BE9FD');
    expect(dracula.labelTextColor).toBe('#F1FA8C');
  });

  it('configures nord theme with arctic frost palette', () => {
    const nord = getMermaidThemeConfig('nord');
    expect(nord.darkMode).toBe(true);
    expect(nord.primaryColor).toBe('#3B4252');
    expect(nord.primaryTextColor).toBe('#ECEFF4');
    expect(nord.primaryBorderColor).toBe('#88C0D0');
    expect(nord.lineColor).toBe('#81A1C1');
  });

  it('configures github-dark with dark charcoal container and github-light with soft blue container', () => {
    const ghDark = getMermaidThemeConfig('github-dark');
    expect(ghDark.darkMode).toBe(true);
    expect(ghDark.primaryColor).toBe('#21262D'); // GitHub Dark node fill
    expect(ghDark.primaryTextColor).toBe('#E6EDF3');
    expect(ghDark.primaryBorderColor).toBe('#2F81F7');
    expect(ghDark.lineColor).toBe('#58A6FF');
    expect(ghDark.edgeLabelBackground).toBe('#161B22');

    const ghLight = getMermaidThemeConfig('github-light');
    expect(ghLight.darkMode).toBe(false);
    expect(ghLight.primaryColor).toBe('#DDF4FF'); // GitHub Light node fill
    expect(ghLight.primaryTextColor).toBe('#0969DA');
    expect(ghLight.primaryBorderColor).toBe('#0969DA');
    expect(ghLight.lineColor).toBe('#0969DA');
    expect(ghLight.edgeLabelBackground).toBe('#FFFFFF');
  });

  it('applies all --mermaid-* CSS custom properties when theme is applied to element', () => {
    const el = document.createElement('div');
    applyThemeTokensToElement('google-material-3', el);

    expect(el.getAttribute('data-theme')).toBe('google-material-3');
    expect(el.getAttribute('data-theme-type')).toBe('light');
    expect(el.style.getPropertyValue('--mermaid-node-bg')).toBe('#D3E3FD');
    expect(el.style.getPropertyValue('--mermaid-node-fg')).toBe('#041E49');
    expect(el.style.getPropertyValue('--mermaid-node-border')).toBe('#0B57D0');
    expect(el.style.getPropertyValue('--mermaid-line-color')).toBe('#0B57D0');
    expect(el.style.getPropertyValue('--mermaid-label-bg')).toBe('#FFFFFF');
    expect(el.style.getPropertyValue('--mermaid-label-fg')).toBe('#1F1F1F');

    // Switch to dark
    applyThemeTokensToElement('contextpad-dark', el);
    expect(el.getAttribute('data-theme')).toBe('contextpad-dark');
    expect(el.getAttribute('data-theme-type')).toBe('dark');
    expect(el.style.getPropertyValue('--mermaid-node-bg')).toBe('#2E2E38');
    expect(el.style.getPropertyValue('--mermaid-node-fg')).toBe('#EDEDED');
    expect(el.style.getPropertyValue('--mermaid-line-color')).toBe('#38BDF8');
  });

  it('properly detects dark vs light theme in isDarkTheme() helper', () => {
    document.documentElement.setAttribute('data-theme', 'google-material-3');
    document.documentElement.setAttribute('data-theme-type', 'light');
    expect(isDarkTheme()).toBe(false);

    document.documentElement.setAttribute('data-theme', 'parchment');
    document.documentElement.setAttribute('data-theme-type', 'light');
    expect(isDarkTheme()).toBe(false);

    document.documentElement.setAttribute('data-theme', 'github-light');
    document.documentElement.setAttribute('data-theme-type', 'light');
    expect(isDarkTheme()).toBe(false);

    document.documentElement.setAttribute('data-theme', 'contextpad-dark');
    document.documentElement.setAttribute('data-theme-type', 'dark');
    expect(isDarkTheme()).toBe(true);

    document.documentElement.setAttribute('data-theme', 'dracula');
    document.documentElement.setAttribute('data-theme-type', 'dark');
    expect(isDarkTheme()).toBe(true);
  });

  it('renders diagrams with empty string safely', async () => {
    const res = await renderMermaidDiagram('', 'google-material-3');
    expect(res.svg).toBe('');
    expect(res.isError).toBe(false);
  });
});
