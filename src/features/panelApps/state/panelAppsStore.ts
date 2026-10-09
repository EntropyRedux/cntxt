import { create } from 'zustand';
import { PanelAppRecord } from '../../../contracts/data_shapes';
import { validatePanelAppRecords } from '../../../contracts/boundarySchemas';
import { IStorageBridge } from '../../../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../../../adapters/storageKeys';
import { safePersist } from '../../../services/storageHelper';

interface PanelAppsState {
  apps: PanelAppRecord[];
  activeId: string | null;
  add: (record: PanelAppRecord, storage?: IStorageBridge) => void;
  remove: (id: string, storage?: IStorageBridge) => void;
  open: (id: string | null) => void;
  hydrate: (apps: PanelAppRecord[]) => void;
  initialize: (storage: IStorageBridge) => Promise<void>;
}

export const usePanelAppsStore = create<PanelAppsState>((set, get) => ({
  apps: [],
  activeId: null,

  add: (record, storage) => {
    const updated = [...get().apps.filter((a) => a.id !== record.id), record];
    set({ apps: updated });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  remove: (id, storage) => {
    const updated = get().apps.filter((a) => a.id !== id);
    set({
      apps: updated,
      activeId: get().activeId === id ? null : get().activeId,
    });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  open: (id) => set({ activeId: id }),

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
