import katex from 'katex';

export interface MathRenderResult {
  html: string;
  isError: boolean;
  error?: string;
}

export function renderLatex(latex: string, displayMode: boolean = false): MathRenderResult {
  try {
    const trimmed = latex.trim();
    if (!trimmed) {
      return { html: '', isError: false };
    }
    const html = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: false,
      output: 'htmlAndMathml',
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
