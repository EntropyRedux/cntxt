import { create } from 'zustand';
import { Tab, SupportedLanguage } from '../types';
import { WELCOME_DOCUMENT } from '../constants/defaultData';
import { dbStorage } from '../services/storage/IndexedDBStorage';
import { editorRegistry } from '../services/editor/editorRegistry';

interface TabState {
  tabs: Tab[];
  activeTabId: string;
  isSaving: boolean;
  
  // Actions
  createTab: (title?: string, content?: string, language?: SupportedLanguage, filePath?: string | null) => string;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (keepTabId: string) => void;
  closeAllTabs: () => void;
  setActiveTabId: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  updateTabMetadata: (tabId: string, updates: Partial<Tab>) => void;
  insertTextAtCursor: (tabId: string, textToInsert: string) => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
  saveCurrentTab: () => Promise<void>;
  saveTabAs: (tabId: string, newTitle: string, newPath?: string) => Promise<void>;
  duplicateTab: (tabId: string) => string;
  togglePinTab: (tabId: string) => void;
  initializeTabs: () => Promise<void>;
}

const STORAGE_KEY_META = 'contextpad_tabs_meta';
const STORAGE_KEY_ACTIVE = 'contextpad_active_tab_id';

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: '',
  isSaving: false,

  initializeTabs: async () => {
    try {
      const storedMeta = localStorage.getItem(STORAGE_KEY_META);
      const storedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE);

      if (storedMeta) {
        const metaList: Tab[] = JSON.parse(storedMeta);
        if (metaList.length > 0) {
          // Load content from IndexedDB for each tab
          const fullTabs: Tab[] = await Promise.all(
            metaList.map(async (meta) => {
              const content = await dbStorage.getTabContent(meta.id);
              return {
                ...meta,
                content: content !== null ? content : meta.content || ''
              };
            })
          );

          const activeId = storedActiveId && fullTabs.some(t => t.id === storedActiveId)
            ? storedActiveId
            : fullTabs[0].id;

          set({ tabs: fullTabs, activeTabId: activeId });
          return;
        }
      }

      // First run: Create Welcome Document
      const initialTabId = 'welcome-doc';
      const initialTab: Tab = {
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

      await dbStorage.setTabContent(initialTabId, WELCOME_DOCUMENT);
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify([initialTab]));
      localStorage.setItem(STORAGE_KEY_ACTIVE, initialTabId);

      set({
        tabs: [initialTab],
        activeTabId: initialTabId
      });
    } catch (e) {
      console.error('Error initializing tabs:', e);
    }
  },

  createTab: (title = 'Untitled.md', content = '', language: SupportedLanguage = 'markdown', filePath = null) => {
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
      cursorCol: 1
    };

    const newTabs = [...get().tabs, newTab];
    set({ tabs: newTabs, activeTabId: id });

    // Save to IndexedDB & meta
    dbStorage.setTabContent(id, content);
    saveTabsMeta(newTabs, id);

    return id;
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      // Create a fresh untitled tab when closing the last one
      const newId = get().createTab('Untitled.md', '', 'markdown');
      const filtered = get().tabs.filter(t => t.id !== tabId);
      set({ tabs: filtered, activeTabId: newId });
      dbStorage.deleteTabContent(tabId);
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
    dbStorage.deleteTabContent(tabId);
    saveTabsMeta(newTabs, nextActiveId);
  },

  closeOtherTabs: (keepTabId: string) => {
    const { tabs } = get();
    const toDelete = tabs.filter(t => t.id !== keepTabId);
    const remaining = tabs.filter(t => t.id === keepTabId);

    toDelete.forEach(t => dbStorage.deleteTabContent(t.id));
    set({ tabs: remaining, activeTabId: keepTabId });
    saveTabsMeta(remaining, keepTabId);
  },

  closeAllTabs: () => {
    const { tabs } = get();
    tabs.forEach(t => dbStorage.deleteTabContent(t.id));
    
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
    dbStorage.setTabContent(newId, '');
    set({ tabs: [freshTab], activeTabId: newId });
    saveTabsMeta([freshTab], newId);
  },

  setActiveTabId: (tabId: string) => {
    set({ activeTabId: tabId });
    localStorage.setItem(STORAGE_KEY_ACTIVE, tabId);
  },

  updateTabContent: (tabId: string, content: string) => {
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

    // Debounced persist to storage
    debouncedContentSave(tabId, content);
  },

  updateTabMetadata: (tabId: string, updates: Partial<Tab>) => {
    const { tabs, activeTabId } = get();
    const updated = tabs.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab);
    set({ tabs: updated });
    saveTabsMeta(updated, activeTabId);
  },

  insertTextAtCursor: (tabId: string, textToInsert: string) => {
    // 1. Try to dispatch directly through the active CodeMirror view if mounted
    const insertedInView = editorRegistry.insertTextAtCursor(tabId, textToInsert);
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

    const newContent = currentContent.slice(0, offset) + textToInsert + currentContent.slice(selTo);
    const newOffset = offset + textToInsert.length;

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

  reorderTabs: (sourceIndex: number, destinationIndex: number) => {
    const { tabs, activeTabId } = get();
    const result = Array.from(tabs);
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destinationIndex, 0, removed);
    set({ tabs: result });
    saveTabsMeta(result, activeTabId);
  },

  saveCurrentTab: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    set({ isSaving: true });
    await dbStorage.setTabContent(tab.id, tab.content);

    const updated = tabs.map(t => t.id === activeTabId ? { ...t, isDirty: false, lastModifiedTime: Date.now() } : t);
    set({ tabs: updated, isSaving: false });
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
    saveTabsMeta(updated, activeTabId);
  }
}));

// Helper functions for metadata persistence and debounced saves
function saveTabsMeta(tabs: Tab[], activeTabId: string) {
  try {
    const metaOnly = tabs.map(({ id, title, filePath, folderPath, isDirty, language, lastModifiedTime, isPinned }) => ({
      id,
      title,
      filePath,
      folderPath,
      isDirty,
      language,
      lastModifiedTime,
      isPinned
    }));
    localStorage.setItem(STORAGE_KEY_META, JSON.stringify(metaOnly));
    localStorage.setItem(STORAGE_KEY_ACTIVE, activeTabId);
  } catch (e) {
    console.error('Failed to save tab metadata', e);
  }
}

const saveTimers: Record<string, any> = {};
function debouncedContentSave(tabId: string, content: string) {
  if (saveTimers[tabId]) {
    clearTimeout(saveTimers[tabId]);
  }
  saveTimers[tabId] = setTimeout(() => {
    dbStorage.setTabContent(tabId, content);
    delete saveTimers[tabId];
  }, 1000);
}
