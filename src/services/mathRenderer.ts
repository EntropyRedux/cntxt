import { escapeHtml } from '../adapters';

export interface MathRenderResult {
  html: string;
  isError: boolean;
  error?: string;
  isPending?: boolean;
}

let katexInstance: any = null;
let katexLoadingPromise: Promise<any> | null = null;

export async function getKatex(): Promise<any> {
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
    return { html, isError: false };
  } catch (err: any) {
    return {
      html: `<span class="text-red-400 font-mono text-xs">[LaTeX Error: ${err?.message || 'Invalid formula'}]</span>`,
      isError: true,
      error: err?.message
    };
  }
}
