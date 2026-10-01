/**
 * ACTION ENGINE (src/services/actionEngine.ts)
 * 
 * Declarative operation pipeline executor and registered transform engine.
 * Eliminates dynamic 'new Function' and 'eval' execution in CNTXT, allowing
 * 'unsafe-eval' to be completely removed from the CSP.
 */

import { ActionOp, ActionTransformName, Action } from '../../contracts/data_shapes';
import {
  ActionSnapshot,
  ActionMutation,
  SandboxAPI,
  createSandboxAPI,
  validateActionSyntax,
  isValidActionMutation
} from './sandboxApiFactory';
import { FormulaEngine } from './formulaParser';

export type TransformHandler = (snapshot: ActionSnapshot, api: SandboxAPI, args?: Record<string, string | number | boolean>) => void | Promise<void>;

const transformRegistry: Map<string, TransformHandler> = new Map();

/**
 * Registers an extensible action transform function.
 */
export function registerActionTransform(name: string, handler: TransformHandler): void {
  transformRegistry.set(name, handler);
}

/**
 * Retrieves a registered action transform function.
 */
export function getActionTransform(name: string): TransformHandler | undefined {
  return transformRegistry.get(name);
}

/**
 * Lists all registered action transform names.
 */
export function listActionTransforms(): string[] {
  return Array.from(transformRegistry.keys());
}

// ============================================================================
// Built-in Pure Deterministic Transforms
// ============================================================================

registerActionTransform('summarize', (snapshot, api) => {
  const text = snapshot.text;
  if (!text.trim()) {
    api.toast("Document is empty", "warning");
    return;
  }
  api.toast("Analyzing text content...", "info");
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  const summary = `## Executive Summary\n\n**Key Metrics:**\n- Total Words: ${wordCount}\n- Total Characters: ${charCount}\n- Paragraphs: ${lines.length}\n\n**Core Takeaways:**\n` + lines.slice(0, 3).map(l => `- ${l.replace(/^[#*\-\s]+/, '')}`).join('\n');

  api.insertAtCursor('\n\n' + summary);
  api.toast("Summary appended successfully!", "success");
});

registerActionTransform('formatTable', (snapshot, api) => {
  const text = snapshot.text;
  const lines = text.split('\n');
  let modified = false;

  const newLines = lines.map(line => {
    if (line.includes('|')) {
      const cells = line.split('|').map(c => c.trim());
      modified = true;
      return cells.join(' | ');
    }
    return line;
  });

  if (modified) {
    api.setText(newLines.join('\n'));
    api.toast("Normalized markdown tables", "success");
  } else {
    api.toast("No markdown table found in current document", "info");
  }
});

registerActionTransform('slugify', (snapshot, api) => {
  const sel = snapshot.selection;
  const target = sel || snapshot.text.split('\n')[0];
  if (!target) {
    api.toast("Nothing to slugify", "warning");
    return;
  }
  const slug = target
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sel) {
    api.replaceSelection(slug);
  } else {
    api.insertAtCursor(slug);
  }
  api.toast(`Generated slug: ${slug}`, "success");
});

registerActionTransform('extractTasks', (snapshot, api) => {
  const text = snapshot.text;
  const matches = text.match(/^[ \t]*- \[([ xX])\]\s+(.+)$/gm);
  if (!matches || matches.length === 0) {
    api.toast("No checklist tasks found (- [ ] ...)", "info");
    return;
  }
  const header = "\n\n### Consolidated Task Checklist\n";
  const tasks = matches.join('\n');
  api.insertAtCursor(header + tasks + '\n');
  api.toast(`Extracted ${matches.length} tasks`, "success");
});

registerActionTransform('formatJSON', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  try {
    const parsed = JSON.parse(text);

    function sortObjectKeys(obj: unknown): unknown {
      if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys);
      } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj)
          .sort()
          .reduce((result: Record<string, unknown>, key) => {
            const record = obj as Record<string, unknown>;
            result[key] = sortObjectKeys(record[key]);
            return result;
          }, {});
      }
      return obj;
    }

    const sorted = sortObjectKeys(parsed);
    const formatted = JSON.stringify(sorted, null, 2);

    if (snapshot.selection) {
      api.replaceSelection(formatted);
    } else {
      api.setText(formatted);
    }
    api.toast('JSON formatted and keys sorted successfully!', 'success');
  } catch (e: unknown) {
    api.toast('Failed to parse JSON: ' + ((e as Error)?.message || String(e)), 'error');
  }
});

registerActionTransform('extractAndFillVariables', (snapshot, api) => {
  const text = snapshot.text;
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [...text.matchAll(regex)];

  if (matches.length === 0) {
    api.toast('No {{variable}} placeholders found in document', 'info');
  } else {
    const uniqueVars = Array.from(new Set(matches.map(m => m[1].trim())));
    api.toast(`Found ${uniqueVars.length} template variable(s). Opening variable filler...`, 'info');
    api.openVariableModal();
  }
});

