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
