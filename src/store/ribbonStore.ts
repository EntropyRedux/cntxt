import { create } from 'zustand';
import { RibbonItem, RibbonItemType } from '../types';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { safePersist } from '../services/storageHelper';

let activeStorage: IStorageBridge | null = null;

export const DEFAULT_RIBBON_ITEMS: RibbonItem[] = [
  {
    id: 'rb_fill_vars',
    label: 'Fill Variables',
    icon: 'Variable',
    type: 'tool',
    targetId: 'variable-modal',
    color: 'accent',
    shortcut: 'Alt+V',
    tooltip: 'Scan document and substitute {{variable}} tags',
    enabled: true,
    showLabel: false,
    order: 0,
  },
  {
    id: 'rb_token_stats',
    label: 'Token Inspector',
    icon: 'Zap',
    type: 'tool',
    targetId: 'tokens',
    color: 'amber',
    tooltip: 'Inspect LLM token count and model context budgets',
    enabled: true,
    showLabel: false,
    order: 1,
  },
  {
    id: 'rb_outline',
    label: 'Outline',
    icon: 'ListTree',
    type: 'tool',
    targetId: 'outline',
    color: 'cyan',
    tooltip: 'Jump between headings in document structure',
    enabled: true,
    showLabel: false,
    order: 2,
  },
  {
    id: 'rb_templates',
    label: 'Templates',
    icon: 'FileText',
    type: 'tool',
    targetId: 'templates',
    color: 'purple',
    tooltip: 'Browse and insert context prompt templates',
    enabled: true,
    showLabel: false,
    order: 3,
  },
  {
    id: 'rb_sep_1',
    label: 'Separator',
    icon: 'Minus',
    type: 'separator',
    enabled: true,
    showLabel: false,
    order: 4,
  },
  {
    id: 'rb_clean_markdown',
    label: 'Clean Markdown',
    icon: 'Sparkles',
    type: 'action',
    targetId: 'act_clean_markdown',
    color: 'rose',
    tooltip: 'Format whitespace and normalize headings',
    enabled: true,
    showLabel: false,
    order: 5,
  },
  {
    id: 'rb_format_json',
    label: 'Format JSON',
    icon: 'Braces',
    type: 'action',
    targetId: 'act_format_json',
    color: 'amber',
    tooltip: 'Beautify JSON structures',
    enabled: true,
    showLabel: false,
    order: 6,
  },
  {
    id: 'rb_sep_2',
    label: 'Separator',
    icon: 'Minus',
    type: 'separator',
    enabled: true,
    showLabel: false,
    order: 7,
  },
  {
    id: 'rb_insert_image',
    label: 'Insert Image',
    icon: 'Image',
    type: 'tool',
    targetId: 'insert-image-modal',
    color: 'emerald',
    tooltip: 'Insert image from local file or web URL (or paste with Ctrl+V)',
    enabled: true,
    showLabel: false,
    order: 8,
  },
  {
    id: 'rb_insert_var',
    label: 'Insert Variable',
    icon: 'Variable',
    type: 'formatting',
    targetId: 'fmt_variable',
    color: 'accent',
    tooltip: 'Wrap selected text or insert variable placeholder {{variable}}',
    enabled: true,
    showLabel: false,
    order: 9,
  }
];

const STORAGE_KEY = 'contextpad_modular_ribbon';

interface RibbonState {
  items: RibbonItem[];
  isCustomizerOpen: boolean;
  
  // Actions
  openCustomizer: () => void;
  closeCustomizer: () => void;
  addItem: (itemData: Omit<RibbonItem, 'id' | 'order'>) => RibbonItem;
  updateItem: (id: string, updates: Partial<RibbonItem>) => void;
  removeItem: (id: string) => void;
  removeItemByTarget: (targetId: string, type?: RibbonItemType) => void;
  toggleItem: (id: string) => void;
  toggleItemLabel: (id: string) => void;
  addSeparator: () => RibbonItem;
  reorderItems: (sourceIndex: number, destinationIndex: number) => void;
  moveItemUp: (id: string) => void;
  moveItemDown: (id: string) => void;
  resetToDefaults: () => void;
  initializeRibbon: (storage?: IStorageBridge) => Promise<void>;
}

