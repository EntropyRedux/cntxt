import { create } from 'zustand';
import { Template } from '../../contracts/data_shapes';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_TEMPLATES, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';

let activeStorage: IStorageBridge | null = null;

interface TemplateState {
  templates: Template[];
  searchQuery: string;
  selectedCategory: string;
  isVariableModalOpen: boolean;
  activeTemplateForModal: Template | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  createTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'variables'>) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  togglePinTemplate: (id: string) => void;
  openVariableModal: (template?: Template) => void;
  closeVariableModal: () => void;
  extractVariables: (content: string) => string[];
  importTemplates: (imported: Template[]) => number;
  exportTemplates: () => string;
  resetToDefaults: () => void;
  initializeTemplates: (storage?: IStorageBridge) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  searchQuery: '',
  selectedCategory: 'All',
  isVariableModalOpen: false,
  activeTemplateForModal: null,

  initializeTemplates: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ templates: DEFAULT_TEMPLATES });
      }
      return;
    }

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (stored) {
        const parsed: Template[] = JSON.parse(stored);
        set({ templates: parsed });
      } else if (IS_PROTOTYPE_DEMO_MODE) {
        set({ templates: DEFAULT_TEMPLATES });
        await activeStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      } else {
        set({ templates: [] });
      }
    } catch {
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ templates: DEFAULT_TEMPLATES });
      } else {
        set({ templates: [] });
      }
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),

  createTemplate: (templateData) => {
    const variables = get().extractVariables(templateData.content);
    const newTemplate: Template = {
      ...templateData,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      variables,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const updated = [newTemplate, ...get().templates];
    set({ templates: updated });
    saveTemplates(updated);
    return newTemplate;
  },

  updateTemplate: (id, updates) => {
    const updated = get().templates.map(tmpl => {
      if (tmpl.id === id) {
        const newContent = updates.content !== undefined ? updates.content : tmpl.content;
        const variables = get().extractVariables(newContent);
        return {
          ...tmpl,
          ...updates,
          variables,
          updatedAt: Date.now()
        };
      }
      return tmpl;
    });

    set({ templates: updated });
    saveTemplates(updated);
  },

  deleteTemplate: (id) => {
    const updated = get().templates.filter(t => t.id !== id);
    set({ templates: updated });
    saveTemplates(updated);
  },

  duplicateTemplate: (id) => {
    const source = get().templates.find(t => t.id === id);
    if (!source) return;

    get().createTemplate({
      name: `${source.name} (Copy)`,
      description: source.description,
      content: source.content,
      category: source.category,
      isPinned: source.isPinned
    });
  },

  togglePinTemplate: (id) => {
    const updated = get().templates.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t);
    set({ templates: updated });
    saveTemplates(updated);
  },

  openVariableModal: (template) => {
    set({ isVariableModalOpen: true, activeTemplateForModal: template || null });
  },

  closeVariableModal: () => {
    set({ isVariableModalOpen: false, activeTemplateForModal: null });
  },

  extractVariables: (content: string): string[] => {
    if (!content) return [];
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = Array.from(content.matchAll(regex));
    const rawVars = matches.map(m => m[1].trim());
    return Array.from(new Set(rawVars));
  },

  importTemplates: (imported) => {
    if (!Array.isArray(imported)) return 0;
    const current = get().templates;
    const valid = imported.filter(item => item && item.name && item.content);
    const combined = [...valid, ...current];
    // Deduplicate by name/id
    const unique = Array.from(new Map(combined.map(item => [item.id || item.name, item])).values());
    
    set({ templates: unique });
    saveTemplates(unique);
    return valid.length;
  },

  exportTemplates: () => {
    return JSON.stringify(get().templates, null, 2);
  },

  resetToDefaults: () => {
    set({ templates: DEFAULT_TEMPLATES });
    saveTemplates(DEFAULT_TEMPLATES);
  }
}));

function saveTemplates(templates: Template[]) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.TEMPLATES, JSON.stringify(templates), 'templates');
}
