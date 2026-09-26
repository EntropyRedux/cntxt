import { create } from 'zustand';
import { Action, ActionCategory, PersistedActionUIState } from '../../contracts/data_shapes';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_ACTIONS, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { executeActionById } from '../services/actionExecutor';
import { executeInSandbox } from '../services/actionSandbox';
import { useNotificationStore } from './notificationStore';
import { useSettingsStore } from './settingsStore';

export { DEFAULT_ACTIONS };

let activeStorage: IStorageBridge | null = null;

export interface CategorySummary {
  name: string;
  count: number;
}

interface ActionState {
  actions: Action[];
  collapsedCategories: string[];
  categoryOrder: string[];
  pinnedActionIds: string[];
  showHidden: boolean;
  bulkMode: boolean;
  selectedActionIds: string[];
  searchQuery: string;
  selectedCategory: ActionCategory;
  isActionEditorOpen: boolean;
  editingAction: Action | null;
  isRunningAction: boolean;
  
  initializeActions: (storage?: IStorageBridge) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ActionCategory) => void;
  setShowHidden: (show: boolean | ((prev: boolean) => boolean)) => void;
  toggleShowHidden: () => void;
  setBulkMode: (bulk: boolean) => void;
  toggleBulkMode: () => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  
  openActionEditor: (action?: Action | null) => void;
  closeActionEditor: () => void;
  saveAction: (action: Omit<Action, 'id'> & { id?: string }) => void;
  createAction: (action: Omit<Action, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAction: (id: string, updates: Partial<Action>) => void;
  renameActionId: (oldId: string, newId: string) => boolean;
  duplicateAction: (id: string) => void;
  toggleActionEnabled: (id: string) => void;
  toggleActionsEnabledBulk: (ids: string[], enabled: boolean) => void;
  executeAction: (id: string, context?: any) => Promise<void>;
  deleteAction: (id: string) => void;
  deleteActionsBulk: (ids: string[]) => void;
  runAction: (action: Action, sandboxApi: any) => Promise<void>;
  
  toggleActionPin: (id: string) => void;
  isActionPinned: (id: string) => boolean;
  toggleCategoryCollapse: (category: string) => void;
  collapseAllCategories: () => void;
  expandAllCategories: () => void;
  moveCategory: (category: string, direction: 'up' | 'down') => void;
  addCategory: (name: string) => boolean;
  renameCategory: (oldName: string, newName: string) => boolean;
  deleteCategory: (category: string, fallbackCategory?: string) => boolean;
  
  getEnabledActions: () => Action[];
  getAllCategories: () => CategorySummary[];
  
  importActions: (jsonString: string) => number;
  exportActions: () => string;
  resetToDefaults: () => void;
}