const saveRibbonToStorage = (items: RibbonItem[]) => {
  if (!activeStorage) return;
  safePersist(activeStorage, STORAGE_KEYS.RIBBON, JSON.stringify(items), 'ribbon items');
};

export const useRibbonStore = create<RibbonState>((set, get) => ({
  items: DEFAULT_RIBBON_ITEMS,
  isCustomizerOpen: false,

  initializeRibbon: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) return;

    try {
      const stored = await activeStorage.getItem(STORAGE_KEYS.RIBBON);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validItems = parsed.filter(
            (item: any) => item && typeof item.id === 'string' && typeof item.order === 'number'
          ) as RibbonItem[];
          if (validItems.length > 0) {
            set({ items: validItems.sort((a, b) => a.order - b.order) });
            return;
          }
        }
      }
    } catch {
      console.warn('Failed to parse stored ribbon items, using defaults');
    }
    set({ items: DEFAULT_RIBBON_ITEMS });
    saveRibbonToStorage(DEFAULT_RIBBON_ITEMS);
  },

  openCustomizer: () => set({ isCustomizerOpen: true }),
  closeCustomizer: () => set({ isCustomizerOpen: false }),

  addItem: (itemData) => {
    const current = get().items;
    const newItem: RibbonItem = {
      ...itemData,
      id: `rb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order: current.length,
      enabled: itemData.enabled !== undefined ? itemData.enabled : true,
      showLabel: itemData.showLabel !== undefined ? itemData.showLabel : false
    };
    const updated = [...current, newItem].sort((a, b) => a.order - b.order);
    set({ items: updated });
    saveRibbonToStorage(updated);
    return newItem;
  },

  updateItem: (id, updates) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({ items: updated });
    saveRibbonToStorage(updated);
  },

  removeItem: (id) => {
    const filtered = get().items.filter(item => item.id !== id);
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx }));
    set({ items: reordered });
    saveRibbonToStorage(reordered);
  },

  removeItemByTarget: (targetId, type) => {
    const filtered = get().items.filter(item => {
      if (type) return !(item.targetId === targetId && item.type === type);
      return item.targetId !== targetId;
    });
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx }));
    set({ items: reordered });
    saveRibbonToStorage(reordered);
  },

  toggleItem: (id) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    set({ items: updated });
    saveRibbonToStorage(updated);
  },

  toggleItemLabel: (id) => {
    const updated = get().items.map((item) =>
      item.id === id ? { ...item, showLabel: !item.showLabel } : item
    );
    set({ items: updated });
    saveRibbonToStorage(updated);
  },

  addSeparator: () => {
    const current = get().items;
    const newSeparator: RibbonItem = {
      id: `rb_sep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: 'Separator',
      icon: 'Minus',
      type: 'separator',
      order: current.length,
      enabled: true,
      showLabel: false
    };
    const updated = [...current, newSeparator].sort((a, b) => a.order - b.order);
    set({ items: updated });
    saveRibbonToStorage(updated);
    return newSeparator;
  },

  reorderItems: (sourceIndex, destinationIndex) => {
    const items = [...get().items];
    const [removed] = items.splice(sourceIndex, 1);
    items.splice(destinationIndex, 0, removed);
    const reordered = items.map((item, idx) => ({ ...item, order: idx }));
    set({ items: reordered });
    saveRibbonToStorage(reordered);
  },

  moveItemUp: (id) => {
    const items = [...get().items];
    const index = items.findIndex(i => i.id === id);
    if (index > 0) {
      const temp = items[index];
      items[index] = items[index - 1];
      items[index - 1] = temp;
      const reordered = items.map((item, idx) => ({ ...item, order: idx }));
      set({ items: reordered });
      saveRibbonToStorage(reordered);
    }
  },

  moveItemDown: (id) => {
    const items = [...get().items];
    const index = items.findIndex(i => i.id === id);
    if (index >= 0 && index < items.length - 1) {
      const temp = items[index];
      items[index] = items[index + 1];
      items[index + 1] = temp;
      const reordered = items.map((item, idx) => ({ ...item, order: idx }));
      set({ items: reordered });
      saveRibbonToStorage(reordered);
    }
  },

  resetToDefaults: () => {
    set({ items: DEFAULT_RIBBON_ITEMS });
    saveRibbonToStorage(DEFAULT_RIBBON_ITEMS);
  }
}));
