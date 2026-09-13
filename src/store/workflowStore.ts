import { create } from 'zustand';
import { PinnedTab } from '../../contracts/data_shapes';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_PINNED_TABS, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';

let activeStorage: IStorageBridge | null = null;

interface WorkflowState {
  workflows: PinnedTab[];
  searchQuery: string;
  selectedCategory: string;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  createWorkflow: (item: Omit<PinnedTab, 'id' | 'createdAt'>) => PinnedTab;
  updateWorkflow: (id: string, updates: Partial<PinnedTab>) => void;
  deleteWorkflow: (id: string) => void;
  toggleHideWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;
  reorderWorkflows: (sourceIdx: number, destIdx: number) => void;
  importWorkflows: (imported: PinnedTab[]) => number;
  exportWorkflows: () => string;
  resetToDefaults: () => void;
  initializeWorkflows: (storage?: IStorageBridge) => Promise<void>;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  searchQuery: '',
  selectedCategory: 'All',

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

  createWorkflow: (itemData) => {
    const newItem: PinnedTab = {
      ...itemData,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
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
  },

  deleteWorkflow: (id) => {
    const updated = get().workflows.filter(item => item.id !== id);
    set({ workflows: updated });
    saveWorkflows(updated);
  },

  toggleHideWorkflow: (id) => {
    const updated = get().workflows.map(item => item.id === id ? { ...item, isHidden: !item.isHidden } : item);
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
    set({ workflows: DEFAULT_PINNED_TABS });
    saveWorkflows(DEFAULT_PINNED_TABS);
  }
}));

function saveWorkflows(workflows: PinnedTab[]) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows), 'workflows');
}
