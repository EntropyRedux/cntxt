import { EditorContext, FormulaResult } from '../types';

export class FormulaEngine {
  private static globalFunctions = new Map<string, (args: unknown[], context: EditorContext) => unknown>();
  private instanceFunctions = new Map<string, (args: unknown[], context: EditorContext) => unknown>();
  private context: EditorContext;

  constructor(context?: Partial<EditorContext>) {
    this.context = {
      line: context?.line ?? 1,
      column: context?.column ?? 1,
      lineCount: context?.lineCount ?? 1,
      charCount: context?.charCount ?? 0,
      wordCount: context?.wordCount ?? 0,
      selectedText: context?.selectedText ?? '',
      getLine: context?.getLine ?? (() => ''),
      getRange: context?.getRange ?? (() => '')
    };
  }

  /**
   * Register a custom formula function globally across all FormulaEngine instances.
   */
  public static registerFunction(
    name: string,
    fn: (args: unknown[], context: EditorContext) => unknown,
    info?: Partial<FormulaFunctionInfo>
  ): void {
    const upper = name.toUpperCase();
    FormulaEngine.globalFunctions.set(upper, fn);
    if (info) {
      const existingIdx = FORMULA_FUNCTIONS.findIndex(f => f.name === upper);
      const fullInfo: FormulaFunctionInfo = {
        name: upper,
        description: info.description || `Custom formula function ${upper}`,
        example: info.example || `${upper}()`,
        category: info.category || 'Custom'
      };
      if (existingIdx >= 0) {
        FORMULA_FUNCTIONS[existingIdx] = fullInfo;
      } else {
        FORMULA_FUNCTIONS.push(fullInfo);
      }
    }
  }

  /**
   * Unregister a globally registered custom formula function.
   */
  public static unregisterFunction(name: string): boolean {
    const upper = name.toUpperCase();
    const deleted = FormulaEngine.globalFunctions.delete(upper);
    const idx = FORMULA_FUNCTIONS.findIndex(f => f.name === upper);
    if (idx >= 0) FORMULA_FUNCTIONS.splice(idx, 1);
    return deleted;
  }

  /**
   * Register a custom formula function specifically for this FormulaEngine instance.
   */
  public registerFunction(name: string, fn: (args: unknown[], context: EditorContext) => unknown): void {
    this.instanceFunctions.set(name.toUpperCase(), fn);
  }

  public updateContext(context: Partial<EditorContext>) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Evaluates an inline expression such as UPPER("hello") or {=TODAY()}
   */
  public evaluate(rawExpr: string): FormulaResult {
    try {
      let expr = rawExpr.trim();
      // Remove enclosing {= ... }, {!= ...}, {=! ... } if present
      if (expr.startsWith('{!=') && expr.endsWith('}')) {
        expr = expr.slice(3, -1).trim();
      } else if (expr.startsWith('{=!') && expr.endsWith('}')) {
        expr = expr.slice(3, -1).trim();
      } else if (expr.startsWith('{=') && expr.endsWith('}')) {
        expr = expr.slice(2, -1).trim();
      } else if (expr.startsWith('!=')) {
        expr = expr.slice(2).trim();
      } else if (expr.startsWith('=')) {
        expr = expr.slice(1).trim();
      }

      if (!expr) {
        return { success: true, value: '' };
      }

      const ast = this.parse(expr);
      const val = this.evaluateAST(ast);
      return { success: true, value: typeof val === 'number' ? val : String(val ?? '') };
    } catch (err: unknown) {
      return { success: false, error: (err as Error)?.message || 'Formula syntax error' };
    }
  }

  /**
   * Replaces all inline {=FORMULA()} instances in a text document
   */
  public replaceInlineFormulas(text: string): string {
    const regex = /\{=([^{}]+)\}/g;
    return text.replace(regex, (_, expr) => {
      const res = this.evaluate(expr);
      return res.success && res.value !== undefined ? String(res.value) : `{=${expr}}`;
    });
  }

  // --- Lexer & Recursive Descent Parser ---

