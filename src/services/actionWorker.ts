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
  try {
    const proto1 = Object.getPrototypeOf(self);
    if (proto1) targetScopes.push(proto1);
    const proto2 = proto1 ? Object.getPrototypeOf(proto1) : null;
    if (proto2) targetScopes.push(proto2);
  } catch {
    // Non-configurable in certain environments
  }

  for (const target of targetScopes) {
    if (!target) continue;
    for (const key of BLOCKED_WORKER_GLOBALS) {
      try {
        Object.defineProperty(target, key, {
          value: undefined,
          writable: false,
          configurable: false
        });
      } catch {
        try {
          target[key] = undefined;
        } catch {
          // ignore
        }
      }
    }
  }

  // Freeze prototypes in the worker realm to protect against prototype climbing/tampering
  try {
    Object.freeze(Object.prototype);
    Object.freeze(Function.prototype);
    Object.freeze(Array.prototype);
  } catch {
    // Ignore if already frozen or restricted
  }

  nativeAddEventListener('message', async (event: Event) => {
    const msgEvent = event as MessageEvent<WorkerInMessage>;
    const data = msgEvent.data;
    if (!data || data.type !== 'EXECUTE') return;

    const { code, snapshot } = data;

    // C-02: Enforce syntax pre-scan inside worker realm before compilation
    try {
      validateActionSyntax(code);
    } catch (syntaxErr: unknown) {
      const errMessage = syntaxErr instanceof Error ? syntaxErr.message : String(syntaxErr);
      nativePostMessage({
        type: 'ERROR',
        error: errMessage
      } as WorkerOutMessage);
      return;
    }

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
          // L-02: Cryptographic UUID for dialog correlation
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
      // Lexical parameter shadowing of ambient globals
      const BLOCKED_PARAMS = [
        'globalThis', 'self', 'window', 'document', 'Function', 'Reflect', 'Proxy',
        'process', 'localStorage', 'sessionStorage', 'navigator', 'indexedDB', // platform-leak-ignore: blocked globals list
        'XMLHttpRequest', 'fetch', 'WebSocket', 'EventSource', 'Worker', 'SharedWorker',
        'BroadcastChannel', 'importScripts', 'caches', 'postMessage', 'location'
      ];
      const BLOCKED_VALUES = BLOCKED_PARAMS.map(() => undefined);

      const runner = new Function(
        'api',
        'console',
        ...BLOCKED_PARAMS,
        `"use strict"; return (async function() { ${code} })();`
      );

      await runner(safeApi, safeConsole, ...BLOCKED_VALUES);

      const successMsg: WorkerOutMessage = {
        type: 'SUCCESS',
        journal
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