registerActionTransform('tableToCsv', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  const lines = text.split('\n').filter(l => l.trim().startsWith('|') && l.trim().endsWith('|'));

  if (lines.length < 2) {
    api.toast('Please select a valid markdown table (with | header and row lines)', 'warning');
  } else {
    const cleanRows = lines
      .filter(line => !line.match(/^\|?\s*[-:]+[-| :]*\|?$/))
      .map(line => {
        return line
          .split('|')
          .slice(1, -1)
          .map(cell => cell.trim().replace(/"/g, '""'));
      });

    const csvContent = cleanRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    api.openTab('Table Export.csv', csvContent, 'text');
    api.toast('Converted markdown table to CSV in new tab!', 'success');
  }
});

registerActionTransform('deduplicateLines', (snapshot, api) => {
  const isSelection = Boolean(snapshot.selection);
  const text = isSelection ? snapshot.selection : snapshot.text;
  const lines = text.split('\n');
  const uniqueLines = Array.from(new Set(lines.map(l => l.trim()))).filter(l => l.length > 0);
  uniqueLines.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const result = uniqueLines.join('\n');
  if (isSelection) {
    api.replaceSelection(result);
  } else {
    api.setText(result);
  }
  api.toast(`Deduplicated ${lines.length} lines down to ${uniqueLines.length} sorted unique lines`, 'success');
});

registerActionTransform('bakeFormulas', (snapshot, api) => {
  const text = snapshot.text;
  const formulaRegex = /\{=([^}]+)\}/g;

  let count = 0;
  const evaluated = text.replace(formulaRegex, (match, expression) => {
    try {
      count++;
      const res = api.evaluateFormula(expression.trim());
      return res !== undefined && res !== null ? String(res) : match;
    } catch {
      return match;
    }
  });

  if (count > 0) {
    api.setText(evaluated);
    api.toast(`Successfully evaluated and baked ${count} formula(s) into text`, 'success');
  } else {
    api.toast('No {=FORMULA()} tags found in current document', 'info');
  }
});
registerActionTransform('evalAllFormulas', getActionTransform('bakeFormulas')!);

registerActionTransform('wrapPromptContext', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  const wrapped = `<prompt_context version="1.0" created="${new Date().toISOString()}">
<instructions>
${text}
</instructions>
<output_guardrails>
- Enforce strict JSON output when requesting data structures.
- Do not provide conversational preamble or post-amble.
- Think through edge cases before returning final answer.
</output_guardrails>
</prompt_context>`;

  if (snapshot.selection) {
    api.replaceSelection(wrapped);
  } else {
    api.setText(wrapped);
  }
  api.toast('Wrapped in prompt context tags', 'success');
});

registerActionTransform('extractAnsweredVariables', async (snapshot, api) => {
  const text = snapshot.text;
  const regex = /\{\{([a-zA-Z0-9_-]+)(?:=([^}]+))?\}\}/g;
  const matches = [...text.matchAll(regex)];

  const varMap = new Map<string, string>();
  for (const m of matches) {
    const key = m[1].trim();
    const val = m[2] ? m[2].trim() : '(unassigned)';
    if (!varMap.has(key) || (varMap.get(key) === '(unassigned)' && val !== '(unassigned)')) {
      varMap.set(key, val);
    }
  }

  if (varMap.size === 0) {
    api.toast('No variable tags {{...}} found in document', 'info');
  } else {
    let table = '### Extracted Document Variables\n| Variable | Value |\n| :--- | :--- |\n';
    for (const [k, v] of varMap.entries()) {
      table += `| ${k} | ${v} |\n`;
    }
    await api.copyToClipboard(table);
    api.toast(`Copied ${varMap.size} extracted variable(s) to clipboard`, 'success');
  }
});

registerActionTransform('extractRowsWithVars', async (snapshot, api) => {
  const text = snapshot.text;
  const lines = text.split('\n');
  const matching = lines.filter(l => /\{\{[^}]+\}\}/.test(l));

  if (matching.length === 0) {
    api.toast('No rows containing {{variable}} tags found', 'info');
  } else {
    const result = matching.join('\n');
    await api.copyToClipboard(result);
    api.toast(`Copied ${matching.length} row(s) with variables to clipboard`, 'success');
  }
});

registerActionTransform('extractRowsWithoutVars', async (snapshot, api) => {
  const text = snapshot.text;
  const lines = text.split('\n');
  const staticLines = lines.filter(l => !/\{\{[^}]+\}\}/.test(l));

  if (staticLines.length === 0) {
    api.toast('All rows in document contain {{variable}} tags', 'info');
  } else {
    const result = staticLines.join('\n');
    await api.copyToClipboard(result);
    api.toast(`Copied ${staticLines.length} row(s) without variables to clipboard`, 'success');
  }
});

registerActionTransform('selectionExtractVars', async (snapshot, api) => {
  const sel = snapshot.selection;
  const target = sel || snapshot.text;
  const matches = [...target.matchAll(/\{\{([^}]+)\}\}/g)];

  if (matches.length === 0) {
    api.toast('No {{variable}} tags found in ' + (sel ? 'selection' : 'document'), 'info');
  } else {
    const unique = Array.from(new Set(matches.map(m => m[1].trim())));
    const checklist = '### Variable Checklist\n' + unique.map(v => `- [ ] \`{{${v}}}\``).join('\n');
    await api.copyToClipboard(checklist);
    api.toast(`Extracted ${unique.length} unique variable(s) to checklist and copied to clipboard`, 'success');
  }
});

registerActionTransform('uppercase', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  if (snapshot.selection) api.replaceSelection(text.toUpperCase());
  else api.setText(text.toUpperCase());
});

registerActionTransform('lowercase', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  if (snapshot.selection) api.replaceSelection(text.toLowerCase());
  else api.setText(text.toLowerCase());
});

registerActionTransform('titlecase', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  const titled = text.replace(/\b\w/g, c => c.toUpperCase());
  if (snapshot.selection) api.replaceSelection(titled);
  else api.setText(titled);
});

registerActionTransform('boldSelection', (snapshot, api) => {
  if (snapshot.selection) api.wrapSelection('**', '**');
  else api.insertAtCursor('****');
});

registerActionTransform('italicSelection', (snapshot, api) => {
  if (snapshot.selection) api.wrapSelection('*', '*');
  else api.insertAtCursor('**');
});

registerActionTransform('codeSelection', (snapshot, api) => {
  if (snapshot.selection) api.wrapSelection('`', '`');
  else api.insertAtCursor('``');
});

registerActionTransform('bulletlistSelection', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  const converted = text.split('\n').map(l => l.trim().length > 0 ? `* ${l}` : l).join('\n');
  if (snapshot.selection) api.replaceSelection(converted);
  else api.setText(converted);
});

