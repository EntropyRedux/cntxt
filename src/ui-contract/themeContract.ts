export type ThemeName = 
  | 'google-material-3'
  | 'contextpad-dark' 
  | 'one-dark' 
  | 'dracula' 
  | 'nord' 
  | 'monokai' 
  | 'github-dark' 
  | 'github-light' 
  | 'solarized-dark';

export interface UiThemeDefinition {
  id: ThemeName;
  name: string;
  type: 'dark' | 'light';
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface ThemeEventContracts {
  onThemeChange: (theme: ThemeName) => void;
  onDensityChange: (density: 'compact' | 'comfortable' | 'touch') => void;
  onTouchOptimizedChange: (enabled: boolean) => void;
}
