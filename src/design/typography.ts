/**
 * CNTXT Typography Hierarchy Types
 * Pure type definitions for design hierarchy. Zero runtime values.
 */

export type TextStyleName = 
  | 'display' 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'body' 
  | 'bodySmall' 
  | 'caption' 
  | 'code' 
  | 'kbd';

export interface TextStyleDefinition {
  fontSize: string;
  lineHeight: string;
  fontWeight: string;
  letterSpacing?: string;
  fontFamily?: string;
}
