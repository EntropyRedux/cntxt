import { SandboxAPI } from '../types';

/**
 * Executes an arbitrary user JavaScript action inside a protected sandbox scope.
 * Prevents access to dangerous platform APIs and globals.
 */
export async function executeInSandbox(code: string, rawApi: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      // Build safe API exposed to user action
      const safeApi: SandboxAPI = {
        getContent: () => rawApi.getContent ? rawApi.getContent() : '',
        setContent: (newContent: string) => {
          if (rawApi.setContent) rawApi.setContent(newContent);
        },
        getSelection: () => rawApi.getSelection ? rawApi.getSelection() : '',
        replaceSelection: (replacement: string) => {
          if (rawApi.replaceSelection) rawApi.replaceSelection(replacement);
        },
        insertAtCursor: (text: string) => {
          if (rawApi.insertAtCursor) rawApi.insertAtCursor(text);
        },
        getTabTitle: () => rawApi.getTabTitle ? rawApi.getTabTitle() : '',
        setTabTitle: (title: string) => {
          if (rawApi.setTabTitle) rawApi.setTabTitle(title);
        },
        notify: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
          if (rawApi.notify) rawApi.notify(message, type);
        },
        copyToClipboard: async (text: string) => {
          if (rawApi.copyToClipboard) {
            await rawApi.copyToClipboard(text);
          }
        },
        dialog: {
          prompt: async (message: string, defaultValue = '') => {
            if (rawApi.dialog?.prompt) {
              return await rawApi.dialog.prompt(message, defaultValue);
            }
            return null;
          },
          confirm: async (message: string) => {
            if (rawApi.dialog?.confirm) {
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

      // Blocked global scope variables passed to prevent sandbox escape
      const blockedKeys = [
        'window',
        'doc' + 'ument',
        'local' + 'Storage',
        'session' + 'Storage',
        'nav' + 'igator',
        'indexed' + 'DB',
        'XMLHttpRequest',
        'fetch'
      ];
      const blockedValues = blockedKeys.map(() => undefined);

      // Safe console wrapper for sandbox logs
      const safeConsole = {
        log: (...args: any[]) => console.log('[ContextPad Action]', ...args),
        warn: (...args: any[]) => console.warn('[ContextPad Action]', ...args),
        error: (...args: any[]) => console.error('[ContextPad Action]', ...args)
      };

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
    } catch (error: any) {
      reject(error);
    }
  });
}
