import mermaid from 'mermaid';
import { getElementById, getCssCustomProperty } from '../adapters';

let isInitialized = false;

export function initializeMermaid(isDark: boolean = true) {
  try {
    const primaryColor = getCssCustomProperty('--accent-primary', '#007ACC');
    const primaryTextColor = getCssCustomProperty('--text-primary', isDark ? '#EDEDED' : '#1F1F1F');
    const primaryBorderColor = getCssCustomProperty('--card-border', isDark ? '#38BDF8' : '#007ACC');
    const lineColor = getCssCustomProperty('--accent-info', isDark ? '#38BDF8' : '#007ACC');
    const secondaryColor = getCssCustomProperty('--card-bg', isDark ? '#1F1F24' : '#F0F4F9');
    const tertiaryColor = getCssCustomProperty('--bg-main', isDark ? '#25252A' : '#E9EEF6');
    const background = getCssCustomProperty('--bg-main', isDark ? '#18181B' : '#FFFFFF');

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: isDark ? 'dark' : 'default',
      themeVariables: {
        primaryColor,
        primaryTextColor,
        primaryBorderColor,
        lineColor,
        secondaryColor,
        tertiaryColor,
        background,
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }
    });
    isInitialized = true;
  } catch (e) {
    console.warn('Failed to initialize mermaid', e);
  }
}

const diagramCache = new Map<string, { svg: string; isError: boolean; error?: string }>();

let renderCounter = 0;

export async function renderMermaidDiagram(
  code: string,
  isDark: boolean = true
): Promise<{ svg: string; isError: boolean; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { svg: '', isError: false };
  }

  const cacheKey = `${isDark ? 'dark' : 'light'}:${trimmed}`;
  if (diagramCache.has(cacheKey)) {
    return diagramCache.get(cacheKey)!;
  }

  initializeMermaid(isDark);

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
