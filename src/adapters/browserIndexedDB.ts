/**
 * Browser-specific IndexedDB and Web storage provider
 * Restricted strictly to src/adapters/
 */

export class BrowserIndexedDBStorage {
  private dbName = 'ContextPadDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private isReadyPromise: Promise<void>;

  constructor() {
    this.isReadyPromise = this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve) => {
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
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = () => {
        resolve();
      };
    });
  }

  public async getItem(key: string): Promise<string | null> {
    await this.isReadyPromise;
    if (this.db) {
      const dbResult = await new Promise<string | null>((resolve) => {
        try {
          const tx = this.db!.transaction('app_state', 'readonly');
          const store = tx.objectStore('app_state');
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result ? req.result.value : null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
      if (dbResult !== null) return dbResult;
    }

    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public async setItem(key: string, value: string): Promise<boolean> {
    await this.isReadyPromise;
    let ok = false;
    try {
      localStorage.setItem(key, value);
      ok = true;
    } catch {
      // localStorage may fail on quota exceeded
    }

    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('app_state', 'readwrite');
          const store = tx.objectStore('app_state');
          store.put({ key, value, updatedAt: Date.now() });
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
      ok = true;
    }

    return ok;
  }

  public async removeItem(key: string): Promise<boolean> {
    await this.isReadyPromise;
    try {
      localStorage.removeItem(key);
    } catch {}

    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('app_state', 'readwrite');
          const store = tx.objectStore('app_state');
          store.delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    return true;
  }
}

export const browserDB = new BrowserIndexedDBStorage();
