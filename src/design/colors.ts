/**
 * CNTXT Semantic Color Token Types
 * Pure type definitions for design tokens. Zero runtime values.
 */

export type SemanticColorCategory = 
  | 'background' 
  | 'foreground' 
  | 'border' 
  | 'accent' 
  | 'status';

export interface SemanticColorDefinition {
  appBg: string;
  surfaceBg: string;
  panelBg: string;
  activityBarBg: string;
  editorBg: string;
  sidebarBg: string;
  elevatedBg: string;
  hoverBg: string;
  activeBg: string;
  selectedBg: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  borderSubtle: string;
  borderMuted: string;
  borderFocus: string;
  accentPrimary: string;
  accentHover: string;
  accentSubtle: string;
}