registerActionTransform('checklistSelection', (snapshot, api) => {
  const text = snapshot.selection || snapshot.text;
  const converted = text.split('\n').map(l => l.trim().length > 0 ? `- [ ] ${l}` : l).join('\n');
  if (snapshot.selection) api.replaceSelection(converted);
  else api.setText(converted);
});

registerActionTransform('insertToday', (_snapshot, api) => {
  const d = new Date().toISOString().slice(0, 10);
  api.insertAtCursor(d);
});

registerActionTransform('insertUuid', (_snapshot, api) => {
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  api.insertAtCursor(uuid);
});

// ============================================================================
// Pipeline & Declarative Action Execution Engine
// ============================================================================

export class ActionEngine {
  /**
   * Executes a pipeline of ActionOp instructions atomically.
   */
  public static async executePipeline(
    pipeline: ActionOp[],
    initialSnapshot: ActionSnapshot,
    rawApi?: Partial<SandboxAPI>
  ): Promise<ActionMutation[]> {
    const currentSnapshot: ActionSnapshot = { ...initialSnapshot };
    const journal: ActionMutation[] = [];

    const safeApi = createSandboxAPI({
      getSnapshot: () => currentSnapshot,
      applyMutation: (mutation: ActionMutation) => {
        if (!isValidActionMutation(mutation)) return;
        journal.push(mutation);
        if (mutation.type === 'toast' && typeof rawApi?.toast === 'function') {
          rawApi.toast(mutation.message, mutation.toastType);
        }
        if (mutation.type === 'setText') {
          currentSnapshot.text = mutation.text;
        } else if (mutation.type === 'replaceSelection') {
          currentSnapshot.selection = mutation.text;
        } else if (mutation.type === 'insertAtCursor') {
          currentSnapshot.text += mutation.text;
        } else if (mutation.type === 'wrapSelection') {
          currentSnapshot.selection = `${mutation.before}${currentSnapshot.selection}${mutation.after}`;
        }
      },
      requestDialogPrompt: async (title: string, defaultValue = '') => {
        if (rawApi?.dialog?.prompt) return await rawApi.dialog.prompt(title, defaultValue);
        return null;
      },
      requestDialogConfirm: async (title: string, message: string) => {
        if (rawApi?.dialog?.confirm) return await rawApi.dialog.confirm(title, message);
        return false;
      },
      evaluateFormula: (expr: string) => {
        const engine = new FormulaEngine({
          lineCount: currentSnapshot.lineCount,
          charCount: currentSnapshot.characterCount,
          wordCount: currentSnapshot.wordCount,
          selectedText: currentSnapshot.selection
        });
        const res = engine.evaluate(expr);
        return res.success ? res.value : null;
      }
    });

    for (const op of pipeline) {
      switch (op.type) {
        case 'setText':
          safeApi.setText(op.text);
          break;
        case 'insertAtCursor':
          safeApi.insertAtCursor(op.text);
          break;
        case 'wrapSelection':
          safeApi.wrapSelection(op.before, op.after);
          break;
        case 'replaceSelection':
          safeApi.replaceSelection(op.text);
          break;
        case 'toast':
          safeApi.toast(op.message, op.toastType);
          break;
        case 'openTab':
          safeApi.openTab(op.title, op.content, op.language);
          break;
        case 'openVariableModal':
          safeApi.openVariableModal();
          break;
        case 'copyToClipboard':
          if (op.text) await safeApi.copyToClipboard(op.text);
          break;
        case 'formula': {
          const res = safeApi.evaluateFormula(op.expression);
          if (res !== null && res !== undefined) {
            safeApi.insertAtCursor(String(res));
          }
          break;
        }
        case 'transform': {
          const handler = getActionTransform(op.transform);
          if (handler) {
            await handler(currentSnapshot, safeApi, op.args);
          } else {
            safeApi.toast(`Transform "${op.transform}" not found`, 'warning');
          }
          break;
        }
      }
    }

    return journal;
  }

  /**
   * Deterministic safe expression and statement evaluator.
   * Parses and executes without ANY eval or new Function, enforcing 100% CSP purity.
   */
  public static async executeCode(
    code: string,
    initialSnapshot: ActionSnapshot,
    rawApi?: Partial<SandboxAPI>
  ): Promise<{ result?: unknown; journal: ActionMutation[] }> {
    validateActionSyntax(code);

    const currentSnapshot: ActionSnapshot = { ...initialSnapshot };
    const journal: ActionMutation[] = [];

    const safeApi = createSandboxAPI({
      getSnapshot: () => currentSnapshot,
      applyMutation: (mutation: ActionMutation) => {
        if (!isValidActionMutation(mutation)) return;
        journal.push(mutation);
        if (mutation.type === 'toast' && typeof rawApi?.toast === 'function') {
          rawApi.toast(mutation.message, mutation.toastType);
        }
        if (mutation.type === 'setText') {
          currentSnapshot.text = mutation.text;
        } else if (mutation.type === 'replaceSelection') {
          currentSnapshot.selection = mutation.text;
        } else if (mutation.type === 'insertAtCursor') {
          currentSnapshot.text += mutation.text;
        } else if (mutation.type === 'wrapSelection') {
          currentSnapshot.selection = `${mutation.before}${currentSnapshot.selection}${mutation.after}`;
        }
      },
      requestDialogPrompt: async (title: string, defaultValue = '') => {
        if (rawApi?.dialog?.prompt) return await rawApi.dialog.prompt(title, defaultValue);
        return null;
      },
      requestDialogConfirm: async (title: string, message: string) => {
        if (rawApi?.dialog?.confirm) return await rawApi.dialog.confirm(title, message);
        return false;
      },
      evaluateFormula: (expr: string) => {
        const engine = new FormulaEngine({
          lineCount: currentSnapshot.lineCount,
          charCount: currentSnapshot.characterCount,
          wordCount: currentSnapshot.wordCount,
          selectedText: currentSnapshot.selection
        });
        const res = engine.evaluate(expr);
        return res.success ? res.value : null;
      }
    });

    const trimmed = code.trim();

    // 1. Direct FORMULA prefix
    if (trimmed.startsWith('FORMULA:')) {
      const formula = trimmed.slice(8).trim();
      const res = safeApi.evaluateFormula(formula);
      return { result: res, journal };
    }

    // 2. Direct TRANSFORM prefix
    if (trimmed.startsWith('TRANSFORM:')) {
      const transformName = trimmed.slice(10).trim();
      const handler = getActionTransform(transformName);
      if (handler) {
        await handler(currentSnapshot, safeApi);
      } else {
        throw new Error(`Action Engine Error: Transform "${transformName}" is not registered`);
      }
      return { result: undefined, journal };
    }

    // 3. Real AST Tokenize, Parse & Interpret
    const tokens = new ActionTokenizer(code).tokenize();
    const ast = new ActionParser(tokens).parseProgram();
    const interpreter = new ActionASTInterpreter(safeApi);
    const result = interpreter.execute(ast);
    return { result, journal };
  }
}

