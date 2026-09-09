import { ThemeName } from '../types';

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
