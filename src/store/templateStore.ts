import { create } from 'zustand';
import { Template, PersistedTemplateUIState } from '../../contracts/data_shapes';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { DEFAULT_TEMPLATES, IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';
import { extractTemplateVariables } from '../services/editor/templateVariableService';

let activeStorage: IStorageBridge | null = null;

export interface CategorySummary {
  name: string;
  count: number;
}

export interface ImportPreviewResult {
  addedCount: number;
  skippedCount: number;
  duplicates: string[];
  newTemplates: Template[];
}

interface TemplateState {
  templates: Template[];
  collapsedCategories: string[];
  categoryOrder: string[];
  pinnedTemplateIds: string[];
  showHidden: boolean;
  bulkMode: boolean;
  selectedTemplateIds: string[];
  searchQuery: string;
  selectedCategory: string;
  isVariableModalOpen: boolean;
  activeTemplateForModal: Template | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setShowHidden: (show: boolean | ((prev: boolean) => boolean)) => void;
  toggleShowHidden: () => void;
  setBulkMode: (bulk: boolean) => void;
  toggleBulkMode: () => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  createTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'variables'> & { id?: string }) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  renameTemplateId: (oldId: string, newId: string) => boolean;
  deleteTemplate: (id: string) => void;
  deleteTemplatesBulk: (ids: string[]) => void;
  duplicateTemplate: (id: string) => void;

  togglePinTemplate: (id: string) => void;
  toggleTemplateVisibility: (id: string) => void;
  toggleTemplatesVisibilityBulk: (ids: string[], isHidden: boolean) => void;
  toggleCategoryCollapse: (category: string) => void;
  moveCategory: (category: string, direction: 'up' | 'down') => void;

  getAllCategories: () => CategorySummary[];
  getVisibleTemplates: () => Template[];
  isTemplatePinned: (id: string) => boolean;

  openVariableModal: (template?: Template) => void;
  closeVariableModal: () => void;
  extractVariables: (content: string) => string[];

  previewImportTemplates: (jsonOrArray: string | any[]) => ImportPreviewResult;
  commitImportTemplates: (templatesToAdd: Template[]) => number;
  importTemplates: (imported: Template[] | string) => number;
  exportTemplates: () => string;
  resetToDefaults: () => void;
  initializeTemplates: (storage?: IStorageBridge) => Promise<void>;
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  collapsedCategories: [],
  categoryOrder: [],
  pinnedTemplateIds: [],
  showHidden: true,
  bulkMode: false,
  selectedTemplateIds: [],
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
      // 1. Load templates
      const stored = await activeStorage.getItem(STORAGE_KEYS.TEMPLATES);
      let templates: Template[] = [];
      if (stored) {
        templates = JSON.parse(stored);
      } else if (IS_PROTOTYPE_DEMO_MODE) {
        templates = DEFAULT_TEMPLATES;
        await activeStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      }

      // 2. Load persisted UI state (category order, collapsed categories, pinned items)
      let uiState: PersistedTemplateUIState = {
        collapsedCategories: [],
        categoryOrder: [],
        pinnedTemplateIds: [],
        showHidden: true
      };

      try {
        const storedUI = await activeStorage.getItem(STORAGE_KEYS.TEMPLATES_UI);
        if (storedUI) {
          uiState = { ...uiState, ...JSON.parse(storedUI) };
        }
      } catch (err) {
        console.warn('Failed to parse templates UI state:', err);
      }

      // Ensure isPinned flags sync with pinnedTemplateIds
      const pinnedSet = new Set(uiState.pinnedTemplateIds || []);
      const syncedTemplates = templates.map(t => ({
        ...t,
        category: (t.category || 'GENERAL').toUpperCase(),
        isPinned: t.isPinned ?? pinnedSet.has(t.id),
        isHidden: t.isHidden ?? false
      }));

      set({
        templates: syncedTemplates,
        collapsedCategories: uiState.collapsedCategories || [],
        categoryOrder: uiState.categoryOrder || [],
        pinnedTemplateIds: Array.from(pinnedSet),
        showHidden: uiState.showHidden !== undefined ? uiState.showHidden : true
      });
    } catch (e) {
      console.error('Error initializing templates:', e);
      if (IS_PROTOTYPE_DEMO_MODE) {
        set({ templates: DEFAULT_TEMPLATES });
      } else {
        set({ templates: [] });
      }
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setShowHidden: (show) => {
    set((state) => {
      const showHidden = typeof show === 'function' ? show(state.showHidden) : show;
      persistUIState({
        collapsedCategories: state.collapsedCategories,
        categoryOrder: state.categoryOrder,
        pinnedTemplateIds: state.pinnedTemplateIds,
        showHidden
      });
      return { showHidden };
    });
  },
  toggleShowHidden: () => {
    set((state) => {
      const showHidden = !state.showHidden;
      persistUIState({
        collapsedCategories: state.collapsedCategories,
        categoryOrder: state.categoryOrder,
        pinnedTemplateIds: state.pinnedTemplateIds,
        showHidden
      });
      return { showHidden };
    });
  },

  setBulkMode: (bulkMode) => set({ bulkMode, selectedTemplateIds: bulkMode ? get().selectedTemplateIds : [] }),
  toggleBulkMode: () => set((state) => ({ bulkMode: !state.bulkMode, selectedTemplateIds: !state.bulkMode ? state.selectedTemplateIds : [] })),
  toggleSelection: (id) => {
    set((state) => {
      const exists = state.selectedTemplateIds.includes(id);
      const selectedTemplateIds = exists
        ? state.selectedTemplateIds.filter(item => item !== id)
        : [...state.selectedTemplateIds, id];
      return { selectedTemplateIds };
    });
  },
  clearSelection: () => set({ selectedTemplateIds: [] }),
  selectAll: () => set((state) => ({ selectedTemplateIds: state.templates.map(t => t.id) })),

  createTemplate: (templateData) => {
    const variables = extractTemplateVariables(templateData.content);
    const category = (templateData.category || 'GENERAL').trim().toUpperCase();
    const newTemplate: Template = {
      ...templateData,
      id: templateData.id || `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      category,
      variables,
      isHidden: templateData.isHidden ?? false,
      isPinned: templateData.isPinned ?? false,
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
        const variables = extractTemplateVariables(newContent);
        const category = updates.category ? updates.category.trim().toUpperCase() : tmpl.category;
        return {
          ...tmpl,
          ...updates,
          category,
          variables,
          updatedAt: Date.now()
        };
      }
      return tmpl;
    });

    set({ templates: updated });
    saveTemplates(updated);
  },

  renameTemplateId: (oldId, newId) => {
    const state = get();
    if (state.templates.some(t => t.id === newId)) {
      return false;
    }

    const updated = state.templates.map(t =>
      t.id === oldId ? { ...t, id: newId, updatedAt: Date.now() } : t
    );
    const pinnedTemplateIds = state.pinnedTemplateIds.map(id => id === oldId ? newId : id);
    const selectedTemplateIds = state.selectedTemplateIds.map(id => id === oldId ? newId : id);

    set({ templates: updated, pinnedTemplateIds, selectedTemplateIds });
    saveTemplates(updated);
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: state.categoryOrder,
      pinnedTemplateIds,
      showHidden: state.showHidden
    });
    return true;
  },

  deleteTemplate: (id) => {
    const state = get();
    const updated = state.templates.filter(t => t.id !== id);
    const pinnedTemplateIds = state.pinnedTemplateIds.filter(item => item !== id);
    const selectedTemplateIds = state.selectedTemplateIds.filter(item => item !== id);

    set({ templates: updated, pinnedTemplateIds, selectedTemplateIds });
    saveTemplates(updated);
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: state.categoryOrder,
      pinnedTemplateIds,
      showHidden: state.showHidden
    });
  },

  deleteTemplatesBulk: (ids) => {
    const state = get();
    const idSet = new Set(ids);
    const updated = state.templates.filter(t => !idSet.has(t.id));
    const pinnedTemplateIds = state.pinnedTemplateIds.filter(id => !idSet.has(id));
    const selectedTemplateIds = state.selectedTemplateIds.filter(id => !idSet.has(id));

    set({ templates: updated, pinnedTemplateIds, selectedTemplateIds });
    saveTemplates(updated);
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: state.categoryOrder,
      pinnedTemplateIds,
      showHidden: state.showHidden
    });
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
    const state = get();
    const isCurrentlyPinned = state.pinnedTemplateIds.includes(id);
    const pinnedTemplateIds = isCurrentlyPinned
      ? state.pinnedTemplateIds.filter(item => item !== id)
      : [...state.pinnedTemplateIds, id];

    const updated = state.templates.map(t =>
      t.id === id ? { ...t, isPinned: !isCurrentlyPinned } : t
    );

    set({ templates: updated, pinnedTemplateIds });
    saveTemplates(updated);
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: state.categoryOrder,
      pinnedTemplateIds,
      showHidden: state.showHidden
    });
  },

  toggleTemplateVisibility: (id) => {
    const updated = get().templates.map(t =>
      t.id === id ? { ...t, isHidden: !t.isHidden } : t
    );
    set({ templates: updated });
    saveTemplates(updated);
  },

  toggleTemplatesVisibilityBulk: (ids, isHidden) => {
    const idSet = new Set(ids);
    const updated = get().templates.map(t =>
      idSet.has(t.id) ? { ...t, isHidden } : t
    );
    set({ templates: updated });
    saveTemplates(updated);
  },

  toggleCategoryCollapse: (category) => {
    const state = get();
    const catUpper = category.toUpperCase();
    const current = new Set(state.collapsedCategories);
    if (current.has(catUpper)) {
      current.delete(catUpper);
    } else {
      current.add(catUpper);
    }
    const collapsedCategories = Array.from(current);

    set({ collapsedCategories });
    persistUIState({
      collapsedCategories,
      categoryOrder: state.categoryOrder,
      pinnedTemplateIds: state.pinnedTemplateIds,
      showHidden: state.showHidden
    });
  },

  moveCategory: (category, direction) => {
    const state = get();
    const catUpper = category.toUpperCase();
    const allCategories = state.getAllCategories().map(c => c.name);
    let order = state.categoryOrder.length > 0 ? [...state.categoryOrder] : [...allCategories];

    allCategories.forEach(c => {
      if (!order.includes(c)) order.push(c);
    });

    const index = order.indexOf(catUpper);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      [order[index], order[index - 1]] = [order[index - 1], order[index]];
    } else if (direction === 'down' && index < order.length - 1) {
      [order[index], order[index + 1]] = [order[index + 1], order[index]];
    }

    set({ categoryOrder: order });
    persistUIState({
      collapsedCategories: state.collapsedCategories,
      categoryOrder: order,
      pinnedTemplateIds: state.pinnedTemplateIds,
      showHidden: state.showHidden
    });
  },

  getAllCategories: () => {
    const { templates, categoryOrder } = get();
    const categoryMap = new Map<string, number>();

    templates.forEach(t => {
      const cat = (t.category || 'GENERAL').toUpperCase();
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });

    const categories: CategorySummary[] = Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count
    }));

    if (categoryOrder.length > 0) {
      categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.name);
        const indexB = categoryOrder.indexOf(b.name);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
    } else {
      categories.sort((a, b) => a.name.localeCompare(b.name));
    }

    return categories;
  },

  getVisibleTemplates: () => {
    return get().templates.filter(t => !t.isHidden);
  },

  isTemplatePinned: (id) => {
    return get().pinnedTemplateIds.includes(id);
  },

  openVariableModal: (template) => {
    set({ isVariableModalOpen: true, activeTemplateForModal: template || null });
  },

  closeVariableModal: () => {
    set({ isVariableModalOpen: false, activeTemplateForModal: null });
  },

  extractVariables: (content: string): string[] => {
    return extractTemplateVariables(content);
  },

  previewImportTemplates: (jsonOrArray) => {
    let rawItems: any[] = [];
    if (typeof jsonOrArray === 'string') {
      try {
        const parsed = JSON.parse(jsonOrArray);
        rawItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.templates) ? parsed.templates : []);
      } catch {
        return { addedCount: 0, skippedCount: 0, duplicates: [], newTemplates: [] };
      }
    } else if (Array.isArray(jsonOrArray)) {
      rawItems = jsonOrArray;
    }

    const currentTemplates = get().templates;
    const duplicates: string[] = [];
    const newTemplates: Template[] = [];

    rawItems.forEach(t => {
      if (!t || !t.name || !t.content) return;
      const isDuplicate = currentTemplates.some(
        curr => curr.name.trim().toLowerCase() === String(t.name).trim().toLowerCase()
      );

      if (isDuplicate) {
        duplicates.push(t.name);
      }

      newTemplates.push({
        id: t.id || `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: t.name,
        description: t.description || '',
        category: (t.category || 'GENERAL').toUpperCase(),
        content: t.content,
        variables: Array.isArray(t.variables) ? t.variables : extractTemplateVariables(t.content),
        isHidden: Boolean(t.isHidden),
        isPinned: Boolean(t.isPinned),
        createdAt: t.createdAt || Date.now(),
        updatedAt: Date.now()
      });
    });

    return {
      addedCount: newTemplates.length,
      skippedCount: duplicates.length,
      duplicates,
      newTemplates
    };
  },

  commitImportTemplates: (templatesToAdd) => {
    if (!templatesToAdd || templatesToAdd.length === 0) return 0;
    const current = get().templates;
    const combined = [...templatesToAdd, ...current];
    // Deduplicate by ID
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

    set({ templates: unique });
    saveTemplates(unique);
    return templatesToAdd.length;
  },

  importTemplates: (imported) => {
    const preview = get().previewImportTemplates(imported);
    if (preview.newTemplates.length > 0) {
      return get().commitImportTemplates(preview.newTemplates);
    }
    return 0;
  },

  exportTemplates: () => {
    return JSON.stringify({
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: get().templates
    }, null, 2);
  },

  resetToDefaults: () => {
    const resetTemplates = IS_PROTOTYPE_DEMO_MODE ? DEFAULT_TEMPLATES : [];
    set({ templates: resetTemplates });
    saveTemplates(resetTemplates);
  }
}));

function saveTemplates(templates: Template[]) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.TEMPLATES, JSON.stringify(templates), 'templates');
}

function persistUIState(uiState: PersistedTemplateUIState) {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.TEMPLATES_UI, JSON.stringify(uiState), 'templates UI state');
}