  private parse(input: string): ASTNode {
    const tokens = this.tokenize(input);
    let current = 0;

    const peek = () => tokens[current];
    const consume = () => tokens[current++];
    const expect = (type: TokenType, val?: string) => {
      const tok = peek();
      if (!tok || tok.type !== type || (val !== undefined && tok.value !== val)) {
        throw new Error(`Expected ${val || type}, got ${tok ? tok.value : 'EOF'}`);
      }
      return consume();
    };

    // Expression parser (supports +, -, *, / and function calls)
    const parseExpression = (): ASTNode => {
      return parseAdditive();
    };

    const parseAdditive = (): ASTNode => {
      let left = parseMultiplicative();
      while (peek() && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value;
        const right = parseMultiplicative();
        left = { type: 'BinaryOp', op, left, right };
      }
      return left;
    };

    const parseMultiplicative = (): ASTNode => {
      let left = parsePrimary();
      while (peek() && (peek().value === '*' || peek().value === '/' || peek().value === '%')) {
        const op = consume().value;
        const right = parsePrimary();
        left = { type: 'BinaryOp', op, left, right };
      }
      return left;
    };

    const parsePrimary = (): ASTNode => {
      const tok = peek();
      if (!tok) throw new Error('Unexpected end of formula');

      if (tok.type === 'Number') {
        consume();
        return { type: 'Literal', value: Number(tok.value) };
      }

      if (tok.type === 'String') {
        consume();
        return { type: 'Literal', value: tok.value };
      }

      if (tok.type === 'Identifier') {
        const name = consume().value;
        if (peek() && peek().type === 'Paren' && peek().value === '(') {
          // Function Call
          consume(); // '('
          const args: ASTNode[] = [];
          if (!peek() || peek().value !== ')') {
            while (true) {
              args.push(parseExpression());
              if (peek() && peek().value === ',') {
                consume();
              } else {
                break;
              }
            }
          }
          expect('Paren', ')');
          return { type: 'Call', name: name.toUpperCase(), args };
        } else {
          // Constant / Keyword (like TRUE, FALSE, PI, SELECTION, LINECOUNT, etc.)
          const upper = name.toUpperCase();
          if (upper === 'TRUE') return { type: 'Literal', value: true };
          if (upper === 'FALSE') return { type: 'Literal', value: false };
          if (upper === 'PI') return { type: 'Literal', value: Math.PI };
          if (upper === 'SELECTION' || upper === 'SELECTED') return { type: 'Literal', value: this.context.selectedText || '' };
          if (upper === 'LINE') return { type: 'Literal', value: this.context.line };
          if (upper === 'COL' || upper === 'COLUMN') return { type: 'Literal', value: this.context.column };
          if (upper === 'LINES' || upper === 'LINECOUNT') return { type: 'Literal', value: this.context.lineCount };
          if (upper === 'CHARS' || upper === 'CHARCOUNT') return { type: 'Literal', value: this.context.charCount };
          if (upper === 'WORDS' || upper === 'WORDCOUNT') return { type: 'Literal', value: this.context.wordCount };
          return { type: 'Literal', value: name };
        }
      }

      if (tok.type === 'Paren' && tok.value === '(') {
        consume();
        const expr = parseExpression();
        expect('Paren', ')');
        return expr;
      }

      throw new Error(`Unexpected token '${tok.value}'`);
    };

    return parseExpression();
  }

