import { create } from 'zustand';
import { PinnedTab } from '../../contracts/data_shapes';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_PINNED_TABS, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';
import { useRibbonStore } from './ribbonStore';

let activeStorage: IStorageBridge | null = null;

interface WorkflowState {
  workflows: PinnedTab[];
  searchQuery: string;
  selectedCategory: string;
  collapsedCategories: string[];
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  toggleCategoryCollapse: (category: string) => void;
  isCategoryCollapsed: (category: string) => boolean;

  createWorkflow: (item: Omit<PinnedTab, 'id' | 'createdAt'>) => PinnedTab;
  updateWorkflow: (id: string, updates: Partial<PinnedTab>) => void;
  deleteWorkflow: (id: string) => void;
  toggleHideWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;
  reorderWorkflows: (sourceIdx: number, destIdx: number) => void;
  
  // Bulk operations
  bulkDeleteWorkflows: (ids: string[]) => void;
  bulkToggleHideWorkflows: (ids: string[], hide?: boolean) => void;

  // Ribbon synchronization
  isPinnedToRibbon: (id: string) => boolean;
  togglePinToRibbon: (id: string) => void;

  importWorkflows: (imported: PinnedTab[]) => number;
  exportWorkflows: () => string;
  resetToDefaults: () => void;
  initializeWorkflows: (storage?: IStorageBridge) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  searchQuery: '',
  selectedCategory: 'All',
  collapsedCategories: [],

  initializeWorkflows: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ workflows: DEFAULT_PINNED_TABS });
      }
      return;
    }

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.WORKFLOWS);
      if (stored) {
        set({ workflows: JSON.parse(stored) });
      } else if (IS_PROTOTYPE_DEMO_MODE) {
        set({ workflows: DEFAULT_PINNED_TABS });
        await activeStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(DEFAULT_PINNED_TABS));
      } else {
        set({ workflows: [] });
      }
    } catch {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ workflows: DEFAULT_PINNED_TABS });
      } else {
        set({ workflows: [] });
      }
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  toggleCategoryCollapse: (category) => {
    const collapsed = get().collapsedCategories;
    const exists = collapsed.includes(category);
    const updated = exists 
      ? collapsed.filter(c => c !== category)
      : [...collapsed, category];
    set({ collapsedCategories: updated });
  },

  isCategoryCollapsed: (category) => {
    return get().collapsedCategories.includes(category);
  },

  createWorkflow: (itemData) => {
    const newItem: PinnedTab = {
      isHidden: false,
      ...itemData,
      id: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: Date.now()
    };

    const updated = [newItem, ...get().workflows];
    set({ workflows: updated });
    saveWorkflows(updated);
    return newItem;
  },

  updateWorkflow: (id, updates) => {
    const updated = get().workflows.map(item => item.id === id ? { ...item, ...updates } : item);
    set({ workflows: updated });
    saveWorkflows(updated);

    // Synchronize updates with ribbon item if pinned
    const ribbonStore = useRibbonStore.getState();
    const ribbonItem = ribbonStore.items.find(i => i.type === 'workflow' && i.targetId === id);
    if (ribbonItem) {
      ribbonStore.updateItem(ribbonItem.id, {
        label: updates.name ?? ribbonItem.label,
        icon: updates.icon ?? ribbonItem.icon,
        tooltip: `${(updates.type ?? 'workflow') === 'bookmark' ? 'Bookmark' : 'Workflow Blueprint'}: ${updates.name ?? ribbonItem.label}`
      });
    }
  },

  deleteWorkflow: (id) => {
    const updated = get().workflows.filter(item => item.id !== id);
    set({ workflows: updated });
    saveWorkflows(updated);
    useRibbonStore.getState().removeItemByTarget(id, 'workflow');
  },

  bulkDeleteWorkflows: (ids) => {
    const idSet = new Set(ids);
    const updated = get().workflows.filter(item => !idSet.has(item.id));
    set({ workflows: updated });
    saveWorkflows(updated);
    ids.forEach(id => useRibbonStore.getState().removeItemByTarget(id, 'workflow'));
  },

  toggleHideWorkflow: (id) => {
    const updated = get().workflows.map(item => item.id === id ? { ...item, isHidden: !item.isHidden } : item);
    set({ workflows: updated });
    saveWorkflows(updated);
  },

  bulkToggleHideWorkflows: (ids, hide) => {
    const idSet = new Set(ids);
    const updated = get().workflows.map(item => {
      if (idSet.has(item.id)) {
        return { ...item, isHidden: hide !== undefined ? hide : !item.isHidden };
      }
      return item;
    });
    set({ workflows: updated });
    saveWorkflows(updated);
  },

  duplicateWorkflow: (id) => {
    const source = get().workflows.find(w => w.id === id);
    if (!source) return;

    get().createWorkflow({
      name: `${source.name} (Copy)`,
      icon: source.icon,
      type: source.type,
      content: source.content,
      filePath: source.filePath,
      category: source.category
    });
  },

  reorderWorkflows: (sourceIdx, destIdx) => {
    const result = Array.from(get().workflows);
    const [removed] = result.splice(sourceIdx, 1);
    result.splice(destIdx, 0, removed);
    set({ workflows: result });
    saveWorkflows(result);
  },

  isPinnedToRibbon: (id) => {
    return useRibbonStore.getState().items.some(
      item => item.type === 'workflow' && item.targetId === id
    );
  },

  togglePinToRibbon: (id) => {
    const isPinned = get().isPinnedToRibbon(id);
    const ribbonStore = useRibbonStore.getState();

    if (isPinned) {
      ribbonStore.removeItemByTarget(id, 'workflow');
    } else {
      const wf = get().workflows.find(w => w.id === id);
      if (wf) {
        ribbonStore.addItem({
          label: wf.name,
          icon: wf.icon || (wf.type === 'bookmark' ? 'Bookmark' : 'Workflow'),
          type: 'workflow',
          targetId: wf.id,
          color: wf.type === 'bookmark' ? 'amber' : 'purple',
          tooltip: `${wf.type === 'bookmark' ? 'Bookmark' : 'Workflow Blueprint'}: ${wf.name}`,
          enabled: true
        });
      }
    }
  },

  importWorkflows: (imported) => {
    if (!Array.isArray(imported)) return 0;
    const current = get().workflows;
    const valid = imported.filter(item => item && item.name && (item.content || item.filePath));
    const combined = [...valid, ...current];
    const unique = Array.from(new Map(combined.map(item => [item.id || item.name, item])).values());
    
    set({ workflows: unique });
    saveWorkflows(unique);
    return valid.length;
  },

  exportWorkflows: () => {
    return JSON.stringify(get().workflows, null, 2);
  },

  resetToDefaults: () => {
    const resetWorkflows = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_PINNED_TABS : [];
    set({ workflows: resetWorkflows });
    saveWorkflows(resetWorkflows);
  }
}));

function saveWorkflows(workflows: PinnedTab[]) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows), 'workflows');
}
