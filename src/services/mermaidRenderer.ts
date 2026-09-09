import mermaid from 'mermaid';
import { getElementById } from '../adapters';

let isInitialized = false;

export function initializeMermaid(isDark: boolean = true) {
  try {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: isDark ? 'dark' : 'default',
      themeVariables: isDark ? {
        primaryColor: '#007ACC',
        primaryTextColor: '#EDEDED',
        primaryBorderColor: '#38BDF8',
        lineColor: '#38BDF8',
        secondaryColor: '#1F1F24',
        tertiaryColor: '#25252A',
        background: '#18181B',
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      } : {
        primaryColor: '#007ACC',
        primaryTextColor: '#1F1F1F',
        primaryBorderColor: '#007ACC',
        lineColor: '#007ACC',
        secondaryColor: '#F0F4F9',
        tertiaryColor: '#E9EEF6',
        background: '#FFFFFF',
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