// ============================================================================
// Real AST Engine: Tokenizer, Parser & Sandboxed Interpreter
// ============================================================================

export enum ActionTokenType {
  IDENT = 'IDENT',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  KEYWORD = 'KEYWORD',
  PUNCT = 'PUNCT',
  OPERATOR = 'OPERATOR',
  EOF = 'EOF'
}

export interface ActionToken {
  type: ActionTokenType;
  value: string | number | boolean | null | undefined;
  pos: number;
}

const KEYWORDS = new Set([
  'const', 'let', 'var', 'return', 'typeof', 'true', 'false', 'null', 'undefined'
]);

const UNSUPPORTED_KEYWORDS = new Set([
  'while', 'for', 'do', 'switch', 'case', 'break', 'continue',
  'function', 'class', 'import', 'export', 'new', 'this', 'throw',
  'try', 'catch', 'finally', 'yield', 'await', 'async', 'void',
  'delete', 'debugger', 'with'
]);

const FORBIDDEN_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  'eval',
  'Function',
  'AsyncFunction',
  'GeneratorFunction',
  'importScripts',
  'document',
  'window',
  'globalThis',
  'self',
  'top',
  'parent'
]);

export class ActionTokenizer {
  private pos = 0;
  private len: number;

  constructor(private input: string) {
    this.len = input.length;
  }

  public tokenize(): ActionToken[] {
    const tokens: ActionToken[] = [];
    while (this.pos < this.len) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.len) break;

      const ch = this.input[this.pos];

      // Strings
      if (ch === '"' || ch === "'" || ch === '`') {
        tokens.push(this.readString(ch));
        continue;
      }

      // Numbers
      if (this.isDigit(ch)) {
        tokens.push(this.readNumber());
        continue;
      }

      // Identifiers & Keywords
      if (this.isIdentStart(ch)) {
        tokens.push(this.readIdent());
        continue;
      }

      // Multi-character operators
      const two = this.input.slice(this.pos, this.pos + 2);
      const three = this.input.slice(this.pos, this.pos + 3);

      if (three === '===' || three === '!==') {
        tokens.push({ type: ActionTokenType.OPERATOR, value: three, pos: this.pos });
        this.pos += 3;
        continue;
      }

      if (['==', '!=', '<=', '>=', '&&', '||', '+=', '-='].includes(two)) {
        tokens.push({ type: ActionTokenType.OPERATOR, value: two, pos: this.pos });
        this.pos += 2;
        continue;
      }

      // Single-character operators & punctuation
      if (['+', '-', '*', '/', '%', '<', '>', '!', '='].includes(ch)) {
        tokens.push({ type: ActionTokenType.OPERATOR, value: ch, pos: this.pos });
        this.pos++;
        continue;
      }

      if (['(', ')', '{', '}', '[', ']', ';', ',', '.', ':', '?'].includes(ch)) {
        tokens.push({ type: ActionTokenType.PUNCT, value: ch, pos: this.pos });
        this.pos++;
        continue;
      }

      throw new Error(`Action Engine Syntax Error: Unexpected token "${ch}" at index ${this.pos}`);
    }

    tokens.push({ type: ActionTokenType.EOF, value: '', pos: this.pos });
    return tokens;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.len) {
      const ch = this.input[this.pos];
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.pos++;
        continue;
      }
      if (ch === '/' && this.pos + 1 < this.len) {
        const next = this.input[this.pos + 1];
        if (next === '/') {
          this.pos += 2;
          while (this.pos < this.len && this.input[this.pos] !== '\n') {
            this.pos++;
          }
          continue;
        }
        if (next === '*') {
          this.pos += 2;
          while (this.pos + 1 < this.len && !(this.input[this.pos] === '*' && this.input[this.pos + 1] === '/')) {
            this.pos++;
          }
          this.pos += 2;
          continue;
        }
      }
      break;
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch);
  }

  private readString(quote: string): ActionToken {
    const start = this.pos;
    this.pos++;
    let str = '';
    while (this.pos < this.len) {
      const ch = this.input[this.pos];
      if (ch === quote) {
        this.pos++;
        return { type: ActionTokenType.STRING, value: str, pos: start };
      }
      if (ch === '\\' && this.pos + 1 < this.len) {
        this.pos++;
        const esc = this.input[this.pos];
        if (esc === 'n') str += '\n';
        else if (esc === 't') str += '\t';
        else if (esc === 'r') str += '\r';
        else if (esc === '\\') str += '\\';
        else if (esc === quote) str += quote;
        else str += esc;
        this.pos++;
        continue;
      }
      str += ch;
      this.pos++;
    }
    throw new Error(`Action Engine Syntax Error: Unterminated string literal starting at index ${start}`);
  }

  private readNumber(): ActionToken {
    const start = this.pos;
    while (this.pos < this.len && this.isDigit(this.input[this.pos])) {
      this.pos++;
    }
    if (this.pos < this.len && this.input[this.pos] === '.' && this.pos + 1 < this.len && this.isDigit(this.input[this.pos + 1])) {
      this.pos++;
      while (this.pos < this.len && this.isDigit(this.input[this.pos])) {
        this.pos++;
      }
    }
    const val = Number(this.input.slice(start, this.pos));
    return { type: ActionTokenType.NUMBER, value: val, pos: start };
  }

  private readIdent(): ActionToken {
    const start = this.pos;
    while (this.pos < this.len && this.isIdentPart(this.input[this.pos])) {
      this.pos++;
    }
    const word = this.input.slice(start, this.pos);
    if (UNSUPPORTED_KEYWORDS.has(word)) {
      throw new Error(`Action Engine Syntax Error: "${word}" statement/expression is not supported in sandboxed actions`);
    }
    if (KEYWORDS.has(word)) {
      return { type: ActionTokenType.KEYWORD, value: word, pos: start };
    }
    return { type: ActionTokenType.IDENT, value: word, pos: start };
  }
}

