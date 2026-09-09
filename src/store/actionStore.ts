import { create } from 'zustand';
import { Action, ActionCategory } from '../types';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';

export const DEFAULT_ACTIONS: Action[] = [
  {
    id: 'act_summarize',
    name: 'Summarize Document',
    description: 'Generates an executive summary of the current note content',
    category: 'Text Analysis',
    shortcut: 'Ctrl+Shift+S',
    code: `
// Executive Summary Generator
const text = api.getContent();
if (!text.trim()) {
  api.notify("Document is empty", "warning");
  return;
}
api.notify("Analyzing text content...", "info");
const lines = text.split('\\n').filter(l => l.trim().length > 0);
const wordCount = text.split(/\\s+/).filter(Boolean).length;
const charCount = text.length;

const summary = \`## Executive Summary\\n\\n**Key Metrics:**\\n- Total Words: \${wordCount}\\n- Total Characters: \${charCount}\\n- Paragraphs: \${lines.length}\\n\\n**Core Takeaways:**\\n\` + lines.slice(0, 3).map(l => \`- \${l.replace(/^[#*\\-\\s]+/, '')}\`).join('\\n');

api.insertAtCursor('\\n\\n' + summary);
api.notify("Summary appended successfully!", "success");
    `,
    color: 'emerald'
  },
  {
    id: 'act_format_table',
    name: 'Clean Markdown Table',
    description: 'Normalizes column widths and whitespace in markdown tables',
    category: 'Formatting',
    shortcut: 'Ctrl+Shift+T',
    code: `
const text = api.getContent();
const lines = text.split('\\n');
let modified = false;

const newLines = lines.map(line => {
  if (line.includes('|')) {
    const cells = line.split('|').map(c => c.trim());
    modified = true;
    return cells.join(' | ');
  }
  return line;
});

if (modified) {
  api.setContent(newLines.join('\\n'));
  api.notify("Normalized markdown tables", "success");
} else {
  api.notify("No markdown table found in current document", "info");
}
    `,
    color: 'sky'
  },
  {
    id: 'act_slugify',
    name: 'Generate URL Slug',
    description: 'Converts selected text or heading to kebab-case slug',
    category: 'Utility',
    code: `
const sel = api.getSelection();
const target = sel || api.getContent().split('\\n')[0];
if (!target) {
  api.notify("Nothing to slugify", "warning");
  return;
}
const slug = target
  .toLowerCase()
  .trim()
  .replace(/[^\\w\\s-]/g, '')
  .replace(/[\\s_-]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (sel) {
  api.replaceSelection(slug);
} else {
  api.insertAtCursor(slug);
}
api.notify(\`Generated slug: \${slug}\`, "success");
    `,
    color: 'indigo'
  },
  {
    id: 'act_extract_todos',
    name: 'Extract All Tasks',
    description: 'Gathers all checkbox tasks (- [ ]) and copies to end of document',
    category: 'Text Analysis',
    code: `
const text = api.getContent();
const matches = text.match(/^[ \\t]*- \\[([ xX])\\]\\s+(.+)$/gm);
if (!matches || matches.length === 0) {
  api.notify("No checklist tasks found (- [ ] ...)", "info");
  return;
}
const header = "\\n\\n### Consolidated Task Checklist\\n";
const tasks = matches.join('\\n');
api.insertAtCursor(header + tasks + '\\n');
api.notify(\`Extracted \${matches.length} tasks\`, "success");
    `,
    color: 'amber'
  }
];

let activeStorage: IStorageBridge | null = null;

interface ActionState {
  actions: Action[];
  searchQuery: string;
  selectedCategory: ActionCategory;
  isActionEditorOpen: boolean;
  editingAction: Action | null;
  isRunningAction: boolean;
  
  initializeActions: (storage?: IStorageBridge) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ActionCategory) => void;
  openActionEditor: (action?: Action | null) => void;
  closeActionEditor: () => void;
  saveAction: (action: Omit<Action, 'id'> & { id?: string }) => void;
  createAction: (action: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAction: (id: string, updates: Partial<Action>) => void;
  duplicateAction: (id: string) => void;
  toggleActionEnabled: (id: string) => void;
  executeAction: (id: string, context?: any) => Promise<void>;
  deleteAction: (id: string) => void;
  runAction: (action: Action, sandboxApi: any) => Promise<void>;
  importActions: (jsonString: string) => number;
  exportActions: () => string;
  resetToDefaults: () => void;
}

