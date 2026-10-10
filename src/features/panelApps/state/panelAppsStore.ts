import { create } from 'zustand';
import { PanelAppRecord } from '../../../contracts/data_shapes';
import { validatePanelAppRecords } from '../../../contracts/boundarySchemas';
import { IStorageBridge } from '../../../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../../../adapters/storageKeys';
import { safePersist } from '../../../services/storageHelper';

export const MAX_LIVE_APPS = 5;

interface PanelAppsState {
  apps: PanelAppRecord[];
  activeId: string | null;
  mounted: string[];
  reloadNonce: Record<string, number>;
  htmlCache: Record<string, string>;
  add: (record: PanelAppRecord, storage?: IStorageBridge) => void;
  remove: (id: string, storage?: IStorageBridge) => void;
  update: (id: string, updates: Partial<PanelAppRecord>, storage?: IStorageBridge) => void;
  open: (id: string | null) => void;
  reload: (id: string) => void;
  close: (id: string) => void;
  setHtmlCache: (id: string, html: string) => void;
  hydrate: (apps: PanelAppRecord[]) => void;
  initialize: (storage: IStorageBridge) => Promise<void>;
}

export const usePanelAppsStore = create<PanelAppsState>((set, get) => ({
  apps: [],
  activeId: null,
  mounted: [],
  reloadNonce: {},
  htmlCache: {},

  add: (record, storage) => {
    const updated = [...get().apps.filter((a) => a.id !== record.id), record];
    set({ apps: updated });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  remove: (id, storage) => {
    const updated = get().apps.filter((a) => a.id !== id);
    const updatedMounted = get().mounted.filter((m) => m !== id);
    set({
      apps: updated,
      mounted: updatedMounted,
      activeId: get().activeId === id ? null : get().activeId,
    });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  update: (id, updates, storage) => {
    const updated = get().apps.map((a) => (a.id === id ? { ...a, ...updates } : a));
    set({ apps: updated });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  open: (id) => set((s) => {
    if (!id) return { activeId: null };
    const mounted = [...s.mounted.filter((m) => m !== id), id].slice(-MAX_LIVE_APPS);
    return { activeId: id, mounted };
  }),

  reload: (id) => set((s) => ({
    reloadNonce: { ...s.reloadNonce, [id]: (s.reloadNonce[id] ?? 0) + 1 }
  })),

  close: (id) => set((s) => ({
    mounted: s.mounted.filter((m) => m !== id),
    activeId: s.activeId === id ? null : s.activeId,
  })),

  setHtmlCache: (id, html) => set((s) => ({
    htmlCache: { ...s.htmlCache, [id]: html }
  })),

  hydrate: (apps) => set({ apps }),

  initialize: async (storage) => {
    try {
      const raw = await storage.getItem(STORAGE_KEYS.PANEL_APPS_INDEX);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const validated = validatePanelAppRecords(parsed);
      if (validated.success) {
        set({ apps: validated.data });
      }
    } catch (e) {
      console.warn('[panelAppsStore] Failed to initialize panel apps index:', e);
    }
  },
}));
