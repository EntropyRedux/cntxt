import { CNTXT_THEME_TOKENS } from '../blueprint/promptBuilder';
import { getRootComputedStyleProperty, getRootAttribute } from '../../../adapters';

export function isDarkTheme(): boolean {
  const themeAttr = getRootAttribute('data-theme');
  if (
    themeAttr === 'google-material-3' ||
    themeAttr === 'material-light' ||
    themeAttr === 'github-light' ||
    themeAttr === 'parchment' ||
    themeAttr.includes('light')
  ) {
    return false;
  }
  return true;
}

export function getActiveThemeTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const token of CNTXT_THEME_TOKENS) {
    const val = getRootComputedStyleProperty(token);
    if (val) {
      tokens[token] = val;
    }
  }

  const isDark = isDarkTheme();

  // Ensure default fallbacks if document element had empty/unset values (e.g. initial render or testing)
  const darkFallbacks: Record<string, string> = {
    '--bg-primary': '#18181B',
    '--bg-secondary': '#1F1F24',
    '--bg-tertiary': '#25252A',
    '--text-primary': '#EDEDED',
    '--text-secondary': '#A1A1AA',
    '--text-muted': '#71717A',
    '--accent-primary': '#007ACC',
    '--accent-hover': '#0066A6',
    '--border-primary': '#2B2B33',
    '--border-subtle': '#222228',
    '--card-bg': '#25252A',
    '--card-hover-bg': '#2E2E36',
    '--sidebar-bg': '#1F1F24',
    '--sidebar-header-bg': '#18181B',
  };

  const lightFallbacks: Record<string, string> = {
    '--bg-primary': '#EDF2FA',
    '--bg-secondary': '#F0F4F9',
    '--bg-tertiary': '#E8EEF5',
    '--text-primary': '#1F1F1F',
    '--text-secondary': '#444746',
    '--text-muted': '#5E6266',
    '--accent-primary': '#0B57D0',
    '--accent-hover': '#0842A0',
    '--border-primary': '#D3D7DC',
    '--border-subtle': '#E8EEF5',
    '--card-bg': '#FFFFFF',
    '--card-hover-bg': '#EDF2FA',
    '--sidebar-bg': '#F0F4F9',
    '--sidebar-header-bg': '#E8EEF5',
  };

  const fallbacks = isDark ? darkFallbacks : lightFallbacks;

  for (const [k, v] of Object.entries(fallbacks)) {
    if (!tokens[k]) {
      tokens[k] = v;
    }
  }

  return tokens;
}

export function buildThemeInjection(
  tokens: Record<string, string> = getActiveThemeTokens(),
  dark: boolean = isDarkTheme()
): string {
  const vars = Object.entries(tokens)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join('\n');

  return `<style id="cntxt-theme-injection">
:root {
  color-scheme: ${dark ? 'dark' : 'light'};
${vars}
}
html, body {
  background-color: var(--bg-primary) !important;
  color: var(--text-primary) !important;
}
</style>`;
}