  private tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
      const char = input[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (char === '(' || char === ')' || char === ',') {
        tokens.push({ type: char === ',' ? 'Comma' : 'Paren', value: char });
        i++;
        continue;
      }

      if (['+', '-', '*', '/', '%'].includes(char)) {
        tokens.push({ type: 'Operator', value: char });
        i++;
        continue;
      }

      // String literal with quotes "..." or '...'
      if (char === '"' || char === "'") {
        const quote = char;
        let str = '';
        i++;
        while (i < input.length && input[i] !== quote) {
          if (input[i] === '\\' && i + 1 < input.length) {
            i++;
            str += input[i];
          } else {
            str += input[i];
          }
          i++;
        }
        if (i < input.length) i++; // consume closing quote
        tokens.push({ type: 'String', value: str });
        continue;
      }

      // Numbers (e.g. 123, 45.67)
      if (/\d/.test(char) || (char === '.' && i + 1 < input.length && /\d/.test(input[i + 1]))) {
        let numStr = '';
        while (i < input.length && (/[\d.]/.test(input[i]))) {
          numStr += input[i];
          i++;
        }
        tokens.push({ type: 'Number', value: numStr });
        continue;
      }

      // Identifiers / Function names
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
          ident += input[i];
          i++;
        }
        tokens.push({ type: 'Identifier', value: ident });
        continue;
      }

      // Unknown character fallback
      tokens.push({ type: 'Operator', value: char });
      i++;
    }

    return tokens;
  }

  // --- AST Evaluator ---

  private evaluateAST(node: ASTNode): unknown {
    if (!node) return '';

    if (node.type === 'Literal') {
      return node.value;
    }

    if (node.type === 'BinaryOp') {
      const left = this.evaluateAST(node.left);
      const right = this.evaluateAST(node.right);

      if (node.op === '+') {
        if (typeof left === 'number' && typeof right === 'number') {
          return left + right;
        }
        return String(left) + String(right);
      }
      if (node.op === '-') return Number(left) - Number(right);
      if (node.op === '*') return Number(left) * Number(right);
      if (node.op === '/') return Number(right) === 0 ? '#DIV/0!' : Number(left) / Number(right);
      if (node.op === '%') return Number(left) % Number(right);
    }

    if (node.type === 'Call') {
      const fn = node.name;
      const args = (node.args || []).map(arg => this.evaluateAST(arg));
      return this.executeFunction(fn, args);
    }

    return '';
  }

  private executeFunction(name: string, args: unknown[]): unknown {
    const upper = name.toUpperCase();

    // Check custom registered instance & global functions first
    if (this.instanceFunctions.has(upper)) {
      return this.instanceFunctions.get(upper)!(args, this.context);
    }
    if (FormulaEngine.globalFunctions.has(upper)) {
      return FormulaEngine.globalFunctions.get(upper)!(args, this.context);
    }

    const strArg = (idx: number, fallback = '') => args[idx] !== undefined ? String(args[idx]) : fallback;
    const textOrSelectArg = (idx: number, fallback = '') => {
      if (args[idx] !== undefined && args[idx] !== '') return String(args[idx]);
      return this.context.selectedText || fallback;
    };
    const numArg = (idx: number, fallback = 0) => {
      const val = Number(args[idx]);
      return isNaN(val) ? fallback : val;
    };

    switch (upper) {
      // --- Explicit Action Flow Directives ---
      case 'INSERT':
        return args[0] !== undefined ? args[0] : '';
      case 'REPLACE_SELECTION':
        return args[0] !== undefined ? args[0] : '';

      // --- Date & Time ---
      case 'TODAY': {
        const d = new Date();
        return d.toISOString().split('T')[0];
      }
      case 'NOW': {
        const d = new Date();
        return d.toISOString().replace('T', ' ').substring(0, 19);
      }
      case 'TIME': {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      case 'UUID': {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }
      case 'TIMESTAMP': {
        return Date.now();
      }
      case 'DATE_ADD': {
        const days = numArg(0, 1);
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      }

      // --- Text Case & Transforms ---
      case 'UPPER':
        return textOrSelectArg(0).toUpperCase();
      case 'LOWER':
        return textOrSelectArg(0).toLowerCase();
      case 'TITLE':
        return textOrSelectArg(0).replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
      case 'TRIM':
        return textOrSelectArg(0).trim();
      case 'REVERSE':
        return textOrSelectArg(0).split('').reverse().join('');
      case 'CAMEL': {
        const s = textOrSelectArg(0).replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
        return s.charAt(0).toLowerCase() + s.slice(1);
      }
      case 'PASCAL': {
        const s = textOrSelectArg(0).replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
        return s.charAt(0).toUpperCase() + s.slice(1);
      }
      case 'SNAKE':
        return textOrSelectArg(0).trim().toLowerCase().replace(/[\s\W-]+/g, '_');
      case 'KEBAB':
        return textOrSelectArg(0).trim().toLowerCase().replace(/[\s\W_]+/g, '-');
      case 'CONSTANT':
        return textOrSelectArg(0).trim().toUpperCase().replace(/[\s\W-]+/g, '_');

      // --- String & Substring ---
      case 'CONCAT':
        return args.map(a => String(a)).join('');
      case 'LEN':
        return textOrSelectArg(0).length;
      case 'SLUGIFY': {
        const target = textOrSelectArg(0);
        return target.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
      }
      case 'REPEAT':
        return textOrSelectArg(0).repeat(Math.max(0, numArg(1, 1)));
      case 'LEFT': {
        const str = textOrSelectArg(0);
        const len = numArg(1, str.length);
        return str.substring(0, len);
      }
      case 'RIGHT': {
        const str = textOrSelectArg(0);
        const len = numArg(1, str.length);
        return str.substring(Math.max(0, str.length - len));
      }
      case 'MID': {
        const str = textOrSelectArg(0);
        const start = Math.max(0, numArg(1, 1) - 1);
        const len = numArg(2, str.length);
        return str.substring(start, start + len);
      }
      case 'REPLACE': {
        const text = textOrSelectArg(0);
        const search = strArg(1);
        const replaceWith = strArg(2);
        return text.split(search).join(replaceWith);
      }
      case 'WRAP': {
        const str = textOrSelectArg(0);
        const left = strArg(1, '"');
        const right = strArg(2, left);
        return `${left}${str}${right}`;
      }
      case 'PREFIX': {
        if (args.length <= 1) {
          return `${strArg(0)}${this.context.selectedText || ''}`;
        }
        return `${strArg(0)}${strArg(1)}`;
      }
      case 'SUFFIX': {
        if (args.length <= 1) {
          return `${this.context.selectedText || ''}${strArg(0)}`;
        }
        return `${strArg(1)}${strArg(0)}`;
      }
      case 'PAD': {
        const str = textOrSelectArg(0);
        const targetLen = numArg(1, 10);
        const padChar = strArg(2, ' ').charAt(0) || ' ';
        return str.padEnd(targetLen, padChar);
      }

      // --- Markdown & Formatting ---
      case 'BOLD':
        return `**${textOrSelectArg(0)}**`;
      case 'ITALIC':
        return `*${textOrSelectArg(0)}*`;
      case 'STRIKE':
        return `~~${textOrSelectArg(0)}~~`;
      case 'CODE':
        return `\`${textOrSelectArg(0)}\``;
      case 'CODEBLOCK': {
        const lang = strArg(1, strArg(0, ''));
        const code = args.length > 1 ? textOrSelectArg(0) : (this.context.selectedText || strArg(1, ''));
        return `\`\`\`${lang}\n${code}\n\`\`\``;
      }
      case 'LINK': {
        const text = textOrSelectArg(0);
        const url = strArg(1, '#');
        return `[${text}](${url})`;
      }
      case 'IMAGE': {
        const alt = strArg(0, 'Image');
        const url = strArg(1, '#');
        return `![${alt}](${url})`;
      }
      case 'HEADING': {
        const lvl = numArg(1, numArg(0, 1));
        const text = args.length > 1 ? textOrSelectArg(0) : (this.context.selectedText || textOrSelectArg(1));
        return `${'#'.repeat(Math.min(6, Math.max(1, lvl)))} ${text}`;
      }
      case 'QUOTE':
        return `> ${textOrSelectArg(0)}`;

      // --- Wrap Helpers ---
      case 'PARENTHESES':
        return `(${textOrSelectArg(0)})`;
      case 'BRACKETS':
        return `[${textOrSelectArg(0)}]`;
      case 'BRACES':
        return `{${textOrSelectArg(0)}}`;
      case 'ANGLES':
        return `<${textOrSelectArg(0)}>`;
      case 'SINGLEQUOTE':
        return `'${textOrSelectArg(0)}'`;
      case 'DOUBLEQUOTE':
        return `"${textOrSelectArg(0)}"`;

      // --- List & Lines Operations ---
      case 'SORT': {
        const text = textOrSelectArg(0);
        const desc = strArg(1).toUpperCase() === 'DESC';
        const lines = text.split('\n').filter(l => l.length > 0);
        lines.sort((a, b) => desc ? b.localeCompare(a) : a.localeCompare(b));
        return lines.join('\n');
      }
      case 'SORTDESC': {
        const text = textOrSelectArg(0);
        const lines = text.split('\n').filter(l => l.length > 0);
        lines.sort((a, b) => b.localeCompare(a));
        return lines.join('\n');
      }
      case 'UNIQUE': {
        const text = textOrSelectArg(0);
        const lines = text.split('\n');
        return Array.from(new Set(lines)).join('\n');
      }
      case 'JOIN': {
        const sep = strArg(0);
        return args.slice(1).map(a => String(a)).join(sep);
      }
      case 'SPLIT': {
        const sep = strArg(0);
        const text = strArg(1);
        const index = numArg(2, 0);
        const parts = text.split(sep);
        return parts[index] !== undefined ? parts[index] : '';
      }
      case 'NUMBERLIST': {
        const text = textOrSelectArg(0);
        return text.split('\n').filter(l => l.trim().length > 0).map((l, idx) => `${idx + 1}. ${l}`).join('\n');
      }
      case 'BULLETLIST': {
        const text = textOrSelectArg(0);
        return text.split('\n').filter(l => l.trim().length > 0).map(l => `* ${l}`).join('\n');
      }
      case 'CHECKLIST': {
        const text = textOrSelectArg(0);
        return text.split('\n').filter(l => l.trim().length > 0).map(l => `- [ ] ${l}`).join('\n');
      }
      case 'INDENT': {
        const text = textOrSelectArg(0);
        const spaces = ' '.repeat(numArg(1, 2));
        return text.split('\n').map(l => l ? spaces + l : l).join('\n');
      }
      case 'UNINDENT': {
        const text = textOrSelectArg(0);
        const count = numArg(1, 2);
        return text.split('\n').map(l => l.replace(new RegExp(`^[ ]{1,${count}}`), '')).join('\n');
      }

      // --- DateTime Helpers ---
      case 'YEAR': {
        const d = args[0] ? new Date(args[0] as string | number) : new Date();
        return isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
      }
      case 'MONTH': {
        const d = args[0] ? new Date(args[0] as string | number) : new Date();
        return isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1;
      }
      case 'DAY': {
        const d = args[0] ? new Date(args[0] as string | number) : new Date();
        return isNaN(d.getTime()) ? new Date().getDate() : d.getDate();
      }

      // --- Encoding & Hashing ---
      case 'BASE64':
        try {
          return btoa(unescape(encodeURIComponent(strArg(0))));
        } catch (e) {
          throw new Error(`BASE64 encode failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      case 'BASE64D':
        try {
          return decodeURIComponent(escape(atob(strArg(0))));
        } catch (e) {
          throw new Error(`BASE64 decode failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      case 'URLENCODE':
        return encodeURIComponent(strArg(0));
      case 'URLDECODE':
        try {
          return decodeURIComponent(strArg(0));
        } catch (e) {
          throw new Error(`URL decode failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      case 'HTMLESCAPE':
        return strArg(0)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      case 'HTMLUNESCAPE':
        return strArg(0)
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");

      // --- Math & Aggregation ---
      case 'SUM': {
        const nums = args.flat().map(Number).filter(n => !isNaN(n));
        return nums.reduce((acc, curr) => acc + curr, 0);
      }
      case 'AVG':
      case 'AVERAGE': {
        const nums = args.flat().map(Number).filter(n => !isNaN(n));
        return nums.length ? nums.reduce((acc, curr) => acc + curr, 0) / nums.length : 0;
      }
      case 'MIN': {
        const nums = args.flat().map(Number).filter(n => !isNaN(n));
        return nums.length ? Math.min(...nums) : 0;
      }
      case 'MAX': {
        const nums = args.flat().map(Number).filter(n => !isNaN(n));
        return nums.length ? Math.max(...nums) : 0;
      }
      case 'COUNT':
        return args.flat().length;
      case 'ROUND': {
        const val = numArg(0, 0);
        const decimals = numArg(1, 0);
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
      }
      case 'FLOOR':
        return Math.floor(numArg(0, 0));
      case 'CEIL':
        return Math.ceil(numArg(0, 0));
      case 'ABS':
        return Math.abs(numArg(0, 0));
      case 'RANDOM': {
        const min = numArg(0, 1);
        const max = numArg(1, 100);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      // --- Document Context ---
      case 'LINE':
        return this.context.line;
      case 'COL':
        return this.context.column;
      case 'LINES':
      case 'LINECOUNT':
        return this.context.lineCount;
      case 'CHARS':
      case 'CHARCOUNT':
        return this.context.charCount;
      case 'WORDS':
      case 'WORDCOUNT':
        return this.context.wordCount;
      case 'SELECTED':
      case 'SELECTION':
        return this.context.selectedText || '';
      case 'ACTION':
      case 'RUN': {
        const actId = strArg(0);
        return `[Action:${actId}]`;
      }
      case 'GETLINE':
        return this.context.getLine(numArg(0, 1));
      case 'GETRANGE':
        return this.context.getRange(numArg(0, 1), numArg(1, 1));

      // --- Prompt Helpers ---
      case 'XML_TAG': {
        const tag = strArg(0);
        const content = strArg(1);
        return `<${tag}>\n${content}\n</${tag}>`;
      }
      case 'SYSTEM_PROMPT': {
        const role = strArg(0, 'Assistant');
        const rules = strArg(1, '');
        return `<system_instruction>\n# Role\nYou are a ${role}.\n\n# Rules\n${rules}\n</system_instruction>`;
      }

      default:
        throw new Error(`Unknown formula function: ${name}`);
    }
  }
}

// Token & AST definitions
type TokenType = 'Number' | 'String' | 'Identifier' | 'Paren' | 'Comma' | 'Operator';

interface Token {
  type: TokenType;
  value: string;
}

type ASTNode =
  | { type: 'Literal'; value: unknown }
  | { type: 'BinaryOp'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'Call'; name: string; args: ASTNode[] };

export interface FormulaFunctionInfo {
  name: string;
  description: string;
  example: string;
  category: string;
}

export const FORMULA_FUNCTIONS: FormulaFunctionInfo[] = [
  // Text
  { name: 'UPPER', description: 'Convert text to uppercase', example: 'UPPER(selection)', category: 'Text' },
  { name: 'LOWER', description: 'Convert text to lowercase', example: 'LOWER(selection)', category: 'Text' },
  { name: 'TITLE', description: 'Convert to Title Case', example: 'TITLE(selection)', category: 'Text' },
  { name: 'TRIM', description: 'Strip leading & trailing whitespace', example: 'TRIM(selection)', category: 'Text' },
  { name: 'LEN', description: 'Character length of text', example: 'LEN(selection)', category: 'Text' },
  { name: 'SLUGIFY', description: 'Convert text to URL-friendly slug', example: 'SLUGIFY(selection)', category: 'Text' },
  { name: 'REVERSE', description: 'Reverse character string', example: 'REVERSE(selection)', category: 'Text' },
  { name: 'REPEAT', description: 'Repeat string N times', example: 'REPEAT(selection, 3)', category: 'Text' },

  // Markdown
  { name: 'BOLD', description: 'Wrap in bold (**text**)', example: 'BOLD(selection)', category: 'Markdown' },
  { name: 'ITALIC', description: 'Wrap in italic (*text*)', example: 'ITALIC(selection)', category: 'Markdown' },
  { name: 'STRIKE', description: 'Wrap in strikethrough (~~text~~)', example: 'STRIKE(selection)', category: 'Markdown' },
  { name: 'CODE', description: 'Wrap in inline code (`code`)', example: 'CODE(selection)', category: 'Markdown' },
  { name: 'CODEBLOCK', description: 'Wrap in fenced code block', example: 'CODEBLOCK(selection, "typescript")', category: 'Markdown' },
  { name: 'QUOTE', description: 'Wrap in blockquote (> text)', example: 'QUOTE(selection)', category: 'Markdown' },
  { name: 'HEADING', description: 'Format as markdown heading', example: 'HEADING(selection, 2)', category: 'Markdown' },
  { name: 'LINK', description: 'Create markdown link', example: 'LINK(selection, "https://")', category: 'Markdown' },
  { name: 'IMAGE', description: 'Create markdown image', example: 'IMAGE("Alt text", "https://")', category: 'Markdown' },

  // Wrap
  { name: 'PARENTHESES', description: 'Wrap in ()', example: 'PARENTHESES(selection)', category: 'Wrap' },
  { name: 'BRACKETS', description: 'Wrap in []', example: 'BRACKETS(selection)', category: 'Wrap' },
  { name: 'BRACES', description: 'Wrap in {}', example: 'BRACES(selection)', category: 'Wrap' },
  { name: 'ANGLES', description: 'Wrap in <>', example: 'ANGLES(selection)', category: 'Wrap' },
  { name: 'SINGLEQUOTE', description: "Wrap in ''", example: 'SINGLEQUOTE(selection)', category: 'Wrap' },
  { name: 'DOUBLEQUOTE', description: 'Wrap in ""', example: 'DOUBLEQUOTE(selection)', category: 'Wrap' },

  // Lines
  { name: 'SORT', description: 'Sort lines alphabetically A-Z', example: 'SORT(selection)', category: 'Lines' },
  { name: 'SORTDESC', description: 'Sort lines reverse Z-A', example: 'SORTDESC(selection)', category: 'Lines' },
  { name: 'UNIQUE', description: 'Remove duplicate lines', example: 'UNIQUE(selection)', category: 'Lines' },
  { name: 'NUMBERLIST', description: 'Convert lines to numbered list', example: 'NUMBERLIST(selection)', category: 'Lines' },
  { name: 'BULLETLIST', description: 'Convert lines to bulleted list', example: 'BULLETLIST(selection)', category: 'Lines' },
  { name: 'CHECKLIST', description: 'Convert lines to task checklist', example: 'CHECKLIST(selection)', category: 'Lines' },
  { name: 'INDENT', description: 'Indent lines by 2 spaces', example: 'INDENT(selection, 2)', category: 'Lines' },
  { name: 'UNINDENT', description: 'Outdent lines by 2 spaces', example: 'UNINDENT(selection, 2)', category: 'Lines' },

  // DateTime
  { name: 'NOW', description: 'Current timestamp string', example: 'NOW()', category: 'DateTime' },
  { name: 'TODAY', description: 'Current date YYYY-MM-DD', example: 'TODAY()', category: 'DateTime' },
  { name: 'YEAR', description: 'Current or date year', example: 'YEAR()', category: 'DateTime' },
  { name: 'MONTH', description: 'Current or date month', example: 'MONTH()', category: 'DateTime' },
  { name: 'DAY', description: 'Current or date day', example: 'DAY()', category: 'DateTime' },

  // Document Context
  { name: 'LINE', description: 'Active cursor line number', example: 'LINE()', category: 'Document' },
  { name: 'COL', description: 'Active cursor column number', example: 'COL()', category: 'Document' },
  { name: 'LINECOUNT', description: 'Total document lines', example: 'LINECOUNT()', category: 'Document' },
  { name: 'CHARCOUNT', description: 'Total document characters', example: 'CHARCOUNT()', category: 'Document' },
  { name: 'WORDCOUNT', description: 'Total document word count', example: 'WORDCOUNT()', category: 'Document' },
  { name: 'SELECTION', description: 'Current highlighted text', example: 'SELECTION()', category: 'Document' },

  // Prompt & AI
  { name: 'XML_TAG', description: 'Enclose text in XML tags', example: 'XML_TAG("user_query", selection)', category: 'Prompt' },
  { name: 'SYSTEM_PROMPT', description: 'Generate structured system prompt', example: 'SYSTEM_PROMPT("Coding Expert", "Be concise")', category: 'Prompt' },
  { name: 'UUID', description: 'Generate random UUID v4', example: 'UUID()', category: 'Utility' },
  { name: 'INSERT', description: 'Force result to insert next to text without replacing selection', example: 'INSERT(" [Length: " + LEN(selection) + "]")', category: 'Utility' },
  { name: 'REPLACE_SELECTION', description: 'Force result to explicitly replace active selection', example: 'REPLACE_SELECTION(TODAY())', category: 'Utility' }
];

export function getFormulaFunctionsByCategory(): Record<string, FormulaFunctionInfo[]> {
  const grouped: Record<string, FormulaFunctionInfo[]> = {};
  for (const fn of FORMULA_FUNCTIONS) {
    if (!grouped[fn.category]) {
      grouped[fn.category] = [];
    }
    grouped[fn.category].push(fn);
  }
  return grouped;
}

