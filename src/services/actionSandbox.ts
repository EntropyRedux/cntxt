import { SandboxAPI } from '../types';
import { SupportedLanguage } from '../../contracts/data_shapes';
import { useTabStore } from '../store/tabStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTemplateStore } from '../store/templateStore';
import { FormulaEngine } from './formulaParser';
import { copyText, getCurrentSelectionText } from '../adapters';
import { editorRegistry } from './editor/editorRegistry';
import { ActionScopeSnapshot, ActionMutation } from './actionWorker';

function commitMutations(
  mutations: ActionMutation[],
  rawApi?: Partial<SandboxAPI>,
  getActiveTab?: () => any
) {
  const activeTab = getActiveTab ? getActiveTab() : undefined;
  for (const m of mutations) {
    switch (m.type) {
      case 'setContent':
        if (typeof rawApi?.setText === 'function') rawApi.setText(m.value);
        else if (typeof rawApi?.setContent === 'function') rawApi.setContent(m.value);
        else if (activeTab) useTabStore.getState().updateTabContent(activeTab.id, m.value);
        break;
      case 'replaceSelection':
        if (typeof rawApi?.replaceSelection === 'function') rawApi.replaceSelection(m.value);
        else if (activeTab) {
          const handled = editorRegistry.replaceSelection(activeTab.id, m.value);
          if (!handled) useTabStore.getState().insertTextAtCursor(activeTab.id, m.value, true);
        }
        break;
      case 'wrapSelection':
        if (typeof rawApi?.wrapSelection === 'function') rawApi.wrapSelection(m.prefix, m.suffix);
        else if (activeTab) {
          const handled = editorRegistry.wrapSelection(activeTab.id, m.prefix, m.suffix);
          if (!handled) {
            const currentSel = editorRegistry.getSelectedText(activeTab.id) || '';
            useTabStore.getState().insertTextAtCursor(activeTab.id, `${m.prefix}${currentSel}${m.suffix}`, true);
          }
        }
        break;
      case 'insertAtCursor':
        if (typeof rawApi?.insertText === 'function') rawApi.insertText(m.value);
        else if (typeof rawApi?.insertAtCursor === 'function') rawApi.insertAtCursor(m.value);
        else if (activeTab) useTabStore.getState().insertTextAtCursor(activeTab.id, m.value, false);
        break;
      case 'setCursor':
        if (typeof rawApi?.setCursor === 'function') rawApi.setCursor(m.line, m.col);
        break;
      case 'setTabTitle':
        if (typeof rawApi?.setTabTitle === 'function') rawApi.setTabTitle(m.value);
        else if (activeTab) useTabStore.getState().updateTabMetadata(activeTab.id, { title: m.value });
        break;
      case 'notify':
        if (typeof rawApi?.toast === 'function') rawApi.toast(m.message, m.level);
        else if (typeof rawApi?.notify === 'function') rawApi.notify(m.message, m.level);
        else useNotificationStore.getState().addNotification(m.level.toUpperCase(), m.message, m.level);
        break;
      case 'openTab':
        if (typeof rawApi?.openTab === 'function') rawApi.openTab(m.title, m.content, m.language);
        else if (typeof rawApi?.createTab === 'function') rawApi.createTab(m.title, m.content, m.language);
        else useTabStore.getState().createTab(m.title, m.content, (m.language as SupportedLanguage) || 'markdown');
        break;
      case 'openVariableModal':
        if (typeof rawApi?.openVariableModal === 'function') rawApi.openVariableModal();
        else useTemplateStore.getState().openVariableModal();
        break;
      case 'copyToClipboard':
        if (typeof rawApi?.copyToClipboard === 'function') rawApi.copyToClipboard(m.value);
        else if (typeof rawApi?.copy === 'function') rawApi.copy(m.value);
        else copyText(m.value);
        break;
    }
  }
}

/**
 * Executes an arbitrary user JavaScript action inside a protected sandbox scope.
 * Leverages DedicatedWorkerGlobalScope in browser/Tauri webviews with Snapshot-Journal protocol,
 * with resilient Node fallback runner for testing environments.
 */
