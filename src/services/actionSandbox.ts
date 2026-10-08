import { SandboxAPI } from '../types';
import { SupportedLanguage } from '../../contracts/data_shapes';
import { useTabStore } from '../store/tabStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTemplateStore } from '../store/templateStore';
import { copyText, getCurrentSelectionText } from '../adapters';
import { editorRegistry } from './editor/editorRegistry';
import { FormulaEngine } from './formulaParser';
import {
  ActionSnapshot,
  ActionMutation,
  WorkerInMessage,
  WorkerOutMessage,
  createSandboxAPI,
  validateActionSyntax,
  isValidActionMutation
} from './sandboxApiFactory';

type LegacySandboxAPI = Partial<SandboxAPI> & {
  insertText?: (text: string) => void;
  createTab?: (title?: string, content?: string, language?: string) => void;
  copy?: (text: string) => void | Promise<void>;
};

function commitMutations(
  mutations: ActionMutation[],
  rawApi?: Partial<SandboxAPI>,
  getActiveTab?: () => { id: string; content?: string } | undefined
) {
  const activeTab = getActiveTab ? getActiveTab() : undefined;
  const legacyApi = rawApi as LegacySandboxAPI | undefined;

  for (const m of mutations) {
    if (!isValidActionMutation(m)) {
      console.warn('[CNTXT Sandbox] Rejected malformed action mutation:', m);
      continue;
    }
    switch (m.type) {
      case 'setText':
        if (typeof rawApi?.setText === 'function') rawApi.setText(m.text);
        else if (typeof rawApi?.setContent === 'function') rawApi.setContent(m.text);
        else if (activeTab) useTabStore.getState().updateTabContent(activeTab.id, m.text);
        break;
      case 'replaceSelection':
        if (typeof rawApi?.replaceSelection === 'function') rawApi.replaceSelection(m.text);
        else if (activeTab) {
          const handled = editorRegistry.replaceSelection(activeTab.id, m.text);
          if (!handled) useTabStore.getState().insertTextAtCursor(activeTab.id, m.text, true);
        }
        break;
      case 'wrapSelection':
        if (typeof rawApi?.wrapSelection === 'function') rawApi.wrapSelection(m.before, m.after);
        else if (activeTab) {
          const handled = editorRegistry.wrapSelection(activeTab.id, m.before, m.after);
          if (!handled) {
            const currentSel = editorRegistry.getSelectedText(activeTab.id) || '';
            useTabStore.getState().insertTextAtCursor(activeTab.id, `${m.before}${currentSel}${m.after}`, true);
          }
        }
        break;
      case 'insertAtCursor':
        if (typeof rawApi?.insertAtCursor === 'function') rawApi.insertAtCursor(m.text);
        else if (typeof legacyApi?.insertText === 'function') legacyApi.insertText(m.text);
        else if (activeTab) useTabStore.getState().insertTextAtCursor(activeTab.id, m.text, false);
        break;
      case 'toast':
        if (typeof rawApi?.toast === 'function') rawApi.toast(m.message, m.toastType);
        else if (typeof rawApi?.notify === 'function') rawApi.notify(m.message, m.toastType);
        else useNotificationStore.getState().addNotification(m.toastType.toUpperCase(), m.message, m.toastType);
        break;
      case 'openTab':
        if (typeof rawApi?.openTab === 'function') rawApi.openTab(m.title, m.content, m.language);
        else if (typeof legacyApi?.createTab === 'function') legacyApi.createTab(m.title, m.content, m.language);
        else useTabStore.getState().createTab(m.title, m.content, (m.language as SupportedLanguage) || 'markdown');
        break;
      case 'openVariableModal':
        if (typeof rawApi?.openVariableModal === 'function') rawApi.openVariableModal();
        else useTemplateStore.getState().openVariableModal();
        break;
      case 'copyToClipboard':
        if (typeof rawApi?.copyToClipboard === 'function') rawApi.copyToClipboard(m.text);
        else if (typeof legacyApi?.copy === 'function') legacyApi.copy(m.text);
        else copyText(m.text);
        break;
    }
  }
}