export const useActionStore = create<ActionState>((set, get) => ({
  actions: [],
  collapsedCategories: [],
  categoryOrder: [],
  pinnedActionIds: [],
  showHidden: true,
  bulkMode: false,
  selectedActionIds: [],
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

      // Load UI State
      const storedUI = await activeStorage.getItem(STORAGE_KEYS.ACTIONS_UI);
      if (storedUI) {
        try {
          const parsedUI: PersistedActionUIState = JSON.parse(storedUI);
          set({
            collapsedCategories: parsedUI.collapsedCategories || [],
            categoryOrder: parsedUI.categoryOrder || [],
            pinnedActionIds: parsedUI.pinnedActionIds || []
          });
        } catch (e) {
          console.error('Failed to parse persisted action UI state', e);
        }
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

  setShowHidden: (show) => {
    set(state => ({
      showHidden: typeof show === 'function' ? show(state.showHidden) : show
    }));
  },

  toggleShowHidden: () => set(state => ({ showHidden: !state.showHidden })),

  setBulkMode: (bulkMode) => {
    set({
      bulkMode,
      selectedActionIds: bulkMode ? get().selectedActionIds : []
    });
  },

  toggleBulkMode: () => {
    const next = !get().bulkMode;
    set({
      bulkMode: next,
      selectedActionIds: next ? get().selectedActionIds : []
    });
  },

  toggleSelection: (id) => {
    set(state => {
      const exists = state.selectedActionIds.includes(id);
      return {
        selectedActionIds: exists
          ? state.selectedActionIds.filter(i => i !== id)
          : [...state.selectedActionIds, id]
      };
    });
  },

  clearSelection: () => set({ selectedActionIds: [] }),

  selectAll: () => {
    set(state => ({
      selectedActionIds: state.actions.map(a => a.id)
    }));
  },

  openActionEditor: (action = null) => {
    useSettingsStore.getState().updateSettings({ showSidebar: true });
    useSettingsStore.getState().setActiveSidebarTab('actions');
    set({ isActionEditorOpen: true, editingAction: action });
  },

  closeActionEditor: () => {
    set({ isActionEditorOpen: false, editingAction: null });
  },

  saveAction: (actionData) => {
    const current = get().actions;
    let updated: Action[];

    if (actionData.id) {
      updated = current.map(a => a.id === actionData.id ? { ...a, ...actionData, updatedAt: Date.now() } as Action : a);
    } else {
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

  renameActionId: (oldId, newId) => {
    if (!newId || oldId === newId) return true;
    const actions = get().actions;
    if (actions.some(a => a.id === newId)) return false;

    const updated = actions.map(a => a.id === oldId ? { ...a, id: newId, updatedAt: Date.now() } : a);
    set({ actions: updated });
    saveActions(updated);
    return true;
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

  toggleActionsEnabledBulk: (ids, enabled) => {
    const updated = get().actions.map(a => ids.includes(a.id) ? { ...a, enabled } : a);
    set({ actions: updated });
    saveActions(updated);
  },

  executeAction: async (id: string, context?: any) => {
    const action = get().actions.find(a => a.id === id);
    if (!action) return;
    await executeActionById(id, context?.view);
  },

  deleteAction: (id) => {
    const updated = get().actions.filter(a => a.id !== id);
    set({ actions: updated });
    saveActions(updated);
  },

  deleteActionsBulk: (ids) => {
    const updated = get().actions.filter(a => !ids.includes(a.id));
    set({
      actions: updated,
      selectedActionIds: get().selectedActionIds.filter(id => !ids.includes(id))
    });
    saveActions(updated);
  },

  runAction: async (action, sandboxApi) => {
    set({ isRunningAction: true });
    try {
      if (action.code && action.code.startsWith('FORMULA:')) {
        await executeActionById(action.id, sandboxApi?.view);
      } else {
        await executeInSandbox(action.code, sandboxApi);
      }
    } catch (e: any) {
      console.error('Action execution failed', e);
      const errorMsg = e?.message || 'Error executing action';
      if (sandboxApi && typeof sandboxApi.notify === 'function') {
        sandboxApi.notify(errorMsg, 'error');
      } else if (sandboxApi && typeof sandboxApi.toast === 'function') {
        sandboxApi.toast(errorMsg, 'error');
      } else {
        useNotificationStore.getState().addNotification(action.name || 'Action Failed', errorMsg, 'error');
      }
    } finally {
      set({ isRunningAction: false });
    }
  },

  toggleActionPin: (id) => {
    set(state => {
      const isPinned = state.pinnedActionIds.includes(id);
      const newPinned = isPinned
        ? state.pinnedActionIds.filter(pId => pId !== id)
        : [...state.pinnedActionIds, id];

      const updatedActions = state.actions.map(a =>
        a.id === id ? { ...a, isPinned: !isPinned } : a
      );

      persistUIState({
        collapsedCategories: state.collapsedCategories,
        categoryOrder: state.categoryOrder,
        pinnedActionIds: newPinned
      });

      return {
        pinnedActionIds: newPinned,
        actions: updatedActions
      };
    });
  },

  isActionPinned: (id) => {
    return get().pinnedActionIds.includes(id);
  },

  toggleCategoryCollapse: (category) => {
    set(state => {
      const isCollapsed = state.collapsedCategories.includes(category);
      const newCollapsed = isCollapsed
        ? state.collapsedCategories.filter(c => c !== category)
        : [...state.collapsedCategories, category];

      persistUIState({
        collapsedCategories: newCollapsed,
        categoryOrder: state.categoryOrder,
        pinnedActionIds: state.pinnedActionIds
      });

      return { collapsedCategories: newCollapsed };
    });
  },

  collapseAllCategories: () => {
    const cats = get().getAllCategories().map(c => c.name);
    set({ collapsedCategories: cats });
    persistUIState({
      collapsedCategories: cats,
      categoryOrder: get().categoryOrder,
      pinnedActionIds: get().pinnedActionIds
    });
  },

  expandAllCategories: () => {
    set({ collapsedCategories: [] });
    persistUIState({
      collapsedCategories: [],
      categoryOrder: get().categoryOrder,
      pinnedActionIds: get().pinnedActionIds
    });
  },

  moveCategory: (category, direction) => {
    const categories = get().getAllCategories().map(c => c.name);
    const order = get().categoryOrder.length > 0 ? [...get().categoryOrder] : [...categories];
    categories.forEach(c => {
      if (!order.includes(c)) order.push(c);
    });

    const index = order.indexOf(category);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [order[index], order[index - 1]] = [order[index - 1], order[index]];
    } else if (direction === 'down' && index < order.length - 1) {
      [order[index], order[index + 1]] = [order[index + 1], order[index]];
    }

    set({ categoryOrder: order });
    persistUIState({
      collapsedCategories: get().collapsedCategories,
      categoryOrder: order,
      pinnedActionIds: get().pinnedActionIds
    });
  },

  addCategory: (name: string) => {
    const cat = name.trim().toUpperCase();
    if (!cat) return false;
    const state = get();
    if (state.categoryOrder.includes(cat)) return true;
    const newOrder = [...state.categoryOrder, cat];
    set({ categoryOrder: newOrder });
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: newOrder,
      pinnedActionIds: state.pinnedActionIds
    });
    return true;
  },

  renameCategory: (oldName: string, newName: string) => {
    const oldCat = oldName.trim().toUpperCase();
    const newCat = newName.trim().toUpperCase();
    if (!oldCat || !newCat || oldCat === newCat) return false;
    const state = get();
    const updatedActions = state.actions.map(a =>
      (a.category || 'GENERAL').toUpperCase() === oldCat
        ? { ...a, category: newCat, updatedAt: Date.now() }
        : a
    );
    const newOrder = state.categoryOrder.map(c => c === oldCat ? newCat : c);
    const newCollapsed = state.collapsedCategories.map(c => c === oldCat ? newCat : c);
    set({
      actions: updatedActions,
      categoryOrder: newOrder,
      collapsedCategories: newCollapsed
    });
    saveActions(updatedActions);
    persistUIState({
      collapsedCategories: newCollapsed,
      categoryOrder: newOrder,
      pinnedActionIds: state.pinnedActionIds
    });
    return true;
  },

  deleteCategory: (category: string, fallback = 'GENERAL') => {
    const targetCat = category.trim().toUpperCase();
    const fallbackCat = fallback.trim().toUpperCase();
    const state = get();
    const updatedActions = state.actions.map(a =>
      (a.category || 'GENERAL').toUpperCase() === targetCat
        ? { ...a, category: fallbackCat, updatedAt: Date.now() }
        : a
    );
    const newOrder = state.categoryOrder.filter(c => c !== targetCat);
    const newCollapsed = state.collapsedCategories.filter(c => c !== targetCat);
    set({
      actions: updatedActions,
      categoryOrder: newOrder,
      collapsedCategories: newCollapsed
    });
    saveActions(updatedActions);
    persistUIState({
      collapsedCategories: newCollapsed,
      categoryOrder: newOrder,
      pinnedActionIds: state.pinnedActionIds
    });
    return true;
  },

  getEnabledActions: () => {
    return get().actions.filter(a => a.enabled !== false);
  },

  getAllCategories: () => {
    const counts = new Map<string, number>();
    const actions = get().actions;
    const order = get().categoryOrder;

    actions.forEach(a => {
      const cat = (a.category || 'GENERAL').toUpperCase();
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    order.forEach(cat => {
      if (!counts.has(cat)) {
        counts.set(cat, 0);
      }
    });

    const categories: CategorySummary[] = Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count
    }));

    if (order.length > 0) {
      categories.sort((a, b) => {
        const aIndex = order.indexOf(a.name);
        const bIndex = order.indexOf(b.name);
        if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    } else {
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    return categories;
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
    const resetActions = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_ACTIONS : [];
    set({ actions: resetActions });
    saveActions(resetActions);
  }
}));

function saveActions(actions: Action[]) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.ACTIONS, JSON.stringify(actions), 'actions');
}

function persistUIState(uiState: PersistedActionUIState) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.ACTIONS_UI, JSON.stringify(uiState), 'actions UI state');
}
