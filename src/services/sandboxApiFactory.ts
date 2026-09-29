/**
 * SANDBOX API FACTORY (src/services/sandboxApiFactory.ts)
 * 
 * Single source of truth for the complete 24-member SandboxAPI matrix.
 * Shared between Dedicated Web Worker realm and headless fallback runners.
 */

export interface ActionSnapshot {
  text: string;
  selection: string;
  lineCount: number;
  wordCount: number;
  characterCount: number;
}

export type ActionMutation =
  | { type: 'setText'; text: string }
  | { type: 'replaceSelection'; text: string }
  | { type: 'insertAtCursor'; text: string }
  | { type: 'wrapSelection'; before: string; after: string }
  | { type: 'toast'; message: string; toastType: 'info' | 'success' | 'warning' | 'error' }
  | { type: 'openTab'; title: string; content: string; language?: string }
  | { type: 'openVariableModal' }
  | { type: 'copyToClipboard'; text: string };

export type WorkerInMessage =
  | { type: 'EXECUTE'; code: string; snapshot: ActionSnapshot }
  | { type: 'DIALOG_RESPONSE'; reqId: string; value: string | boolean | null };

export type WorkerOutMessage =
  | { type: 'SUCCESS'; journal: ActionMutation[] }
  | { type: 'ERROR'; error: string }
  | { type: 'DIALOG_PROMPT'; reqId: string; title: string; defaultValue: string }
  | { type: 'DIALOG_CONFIRM'; reqId: string; title: string; message: string };