// AST Nodes
export interface ProgramNode {
  type: 'Program';
  body: StatementNode[];
}

export type StatementNode =
  | VariableDeclarationNode
  | AssignmentStatementNode
  | ExpressionStatementNode
  | ReturnStatementNode;

export interface VariableDeclarationNode {
  type: 'VariableDeclaration';
  name: string;
  init: ExpressionNode;
  kind: 'const' | 'let' | 'var';
}

export interface AssignmentStatementNode {
  type: 'AssignmentStatement';
  left: IdentifierNode | MemberExpressionNode;
  operator: '=' | '+=';
  right: ExpressionNode;
}

export interface ExpressionStatementNode {
  type: 'ExpressionStatement';
  expression: ExpressionNode;
}

export interface ReturnStatementNode {
  type: 'ReturnStatement';
  argument: ExpressionNode | null;
}

export type ExpressionNode =
  | LiteralNode
  | IdentifierNode
  | UnaryExpressionNode
  | BinaryExpressionNode
  | LogicalExpressionNode
  | ConditionalExpressionNode
  | MemberExpressionNode
  | CallExpressionNode
  | ArrayExpressionNode
  | ObjectExpressionNode;

export interface LiteralNode {
  type: 'Literal';
  value: unknown;
}

export interface IdentifierNode {
  type: 'Identifier';
  name: string;
}

export interface UnaryExpressionNode {
  type: 'UnaryExpression';
  operator: 'typeof' | '!' | '-' | '+';
  argument: ExpressionNode;
}

export interface BinaryExpressionNode {
  type: 'BinaryExpression';
  operator: string;
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface LogicalExpressionNode {
  type: 'LogicalExpression';
  operator: '&&' | '||';
  left: ExpressionNode;
  right: ExpressionNode;
}

export interface ConditionalExpressionNode {
  type: 'ConditionalExpression';
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
}

export interface MemberExpressionNode {
  type: 'MemberExpression';
  object: ExpressionNode;
  property: string | ExpressionNode;
  computed: boolean;
}

export interface CallExpressionNode {
  type: 'CallExpression';
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

export interface ArrayExpressionNode {
  type: 'ArrayExpression';
  elements: ExpressionNode[];
}

export interface ObjectExpressionNode {
  type: 'ObjectExpression';
  properties: { key: string; value: ExpressionNode }[];
}

export class ActionParser {
  private idx = 0;

  constructor(private tokens: ActionToken[]) {}

  private peek(): ActionToken {
    return this.tokens[this.idx] || { type: ActionTokenType.EOF, value: '', pos: 0 };
  }

  private next(): ActionToken {
    const tok = this.peek();
    this.idx++;
    return tok;
  }

  private match(type: ActionTokenType, value?: string): ActionToken | null {
    const tok = this.peek();
    if (tok.type === type && (value === undefined || tok.value === value)) {
      return this.next();
    }
    return null;
  }

  private expect(type: ActionTokenType, value?: string): ActionToken {
    const tok = this.match(type, value);
    if (!tok) {
      const cur = this.peek();
      throw new Error(`Action Engine Syntax Error: Expected "${value || type}" but found "${cur.value || cur.type}" at index ${cur.pos}`);
    }
    return tok;
  }

  public parseProgram(): ProgramNode {
    const stmts: StatementNode[] = [];
    while (this.peek().type !== ActionTokenType.EOF) {
      stmts.push(this.parseStatement());
    }
    return { type: 'Program', body: stmts };
  }

  private parseStatement(): StatementNode {
    const tok = this.peek();

    if (tok.type === ActionTokenType.KEYWORD && (tok.value === 'const' || tok.value === 'let' || tok.value === 'var')) {
      return this.parseVarDecl();
    }

    if (tok.type === ActionTokenType.KEYWORD && tok.value === 'return') {
      return this.parseReturn();
    }

    const expr = this.parseExpression();

    if (this.match(ActionTokenType.OPERATOR, '=')) {
      const value = this.parseExpression();
      this.match(ActionTokenType.PUNCT, ';');
      return { type: 'AssignmentStatement', left: expr as IdentifierNode | MemberExpressionNode, operator: '=', right: value };
    }
    if (this.match(ActionTokenType.OPERATOR, '+=')) {
      const value = this.parseExpression();
      this.match(ActionTokenType.PUNCT, ';');
      return { type: 'AssignmentStatement', left: expr as IdentifierNode | MemberExpressionNode, operator: '+=', right: value };
    }

    this.match(ActionTokenType.PUNCT, ';');
    return { type: 'ExpressionStatement', expression: expr };
  }

