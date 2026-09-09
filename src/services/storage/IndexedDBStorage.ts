export class IndexedDBStorage {
  private dbName = 'ContextPadDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isReadyPromise: Promise<void>;

  constructor() {
    this.isReadyPromise = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('tab_contents')) {
          db.createObjectStore('tab_contents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'path' });
        }
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        console.warn('IndexedDB initialization failed, falling back to in-memory/localStorage', event);
        resolve();
      };
    });
  }

  public async setTabContent(tabId: string, content: string): Promise<void> {
    await this.isReadyPromise;
    if (!this.db) {
      try {
        localStorage.setItem(`cp_tab_${tabId}`, content);
      } catch (e) {}
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('tab_contents', 'readwrite');
        const store = tx.objectStore('tab_contents');
        store.put({ id: tabId, content, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  public async getTabContent(tabId: string): Promise<string | null> {
    await this.isReadyPromise;
    if (!this.db) {
      return localStorage.getItem(`cp_tab_${tabId}`);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('tab_contents', 'readonly');
        const store = tx.objectStore('tab_contents');
        const req = store.get(tabId);
        req.onsuccess = () => {
          resolve(req.result ? req.result.content : null);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  public async deleteTabContent(tabId: string): Promise<void> {
    await this.isReadyPromise;
    if (!this.db) {
      localStorage.removeItem(`cp_tab_${tabId}`);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction('tab_contents', 'readwrite');
        const store = tx.objectStore('tab_contents');
        store.delete(tabId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  public async exportAllData(): Promise<string> {
    const tabsMeta = localStorage.getItem('contextpad_tabs_meta');
    const templates = localStorage.getItem('contextpad_templates');
    const actions = localStorage.getItem('contextpad_actions');
    const workflows = localStorage.getItem('contextpad_workflows');
    const settings = localStorage.getItem('contextpad_settings');

    const backup = {
      version: '1.10.0',
      exportedAt: new Date().toISOString(),
      tabsMeta: tabsMeta ? JSON.parse(tabsMeta) : [],
      templates: templates ? JSON.parse(templates) : [],
      actions: actions ? JSON.parse(actions) : [],
      workflows: workflows ? JSON.parse(workflows) : [],
      settings: settings ? JSON.parse(settings) : {}
    };

    return JSON.stringify(backup, null, 2);
  }

  public async importAllData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      if (data.tabsMeta) localStorage.setItem('contextpad_tabs_meta', JSON.stringify(data.tabsMeta));
      if (data.templates) localStorage.setItem('contextpad_templates', JSON.stringify(data.templates));
      if (data.actions) localStorage.setItem('contextpad_actions', JSON.stringify(data.actions));
      if (data.workflows) localStorage.setItem('contextpad_workflows', JSON.stringify(data.workflows));
      if (data.settings) localStorage.setItem('contextpad_settings', JSON.stringify(data.settings));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
}

export const dbStorage = new IndexedDBStorage();
