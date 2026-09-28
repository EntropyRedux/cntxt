/**
 * ACTION WORKER REALM (src/services/actionWorker.ts)
 * 
 * Standalone Dedicated Web Worker executing user actions in an isolated thread.
 * Zero access to main DOM window, CodeMirror editor instance, or Tauri IPC bindings.
 */

import { FormulaEngine } from './formulaParser';
import {
  createSandboxAPI,
  ActionSnapshot,
  ActionMutation,
  WorkerInMessage,
  WorkerOutMessage
} from './sandboxApiFactory';

// L-01: Strict worker scope verification
type WorkerGlobalScopeConstructor = new () => unknown;
const workerScope = (globalThis as unknown as { DedicatedWorkerGlobalScope?: WorkerGlobalScopeConstructor })
  .DedicatedWorkerGlobalScope;
const isDedicatedWorker =
  typeof workerScope !== 'undefined' && typeof self !== 'undefined' && self instanceof workerScope;

if (isDedicatedWorker) {
  // Strip ambient capabilities from worker global scope
  try {
    const g = self as unknown as Record<string, unknown>;
    g.fetch = undefined;
    g.XMLHttpRequest = undefined;
    g.WebSocket = undefined;
    g.importScripts = undefined;
    g.indexedDB = undefined; // platform-leak-ignore: neutralizing ambient worker global
  } catch {
    // Non-configurable in certain environments
  }

  // Freeze prototypes in the worker realm to protect against prototype climbing/tampering
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Function.prototype);
    Object.freeze(Array.prototype);
  } catch {
    // Ignore if already frozen or restricted
  }

  self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
    const data = event.data;
    if (data.type !== 'EXECUTE') return;

    const { code, snapshot } = data;
    const currentSnapshot: ActionSnapshot = { ...snapshot };
    const journal: ActionMutation[] = [];

    const safeConsole = Object.freeze({
      log: (...args: unknown[]) => console.log('[CNTXT Action Worker]', ...args),
      warn: (...args: unknown[]) => console.warn('[CNTXT Action Worker]', ...args),
      error: (...args: unknown[]) => console.error('[CNTXT Action Worker]', ...args)
    });

    const safeApi = createSandboxAPI({
      getSnapshot: () => currentSnapshot,
      applyMutation: (mutation: ActionMutation) => {
        journal.push(mutation);
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
      requestDialogPrompt: async (title: string, defaultValue = ''): Promise<string | null> => {
        return new Promise((resolve) => {
          // L-02: Cryptographic UUID for dialog correlation
          const reqId = `dlg_${crypto.randomUUID()}`;
          const responseHandler = (e: MessageEvent<WorkerInMessage>) => {
            if (e.data?.type === 'DIALOG_RESPONSE' && e.data.reqId === reqId) {
              self.removeEventListener('message', responseHandler);
              resolve(typeof e.data.value === 'string' ? e.data.value : null);
            }
          };
          self.addEventListener('message', responseHandler);
          const outMsg: WorkerOutMessage = {
            type: 'DIALOG_PROMPT',
            reqId,
            title,
            defaultValue
          };
          self.postMessage(outMsg);
        });
      },
      requestDialogConfirm: async (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
          // L-02: Cryptographic UUID for dialog correlation
          const reqId = `dlg_${crypto.randomUUID()}`;
          const responseHandler = (e: MessageEvent<WorkerInMessage>) => {
            if (e.data?.type === 'DIALOG_RESPONSE' && e.data.reqId === reqId) {
              self.removeEventListener('message', responseHandler);
              resolve(Boolean(e.data.value));
            }
          };
          self.addEventListener('message', responseHandler);
          const outMsg: WorkerOutMessage = {
            type: 'DIALOG_CONFIRM',
            reqId,
            title,
            message
          };
          self.postMessage(outMsg);
        });
      },
      evaluateFormula: (formula: string): unknown => {
        const formulaEngine = new FormulaEngine({
          lineCount: currentSnapshot.lineCount,
          charCount: currentSnapshot.characterCount,
          wordCount: currentSnapshot.wordCount,
          selectedText: currentSnapshot.selection
        });
        const res = formulaEngine.evaluate(formula);
        return res.success ? res.value : null;
      }
    });

    try {
      // Option A: Script compilation in worker realm
      const runner = new Function(
        'api',
        'console',
        `"use strict"; return (async function() { ${code} })();`
      );

      await runner(safeApi, safeConsole);

      const successMsg: WorkerOutMessage = {
        type: 'SUCCESS',
        journal
      };
      self.postMessage(successMsg);
    } catch (err: unknown) {
      const errorMsg: WorkerOutMessage = {
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err)
      };
      self.postMessage(errorMsg);
    }
  };
}