export const useActionStore = create<ActionState>((set, get) => ({
  actions: DEFAULT_ACTIONS,
  searchQuery: '',
  selectedCategory: 'All',
  isActionEditorOpen: false,
  editingAction: null,
  isRunningAction: false,

  initializeActions: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) return;

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.ACTIONS);
      if (stored) {
        set({ actions: JSON.parse(stored) });
      } else {
        set({ actions: DEFAULT_ACTIONS });
        await activeStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(DEFAULT_ACTIONS));
      }
    } catch {
      set({ actions: DEFAULT_ACTIONS });
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  openActionEditor: (action = null) => {
    set({ isActionEditorOpen: true, editingAction: action });
  },

  closeActionEditor: () => {
    set({ isActionEditorOpen: false, editingAction: null });
  },

  saveAction: (actionData) => {
    const current = get().actions;
    let updated: Action[];

    if (actionData.id) {
      // Update existing
      updated = current.map(a => a.id === actionData.id ? { ...a, ...actionData } as Action : a);
    } else {
      // Create new
      const newAction: Action = {
        ...actionData,
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      updated = [newAction, ...current];
    }

    set({ actions: updated, isActionEditorOpen: false, editingAction: null });
    saveActions(updated);
  },

  createAction: (actionData) => {
    const newAction: Action = {
      ...actionData,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [newAction, ...get().actions];
    set({ actions: updated, isActionEditorOpen: false, editingAction: null });
    saveActions(updated);
    return newAction.id;
  },

  updateAction: (id, updates) => {
    const updated = get().actions.map(a => a.id === id ? { ...a, ...updates, updatedAt: Date.now() } : a);
    set({ actions: updated, isActionEditorOpen: false, editingAction: null });
    saveActions(updated);
  },

  duplicateAction: (id) => {
    const target = get().actions.find(a => a.id === id);
    if (!target) return;
    const duplicated: Action = {
      ...target,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const updated = [duplicated, ...get().actions];
    set({ actions: updated });
    saveActions(updated);
  },

  toggleActionEnabled: (id) => {
    const updated = get().actions.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    set({ actions: updated });
    saveActions(updated);
  },

  executeAction: async (id: string, context?: any) => {
    const action = get().actions.find(a => a.id === id);
    if (!action) return;
    await get().runAction(action, context);
  },

  deleteAction: (id) => {
    const updated = get().actions.filter(a => a.id !== id);
    set({ actions: updated });
    saveActions(updated);
  },

  runAction: async (action, sandboxApi) => {
    set({ isRunningAction: true });
    try {
      const { executeInSandbox } = await import('../services/actionSandbox');
      await executeInSandbox(action.code, sandboxApi);
    } catch (e: any) {
      console.error('Action execution failed', e);
      if (sandboxApi && sandboxApi.notify) {
        sandboxApi.notify(e?.message || 'Error executing action', 'error');
      }
    } finally {
      set({ isRunningAction: false });
    }
  },

  importActions: (jsonString: string) => {
    const current = get().actions;
    let imported: Action[];
    try {
      imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) return 0;
    } catch {
      return 0;
    }

    const valid = imported.filter(item => item && item.name && item.code);
    const combined = [...valid, ...current];
    const unique = Array.from(new Map(combined.map(item => [item.id || item.name, item])).values());
    
    set({ actions: unique });
    saveActions(unique);
    return valid.length;
  },

  exportActions: () => {
    return JSON.stringify(get().actions, null, 2);
  },

  resetToDefaults: () => {
    set({ actions: DEFAULT_ACTIONS });
    saveActions(DEFAULT_ACTIONS);
  }
}));

function saveActions(actions: Action[]) {
  if (!activeStorage) return;
  try {
    activeStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions)).catch(() => {});
  } catch (e) {
    console.error('Failed to save actions', e);
  }
}
