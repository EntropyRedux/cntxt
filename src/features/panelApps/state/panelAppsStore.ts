import { create } from 'zustand';
import { PanelAppFloatingPosition, PanelAppPresentationMode, PanelAppRecord } from '../../../contracts/data_shapes';
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
  toggleKeepAlive: (id: string, storage?: IStorageBridge) => void;
  setPresentation: (id: string, mode: PanelAppPresentationMode, storage?: IStorageBridge) => void;
  setFloatingPosition: (id: string, pos: PanelAppFloatingPosition, storage?: IStorageBridge) => void;
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
    // If already mounted, keep mounted array completely untouched to avoid DOM re-insertion
    if (s.mounted.includes(id)) {
      return { activeId: id };
    }
    const protectedIds = new Set(
      s.apps
        .filter((a) => a.keepAlive || a.presentation === 'floating')
        .map((a) => a.id)
    );
    const candidateList = [...s.mounted, id];
    if (candidateList.length <= MAX_LIVE_APPS) {
      return { activeId: id, mounted: candidateList };
    }
    // Evict oldest un-protected app
    const evictIdx = candidateList.findIndex((m) => m !== id && !protectedIds.has(m));
    const nextMounted = evictIdx >= 0 ? candidateList.filter((_, idx) => idx !== evictIdx) : candidateList;
    return { activeId: id, mounted: nextMounted };
  }),

  reload: (id) => set((s) => ({
    reloadNonce: { ...s.reloadNonce, [id]: (s.reloadNonce[id] ?? 0) + 1 }
  })),

  close: (id) => set((s) => ({
    mounted: s.mounted.filter((m) => m !== id),
    activeId: s.activeId === id ? null : s.activeId,
    apps: s.apps.map((a) => (a.id === id ? { ...a, presentation: 'docked' as PanelAppPresentationMode } : a)),
  })),

  setHtmlCache: (id, html) => set((s) => ({
    htmlCache: { ...s.htmlCache, [id]: html }
  })),

  toggleKeepAlive: (id, storage) => {
    const app = get().apps.find((a) => a.id === id);
    if (!app) return;
    const newKeepAlive = !app.keepAlive;
    const updated = get().apps.map((a) => (a.id === id ? { ...a, keepAlive: newKeepAlive } : a));
    const mounted = newKeepAlive && !get().mounted.includes(id) ? [...get().mounted, id] : get().mounted;
    set({ apps: updated, mounted });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  setPresentation: (id, mode, storage) => {
    const updated = get().apps.map((a) => {
      if (a.id === id) {
        return { ...a, presentation: mode };
      }
      // Floating windows strictly one at a time for now: revert any other floating app to docked
      if (mode === 'floating' && a.presentation === 'floating') {
        return { ...a, presentation: 'docked' as PanelAppPresentationMode };
      }
      return a;
    });
    const mounted = mode === 'floating' && !get().mounted.includes(id)
      ? [...get().mounted, id]
      : get().mounted;
    set({ apps: updated, mounted });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  setFloatingPosition: (id, pos, storage) => {
    const updated = get().apps.map((a) => (a.id === id ? { ...a, floatingPosition: pos } : a));
    set({ apps: updated });
    if (storage) {
      safePersist(storage, STORAGE_KEYS.PANEL_APPS_INDEX, JSON.stringify(updated), 'Panel Apps Registry');
    }
  },

  hydrate: (apps) => set({ apps }),

  initialize: async (storage) => {
    try {
      const raw = await storage.getItem(STORAGE_KEYS.PANEL_APPS_INDEX);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const validated = validatePanelAppRecords(parsed);
      if (validated.success) {
        const apps = validated.data;
        const initialMounted = apps
          .filter((a) => a.keepAlive || a.presentation === 'floating')
          .map((a) => a.id);
        set({ apps, mounted: Array.from(new Set([...get().mounted, ...initialMounted])) });
      }
    } catch (e) {
      console.warn('[panelAppsStore] Failed to initialize panel apps index:', e);
    }
  },
}));
