import { getElementById } from '../adapters';
import { getMermaidThemeConfig } from '../theme/index';
import { ThemeName } from '../contracts/data_shapes';

let lastInitializedTheme: string | null = null;
let mermaidModule: any = null;

async function getMermaidInstance() {
  if (!mermaidModule) {
    const mod = await import('mermaid');
    mermaidModule = mod.default || mod;
  }
  return mermaidModule;
}

export async function initializeMermaid(themeInput: ThemeName | string | boolean = 'contextpad-dark') {
  try {
    const mermaid = await getMermaidInstance();
    let themeName: ThemeName = 'contextpad-dark';
    if (typeof themeInput === 'boolean') {
      themeName = themeInput ? 'contextpad-dark' : 'google-material-3';
    } else if (typeof themeInput === 'string' && themeInput) {
      themeName = themeInput as ThemeName;
    }

    const config = getMermaidThemeConfig(themeName);

    const primaryColor = config.primaryColor;
    const primaryTextColor = config.primaryTextColor;
    const primaryBorderColor = config.primaryBorderColor;
    const lineColor = config.lineColor;
    const edgeLabelBackground = config.edgeLabelBackground;
    const labelTextColor = config.labelTextColor;
    const clusterBkg = config.clusterBkg;
    const clusterBorder = config.clusterBorder;
    const background = config.background;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: {
        darkMode: config.darkMode,
        background,
        mainBkg: primaryColor,
        primaryColor,
        primaryTextColor,
        primaryBorderColor,
        secondaryColor: config.secondaryColor,
        secondaryTextColor: config.secondaryTextColor,
        secondaryBorderColor: config.secondaryBorderColor,
        tertiaryColor: config.tertiaryColor,
        tertiaryTextColor: config.tertiaryTextColor,
        tertiaryBorderColor: config.tertiaryBorderColor,
        lineColor,
        defaultLinkColor: lineColor,
        edgeLabelBackground,
        labelTextColor,
        nodeBorder: primaryBorderColor,
        nodeTextColor: primaryTextColor,
        clusterBkg,
        clusterBorder,
        titleColor: config.titleColor,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize
      },
      themeCSS: `
        .node rect, .node circle, .node ellipse, .node polygon, .node path {
          rx: 6px;
          ry: 6px;
          stroke-width: 1.5px;
        }
        .edgeLabel {
          border-radius: 4px;
          padding: 2px 4px;
        }
        .edgeLabel rect {
          rx: 4px;
          ry: 4px;
          opacity: 0.95;
        }
        .label {
          font-family: ${config.fontFamily};
        }
      `
    });

    lastInitializedTheme = themeName;
  } catch (e) {
    console.warn('Failed to initialize mermaid', e);
  }
}

const diagramCache = new Map<string, { svg: string; isError: boolean; error?: string }>();

let renderCounter = 0;

export function clearMermaidCache(): void {
  diagramCache.clear();
}

export async function renderMermaidDiagram(
  code: string,
  themeInput: ThemeName | string | boolean = 'contextpad-dark'
): Promise<{ svg: string; isError: boolean; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { svg: '', isError: false };
  }

  let themeName: ThemeName = 'contextpad-dark';
  if (typeof themeInput === 'boolean') {
    themeName = themeInput ? 'contextpad-dark' : 'google-material-3';
  } else if (typeof themeInput === 'string' && themeInput) {
    themeName = themeInput as ThemeName;
  }

  const cacheKey = `${themeName}:${trimmed}`;
  if (diagramCache.has(cacheKey)) {
    return diagramCache.get(cacheKey)!;
  }

  await initializeMermaid(themeName);
  const mermaid = await getMermaidInstance();

  const id = `mermaid-render-${Date.now()}-${++renderCounter}`;

  try {
    const { svg } = await mermaid.render(id, trimmed);
    const result = { svg, isError: false };
    diagramCache.set(cacheKey, result);
    return result;
  } catch (err: any) {
    // Clean up error elements that mermaid might inject into DOM
    const errorEl = getElementById(id);
    if (errorEl) {
      errorEl.remove();
    }
    const dErrorEl = getElementById(`d${id}`);
    if (dErrorEl) {
      dErrorEl.remove();
    }

    const message = err?.str || err?.message || 'Syntax error in Mermaid diagram';
    const result = {
      svg: '',
      isError: true,
      error: message
    };
    diagramCache.set(cacheKey, result);
    return result;
  }
}
