import { create } from 'zustand';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';

export interface PinnedItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string;
  language?: string;
  content?: string;
}

export interface OpenedFileRecord {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path?: string | null;
  language?: string;
  content?: string;
  openedAt: number;
}

const DEFAULT_PINNED_ITEMS: PinnedItem[] = [
  {
    id: 'folder-specs',
    name: 'specifications',
    type: 'folder'
  },
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    type: 'file',
    language: 'markdown'
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    type: 'file',
    language: 'json'
  }
];

const DEFAULT_OPENED_HISTORY: OpenedFileRecord[] = [
  {
    id: 'folder-specs',
    name: 'specifications',
    type: 'folder',
    openedAt: Date.now() - 1000 * 60 * 2
  },
  {
    id: 'f-welcome',
    name: 'Welcome.md',
    type: 'file',
    language: 'markdown',
    openedAt: Date.now() - 1000 * 60 * 4
  },
  {
    id: 'f-draft',
    name: 'draft_system_prompt.md',
    type: 'file',
    language: 'markdown',
    openedAt: Date.now() - 1000 * 60 * 18
  },
  {
    id: 'f-user',
    name: 'user_persona.json',
    type: 'file',
    language: 'json',
    openedAt: Date.now() - 1000 * 60 * 42
  }
];

let activeStorage: IStorageBridge | null = null;

interface FileHistoryState {
  pinnedItems: PinnedItem[];
  openedHistory: OpenedFileRecord[];

  initializeFileHistory: (storage?: IStorageBridge) => Promise<void>;
  recordOpenedFile: (item: { id?: string; name: string; type?: 'file' | 'folder'; path?: string | null; language?: string; content?: string }) => void;
  removeOpenedFile: (idOrName: string) => void;
  clearOpenedHistory: () => void;
  pinItem: (item: PinnedItem) => void;
  unpinItem: (idOrName: string) => void;
  togglePinItem: (item: PinnedItem) => void;
  isPinned: (idOrName: string) => boolean;
}

export const useFileHistoryStore = create<FileHistoryState>((set, get) => ({
  pinnedItems: DEFAULT_PINNED_ITEMS,
  openedHistory: DEFAULT_OPENED_HISTORY,

  initializeFileHistory: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }
    if (!activeStorage) return;

    try {
      const [savedPinned, savedHistory] = await Promise.all([
        activeStorage.getItem(STORAGE_KEYS.PINNED_ITEMS),
        activeStorage.getItem(STORAGE_KEYS.OPENED_FILE_HISTORY)
      ]);

      if (savedPinned) {
        try {
          const parsed = JSON.parse(savedPinned);
          if (Array.isArray(parsed)) {
            set({ pinnedItems: parsed });
          }
        } catch {}
      } else {
        await activeStorage.setItem(STORAGE_KEYS.PINNED_ITEMS, JSON.stringify(DEFAULT_PINNED_ITEMS));
      }

      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed)) {
            set({ openedHistory: parsed });
          }
        } catch {}
      } else {
        await activeStorage.setItem(STORAGE_KEYS.OPENED_FILE_HISTORY, JSON.stringify(DEFAULT_OPENED_HISTORY));
      }
    } catch (e) {
      console.error('Failed to initialize file history store', e);
    }
  },

  recordOpenedFile: (item) => {
    if (!item || !item.name) return;
    const current = get().openedHistory;

    // Filter out previous occurrences of the same item name/id
    const filtered = current.filter(
      f => f.name.toLowerCase() !== item.name.toLowerCase() && f.id !== item.id
    );

    const newRecord: OpenedFileRecord = {
      id: item.id || `hist_${Date.now()}`,
      name: item.name,
      type: item.type || 'file',
      path: item.path || null,
      language: item.language || 'markdown',
      content: item.content,
      openedAt: Date.now()
    };

    // Keep top 25 opened files/folders in history
    const updated = [newRecord, ...filtered].slice(0, 25);
    set({ openedHistory: updated });

    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.OPENED_FILE_HISTORY, JSON.stringify(updated)).catch(() => {});
    }
  },

  removeOpenedFile: (idOrName) => {
    const updated = get().openedHistory.filter(
      item => item.id !== idOrName && item.name !== idOrName
    );
    set({ openedHistory: updated });

    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.OPENED_FILE_HISTORY, JSON.stringify(updated)).catch(() => {});
    }
  },

  clearOpenedHistory: () => {
    set({ openedHistory: [] });
    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.OPENED_FILE_HISTORY, JSON.stringify([])).catch(() => {});
    }
  },

  pinItem: (item) => {
    const current = get().pinnedItems;
    // Remove if already exists and add to top
    const filtered = current.filter(p => p.id !== item.id && p.name !== item.name);
    const updated = [item, ...filtered];
    set({ pinnedItems: updated });

    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.PINNED_ITEMS, JSON.stringify(updated)).catch(() => {});
    }
  },

  unpinItem: (idOrName) => {
    const updated = get().pinnedItems.filter(
      item => item.id !== idOrName && item.name !== idOrName
    );
    set({ pinnedItems: updated });

    if (activeStorage) {
      activeStorage.setItem(STORAGE_KEYS.PINNED_ITEMS, JSON.stringify(updated)).catch(() => {});
    }
  },

  togglePinItem: (item) => {
    const isCurrentlyPinned = get().isPinned(item.id) || get().isPinned(item.name);
    if (isCurrentlyPinned) {
      get().unpinItem(item.id);
    } else {
      get().pinItem(item);
    }
  },

  isPinned: (idOrName) => {
    if (!idOrName) return false;
    return get().pinnedItems.some(
      item => item.id === idOrName || item.name === idOrName
    );
  }
}));