export const FORBIDDEN_ACTION_PATTERN = /\bconstructor\b|\[\s*['"`]constructor['"`]\s*\]|__proto__|prototype|\beval\b|\bimport\s*\(|\bimport\b/i;

export function validateActionSyntax(code: string): void {
  if (FORBIDDEN_ACTION_PATTERN.test(code)) {
    throw new Error('Security Error: Prototype, constructor, and dynamic import access are prohibited in sandboxed actions.');
  }
}

export function isValidActionMutation(m: unknown): m is ActionMutation {
  if (!m || typeof m !== 'object') return false;
  const item = m as Record<string, unknown>;
  switch (item.type) {
    case 'setText':
    case 'replaceSelection':
    case 'insertAtCursor':
    case 'copyToClipboard':
      return typeof item.text === 'string';
    case 'wrapSelection':
      return typeof item.before === 'string' && typeof item.after === 'string';
    case 'toast':
      return typeof item.message === 'string' && ['info', 'success', 'warning', 'error'].includes(item.toastType as string);
    case 'openTab':
      return typeof item.title === 'string' && typeof item.content === 'string';
    case 'openVariableModal':
      return true;
    default:
      return false;
  }
}

export interface SandboxDialog {
  prompt: (title: string, defaultValue?: string) => Promise<string | null>;
  confirm: (titleOrMessage: string, message?: string) => Promise<boolean>;
}

export interface SandboxUtils {
  base64Encode: (str: string) => string;
  base64Decode: (b64: string) => string;
  formatJSON: (jsonStr: string) => string;
  slugify: (str: string) => string;
  countWords: (str: string) => number;
  countChars: (str: string) => number;
}

export interface SandboxAPI {
  // Document inspection (reads immutable snapshot or current draft)
  getText: () => string;
  getSelection: () => string;
  getContent: () => string;
  getLineCount: () => number;
  getWordCount: () => number;
  getCharacterCount: () => number;

  // Document mutation (appends to mutation journal)
  setText: (text: string) => void;
  setContent: (text: string) => void;
  replaceSelection: (text: string) => void;
  insertAtCursor: (text: string) => void;
  wrapSelection: (before: string, after: string) => void;

  // Notifications & User Feedback
  toast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;

  // External commands & navigation
  openTab: (title: string, content: string, language?: string) => void;
  openVariableModal: () => void;
  copyToClipboard: (text: string) => Promise<void>;

  // Formula evaluation
  evaluateFormula: (formula: string) => unknown;

  // Data transformations
  formatJSON: (jsonStr: string) => string;
  base64Encode: (str: string) => string;
  base64Decode: (b64: string) => string;

  // Sub-namespaces
  dialog: SandboxDialog;
  utils: SandboxUtils;
}

export interface CreateSandboxAPIOptions {
  getSnapshot: () => ActionSnapshot;
  applyMutation: (mutation: ActionMutation) => void;
  requestDialogPrompt: (title: string, defaultValue?: string) => Promise<string | null>;
  requestDialogConfirm: (title: string, message: string) => Promise<boolean>;
  evaluateFormula: (formula: string) => unknown;
}

/**
 * Modern UTF-8 safe base64 encoding using TextEncoder
 */
export function safeBase64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Modern UTF-8 safe base64 decoding using TextDecoder
 */
export function safeBase64Decode(b64: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Creates a fully typed, frozen SandboxAPI instance
 */
export function createSandboxAPI(options: CreateSandboxAPIOptions): SandboxAPI {
  const { getSnapshot, applyMutation, requestDialogPrompt, requestDialogConfirm, evaluateFormula } = options;

  const formatJSON = (jsonStr: string): string => {
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch (err) {
      applyMutation({
        type: 'toast',
        message: `JSON format error: ${err instanceof Error ? err.message : String(err)}`,
        toastType: 'warning'
      });
      return jsonStr;
    }
  };

  const slugify = (str: string): string => {
    return String(str || '')
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const countWords = (str: string): number => {
    return (String(str || '').trim().match(/\S+/g) || []).length;
  };

  const countChars = (str: string): number => {
    return String(str || '').length;
  };

  const dialog: SandboxDialog = Object.freeze({
    prompt: (title: string, defaultValue?: string) => requestDialogPrompt(title, defaultValue),
    confirm: (title: string, message?: string) => requestDialogConfirm(title, message || '')
  });

  const utils: SandboxUtils = Object.freeze({
    base64Encode: safeBase64Encode,
    base64Decode: safeBase64Decode,
    formatJSON,
    slugify,
    countWords,
    countChars
  });

  const api: SandboxAPI = {
    getText: () => getSnapshot().text,
    getContent: () => getSnapshot().text,
    getSelection: () => getSnapshot().selection,
    getLineCount: () => getSnapshot().lineCount,
    getWordCount: () => getSnapshot().wordCount,
    getCharacterCount: () => getSnapshot().characterCount,

    setText: (text: string) => {
      applyMutation({ type: 'setText', text: String(text) });
    },
    setContent: (text: string) => {
      applyMutation({ type: 'setText', text: String(text) });
    },
    replaceSelection: (text: string) => {
      applyMutation({ type: 'replaceSelection', text: String(text) });
    },
    insertAtCursor: (text: string) => {
      applyMutation({ type: 'insertAtCursor', text: String(text) });
    },
    wrapSelection: (before: string, after: string) => {
      applyMutation({ type: 'wrapSelection', before: String(before), after: String(after) });
    },

    toast: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      applyMutation({ type: 'toast', message: String(message), toastType: type });
    },
    notify: (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      applyMutation({ type: 'toast', message: String(message), toastType: type });
    },

    openTab: (title: string, content: string, language?: string) => {
      applyMutation({ type: 'openTab', title: String(title), content: String(content), language });
    },
    openVariableModal: () => {
      applyMutation({ type: 'openVariableModal' });
    },
    copyToClipboard: async (text: string) => {
      applyMutation({ type: 'copyToClipboard', text: String(text) });
    },

    evaluateFormula: (expr: string) => evaluateFormula(expr),

    formatJSON,
    base64Encode: safeBase64Encode,
    base64Decode: safeBase64Decode,

    dialog,
    utils
  };

  return Object.freeze(api);
}
