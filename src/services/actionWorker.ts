import { FormulaEngine } from './formulaParser';
import { SandboxAPI } from '../types';

export interface ActionScopeSnapshot {
  content: string;
  selection: string;
  tabTitle: string;
  cursor: { line: number; col: number };
  clipboardText: string;
}

export type ActionMutation =
  | { type: 'setContent'; value: string }
  | { type: 'replaceSelection'; value: string }
  | { type: 'wrapSelection'; prefix: string; suffix: string }
  | { type: 'insertAtCursor'; value: string }
  | { type: 'setCursor'; line: number; col: number }
  | { type: 'setTabTitle'; value: string }
  | { type: 'notify'; message: string; level: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'openTab'; title: string; content: string; language?: string }
  | { type: 'openVariableModal' }
  | { type: 'copyToClipboard'; value: string };

export interface WorkerInMessage {
  type: 'EXECUTE';
  code: string;
  snapshot: ActionScopeSnapshot;
  reqId: string;
}

export interface WorkerOutSuccessMessage {
  type: 'SUCCESS';
  reqId: string;
  result: unknown;
  journal: ActionMutation[];
}

export interface WorkerOutErrorMessage {
  type: 'ERROR';
  reqId: string;
  error: string;
}

// In dedicated worker scope
if (typeof self !== 'undefined' && typeof (self as any).postMessage === 'function') {
  self.onmessage = async (event: MessageEvent<WorkerInMessage | { type: 'DIALOG_RESPONSE'; reqId: string; value: any }>) => {
    const data = event.data;
    if (data.type !== 'EXECUTE') return;

    const { code, snapshot, reqId } = data;
    const currentSnapshot: ActionScopeSnapshot = { ...snapshot };
    const journal: ActionMutation[] = [];

    const safeConsole = Object.freeze({
      log: (...args: unknown[]) => console.log('[CNTXT Action Worker]', ...args),
      warn: (...args: unknown[]) => console.warn('[CNTXT Action Worker]', ...args),
      error: (...args: unknown[]) => console.error('[CNTXT Action Worker]', ...args)
    });

    const safeApi: SandboxAPI = {
      getText: () => currentSnapshot.content,
      getContent: () => currentSnapshot.content,
      setText: (newText: string) => {
        currentSnapshot.content = newText;
        journal.push({ type: 'setContent', value: newText });
      },
      setContent: (newText: string) => {
        currentSnapshot.content = newText;
        journal.push({ type: 'setContent', value: newText });
      },
      getSelection: () => currentSnapshot.selection,
      replaceSelection: (replacement: string) => {
        currentSnapshot.selection = '';
        journal.push({ type: 'replaceSelection', value: replacement });
      },
      wrapSelection: (prefix: string, suffix?: string) => {
        const s = suffix ?? prefix;
        currentSnapshot.selection = `${prefix}${currentSnapshot.selection}${s}`;
        journal.push({ type: 'wrapSelection', prefix, suffix: s });
      },
      insertText: (text: string) => {
        journal.push({ type: 'insertAtCursor', value: text });
      },
      insertAtCursor: (text: string) => {
        journal.push({ type: 'insertAtCursor', value: text });
      },
      getCursor: () => currentSnapshot.cursor,
      setCursor: (line: number, col: number) => {
        currentSnapshot.cursor = { line, col };
        journal.push({ type: 'setCursor', line, col });
      },
      getTabTitle: () => currentSnapshot.tabTitle,
      setTabTitle: (title: string) => {
        currentSnapshot.tabTitle = title;
        journal.push({ type: 'setTabTitle', value: title });
      },
      toast: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        journal.push({ type: 'notify', message, level: type });
      },
      notify: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        journal.push({ type: 'notify', message, level: type });
      },
      openTab: (title: string, content: string, language?: string) => {
        journal.push({ type: 'openTab', title, content, language });
      },
      createTab: (title: string, content: string, language?: string) => {
        journal.push({ type: 'openTab', title, content, language });
      },
      openVariableModal: () => {
        journal.push({ type: 'openVariableModal' });
      },
      evaluateFormula: (formula: string): any => {
        const formulaEngine = new FormulaEngine({
          lineCount: currentSnapshot.content.split('\n').length,
          charCount: currentSnapshot.content.length,
          wordCount: (currentSnapshot.content.trim().match(/\S+/g) || []).length,
          selectedText: currentSnapshot.selection
        });
        const res = formulaEngine.evaluate(formula);
        return res.success ? res.value : null;
      },
      copyToClipboard: async (text: string): Promise<void> => {
        currentSnapshot.clipboardText = text;
        journal.push({ type: 'copyToClipboard', value: text });
      },
      copy: async (text: string): Promise<void> => {
        currentSnapshot.clipboardText = text;
        journal.push({ type: 'copyToClipboard', value: text });
      },
      getClipboard: async (): Promise<string> => {
        return currentSnapshot.clipboardText;
      },
      dialog: {
        prompt: async (message: string, defaultValue = ''): Promise<string | null> => {
          return new Promise((resolve) => {
            const dialogId = `dlg_${Math.random().toString(36).slice(2)}`;
            const responseHandler = (e: MessageEvent) => {
              if (e.data?.type === 'DIALOG_RESPONSE' && e.data?.dialogId === dialogId) {
                self.removeEventListener('message', responseHandler);
                resolve(e.data.value ?? null);
              }
            };
            self.addEventListener('message', responseHandler);
            (self as any).postMessage({ type: 'DIALOG_PROMPT', reqId, dialogId, message, defaultValue });
          });
        },
        confirm: async (message: string): Promise<boolean> => {
          return new Promise((resolve) => {
            const dialogId = `dlg_${Math.random().toString(36).slice(2)}`;
            const responseHandler = (e: MessageEvent) => {
              if (e.data?.type === 'DIALOG_RESPONSE' && e.data?.dialogId === dialogId) {
                self.removeEventListener('message', responseHandler);
                resolve(Boolean(e.data.value));
              }
            };
            self.addEventListener('message', responseHandler);
            (self as any).postMessage({ type: 'DIALOG_CONFIRM', reqId, dialogId, message });
          });
        }
      },
      utils: {
        base64Encode: (str: string): string => {
          const bytes = new TextEncoder().encode(str);
          let binString = '';
          for (let i = 0; i < bytes.length; i++) {
            binString += String.fromCharCode(bytes[i]);
          }
          return btoa(binString);
        },
        base64Decode: (str: string): string => {
          const binString = atob(str);
          const bytes = new Uint8Array(binString.length);
          for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
          }
          return new TextDecoder().decode(bytes);
        },
        formatJSON: (jsonStr: string): string => {
          try {
            return JSON.stringify(JSON.parse(jsonStr), null, 2);
          } catch {
            return jsonStr;
          }
        },
        slugify: (str: string): string => str
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        countWords: (str: string): number => str.trim() ? str.trim().split(/\s+/).length : 0,
        countChars: (str: string): number => str.length,
        now: (): string => new Date().toISOString()
      }
    };

    try {
      const runner = new Function(
        'api',
        'console',
        `"use strict"; return (async function() { ${code} })();`
      );

      const result = await runner(safeApi, safeConsole);
      (self as any).postMessage({
        type: 'SUCCESS',
        reqId,
        result,
        journal
      });
    } catch (err: unknown) {
      (self as any).postMessage({
        type: 'ERROR',
        reqId,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };
}