  private parseVarDecl(): VariableDeclarationNode {
    const kind = this.next().value as 'const' | 'let' | 'var';
    const idTok = this.expect(ActionTokenType.IDENT);
    this.expect(ActionTokenType.OPERATOR, '=');
    const init = this.parseExpression();
    this.match(ActionTokenType.PUNCT, ';');
    return { type: 'VariableDeclaration', name: String(idTok.value), init, kind };
  }

  private parseReturn(): ReturnStatementNode {
    this.next();
    let expr: ExpressionNode | null = null;
    if (this.peek().type !== ActionTokenType.EOF && !(this.peek().type === ActionTokenType.PUNCT && this.peek().value === ';')) {
      expr = this.parseExpression();
    }
    this.match(ActionTokenType.PUNCT, ';');
    return { type: 'ReturnStatement', argument: expr };
  }

  private parseExpression(): ExpressionNode {
    return this.parseTernary();
  }

  private parseTernary(): ExpressionNode {
    let expr = this.parseLogicalOr();
    if (this.match(ActionTokenType.PUNCT, '?')) {
      const consequent = this.parseExpression();
      this.expect(ActionTokenType.PUNCT, ':');
      const alternate = this.parseExpression();
      expr = { type: 'ConditionalExpression', test: expr, consequent, alternate };
    }
    return expr;
  }

  private parseLogicalOr(): ExpressionNode {
    let left = this.parseLogicalAnd();
    while (this.match(ActionTokenType.OPERATOR, '||')) {
      const right = this.parseLogicalAnd();
      left = { type: 'LogicalExpression', operator: '||', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ExpressionNode {
    let left = this.parseEquality();
    while (this.match(ActionTokenType.OPERATOR, '&&')) {
      const right = this.parseEquality();
      left = { type: 'LogicalExpression', operator: '&&', left, right };
    }
    return left;
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseRelational();
    let op: ActionToken | null;
    while ((op = this.match(ActionTokenType.OPERATOR, '===') || this.match(ActionTokenType.OPERATOR, '!==') || this.match(ActionTokenType.OPERATOR, '==') || this.match(ActionTokenType.OPERATOR, '!='))) {
      const right = this.parseRelational();
      left = { type: 'BinaryExpression', operator: String(op.value), left, right };
    }
    return left;
  }

  private parseRelational(): ExpressionNode {
    let left = this.parseAdditive();
    let op: ActionToken | null;
    while ((op = this.match(ActionTokenType.OPERATOR, '<') || this.match(ActionTokenType.OPERATOR, '<=') || this.match(ActionTokenType.OPERATOR, '>') || this.match(ActionTokenType.OPERATOR, '>='))) {
      const right = this.parseAdditive();
      left = { type: 'BinaryExpression', operator: String(op.value), left, right };
    }
    return left;
  }

  private parseAdditive(): ExpressionNode {
    let left = this.parseMultiplicative();
    let op: ActionToken | null;
    while ((op = this.match(ActionTokenType.OPERATOR, '+') || this.match(ActionTokenType.OPERATOR, '-'))) {
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator: String(op.value), left, right };
    }
    return left;
  }

  private parseMultiplicative(): ExpressionNode {
    let left = this.parseUnary();
    let op: ActionToken | null;
    while ((op = this.match(ActionTokenType.OPERATOR, '*') || this.match(ActionTokenType.OPERATOR, '/') || this.match(ActionTokenType.OPERATOR, '%'))) {
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator: String(op.value), left, right };
    }
    return left;
  }

  private parseUnary(): ExpressionNode {
    const tok = this.peek();
    if (tok.type === ActionTokenType.KEYWORD && tok.value === 'typeof') {
      this.next();
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: 'typeof', argument };
    }
    if (tok.type === ActionTokenType.OPERATOR && (tok.value === '!' || tok.value === '-' || tok.value === '+')) {
      this.next();
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: tok.value as '!' | '-' | '+', argument };
    }
    return this.parseMemberOrCall();
  }

