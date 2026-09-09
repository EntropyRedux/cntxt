import { create } from 'zustand';
import { Action } from '../types';
import { DEFAULT_ACTIONS } from '../constants/defaultData';
import { actionSandbox, ActionExecutionContext } from '../services/actionSandbox';

interface ActionState {
  actions: Action[];
  searchQuery: string;
  selectedCategory: string;
  isActionEditorOpen: boolean;
  editingAction: Action | null;
  isRunningAction: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  openActionEditor: (action?: Action | null) => void;
  closeActionEditor: () => void;
  createAction: (actionData: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>) => Action;
  updateAction: (id: string, updates: Partial<Action>) => void;
  deleteAction: (id: string) => void;
  duplicateAction: (id: string) => void;
  toggleActionEnabled: (id: string) => void;
  executeAction: (actionId: string, context: ActionExecutionContext) => Promise<{ success: boolean; error?: string }>;
  importActions: (imported: Action[]) => number;
  exportActions: () => string;
  resetToDefaults: () => void;
  initializeActions: () => void;
}

const STORAGE_KEY = 'contextpad_actions';

export const useActionStore = create<ActionState>((set, get) => ({
  actions: [],
  searchQuery: '',
  selectedCategory: 'All',
  isActionEditorOpen: false,
  editingAction: null,
  isRunningAction: false,

  initializeActions: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ actions: JSON.parse(stored) });
      } else {
        set({ actions: DEFAULT_ACTIONS });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ACTIONS));
      }
    } catch (e) {
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

  createAction: (actionData) => {
    const newAction: Action = {
      ...actionData,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updated = [newAction, ...get().actions];
    set({ actions: updated });
    saveActions(updated);
    return newAction;
  },

  updateAction: (id, updates) => {
    const updated = get().actions.map(act => {
      if (act.id === id) {
        return {
          ...act,
          ...updates,
          updatedAt: Date.now()
        };
      }
      return act;
    });

    set({ actions: updated });
    saveActions(updated);
  },

  deleteAction: (id) => {
    const updated = get().actions.filter(a => a.id !== id);
    set({ actions: updated });
    saveActions(updated);
  },

  duplicateAction: (id) => {
    const source = get().actions.find(a => a.id === id);
    if (!source) return;

    get().createAction({
      name: `${source.name} (Copy)`,
      description: source.description,
      type: source.type,
      code: source.code,
      category: source.category,
      enabled: source.enabled,
      icon: source.icon,
      shortcut: source.shortcut
    });
  },

  toggleActionEnabled: (id) => {
    const updated = get().actions.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a);
    set({ actions: updated });
    saveActions(updated);
  },

  executeAction: async (actionId, context) => {
    const action = get().actions.find(a => a.id === actionId);
    if (!action) {
      context.toast('Action not found', 'error');
      return { success: false, error: 'Action not found' };
    }

    if (!action.enabled) {
      context.toast(`Action "${action.name}" is disabled`, 'warning');
      return { success: false, error: 'Action disabled' };
    }

    set({ isRunningAction: true });
    try {
      const result = await actionSandbox.executeAction(action.code, context);
      set({ isRunningAction: false });
      return result;
    } catch (e: any) {
      set({ isRunningAction: false });
      return { success: false, error: e.message };
    }
  },

  importActions: (imported) => {
    if (!Array.isArray(imported)) return 0;
    const current = get().actions;
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  } catch (e) {
    console.error('Failed to save actions', e);
  }
}
