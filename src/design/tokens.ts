/**
 * CNTXT / ContextPad Design System Tokens
 * 
 * Centralized, typed tokens for spacing, typography, radii, elevation,
 * z-index hierarchy, and motion transitions.
 * Fully decoupled from any native or platform-specific runtime.
 */

export const spacingTokens = {
  '3xs': '2px',
  '2xs': '4px',
  xs: '6px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '48px',
} as const;

export const radiiTokens = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

export const typographyTokens = {
  fontFamily: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Consolas, Monaco, monospace",
    display: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  },
  fontSize: {
    '2xs': '10px',
    xs: '11px',
    sm: '12px',
    base: '13px',
    md: '14px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.2',
    normal: '1.4',
    relaxed: '1.6',
  },
} as const;

export const elevationTokens = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  dialog: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

export const zIndexTokens = {
  base: 0,
  dock: 10,
  panel: 20,
  header: 30,
  accessory: 40,
  dropdown: 50,
  drawer: 60,
  backdrop: 70,
  modal: 80,
  toast: 90,
  tooltip: 100,
} as const;

export const transitionTokens = {
  fast: 'all 0.1s ease-in-out',
  normal: 'all 0.2s ease-in-out',
  slow: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export type SpacingToken = keyof typeof spacingTokens;
export type RadiiToken = keyof typeof radiiTokens;
export type ElevationToken = keyof typeof elevationTokens;
export type ZIndexToken = keyof typeof zIndexTokens;
