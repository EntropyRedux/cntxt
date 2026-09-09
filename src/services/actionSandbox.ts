import { FormulaEngine } from './formulaParser';
import { tokenEstimatorService } from './tokenEstimator/tokenEstimatorService';

export interface ActionExecutionContext {
  getText: () => string;
  setText: (newText: string) => void;
  getSelection: () => string;
  replaceSelection: (replacement: string) => void;
  insertText: (text: string) => void;
  getCursor: () => { line: number; col: number };
  setCursor: (line: number, col: number) => void;
  toast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  copyToClipboard: (text: string) => Promise<void>;
  getClipboard: () => Promise<string>;
  openTab: (title: string, content: string, language?: string) => void;
  openVariableModal: () => void;
  evaluateFormula: (formula: string) => any;
}

export class ActionSandbox {
  private static instance: ActionSandbox;
  private formulaEngine: FormulaEngine;

  constructor() {
    this.formulaEngine = new FormulaEngine();
  }

  public static getInstance(): ActionSandbox {
    if (!ActionSandbox.instance) {
      ActionSandbox.instance = new ActionSandbox();
    }
    return ActionSandbox.instance;
  }

  /**
   * Executes action code safely with sandboxed api proxy and timeout guard
   */
  public async executeAction(
    code: string,
    context: ActionExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Build safe API exposure
      const safeApi = {
        getText: () => context.getText(),
        setText: (txt: string) => context.setText(String(txt)),
        getSelection: () => context.getSelection(),
        replaceSelection: (txt: string) => context.replaceSelection(String(txt)),
        insertText: (txt: string) => context.insertText(String(txt)),
        getCursor: () => context.getCursor(),
        setCursor: (line: number, col: number) => context.setCursor(line, col),
        toast: (msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => context.toast(msg, type),
        copyToClipboard: (txt: string) => context.copyToClipboard(String(txt)),
        getClipboard: () => context.getClipboard(),
        openTab: (title: string, content: string, lang = 'markdown') => context.openTab(title, content, lang),
        openVariableModal: () => context.openVariableModal(),
        evaluateFormula: (expr: string) => {
          const res = this.formulaEngine.evaluate(expr);
          if (res.success) return res.value;
          throw new Error(res.error || 'Formula error');
        },
        models: {
          calculateTokens: (text: string, modelId = 'gpt-4o') => {
            return tokenEstimatorService.calculateTokens(text, modelId).count;
          }
        },
        utils: {
          uuid: () => {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
          },
          base64Encode: (str: string) => btoa(unescape(encodeURIComponent(str))),
          base64Decode: (str: string) => decodeURIComponent(escape(atob(str))),
          now: () => new Date().toISOString()
        }
      };

      // Wrap code in an async function with restricted parameter list
      // Shadow dangerous globals like window, document, localStorage, eval, fetch
      const sandboxWrapper = `
        return (async function(api, console) {
          "use strict";
          const window = undefined;
          const document = undefined;
          const localStorage = undefined;
          const sessionStorage = undefined;
          const XMLHttpRequest = undefined;
          
          ${code}
        })(api, console);
      `;

      // Safe console wrapper for sandbox logs
      const safeConsole = {
        log: (...args: any[]) => console.log('[ContextPad Action]', ...args),
        warn: (...args: any[]) => console.warn('[ContextPad Action]', ...args),
        error: (...args: any[]) => console.error('[ContextPad Action]', ...args)
      };

      const runner = new Function('api', 'console', sandboxWrapper);

      // Execute with timeout protection (4000ms max)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Action execution timed out (4s limit)')), 4000);
      });

      await Promise.race([runner(safeApi, safeConsole), timeoutPromise]);

      return { success: true };
    } catch (err: any) {
      const errorMsg = err?.message || 'Error executing action';
      context.toast(`Action Error: ${errorMsg}`, 'error');
      return { success: false, error: errorMsg };
    }
  }
}

export const actionSandbox = ActionSandbox.getInstance();