  private parseMemberOrCall(): ExpressionNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(ActionTokenType.PUNCT, '.')) {
        const propTok = this.expect(ActionTokenType.IDENT);
        expr = { type: 'MemberExpression', object: expr, property: String(propTok.value), computed: false };
      } else if (this.match(ActionTokenType.PUNCT, '[')) {
        const propExpr = this.parseExpression();
        this.expect(ActionTokenType.PUNCT, ']');
        expr = { type: 'MemberExpression', object: expr, property: propExpr, computed: true };
      } else if (this.match(ActionTokenType.PUNCT, '(')) {
        const args: ExpressionNode[] = [];
        if (!this.match(ActionTokenType.PUNCT, ')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match(ActionTokenType.PUNCT, ','));
          this.expect(ActionTokenType.PUNCT, ')');
        }
        expr = { type: 'CallExpression', callee: expr, arguments: args };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ExpressionNode {
    const tok = this.peek();

    if (tok.type === ActionTokenType.NUMBER || tok.type === ActionTokenType.STRING) {
      this.next();
      return { type: 'Literal', value: tok.value };
    }

    if (tok.type === ActionTokenType.KEYWORD) {
      if (tok.value === 'true') {
        this.next();
        return { type: 'Literal', value: true };
      }
      if (tok.value === 'false') {
        this.next();
        return { type: 'Literal', value: false };
      }
      if (tok.value === 'null') {
        this.next();
        return { type: 'Literal', value: null };
      }
      if (tok.value === 'undefined') {
        this.next();
        return { type: 'Literal', value: undefined };
      }
    }

    if (tok.type === ActionTokenType.IDENT) {
      this.next();
      return { type: 'Identifier', name: String(tok.value) };
    }

    if (this.match(ActionTokenType.PUNCT, '(')) {
      const expr = this.parseExpression();
      this.expect(ActionTokenType.PUNCT, ')');
      return expr;
    }

    if (this.match(ActionTokenType.PUNCT, '[')) {
      const elements: ExpressionNode[] = [];
      if (!this.match(ActionTokenType.PUNCT, ']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match(ActionTokenType.PUNCT, ','));
        this.expect(ActionTokenType.PUNCT, ']');
      }
      return { type: 'ArrayExpression', elements };
    }

    if (this.match(ActionTokenType.PUNCT, '{')) {
      const properties: { key: string; value: ExpressionNode }[] = [];
      if (!this.match(ActionTokenType.PUNCT, '}')) {
        do {
          const keyTok = this.peek();
          let key: string;
          if (keyTok.type === ActionTokenType.IDENT || keyTok.type === ActionTokenType.STRING) {
            this.next();
            key = String(keyTok.value);
          } else {
            throw new Error(`Action Engine Syntax Error: Invalid property key in object literal at index ${keyTok.pos}`);
          }

          let value: ExpressionNode;
          if (this.match(ActionTokenType.PUNCT, ':')) {
            value = this.parseExpression();
          } else {
            value = { type: 'Identifier', name: key };
          }
          properties.push({ key, value });
        } while (this.match(ActionTokenType.PUNCT, ','));
        this.expect(ActionTokenType.PUNCT, '}');
      }
      return { type: 'ObjectExpression', properties };
    }

    throw new Error(`Action Engine Syntax Error: Unexpected token "${tok.value || tok.type}" at index ${tok.pos}`);
  }
}

class ReturnSignal {
  constructor(public readonly value: unknown) {}
}

class Scope {
  private bindings = new Map<string, unknown>();
  constructor(public readonly parent: Scope | null = null) {}

  public declare(name: string, value: unknown): void {
    this.bindings.set(name, value);
  }

  public get(name: string, isTypeof = false): unknown {
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    if (this.parent) {
      return this.parent.get(name, isTypeof);
    }
    if (isTypeof) {
      return undefined;
    }
    throw new ReferenceError(`Action Engine Error: "${name}" is not defined`);
  }

  public set(name: string, value: unknown): void {
    if (this.bindings.has(name)) {
      this.bindings.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.set(name, value);
      return;
    }
    throw new ReferenceError(`Action Engine Error: Cannot assign to undeclared variable "${name}"`);
  }
}

function addValues(a: unknown, b: unknown): unknown {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a) + String(b);
  }
  return Number(a) + Number(b);
}

export class ActionASTInterpreter {
  private rootScope: Scope;
  private safeJson: { stringify: (val: unknown, replacer?: ((this: unknown, key: string, value: unknown) => unknown) | null, space?: string | number) => string; parse: (str: string) => unknown };
  private safeMath: Record<string, unknown>;

  constructor(private api: SandboxAPI) {
    this.rootScope = new Scope();
    this.safeJson = {
      stringify: (val, replacer, space) => JSON.stringify(val, replacer as ((key: string, value: unknown) => unknown) | undefined, space),
      parse: (str) => JSON.parse(str)
    };
    this.safeMath = {
      min: Math.min,
      max: Math.max,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
      abs: Math.abs,
      random: Math.random
    };
    this.setupRootScope();
  }

  private setupRootScope(): void {
    this.rootScope.declare('api', this.api);
    this.rootScope.declare('JSON', this.safeJson);
    this.rootScope.declare('Math', this.safeMath);
  }

  public execute(ast: ProgramNode): unknown {
    try {
      this.executeProgram(ast, this.rootScope);
      return undefined;
    } catch (e) {
      if (e instanceof ReturnSignal) {
        return e.value;
      }
      throw e;
    }
  }

  private executeProgram(program: ProgramNode, scope: Scope): void {
    for (const stmt of program.body) {
      this.executeStatement(stmt, scope);
    }
  }

