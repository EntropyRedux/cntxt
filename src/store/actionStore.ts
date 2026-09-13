import { create } from 'zustand';
import { Action, ActionCategory } from '../../contracts/data_shapes';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_ACTIONS, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';

export { DEFAULT_ACTIONS };

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
  actions: [],
  searchQuery: '',
  selectedCategory: 'All',
  isActionEditorOpen: false,
  editingAction: null,
  isRunningAction: false,

  initializeActions: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ actions: DEFAULT_ACTIONS });
      }
      return;
    }

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.ACTIONS);
      if (stored) {
        set({ actions: JSON.parse(stored) });
      } else if (IS_PROTOTYPE_DEMO_MODE) {
        set({ actions: DEFAULT_ACTIONS });
        await activeStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(DEFAULT_ACTIONS));
      } else {
        set({ actions: [] });
      }
    } catch {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ actions: DEFAULT_ACTIONS });
      } else {
        set({ actions: [] });
      }
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
      const errorMsg = e?.message || 'Error executing action';
      if (sandboxApi && typeof sandboxApi.notify === 'function') {
        sandboxApi.notify(errorMsg, 'error');
      } else if (sandboxApi && typeof sandboxApi.toast === 'function') {
        sandboxApi.toast(errorMsg, 'error');
      } else {
        const { useNotificationStore } = await import('./notificationStore');
        useNotificationStore.getState().addNotification(action.name || 'Action Failed', errorMsg, 'error');
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
  safePersist(activeStorage, STORAGE_KEYS.ACTIONS, JSON.stringify(actions), 'actions');
}
