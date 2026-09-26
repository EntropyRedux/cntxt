import { create } from 'zustand';
import { Tab, SupportedLanguage } from '../../contracts/data_shapes';
// MOCK: quarantined synthetic sample data for prototype demo mode
import { IS_PROTOTYPE_DEMO_MODE } from '../../mocks/index';
import { WELCOME_DOCUMENT } from '../constants/welcomeDoc';
import { MARKDOWN_GUIDE_DOCUMENT } from '../constants/markdownGuideDoc';
import { POWER_USER_GUIDE_DOCUMENT } from '../constants/powerUserGuideDoc';
import { editorRegistry } from '../services/editor/editorRegistry';
import { IStorageBridge } from '../ui-contract/bridgeContract';
import { STORAGE_KEYS } from '../adapters/storageKeys';
import { useSettingsStore } from './settingsStore';
import { useNotificationStore } from './notificationStore';
import { safePersist, safeRemove } from '../services/storageHelper';
import { writeTabCache, readTabCache, clearTabCache } from '../adapters/tabSessionCache';
import { editorStateCache } from '../services/editor/editorStateCache';

let activeStorage: IStorageBridge | null = null;

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  isSaving: boolean;
  /** True until initializeTabs resolves; used to show EditorSkeleton instead of empty state. */
  isHydrating: boolean;

  // Actions
  setActiveTabId: (id: string) => void;
  createTab: (title?: string, content?: string, language?: SupportedLanguage, filePath?: string | null, pinnedTabId?: string | null) => string;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (keepTabId: string) => void;
  updateTabContent: (tabId: string, content: string, isExternal?: boolean) => void;
  updateTabMetadata: (tabId: string, updates: Partial<Tab>) => void;
  insertTextAtCursor: (tabId: string, textToInsert: string, replaceSelection?: boolean) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  saveCurrentTab: () => Promise<void>;
  saveTabAs: (tabId: string, newTitle: string, newPath?: string) => Promise<void>;
  duplicateTab: (tabId: string) => string;
  closeTabsToRight: (tabId: string) => void;
  openWelcomeTab: () => string;
  resetWelcomeTab: () => Promise<void>;
  openMarkdownGuideTab: () => string;
  openPowerUserGuideTab: () => string;
  initializeTabs: (storage?: IStorageBridge) => Promise<void>;
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: '',
  isSaving: false,
  isHydrating: true,

  initializeTabs: async (storage?: IStorageBridge) => {
    if (storage) {
      activeStorage = storage;
    }

    const initialTabId = 'welcome-doc';
    const defaultWelcomeTab: Tab = {
      id: initialTabId,
      title: 'Welcome.md',
      content: WELCOME_DOCUMENT,
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now(),
      isPinned: true
    };

    // ── Layer 1: Synchronous tabSessionCache read ───────────────────────
    // Attempt to hydrate from the write-through cache before any IPC call.
    // On a cache hit the Editor mounts in the first frame; the IPC load
    // runs in the background and patches any diverged content afterwards.
    const cached = readTabCache();
    if (cached && cached.tabs.length > 0) {
      const cachedActiveId = cached.tabs.some(t => t.id === cached.activeTabId)
        ? cached.activeTabId
        : cached.tabs[0].id;
      set({ tabs: cached.tabs, activeTabId: cachedActiveId, isHydrating: false });
      // Continue IPC load silently to refresh stale content
    }
    const isExplicitlyNoDemo = typeof window !== 'undefined' && (window as any).__CONTEXTPAD_DEMO__ === false;

    if (!activeStorage) {
      if (!cached) {
        if (isExplicitlyNoDemo) {
          set({ tabs: [], activeTabId: '', isHydrating: false });
        } else {
          set({ tabs: [defaultWelcomeTab], activeTabId: initialTabId, isHydrating: false });
        }
      }
      return;
    }

    try {
      // ── Layer 2: Parallel IPC calls ────────────────────────────────────
      // Batch the two independent reads into a single Promise.all instead of
      // sequential awaits — halves the minimum cold-start IPC wait.
      const [storedMeta, storedActiveId] = await Promise.all([
        activeStorage.getItem(STORAGE_KEYS.TABS_META),
        activeStorage.getItem(STORAGE_KEYS.ACTIVE_TAB_ID),
      ]);
      // ─────────────────────────────────────────────────────────────────

      if (storedMeta) {
        const metaList: Tab[] = JSON.parse(storedMeta);
        if (metaList.length > 0) {
          // Load content from storage bridge for each tab (parallel)
          const fullTabs: Tab[] = await Promise.all(
            metaList.map(async (meta) => {
              let content = await activeStorage!.getItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${meta.id}`);
              // Auto-heal welcome document if contaminated with old scratch/test typing
              if (meta.id === 'welcome-doc' && content && content.includes('The quick brown fox jumps over the lazy dog')) {
                content = WELCOME_DOCUMENT;
                await activeStorage!.setItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${meta.id}`, WELCOME_DOCUMENT);
              }
              return {
                ...meta,
                content: content !== null ? content : meta.content || ''
              };
            })
          );

          const activeId = storedActiveId && fullTabs.some(t => t.id === storedActiveId)
            ? storedActiveId
            : fullTabs[0].id;

          set({ tabs: fullTabs, activeTabId: activeId, isHydrating: false });
          // Refresh the cache with authoritative IPC data
          writeTabCache(fullTabs, activeId);
          return;
        }
      }

      if (!cached) {
        if (isExplicitlyNoDemo) {
          set({ tabs: [], activeTabId: '', isHydrating: false });
        } else {
          // First run on clean workspace: Seed Welcome.md document with full CNTXT feature showcase
          await activeStorage.setItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${initialTabId}`, WELCOME_DOCUMENT);
          await activeStorage.setItem(STORAGE_KEYS.TABS_META, JSON.stringify([defaultWelcomeTab]));
          await activeStorage.setItem(STORAGE_KEYS.ACTIVE_TAB_ID, initialTabId);

          set({ tabs: [defaultWelcomeTab], activeTabId: initialTabId, isHydrating: false });
          writeTabCache([defaultWelcomeTab], initialTabId);
        }
      } else {
        // Cache exists (Layer 1 hydrated it into state for this session), but IPC
        // returned no authoritative meta. Keep the cached tabs as the user's
        // last-session state.
        set({ isHydrating: false });
      }
    } catch (e) {
      console.error('Error initializing tabs:', e);
      if (!cached) {
        if (IS_PROTOTYPE_DEMO_MODE) {
          set({ tabs: [defaultWelcomeTab], activeTabId: initialTabId, isHydrating: false });
        } else {
          set({ tabs: [], activeTabId: '', isHydrating: false });
        }
      } else {
        set({ isHydrating: false });
      }
    }
  },

  createTab: (title = 'Untitled.md', content = '', language: SupportedLanguage = 'markdown', filePath = null, pinnedTabId?: string) => {
    const id = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newTab: Tab = {
      id,
      title,
      content,
      filePath,
      folderPath: null,
      isDirty: false,
      language,
      lastModifiedTime: Date.now(),
      cursorLine: 1,
      cursorCol: 1,
      pinnedTabId
    };

    const newTabs = [...get().tabs, newTab];
    set({ tabs: newTabs, activeTabId: id });
    writeTabCache(newTabs, id);

    // Save to bridge storage & meta
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${id}`, content, `tab content for ${newTab.title}`);
    }
    saveTabsMeta(newTabs, id);

    return id;
  },

  closeTab: (tabId: string) => {
    cancelPendingSave(tabId);
    editorStateCache.evictTabState(tabId);
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      // Create a fresh untitled tab when closing the last one
      const newId = get().createTab('Untitled.md', '', 'markdown');
      const filtered = get().tabs.filter(t => t.id !== tabId);
      set({ tabs: filtered, activeTabId: newId });
      writeTabCache(filtered, newId);
      if (activeStorage) {
        safeRemove(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tabId}`, `tab ${tabId}`);
      }
      saveTabsMeta(filtered, newId);
      return;
    }

    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    let nextActiveId = activeTabId;

    if (activeTabId === tabId) {
      const nextIndex = Math.min(index, newTabs.length - 1);
      nextActiveId = newTabs[nextIndex]?.id || '';
    }

    set({ tabs: newTabs, activeTabId: nextActiveId });
    writeTabCache(newTabs, nextActiveId);
    if (activeStorage) {
      safeRemove(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tabId}`, `tab ${tabId}`);
    }
    saveTabsMeta(newTabs, nextActiveId);
  },

  closeOtherTabs: (keepTabId: string) => {
    const { tabs } = get();
    const toDelete = tabs.filter(t => t.id !== keepTabId);
    const remaining = tabs.filter(t => t.id === keepTabId);

    toDelete.forEach(t => {
      cancelPendingSave(t.id);
      editorStateCache.evictTabState(t.id);
    });
    if (activeStorage) {
      toDelete.forEach(t => safeRemove(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${t.id}`, `tab ${t.id}`));
    }
    set({ tabs: remaining, activeTabId: keepTabId });
    writeTabCache(remaining, keepTabId);
    saveTabsMeta(remaining, keepTabId);
  },

  closeTabsToRight: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const index = tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const remaining = tabs.slice(0, index + 1);
    const toDelete = tabs.slice(index + 1);

    toDelete.forEach(t => {
      cancelPendingSave(t.id);
      editorStateCache.evictTabState(t.id);
    });
    if (activeStorage) {
      toDelete.forEach(t => safeRemove(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${t.id}`, `tab ${t.id}`));
    }

    const nextActiveId = remaining.some(t => t.id === activeTabId) ? activeTabId : tabId;
    set({ tabs: remaining, activeTabId: nextActiveId });
    writeTabCache(remaining, nextActiveId);
    saveTabsMeta(remaining, nextActiveId);
  },

  reorderTabs: (sourceIndex: number, destinationIndex: number) => {
    const { tabs, activeTabId } = get();
    if (
      sourceIndex < 0 ||
      sourceIndex >= tabs.length ||
      destinationIndex < 0 ||
      destinationIndex >= tabs.length ||
      sourceIndex === destinationIndex
    ) {
      return;
    }

    const reordered = [...tabs];
    const [movedTab] = reordered.splice(sourceIndex, 1);
    reordered.splice(destinationIndex, 0, movedTab);

    set({ tabs: reordered });
    writeTabCache(reordered, activeTabId);
    saveTabsMeta(reordered, activeTabId);
  },

  closeAllTabs: () => {
    const { tabs } = get();
    tabs.forEach(t => cancelPendingSave(t.id));
    editorStateCache.clearAllTabStates();
    if (activeStorage) {
      tabs.forEach(t => safeRemove(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${t.id}`, `tab ${t.id}`));
    }
    
    const newId = `tab_${Date.now()}`;
    const freshTab: Tab = {
      id: newId,
      title: 'Untitled.md',
      content: '',
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now()
    };
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${newId}`, '', 'new tab content');
    }
    set({ tabs: [freshTab], activeTabId: newId });
    writeTabCache([freshTab], newId);
    saveTabsMeta([freshTab], newId);
  },

  setActiveTabId: (tabId: string) => {
    set({ activeTabId: tabId });
    if (activeStorage) {
      safePersist(activeStorage, STORAGE_KEYS.ACTIVE_TAB_ID, tabId, 'active tab id');
    }
  },

  openWelcomeTab: () => {
    const { tabs } = get();
    const existing = tabs.find(t => t.id === 'welcome-doc' || t.title === 'Welcome.md');
    if (existing) {
      get().setActiveTabId(existing.id);
      return existing.id;
    }

    const welcomeId = 'welcome-doc';
    const welcomeTab: Tab = {
      id: welcomeId,
      title: 'Welcome.md',
      content: WELCOME_DOCUMENT,
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now(),
      isPinned: true
    };

    const newTabs = [welcomeTab, ...tabs];
    set({ tabs: newTabs, activeTabId: welcomeId });
    writeTabCache(newTabs, welcomeId);
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${welcomeId}`, WELCOME_DOCUMENT, 'welcome document content');
      saveTabsMeta(newTabs, welcomeId);
    }
    return welcomeId;
  },

  resetWelcomeTab: async () => {
    const welcomeId = 'welcome-doc';
    const welcomeTab: Tab = {
      id: welcomeId,
      title: 'Welcome.md',
      content: WELCOME_DOCUMENT,
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now(),
      isPinned: true
    };
    const { tabs } = get();
    const existingIndex = tabs.findIndex(t => t.id === welcomeId);
    let newTabs: Tab[];
    if (existingIndex >= 0) {
      newTabs = tabs.map(t => t.id === welcomeId ? welcomeTab : t);
    } else {
      newTabs = [welcomeTab, ...tabs];
    }
    set({ tabs: newTabs, activeTabId: welcomeId });
    writeTabCache(newTabs, welcomeId);
    editorRegistry.setContent(welcomeId, WELCOME_DOCUMENT);
    if (activeStorage) {
      await activeStorage.setItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${welcomeId}`, WELCOME_DOCUMENT);
      saveTabsMeta(newTabs, welcomeId);
    }
  },

  openMarkdownGuideTab: () => {
    const { tabs } = get();
    const guideId = 'markdown-guide-doc';
    const existing = tabs.find(t => t.id === guideId);
    if (existing) {
      set({ activeTabId: guideId });
      return guideId;
    }

    const guideTab: Tab = {
      id: guideId,
      title: 'Markdown-Guide.md',
      content: MARKDOWN_GUIDE_DOCUMENT,
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now(),
      isPinned: false
    };

    const newTabs = [...tabs, guideTab];
    set({ tabs: newTabs, activeTabId: guideId });
    writeTabCache(newTabs, guideId);
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${guideId}`, MARKDOWN_GUIDE_DOCUMENT, 'markdown guide content');
      saveTabsMeta(newTabs, guideId);
    }
    return guideId;
  },

  openPowerUserGuideTab: () => {
    const { tabs } = get();
    const guideId = 'power-user-guide-doc';
    const existing = tabs.find(t => t.id === guideId);
    if (existing) {
      set({ activeTabId: guideId });
      return guideId;
    }

    const guideTab: Tab = {
      id: guideId,
      title: 'Power-User-Guide.md',
      content: POWER_USER_GUIDE_DOCUMENT,
      filePath: null,
      folderPath: null,
      isDirty: false,
      language: 'markdown',
      lastModifiedTime: Date.now(),
      isPinned: false
    };

    const newTabs = [...tabs, guideTab];
    set({ tabs: newTabs, activeTabId: guideId });
    writeTabCache(newTabs, guideId);
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${guideId}`, POWER_USER_GUIDE_DOCUMENT, 'power user guide content');
      saveTabsMeta(newTabs, guideId);
    }
    return guideId;
  },

  updateTabContent: (tabId: string, content: string, isExternal = true) => {
    const { tabs } = get();
    const updated = tabs.map(tab => {
      if (tab.id === tabId) {
        return {
          ...tab,
          content,
          isDirty: true,
          lastModifiedTime: Date.now()
        };
      }
      return tab;
    });

    set({ tabs: updated });

    if (isExternal) {
      editorRegistry.setContent(tabId, content);
    }

    // Debounced persist to bridge storage
    debouncedContentSave(tabId, content);
  },

  updateTabMetadata: (tabId: string, updates: Partial<Tab>) => {
    const { tabs, activeTabId } = get();
    const updated = tabs.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab);
    set({ tabs: updated });
    saveTabsMeta(updated, activeTabId);
  },

  insertTextAtCursor: (tabId: string, textToInsert: string, replaceSelection = false) => {
    // 1. Try to dispatch directly through the active CodeMirror view if mounted
    const insertedInView = editorRegistry.insertTextAtCursor(tabId, textToInsert, replaceSelection);
    if (insertedInView) {
      return;
    }

    // 2. Fallback if EditorView is not directly focused or mounted
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const currentContent = tab.content;
    const offset = typeof tab.cursorOffset === 'number' && tab.cursorOffset >= 0 && tab.cursorOffset <= currentContent.length
      ? tab.cursorOffset
      : (typeof tab.selectionFrom === 'number' && tab.selectionFrom >= 0 && tab.selectionFrom <= currentContent.length
          ? tab.selectionFrom
          : currentContent.length);

    const selTo = typeof tab.selectionTo === 'number' && tab.selectionTo >= offset && tab.selectionTo <= currentContent.length
      ? tab.selectionTo
      : offset;

    const insertAt = replaceSelection ? offset : selTo;
    const newContent = currentContent.slice(0, insertAt) + textToInsert + currentContent.slice(replaceSelection ? selTo : insertAt);
    const newOffset = insertAt + textToInsert.length;

    // Calculate line & col from newOffset
    const linesBefore = newContent.slice(0, newOffset).split('\n');
    const newCursorLine = linesBefore.length;
    const newCursorCol = linesBefore[linesBefore.length - 1].length + 1;

    get().updateTabContent(tabId, newContent);
    get().updateTabMetadata(tabId, {
      cursorOffset: newOffset,
      selectionFrom: newOffset,
      selectionTo: newOffset,
      cursorLine: newCursorLine,
      cursorCol: newCursorCol
    });
  },

  saveCurrentTab: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    set({ isSaving: true });
    if (activeStorage) {
      await activeStorage.setItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tab.id}`, tab.content);
    }

    const updated = tabs.map(t => t.id === activeTabId ? { ...t, isDirty: false, lastModifiedTime: Date.now() } : t);
    set({ tabs: updated, isSaving: false });
    writeTabCache(updated, activeTabId);
    saveTabsMeta(updated, activeTabId);
  },

  saveTabAs: async (tabId: string, newTitle: string, newPath?: string) => {
    const { tabs, activeTabId } = get();
    const updated = tabs.map(t => {
      if (t.id === tabId) {
        return {
          ...t,
          title: newTitle,
          filePath: newPath || t.filePath,
          isDirty: false,
          lastModifiedTime: Date.now()
        };
      }
      return t;
    });
    set({ tabs: updated });
    writeTabCache(updated, activeTabId);
    if (activeStorage) {
      const target = updated.find(t => t.id === tabId);
      if (target) {
        await activeStorage.setItem(`${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tabId}`, target.content);
      }
    }
    saveTabsMeta(updated, activeTabId);
  },

  duplicateTab: (tabId: string) => {
    const { tabs } = get();
    const source = tabs.find(t => t.id === tabId);
    if (!source) return '';

    const newTitle = source.title.includes('.')
      ? source.title.replace(/(\.[^.]+)$/, ' (Copy)$1')
      : `${source.title} (Copy)`;

    return get().createTab(newTitle, source.content, source.language);
  },

  togglePinTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const updated = tabs.map(t => t.id === tabId ? { ...t, isPinned: !t.isPinned } : t);
    set({ tabs: updated });
    writeTabCache(updated, activeTabId);
    saveTabsMeta(updated, activeTabId);
  }
}));

// Helper functions for metadata persistence and debounced saves
function saveTabsMeta(tabs: Tab[], activeTabId: string) {
  if (!activeStorage) return;
  try {
    const metaOnly = tabs.map(({ id, title, filePath, folderPath, isDirty, language, lastModifiedTime, isPinned, pinnedTabId }) => ({
      id,
      title,
      filePath,
      folderPath,
      isDirty,
      language,
      lastModifiedTime,
      isPinned,
      pinnedTabId
    }));
    safePersist(activeStorage, STORAGE_KEYS.TABS_META, JSON.stringify(metaOnly), 'tabs metadata');
    safePersist(activeStorage, STORAGE_KEYS.ACTIVE_TAB_ID, activeTabId, 'active tab id');
  } catch (e) {
    console.error('Failed to save tab metadata', e);
    useNotificationStore.getState().addNotification('Persistence Warning', 'Failed to save tab metadata to storage', 'warning');
  }
}

const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const pendingContents: Record<string, string> = {};

function cancelPendingSave(tabId: string) {
  if (saveTimers[tabId]) {
    clearTimeout(saveTimers[tabId]);
    delete saveTimers[tabId];
  }
  delete pendingContents[tabId];
}

export function flushPendingSaves() {
  for (const tabId of Object.keys(saveTimers)) {
    if (saveTimers[tabId]) {
      clearTimeout(saveTimers[tabId]);
      delete saveTimers[tabId];
    }
    const content = pendingContents[tabId];
    if (content !== undefined && activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tabId}`, content, `flush save for tab ${tabId}`);
      delete pendingContents[tabId];
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingSaves();
  });
}

function debouncedContentSave(tabId: string, content: string) {
  if (saveTimers[tabId]) {
    clearTimeout(saveTimers[tabId]);
  }
  const settings = useSettingsStore.getState().settings;
  if (!settings.enableAutosave) {
    return;
  }
  const interval = settings.autosaveIntervalMs ?? 1000;
  pendingContents[tabId] = content;
  saveTimers[tabId] = setTimeout(() => {
    if (activeStorage) {
      safePersist(activeStorage, `${STORAGE_KEYS.TAB_CONTENT_PREFIX}${tabId}`, content, `autosave for tab ${tabId}`);
    }
    delete saveTimers[tabId];
    delete pendingContents[tabId];
  }, interval);
}
