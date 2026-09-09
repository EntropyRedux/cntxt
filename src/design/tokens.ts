/**
 * CNTXT / ContextPad Design System Token Types
 * Pure type contract layer with zero runtime code and zero external imports.
 */

export type SpacingToken = 
  | '3xs' 
  | '2xs' 
  | 'xs' 
  | 'sm' 
  | 'md' 
  | 'lg' 
  | 'xl' 
  | '2xl' 
  | '3xl' 
  | '4xl';

export type RadiiToken = 
  | 'none' 
  | 'xs' 
  | 'sm' 
  | 'md' 
  | 'lg' 
  | 'xl' 
  | '2xl' 
  | 'full';

export type ElevationToken = 
  | 'none' 
  | 'xs' 
  | 'sm' 
  | 'md' 
  | 'lg' 
  | 'xl' 
  | 'dialog';

export type ZIndexToken = 
  | 'base' 
  | 'dock' 
  | 'panel' 
  | 'header' 
  | 'accessory' 
  | 'dropdown' 
  | 'drawer' 
  | 'backdrop' 
  | 'modal' 
  | 'toast' 
  | 'tooltip';

export type TransitionToken = 'fast' | 'normal' | 'slow';

export interface TypographyTokens {
  fontFamily: {
    sans: string;
    mono: string;
    display: string;
  };
  fontSize: Record<string, string>;
  fontWeight: Record<string, string>;
  lineHeight: Record<string, string>;
}
