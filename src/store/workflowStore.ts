import { create } from 'zustand';
import { PinnedTab } from '../types';
import { DEFAULT_PINNED_TABS } from '../constants/defaultData';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';

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
  workflows: DEFAULT_PINNED_TABS,
  searchQuery: '',
  selectedCategory: 'All',

  initializeWorkflows: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) return;

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.WORKFLOWS);
      if (stored) {
        set({ workflows: JSON.parse(stored) });
      } else {
        set({ workflows: DEFAULT_PINNED_TABS });
        await activeStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(DEFAULT_PINNED_TABS));
      }
    } catch {
      set({ workflows: DEFAULT_PINNED_TABS });
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
  try {
    activeStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows)).catch(() => {});
  } catch (e) {
    console.error('Failed to save workflows', e);
  }
}
