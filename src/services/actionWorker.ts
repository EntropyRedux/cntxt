/**
 * ACTION WORKER REALM (src/services/actionWorker.ts)
 * 
 * Standalone Dedicated Web Worker executing user actions in an isolated thread.
 * Zero access to main DOM window, CodeMirror editor instance, or Tauri IPC bindings.
 */

import { FormulaEngine } from './formulaParser';
import { ActionEngine } from './actionEngine';
import {
  createSandboxAPI,
  ActionSnapshot,
  ActionMutation,
  WorkerInMessage,
  WorkerOutMessage,
  validateActionSyntax
} from './sandboxApiFactory';

// L-01: Strict worker scope verification
type WorkerGlobalScopeConstructor = new () => unknown;
const workerScope = (globalThis as unknown as { DedicatedWorkerGlobalScope?: WorkerGlobalScopeConstructor })
  .DedicatedWorkerGlobalScope;
const isDedicatedWorker =
  typeof workerScope !== 'undefined' && typeof self !== 'undefined' && self instanceof workerScope;

if (isDedicatedWorker) {
  // Capture native postMessage and event listener bindings for internal worker communication only
  const nativePostMessage = self.postMessage.bind(self);
  const nativeAddEventListener = self.addEventListener.bind(self);
  const nativeRemoveEventListener = self.removeEventListener.bind(self);

  // C-02: Comprehensive ambient capability neutralization
  const BLOCKED_WORKER_GLOBALS = [
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'Worker',
    'SharedWorker',
    'BroadcastChannel',
    'importScripts',
    'indexedDB', // platform-leak-ignore: neutralizing ambient worker global
    'caches',
    'openDatabase',
    'postMessage',
    'addEventListener',
    'removeEventListener',
    'location'
  ] as const;

  const targetScopes: Record<string, unknown>[] = [
    self as unknown as Record<string, unknown>,
    globalThis as unknown as Record<string, unknown>
  ];

  for (const scope of targetScopes) {
    for (const key of BLOCKED_WORKER_GLOBALS) {
      try {
        Object.defineProperty(scope, key, {
          value: undefined,
          writable: false,
          configurable: false
        });
      } catch {
        // Fallback for non-configurable browser properties
        try {
          (scope as Record<string, unknown>)[key] = undefined;
        } catch {
          // Ignore
        }
      }
    }
  }

  nativeAddEventListener('message', async (e: MessageEvent<WorkerInMessage>) => {
    const data = e.data;
    if (!data || data.type !== 'EXECUTE') return;

    const { code, snapshot } = data;
    try {
      validateActionSyntax(code);
    } catch (err: unknown) {
      const errorMsg: WorkerOutMessage = {
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err)
      };
      nativePostMessage(errorMsg);
      return;
    }

    const currentSnapshot: ActionSnapshot = { ...snapshot };
    const journal: ActionMutation[] = [];

    const safeApi = createSandboxAPI({
      getSnapshot: () => currentSnapshot,
      applyMutation: (mutation: ActionMutation) => {
        journal.push(mutation);
      },
      requestDialogPrompt: async (title: string, defaultValue = ''): Promise<string | null> => {
        return new Promise((resolve) => {
          const reqId = `dlg_${crypto.randomUUID()}`;
          const responseHandler = (e: Event) => {
            const ev = e as MessageEvent<WorkerInMessage>;
            if (ev.data?.type === 'DIALOG_RESPONSE' && ev.data.reqId === reqId) {
              nativeRemoveEventListener('message', responseHandler);
              resolve(typeof ev.data.value === 'string' ? ev.data.value : null);
            }
          };
          nativeAddEventListener('message', responseHandler);
          const outMsg: WorkerOutMessage = {
            type: 'DIALOG_PROMPT',
            reqId,
            title,
            defaultValue
          };
          nativePostMessage(outMsg);
        });
      },
      requestDialogConfirm: async (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const reqId = `dlg_${crypto.randomUUID()}`;
          const responseHandler = (e: Event) => {
            const ev = e as MessageEvent<WorkerInMessage>;
            if (ev.data?.type === 'DIALOG_RESPONSE' && ev.data.reqId === reqId) {
              nativeRemoveEventListener('message', responseHandler);
              resolve(Boolean(ev.data.value));
            }
          };
          nativeAddEventListener('message', responseHandler);
          const outMsg: WorkerOutMessage = {
            type: 'DIALOG_CONFIRM',
            reqId,
            title,
            message
          };
          nativePostMessage(outMsg);
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
      const { journal: execJournal, result: execResult } = await ActionEngine.executeCode(code, currentSnapshot, safeApi);
      for (const m of execJournal) {
        journal.push(m);
      }

      const successMsg: WorkerOutMessage = {
        type: 'SUCCESS',
        journal,
        result: execResult
      };
      nativePostMessage(successMsg);
    } catch (err: unknown) {
      const errorMsg: WorkerOutMessage = {
        type: 'ERROR',
        error: err instanceof Error ? err.message : String(err)
      };
      nativePostMessage(errorMsg);
    }
  });
}