/**
 * Executes an arbitrary user JavaScript action inside a protected sandbox scope.
 * Leverages DedicatedWorkerGlobalScope in browser/Tauri webviews with Snapshot-Journal protocol,
 * with resilient fallback runner for headless testing environments.
 */
export async function executeInSandbox(code: string, rawApi?: Partial<SandboxAPI>): Promise<unknown> {
  validateActionSyntax(code);

  const getActiveTab = () => {
    const state = useTabStore.getState();
    return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
  };

  const getText = (): string => {
    if (typeof rawApi?.getText === 'function') return rawApi.getText();
    if (typeof rawApi?.getContent === 'function') return rawApi.getContent();
    return getActiveTab()?.content || '';
  };

  const getSelection = (): string => {
    if (typeof rawApi?.getSelection === 'function') {
      const s = rawApi.getSelection();
      if (s) return s;
    }
    const active = getActiveTab();
    if (active) {
      const regText = editorRegistry.getSelectedText(active.id);
      if (regText) return regText;
    }
    if (typeof window !== 'undefined' && window.getSelection) {
      return getCurrentSelectionText();
    }
    return '';
  };

  const rawText = getText();
  const rawSel = getSelection();

  const snapshot: ActionSnapshot = {
    text: rawText,
    selection: rawSel,
    lineCount: rawText.split('\n').length,
    wordCount: (rawText.trim().match(/\S+/g) || []).length,
    characterCount: rawText.length
  };

  // If Web Worker is supported in environment (Browser / Tauri desktop)
  const isTestEnv = (typeof process !== 'undefined' && (Boolean(process.env?.VITEST) || process.env?.NODE_ENV === 'test'));
  if (typeof Worker !== 'undefined' && !isTestEnv) {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let worker: Worker | null = null;

      try {
        worker = new Worker(new URL('./actionWorker.ts', import.meta.url), { type: 'module' });

        const cleanup = () => {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          if (worker) {
            worker.terminate();
            worker = null;
          }
        };

        const timeoutMs = (typeof window !== 'undefined' && (window as unknown as { __E2E_ACTION_TIMEOUT__?: number }).__E2E_ACTION_TIMEOUT__)
          ? (window as unknown as { __E2E_ACTION_TIMEOUT__?: number }).__E2E_ACTION_TIMEOUT__!
          : 10000;

        timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Action timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        worker.onmessage = async (e: MessageEvent<WorkerOutMessage>) => {
          const data = e.data;
          if (!data) return;

          if (data.type === 'DIALOG_PROMPT') {
            const val = rawApi?.dialog?.prompt
              ? await rawApi.dialog.prompt(data.title, data.defaultValue)
              : null;
            const resp: WorkerInMessage = { type: 'DIALOG_RESPONSE', reqId: data.reqId, value: val };
            worker?.postMessage(resp);
            return;
          }

          if (data.type === 'DIALOG_CONFIRM') {
            const confirmMsg = data.title ? `${data.title}\n\n${data.message}` : data.message;
            const val = rawApi?.dialog?.confirm
              ? await rawApi.dialog.confirm(confirmMsg)
              : false;
            const resp: WorkerInMessage = { type: 'DIALOG_RESPONSE', reqId: data.reqId, value: val };
            worker?.postMessage(resp);
            return;
          }

          if (data.type === 'SUCCESS') {
            cleanup();
            commitMutations(data.journal, rawApi, getActiveTab);
            resolve(data.result);
            return;
          }

          if (data.type === 'ERROR') {
            cleanup();
            reject(new Error(data.error));
            return;
          }
        };

        worker.onerror = (err: ErrorEvent) => {
          cleanup();
          reject(new Error(err.message || 'Worker execution error'));
        };

        const execMsg: WorkerInMessage = {
          type: 'EXECUTE',
          code,
          snapshot
        };
        worker.postMessage(execMsg);
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (worker) worker.terminate();
        reject(err);
      }
    });
  }

    // Safe headless execution via ActionEngine (zero new Function, zero eval)
  const { ActionEngine } = await import('./actionEngine');
  const { result, journal } = await ActionEngine.executeCode(code, snapshot, rawApi);
  commitMutations(journal, rawApi, getActiveTab);
  return result;
}
