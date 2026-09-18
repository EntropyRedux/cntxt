/**
 * Template Variable Service
 * 
 * Handles extraction and real-time processing of template variables,
 * including system macros ({{SELECTION}}, {{DATE}}, {{TIME}}, {{DATETIME}}, {{CURSOR}})
 * and custom parameter tokens.
 */

export interface ProcessedTemplate {
  content: string;
  cursorOffset: number | null;
}

const SYSTEM_VARIABLES = new Set(['SELECTION', 'DATE', 'TIME', 'DATETIME', 'CURSOR']);

/**
 * Checks if a variable name corresponds to an automatic system macro.
 */
export function isSystemVariable(variableName: string): boolean {
  return SYSTEM_VARIABLES.has(variableName.trim().toUpperCase());
}

/**
 * Processes template content by substituting dynamic system variables and computing cursor offset.
 * 
 * @param content The raw template string
 * @param selectedText Any text currently highlighted in the active document
 */
export function processTemplateVariables(
  content: string,
  selectedText: string = ''
): ProcessedTemplate {
  let processed = content;
  let cursorOffset: number | null = null;

  // 1. {{SELECTION}} - Inject current document selection
  processed = processed.replace(/\{\{SELECTION\}\}/g, selectedText);

  // 2. {{DATE}} - Current local date (YYYY-MM-DD)
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  processed = processed.replace(/\{\{DATE\}\}/g, dateStr);

  // 3. {{TIME}} - Current local time (HH:MM:SS)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;
  processed = processed.replace(/\{\{TIME\}\}/g, timeStr);

  // 4. {{DATETIME}} - Full timestamp (YYYY-MM-DD HH:MM:SS)
  const datetimeStr = `${dateStr} ${timeStr}`;
  processed = processed.replace(/\{\{DATETIME\}\}/g, datetimeStr);

  // 5. {{CURSOR}} - Calculate position where cursor should be placed after insert
  const cursorMatch = processed.match(/\{\{CURSOR\}\}/);
  if (cursorMatch && cursorMatch.index !== undefined) {
    cursorOffset = cursorMatch.index;
    processed = processed.replace(/\{\{CURSOR\}\}/g, '');
  }

  return { content: processed, cursorOffset };
}

/**
 * Extracts all unique {{VARIABLE}} placeholder tokens from template content.
 */
export function extractTemplateVariables(content: string): string[] {
  if (!content) return [];
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = content.matchAll(regex);
  const variables: string[] = [];

  for (const m of matches) {
    const raw = m[1].trim();
    if (raw && !variables.includes(raw)) {
      variables.push(raw);
    }
  }

  return variables;
}

export interface ParsedVariableToken {
  raw: string;
  cleanName: string;
  displayName: string;
  defaultValue: string;
  isRequired: boolean;
  hasPipeModifier: boolean;
  hasAsterisk: boolean;
}

/**
 * Universal parser for ContextPad template variable placeholders.
 * Supports:
 * - Option 1: Asterisk prefix/suffix: {{*variable}}, {{*variable:default}}, {{variable*}}
 * - Option 3: Pipe modifier: {{variable|required}}, {{variable:default|required}}
 * - Standard optional placeholders: {{variable}}, {{variable:default}}
 */
export function parseVariableToken(content: string): ParsedVariableToken {
  const raw = content.trim();

  // Split by pipe for directives, e.g. "task:Fix auth|required" or "api_key|required"
  const pipeParts = raw.split('|').map(p => p.trim());
  const primary = pipeParts[0] || '';
  const modifiers = pipeParts.slice(1).map(p => p.toLowerCase());

  // Check Option 3: |required or |req
  const hasPipeModifier = modifiers.some(m => m === 'required' || m === 'req');

  // Parse primary segment into rawName and defaultValue
  let rawName = primary;
  let defaultValue = '';
  const colonIdx = primary.indexOf(':');
  if (colonIdx !== -1) {
    rawName = primary.slice(0, colonIdx).trim();
    defaultValue = primary.slice(colonIdx + 1).trim();
  }

  // Check Option 1: * prefix or * suffix
  const hasAsterisk = rawName.startsWith('*') || rawName.endsWith('*');

  const isRequired = hasPipeModifier || hasAsterisk;

  // Clean name by removing leading/trailing asterisks
  const cleanName = rawName.replace(/^\*+|\*+$/g, '').trim();

  return {
    raw,
    cleanName,
    displayName: cleanName,
    defaultValue,
    isRequired,
    hasPipeModifier,
    hasAsterisk
  };
}