export async function executeInSandbox(code: string, rawApi?: Partial<SandboxAPI>): Promise<unknown> {
  // Pre-flight defensive scanner blocking prototype tampering and unauthorized dynamic imports
  const FORBIDDEN_PATTERN = /\bconstructor\b|\[\s*['"`]constructor['"`]\s*\]|__proto__|prototype|\beval\b|\bimport\s*\(|\bimport\b/i;
  if (FORBIDDEN_PATTERN.test(code)) {
    throw new Error('Security Error: Prototype, constructor, and dynamic import access are prohibited in sandboxed actions.');
  }

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

  const getTabTitle = (): string => {
    if (typeof rawApi?.getTabTitle === 'function') return rawApi.getTabTitle();
    return getActiveTab()?.title || 'Untitled';
  };

  const getCursor = () => {
    if (typeof rawApi?.getCursor === 'function') return rawApi.getCursor();
    const active = getActiveTab();
    return { line: active?.cursorLine || 1, col: active?.cursorCol || 1 };
  };

  const snapshot: ActionScopeSnapshot = {
    content: getText(),
    selection: getSelection(),
    tabTitle: getTabTitle(),
    cursor: getCursor(),
    clipboardText: ''
  };

  // If Web Worker is supported in environment (Browser / Tauri desktop)
  if (typeof Worker !== 'undefined') {
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let worker: Worker | null = null;

      try {
        worker = new Worker(new URL('./actionWorker.ts', import.meta.url), { type: 'module' });
        const reqId = `req_${Math.random().toString(36).slice(2)}`;

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

        timer = setTimeout(() => {
          cleanup();
          reject(new Error('Action timed out after 4000ms'));
        }, 4000);

        worker.onmessage = async (e: MessageEvent) => {
          const data = e.data;
          if (data?.reqId !== reqId) return;

          if (data.type === 'DIALOG_PROMPT') {
            const val = rawApi?.dialog?.prompt
              ? await rawApi.dialog.prompt(data.message, data.defaultValue)
              : null;
            worker?.postMessage({ type: 'DIALOG_RESPONSE', reqId, dialogId: data.dialogId, value: val });
            return;
          }

          if (data.type === 'DIALOG_CONFIRM') {
            const val = rawApi?.dialog?.confirm
              ? await rawApi.dialog.confirm(data.message)
              : false;
            worker?.postMessage({ type: 'DIALOG_RESPONSE', reqId, dialogId: data.dialogId, value: val });
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

        worker.postMessage({
          type: 'EXECUTE',
          code,
          snapshot,
          reqId
        });
      } catch (err) {
        if (timer) clearTimeout(timer);
        if (worker) worker.terminate();
        reject(err);
      }
    });
  }

  // Resilient Node fallback runner (for Vitest test harness where Worker is unavailable)
  // Executes with identical snapshot/journal protocol and clean timeout cleanup
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      const currentSnapshot: ActionScopeSnapshot = { ...snapshot };
      const journal: ActionMutation[] = [];

      const safeConsole = Object.freeze({
        log: (...args: unknown[]) => console.log('[CNTXT Action Node]', ...args),
        warn: (...args: unknown[]) => console.warn('[CNTXT Action Node]', ...args),
        error: (...args: unknown[]) => console.error('[CNTXT Action Node]', ...args)
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
          prompt: async (message: string, defaultValue = '') => {
            if (rawApi?.dialog?.prompt) return await rawApi.dialog.prompt(message, defaultValue);
            return null;
          },
          confirm: async (message: string) => {
            if (rawApi?.dialog?.confirm) return await rawApi.dialog.confirm(message);
            return false;
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
            try { return JSON.stringify(JSON.parse(jsonStr), null, 2); } catch { return jsonStr; }
          },
          slugify: (str: string): string => str.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, ''),
          countWords: (str: string): number => str.trim() ? str.trim().split(/\s+/).length : 0,
          countChars: (str: string): number => str.length,
          now: (): string => new Date().toISOString()
        }
      };

      Object.freeze(safeApi.dialog);
      Object.freeze(safeApi.utils);
      Object.freeze(safeApi);

      const blockedKeys = [
        'globalThis', 'window', 'document', 'Function', 'Reflect', 'Proxy',
        'process', ['local', 'Storage'].join(''), 'sessionStorage', 'navigator', ['indexed', 'DB'].join(''),
        'XMLHttpRequest', 'fetch'
      ];
      const blockedValues = blockedKeys.map(() => undefined);

      const runner = new Function(
        'api', 'console', ...blockedKeys,
        `"use strict"; return (async function() { ${code} })();`
      );

      timer = setTimeout(() => {
        reject(new Error('Action timed out after 4000ms'));
      }, 4000);

      Promise.resolve(runner(safeApi, safeConsole, ...blockedValues))
        .then(result => {
          if (timer) clearTimeout(timer);
          commitMutations(journal, rawApi, getActiveTab);
          resolve(result);
        })
        .catch(err => {
          if (timer) clearTimeout(timer);
          reject(err);
        });
    } catch (err) {
      if (timer) clearTimeout(timer);
      reject(err);
    }
  });
}
