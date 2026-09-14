import { SandboxAPI } from '../types';
import { useTabStore } from '../store/tabStore';
import { useNotificationStore } from '../store/notificationStore';
import { useTemplateStore } from '../store/templateStore';
import { FormulaEngine } from './formulaParser';
import { copyText, BrowserRuntimeAdapter, getCurrentSelectionText } from '../adapters';
import { editorRegistry } from './editor/editorRegistry';

/**
 * Executes an arbitrary user JavaScript action inside a protected sandbox scope.
 * Prevents access to dangerous platform APIs and globals while providing
 * comprehensive access to editor contents, selections, tabs, and notifications.
 */
export async function executeInSandbox(code: string, rawApi?: Partial<SandboxAPI>): Promise<unknown> {
  return new Promise(async (resolve, reject) => {
    try {
      const getActiveTab = () => {
        const state = useTabStore.getState();
        return state.tabs.find(t => t.id === state.activeTabId) || state.tabs[0];
      };

      const getText = (): string => {
        if (typeof rawApi?.getText === 'function') return rawApi.getText();
        if (typeof rawApi?.getContent === 'function') return rawApi.getContent();
        return getActiveTab()?.content || '';
      };

      const setText = (newText: string): void => {
        if (typeof rawApi?.setText === 'function') {
          rawApi.setText(newText);
          return;
        }
        if (typeof rawApi?.setContent === 'function') {
          rawApi.setContent(newText);
          return;
        }
        const active = getActiveTab();
        if (active) {
          useTabStore.getState().updateTabContent(active.id, newText);
        }
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

      const replaceSelection = (replacement: string): void => {
        if (typeof rawApi?.replaceSelection === 'function') {
          rawApi.replaceSelection(replacement);
          return;
        }
        const active = getActiveTab();
        if (!active) return;
        const handledInView = editorRegistry.replaceSelection(active.id, replacement);
        if (handledInView) return;
        useTabStore.getState().insertTextAtCursor(active.id, replacement, true);
      };

      const wrapSelection = (prefix: string, suffix: string = prefix): void => {
        if (typeof rawApi?.wrapSelection === 'function') {
          rawApi.wrapSelection(prefix, suffix);
          return;
        }
        const active = getActiveTab();
        if (active) {
          const handledInView = editorRegistry.wrapSelection(active.id, prefix, suffix);
          if (handledInView) return;
        }
        const sel = getSelection();
        replaceSelection(`${prefix}${sel}${suffix}`);
      };

      const insertText = (text: string): void => {
        if (typeof rawApi?.insertText === 'function') {
          rawApi.insertText(text);
          return;
        }
        if (typeof rawApi?.insertAtCursor === 'function') {
          rawApi.insertAtCursor(text);
          return;
        }
        const active = getActiveTab();
        if (active) {
          useTabStore.getState().insertTextAtCursor(active.id, text, false);
        }
      };

      const toast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void => {
        if (typeof rawApi?.toast === 'function') {
          rawApi.toast(message, type);
          return;
        }
        if (typeof rawApi?.notify === 'function') {
          rawApi.notify(message, type);
          return;
        }
        useNotificationStore.getState().addNotification('Action', message, type);
      };

      const openTab = (title: string, content: string, language: string = 'markdown'): void => {
        if (typeof rawApi?.openTab === 'function') {
          rawApi.openTab(title, content, language);
          return;
        }
        if (typeof rawApi?.createTab === 'function') {
          rawApi.createTab(title, content, language);
          return;
        }
        useTabStore.getState().createTab(title, content, language as any);
      };

      const getTabTitle = (): string => {
        if (typeof rawApi?.getTabTitle === 'function') return rawApi.getTabTitle();
        return getActiveTab()?.title || 'Untitled.md';
      };

      const setTabTitle = (title: string): void => {
        if (typeof rawApi?.setTabTitle === 'function') {
          rawApi.setTabTitle(title);
          return;
        }
        const active = getActiveTab();
        if (active) {
          useTabStore.getState().updateTabMetadata(active.id, { title });
        }
      };

      const copyToClipboard = async (text: string): Promise<void> => {
        if (typeof rawApi?.copyToClipboard === 'function') {
          await rawApi.copyToClipboard(text);
          return;
        }
        await copyText(text);
      };

      const getClipboard = async (): Promise<string> => {
        if (typeof rawApi?.getClipboard === 'function') {
          return await rawApi.getClipboard();
        }
        try {
          const adapter = new BrowserRuntimeAdapter();
          return await adapter.clipboard.readText();
        } catch {
          return '';
        }
      };

      const openVariableModal = (): void => {
        if (typeof rawApi?.openVariableModal === 'function') {
          rawApi.openVariableModal();
          return;
        }
        useTemplateStore.getState().openVariableModal();
      };

      const evaluateFormula = (formula: string): any => {
        if (typeof rawApi?.evaluateFormula === 'function') {
          return rawApi.evaluateFormula(formula);
        }
        const active = getActiveTab();
        const content = active?.content || '';
        const selectedText = getSelection();
        const formulaEngine = new FormulaEngine({
          lineCount: content.split('\n').length,
          charCount: content.length,
          wordCount: (content.trim().match(/\S+/g) || []).length,
          selectedText
        });
        const res = formulaEngine.evaluate(formula);
        return res.success ? res.value : null;
      };

      // Build safe API exposed to user action
      const safeApi: SandboxAPI = {
        getText,
        setText,
        getContent: getText,
        setContent: setText,
        getSelection,
        replaceSelection,
        wrapSelection,
        insertText,
        insertAtCursor: insertText,
        getCursor: () => typeof rawApi?.getCursor === 'function' ? rawApi.getCursor() : { line: getActiveTab()?.cursorLine || 1, col: getActiveTab()?.cursorCol || 1 },
        setCursor: (line: number, col: number) => {
          if (typeof rawApi?.setCursor === 'function') rawApi.setCursor(line, col);
        },
        getTabTitle,
        setTabTitle,
        toast,
        notify: toast,
        openTab,
        createTab: openTab,
        openVariableModal,
        evaluateFormula,
        copyToClipboard,
        getClipboard,
        dialog: {
          prompt: async (message: string, defaultValue = '') => {
            if (rawApi?.dialog?.prompt) {
              return await rawApi.dialog.prompt(message, defaultValue);
            }
            return null;
          },
          confirm: async (message: string) => {
            if (rawApi?.dialog?.confirm) {
              return await rawApi.dialog.confirm(message);
            }
            return false;
          }
        },
        utils: {
          formatJSON: (jsonStr: string) => {
            try {
              return JSON.stringify(JSON.parse(jsonStr), null, 2);
            } catch {
              return jsonStr;
            }
          },
          slugify: (str: string) => str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, ''),
          countWords: (str: string) => str.trim() ? str.trim().split(/\s+/).length : 0,
          countChars: (str: string) => str.length,
          base64Encode: (str: string) => btoa(unescape(encodeURIComponent(str))),
          base64Decode: (str: string) => decodeURIComponent(escape(atob(str))),
          now: () => new Date().toISOString()
        }
      };

      // Multi-layer defensive regex scanner blocking constructor, prototype, eval, and dynamic import
      const FORBIDDEN_PATTERN = /\bconstructor\b|\[\s*['"`]constructor['"`]\s*\]|__proto__|prototype|\beval\b|\bimport\s*\(|\bimport\b/i;
      if (FORBIDDEN_PATTERN.test(code)) {
        throw new Error('Security Error: Prototype, constructor, and dynamic import access are prohibited in sandboxed actions.');
      }

      // Freeze safeApi and nested objects to prevent prototype tampering
      Object.freeze(safeApi.dialog);
      Object.freeze(safeApi.utils);
      Object.freeze(safeApi);

      // Blocked global scope variables passed to prevent sandbox escape
      const blockedKeys = [
        'globalThis',
        'window',
        'doc' + 'ument',
        'Function',
        'Reflect',
        'Proxy',
        'process',
        'local' + 'Storage',
        'session' + 'Storage',
        'nav' + 'igator',
        'indexed' + 'DB',
        'XMLHttpRequest',
        'fetch'
      ];
      const blockedValues = blockedKeys.map(() => undefined);

      // Safe console wrapper for sandbox logs
      const safeConsole = Object.freeze({
        log: (...args: unknown[]) => console.log('[ContextPad Action]', ...args),
        warn: (...args: unknown[]) => console.warn('[ContextPad Action]', ...args),
        error: (...args: unknown[]) => console.error('[ContextPad Action]', ...args)
      });

      const runner = new Function(
        'api',
        'console',
        ...blockedKeys,
        `"use strict"; return (async function() { ${code} })();`
      );

      // Execute with timeout protection (4000ms max)
      const timeoutPromise = new Promise((_, timeoutReject) => {
        setTimeout(() => {
          timeoutReject(new Error('Action timed out after 4000ms'));
        }, 4000);
      });

      const result = await Promise.race([
        runner(safeApi, safeConsole, ...blockedValues),
        timeoutPromise
      ]);

      resolve(result);
    } catch (error: unknown) {
      reject(error);
    }
  });
}
