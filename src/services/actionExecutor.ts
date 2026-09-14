import { EditorView } from '@codemirror/view';
import { useActionStore } from '../store/actionStore';
import { useTabStore } from '../store/tabStore';
import { useNotificationStore } from '../store/notificationStore';
import { FormulaEngine } from './formulaParser';
import { executeInSandbox } from './actionSandbox';
import { copyText } from '../adapters';
import { editorRegistry } from './editor/editorRegistry';

/**
 * Executes an action by ID either inside an active CodeMirror EditorView
 * or falling back to active tab state.
 *
 * Guarantees that:
 * 1. Text formatting and wrap actions transform selected text without deleting it.
 * 2. Non-transform actions (e.g. TODAY(), Summarize, Extract Tasks) insert without wiping selection.
 * 3. Selections are retrieved directly from CodeMirror even when triggered from external UI.
 */
export async function executeActionById(actionId: string, view?: EditorView): Promise<boolean> {
  const action = useActionStore.getState().actions.find(a => a.id === actionId);
  const notify = useNotificationStore.getState().addNotification;

  if (!action) {
    notify('Action Not Found', `Action "${actionId}" was not found in Action Scripts library`, 'warning');
    return false;
  }

  if (action.enabled === false) {
    notify('Action Disabled', `Action "${action.name}" is currently disabled`, 'warning');
    return false;
  }

  const activeTabId = useTabStore.getState().activeTabId;
  const targetView = view || (activeTabId ? editorRegistry.getView(activeTabId) : undefined);

  let docStr = '';
  let lineCount = 1;
  let charCount = 0;
  let wordCount = 0;
  let selectedText = '';
  let selFrom = 0;
  let selTo = 0;
  let hasSelection = false;

  if (targetView) {
    docStr = targetView.state.doc.toString();
    lineCount = targetView.state.doc.lines;
    const mainSel = targetView.state.selection.main;
    selFrom = mainSel.from;
    selTo = mainSel.to;
    hasSelection = !mainSel.empty;
    if (hasSelection) {
      selectedText = targetView.state.sliceDoc(selFrom, selTo);
    }
  } else {
    const tab = useTabStore.getState().tabs.find(t => t.id === activeTabId);
    docStr = tab?.content || '';
    lineCount = docStr.split('\n').length;
    if (activeTabId) {
      selectedText = editorRegistry.getSelectedText(activeTabId);
      hasSelection = Boolean(selectedText);
    }
  }
  charCount = docStr.length;
  wordCount = (docStr.trim().match(/\S+/g) || []).length;

  const formulaEngine = new FormulaEngine({
    lineCount,
    charCount,
    wordCount,
    selectedText
  });

  try {
    if (action.code && action.code.startsWith('FORMULA:')) {
      const formula = action.code.slice(8).trim();
      const res = formulaEngine.evaluate(formula);

      if (res.success && res.value !== undefined) {
        const valStr = String(res.value);

        const isForceInsert = /\bINSERT\s*\(/i.test(formula);
        const isForceReplace = /\bREPLACE_SELECTION\s*\(/i.test(formula);

        // Action selectionBehavior: 'auto' | 'replace' | 'insert'
        const behavior = action.selectionBehavior || 'auto';

        let shouldReplace = false;
        if (hasSelection) {
          if (behavior === 'replace' || isForceReplace) {
            shouldReplace = true;
          } else if (behavior === 'insert' || isForceInsert) {
            shouldReplace = false;
          } else {
            // 'auto': check if formula references selection or uses transform/formatting function
            shouldReplace = /selection|selected|\b(upper|lower|title|trim|reverse|camel|pascal|snake|kebab|constant|bold|italic|strike|code|codeblock|quote|heading|link|parentheses|brackets|braces|angles|singlequote|doublequote|sort|sortdesc|unique|numberlist|bulletlist|checklist|indent|unindent|wrap|prefix|suffix|pad|replace)\b/i.test(formula);
          }
        }

        if (targetView) {
          if (hasSelection) {
            if (shouldReplace) {
              // Transform/replace the selected text and maintain selection over the new text
              targetView.dispatch({
                changes: { from: selFrom, to: selTo, insert: valStr },
                selection: { anchor: selFrom, head: selFrom + valStr.length },
                scrollIntoView: true
              });
            } else {
              // Insert next to the selected text without removing it
              targetView.dispatch({
                changes: { from: selTo, insert: valStr },
                selection: { anchor: selTo + valStr.length },
                scrollIntoView: true
              });
            }
          } else {
            const pos = targetView.state.selection.main.head;
            targetView.dispatch({
              changes: { from: pos, insert: valStr },
              selection: { anchor: pos + valStr.length },
              scrollIntoView: true
            });
          }
          targetView.focus?.();
        } else {
          const tab = useTabStore.getState().tabs.find(t => t.id === activeTabId);
          if (tab) {
            useTabStore.getState().insertTextAtCursor(tab.id, valStr, shouldReplace && hasSelection);
          }
        }
        notify('Action Executed', `Ran formula for "${action.name}"`, 'success');
        return true;
      } else {
        notify('Formula Failed', res.error || 'Evaluation failed', 'error');
        return false;
      }
    } else {
      const rawApi: any = {
        getText: () => {
          if (targetView) return targetView.state.doc.toString();
          const tab = useTabStore.getState().tabs.find(t => t.id === activeTabId);
          return tab?.content || '';
        },
        setText: (newText: string) => {
          if (targetView) {
            targetView.dispatch({ changes: { from: 0, to: targetView.state.doc.length, insert: newText } });
          } else if (activeTabId) {
            useTabStore.getState().updateTabContent(activeTabId, newText);
          }
        },
        getContent: () => rawApi.getText(),
        setContent: (newText: string) => rawApi.setText(newText),
        getSelection: () => {
          if (targetView) {
            const sel = targetView.state.selection.main;
            return sel.empty ? '' : targetView.state.sliceDoc(sel.from, sel.to);
          }
          return selectedText;
        },
        replaceSelection: (replacement: string) => {
          if (targetView) {
            const sel = targetView.state.selection.main;
            targetView.dispatch({
              changes: { from: sel.from, to: sel.to, insert: replacement },
              selection: { anchor: sel.from, head: sel.from + replacement.length },
              scrollIntoView: true
            });
            targetView.focus?.();
          } else if (activeTabId) {
            useTabStore.getState().insertTextAtCursor(activeTabId, replacement, true);
          }
        },
        wrapSelection: (prefix: string, suffix: string = prefix) => {
          const selText = rawApi.getSelection();
          const wrapped = `${prefix}${selText}${suffix}`;
          if (targetView) {
            const sel = targetView.state.selection.main;
            targetView.dispatch({
              changes: { from: sel.from, to: sel.to, insert: wrapped },
              selection: {
                anchor: selText ? sel.from : sel.from + prefix.length,
                head: selText ? sel.from + wrapped.length : sel.from + prefix.length
              },
              scrollIntoView: true
            });
            targetView.focus?.();
          } else if (activeTabId) {
            useTabStore.getState().insertTextAtCursor(activeTabId, wrapped, Boolean(selText));
          }
        },
        insertText: (text: string) => {
          if (targetView) {
            const sel = targetView.state.selection.main;
            // Insert after selection or at cursor WITHOUT removing selected text
            const pos = sel.to;
            targetView.dispatch({
              changes: { from: pos, insert: text },
              selection: { anchor: pos + text.length },
              scrollIntoView: true
            });
            targetView.focus?.();
          } else if (activeTabId) {
            useTabStore.getState().insertTextAtCursor(activeTabId, text, false);
          }
        },
        insertAtCursor: (text: string) => {
          rawApi.insertText(text);
        },
        evaluateFormula: (formulaStr: string) => {
          const res = formulaEngine.evaluate(formulaStr);
          return res.success ? res.value : null;
        },
        copyToClipboard: async (text: string) => {
          await copyText(text);
          notify('Copied', 'Text copied to clipboard', 'success');
        }
      };

      await executeInSandbox(action.code, rawApi);
      notify('Action Executed', `Ran action "${action.name}"`, 'success');
      return true;
    }
  } catch (err: any) {
    notify('Action Failed', err?.message || `Error executing action "${action.name}"`, 'error');
    return false;
  }
}