  private executeStatement(stmt: StatementNode, scope: Scope): void {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        const val = this.evaluateExpression(stmt.init, scope);
        scope.declare(stmt.name, val);
        break;
      }
      case 'AssignmentStatement': {
        const val = this.evaluateExpression(stmt.right, scope);
        if (stmt.left.type === 'Identifier') {
          if (stmt.operator === '=') {
            scope.set(stmt.left.name, val);
          } else if (stmt.operator === '+=') {
            const current = scope.get(stmt.left.name);
            scope.set(stmt.left.name, addValues(current, val));
          }
        } else if (stmt.left.type === 'MemberExpression') {
          const obj = this.evaluateExpression(stmt.left.object, scope) as Record<string, unknown>;
          const prop = stmt.left.computed
            ? this.evaluateExpression(stmt.left.property as ExpressionNode, scope)
            : stmt.left.property;
          this.assertPropertySafe(prop);
          const key = String(prop);
          if (stmt.operator === '=') {
            obj[key] = val;
          } else if (stmt.operator === '+=') {
            obj[key] = addValues(obj[key], val);
          }
        } else {
          throw new Error('Action Engine Error: Invalid assignment target');
        }
        break;
      }
      case 'ExpressionStatement': {
        this.evaluateExpression(stmt.expression, scope);
        break;
      }
      case 'ReturnStatement': {
        const val = stmt.argument ? this.evaluateExpression(stmt.argument, scope) : undefined;
        throw new ReturnSignal(val);
      }
      default:
        const unhandledStmt: never = stmt as never;
        throw new Error(`Action Engine Error: Unsupported statement type "${(unhandledStmt as StatementNode).type}"`);
    }
  }

  private evaluateExpression(expr: ExpressionNode, scope: Scope): unknown {
    switch (expr.type) {
      case 'Literal':
        return expr.value;

      case 'Identifier':
        return scope.get(expr.name);

      case 'UnaryExpression': {
        if (expr.operator === 'typeof') {
          if (expr.argument.type === 'Identifier') {
            const val = scope.get(expr.argument.name, true);
            return typeof val;
          }
          const val = this.evaluateExpression(expr.argument, scope);
          return typeof val;
        }
        const val = this.evaluateExpression(expr.argument, scope);
        if (expr.operator === '!') return !val;
        if (expr.operator === '-') return -Number(val);
        if (expr.operator === '+') return +Number(val);
        throw new Error(`Action Engine Error: Unsupported unary operator "${expr.operator}"`);
      }

      case 'BinaryExpression': {
        const left = this.evaluateExpression(expr.left, scope);
        const right = this.evaluateExpression(expr.right, scope);
        switch (expr.operator) {
          case '+': return addValues(left, right);
          case '-': return Number(left) - Number(right);
          case '*': return Number(left) * Number(right);
          case '/': return Number(right) !== 0 ? Number(left) / Number(right) : 0;
          case '%': return Number(left) % Number(right);
          case '===': return left === right;
          case '!==': return left !== right;
          case '==': return left == right;
          case '!=': return left != right;
          case '<': return Number(left) < Number(right);
          case '<=': return Number(left) <= Number(right);
          case '>': return Number(left) > Number(right);
          case '>=': return Number(left) >= Number(right);
          default:
            throw new Error(`Action Engine Error: Unsupported binary operator "${expr.operator}"`);
        }
      }

      case 'LogicalExpression': {
        const left = this.evaluateExpression(expr.left, scope);
        if (expr.operator === '&&') {
          return left ? this.evaluateExpression(expr.right, scope) : left;
        }
        if (expr.operator === '||') {
          return left ? left : this.evaluateExpression(expr.right, scope);
        }
        throw new Error(`Action Engine Error: Unsupported logical operator "${expr.operator}"`);
      }

      case 'ConditionalExpression': {
        const test = this.evaluateExpression(expr.test, scope);
        return test
          ? this.evaluateExpression(expr.consequent, scope)
          : this.evaluateExpression(expr.alternate, scope);
      }

      case 'ArrayExpression':
        return expr.elements.map(el => this.evaluateExpression(el, scope));

      case 'ObjectExpression': {
        const obj: Record<string, unknown> = {};
        for (const prop of expr.properties) {
          this.assertPropertySafe(prop.key);
          obj[prop.key] = this.evaluateExpression(prop.value, scope);
        }
        return obj;
      }

      case 'MemberExpression': {
        const obj = this.evaluateExpression(expr.object, scope);
        const prop = expr.computed
          ? this.evaluateExpression(expr.property as ExpressionNode, scope)
          : expr.property;
        this.assertPropertySafe(prop);
        if (obj === null || obj === undefined) {
          throw new TypeError(`Action Engine Error: Cannot read properties of ${obj} (reading '${prop}')`);
        }
        return (obj as Record<string, unknown>)[String(prop)];
      }

      case 'CallExpression': {
        let calleeObj: unknown = null;
        let fn: unknown;
        let methodName = '';

        if (expr.callee.type === 'MemberExpression') {
          calleeObj = this.evaluateExpression(expr.callee.object, scope);
          const prop = expr.callee.computed
            ? this.evaluateExpression(expr.callee.property as ExpressionNode, scope)
            : expr.callee.property;
          this.assertPropertySafe(prop);
          methodName = String(prop);

          if (calleeObj === null || calleeObj === undefined) {
            throw new TypeError(`Action Engine Error: Cannot read property '${prop}' of ${calleeObj}`);
          }
          fn = (calleeObj as Record<string, unknown>)[methodName];
        } else {
          fn = this.evaluateExpression(expr.callee, scope);
        }

        if (typeof fn !== 'function') {
          const calleeName = expr.callee.type === 'Identifier' ? expr.callee.name : methodName;
          throw new TypeError(`Action Engine Error: "${calleeName}" is not a function`);
        }

        this.assertMethodCallSafe(calleeObj, methodName);

        const args = expr.arguments.map(arg => this.evaluateExpression(arg, scope));
        return (fn as Function).apply(calleeObj, args);
      }

      default:
        const unhandledExpr: never = expr as never;
        throw new Error(`Action Engine Error: Unsupported expression type "${(unhandledExpr as ExpressionNode).type}"`);
    }
  }

  private assertPropertySafe(prop: unknown): void {
    if (FORBIDDEN_PROPERTIES.has(String(prop))) {
      throw new Error(`Security Error: Access to forbidden property "${prop}" is blocked`);
    }
  }

  private assertMethodCallSafe(calleeObj: unknown, methodName: string): void {
    if (calleeObj === this.api || calleeObj === this.api.utils || calleeObj === this.api.dialog) {
      return;
    }
    if (calleeObj === JSON || calleeObj === this.safeJson || calleeObj === Math || calleeObj === this.safeMath) {
      return;
    }
    const SAFE_STRING_METHODS = new Set([
      'toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd',
      'slice', 'substring', 'split', 'replace', 'replaceAll',
      'includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf',
      'charAt', 'charCodeAt', 'concat', 'repeat', 'padStart', 'padEnd'
    ]);
    const SAFE_ARRAY_METHODS = new Set([
      'join', 'map', 'filter', 'slice', 'includes', 'indexOf',
      'forEach', 'find', 'findIndex', 'reduce', 'some', 'every',
      'reverse', 'flat'
    ]);
    const SAFE_NUMBER_METHODS = new Set(['toFixed', 'toString']);

    if (typeof calleeObj === 'string' && SAFE_STRING_METHODS.has(methodName)) return;
    if (Array.isArray(calleeObj) && SAFE_ARRAY_METHODS.has(methodName)) return;
    if (typeof calleeObj === 'number' && SAFE_NUMBER_METHODS.has(methodName)) return;

    throw new Error(`Action Engine Error: Method call "${methodName}" on object is not permitted`);
  }
}
