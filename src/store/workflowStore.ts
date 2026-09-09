import { create } from 'zustand';
import { PinnedTab } from '../types';
import { DEFAULT_PINNED_TABS } from '../constants/defaultData';

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
  initializeWorkflows: () => void;
}

const STORAGE_KEY = 'contextpad_workflows';

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  searchQuery: '',
  selectedCategory: 'All',

  initializeWorkflows: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        set({ workflows: JSON.parse(stored) });
      } else {
        set({ workflows: DEFAULT_PINNED_TABS });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PINNED_TABS));
      }
    } catch (e) {
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
  } catch (e) {
    console.error('Failed to save workflows', e);
  }
}
