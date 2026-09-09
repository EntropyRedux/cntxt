/**
 * Typography Scale & Text Styles for CNTXT
 */

export const textStyles = {
  display: 'font-sans text-xl font-bold tracking-tight text-[var(--text-primary)]',
  h1: 'font-sans text-lg font-semibold tracking-tight text-[var(--text-primary)]',
  h2: 'font-sans text-base font-semibold text-[var(--text-primary)]',
  h3: 'font-sans text-sm font-semibold text-[var(--text-primary)]',
  body: 'font-sans text-xs font-normal text-[var(--text-primary)] leading-relaxed',
  bodySmall: 'font-sans text-[11px] font-normal text-[var(--text-secondary)] leading-normal',
  caption: 'font-sans text-[10px] font-medium text-[var(--text-muted)] tracking-wider uppercase',
  code: 'font-mono text-xs text-[var(--text-primary)] bg-[var(--editor-bg)] rounded px-1 py-0.5',
  kbd: 'font-mono text-[10px] font-medium text-[var(--text-muted)] bg-[var(--card-bg)] border border-[var(--border-subtle)] rounded px-1.5 py-0.5 shadow-2xs',
} as const;

export type TextStyleName = keyof typeof textStyles;
