import { escapeHtml } from '../adapters';

export interface MathRenderResult {
  html: string;
  isError: boolean;
  error?: string;
  isPending?: boolean;
}

type KatexInstance = { renderToString: (tex: string, opts?: Record<string, unknown>) => string };
let katexInstance: KatexInstance | null = null;
let katexLoadingPromise: Promise<KatexInstance> | null = null;

export async function getKatex(): Promise<KatexInstance> {
  if (katexInstance) return katexInstance;
  if (!katexLoadingPromise) {
    katexLoadingPromise = import('katex').then((mod) => {
      katexInstance = mod.default || mod;
      return katexInstance;
    });
  }
  return katexLoadingPromise;
}

export function isKatexLoaded(): boolean {
  return katexInstance !== null;
}

export function renderLatex(latex: string, displayMode: boolean = false): MathRenderResult {
  const trimmed = latex.trim();
  if (!trimmed) {
    return { html: '', isError: false };
  }

  if (!katexInstance) {
    const safe = escapeHtml(trimmed);
    return {
      html: displayMode
        ? `<div class="katex-loading-placeholder text-center text-xs text-[var(--text-muted)] font-mono py-2 opacity-80 select-none">$$ ${safe} $$</div>`
        : `<span class="katex-loading-placeholder text-xs text-[var(--text-muted)] font-mono opacity-80 select-none">$${safe}$</span>`,
      isError: false,
      isPending: true
    };
  }

  try {
    const html = katexInstance.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
      trust: false
    });
    const taggedHtml = html.replace(/^(<(?:span|div)\s+class="[^"]*katex[^"]*")/i, '$1 data-cntxt-math="true"');
    return { html: taggedHtml, isError: false };
  } catch (err: unknown) {
    const msg = (err as Error)?.message || 'Invalid formula';
    return {
      html: `<span class="text-red-400 font-mono text-xs">[LaTeX Error: ${msg}]</span>`,
      isError: true,
      error: msg
    };
  }
}
