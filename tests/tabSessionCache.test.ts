import { describe, it, expect, afterEach } from 'vitest';
import { writeTabCache, readTabCache, clearTabCache } from '../src/adapters/tabSessionCache';
import type { Tab } from '../contracts/data_shapes';

class FakeLocalStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  keyCount() { return this.m.size; }
}

function makeTab(partial: Partial<Tab>): Tab {
  return {
    id: 't1',
    title: 'Tab One.md',
    content: 'content',
    filePath: null,
    folderPath: null,
    isDirty: false,
    language: 'markdown',
    lastModifiedTime: 10,
    ...partial,
  } as Tab;
}

const CACHE_KEY = 'cntxt_tab_cache_v2';

function rawEntry(): string | null {
  return (globalThis as any).localStorage.getItem(CACHE_KEY);
}

function installStorage(): FakeLocalStorage {
  const fake = new FakeLocalStorage();
  (globalThis as any).localStorage = fake;
  return fake;
}

function uninstallStorage() {
  delete (globalThis as any).localStorage;
}

afterEach(() => {
  uninstallStorage();
});

describe('tabSessionCache', () => {
  describe('localStorage-absent guard (Node/Vitest default)', () => {
    it('read returns null when localStorage is undefined', () => {
      expect(readTabCache()).toBeNull();
    });

    it('write is a safe no-op when localStorage is undefined', () => {
      expect(() => writeTabCache([makeTab({})], 't1')).not.toThrow();
    });

    it('clear is a safe no-op when localStorage is undefined', () => {
      expect(() => clearTabCache()).not.toThrow();
    });
  });

  describe('round-trip with storage present', () => {
    it('persists and restores tabs plus the active tab id', () => {
      installStorage();
      const tabs = [makeTab({ id: 'a' }), makeTab({ id: 'b', title: 'Two.md' })];
      writeTabCache(tabs, 'b');
      const restored = readTabCache();
      expect(restored).not.toBeNull();
      expect(restored!.activeTabId).toBe('b');
      expect(restored!.tabs.map(t => t.id)).toEqual(['a', 'b']);
      expect(restored!.tabs[1].title).toBe('Two.md');
    });

    it('overwrites a previous cache entry', () => {
      installStorage();
      writeTabCache([makeTab({ id: 'a' })], 'a');
      writeTabCache([makeTab({ id: 'z' })], 'z');
      expect(readTabCache()!.activeTabId).toBe('z');
    });
  });

  describe('integrity guard', () => {
    it('discards a tampered cache (checksum mismatch) and clears the entry', () => {
      const fake = installStorage();
      writeTabCache([makeTab({ id: 'a', content: 'original' })], 'a');
      const entry = JSON.parse(rawEntry()!);
      // Tamper with DIFFERENT-length content so the length-based signature diverges.
      entry.tabs[0].content = 'tampered-data';
      fake.setItem(CACHE_KEY, JSON.stringify(entry));
      expect(readTabCache()).toBeNull();
      expect(rawEntry()).toBeNull();
    });

    it('discards structurally invalid entries (missing checksum) and clears', () => {
      const fake = installStorage();
      fake.setItem(CACHE_KEY, JSON.stringify({ tabs: [makeTab({})] }));
      expect(readTabCache()).toBeNull();
      expect(rawEntry()).toBeNull();
    });

    it('discards corrupt JSON and clears the entry', () => {
      installStorage();
      (globalThis as any).localStorage.setItem(CACHE_KEY, '{not json');
      expect(readTabCache()).toBeNull();
      expect(rawEntry()).toBeNull();
    });

    it('returns null when no cache entry exists', () => {
      installStorage();
      expect(readTabCache()).toBeNull();
    });
  });

  describe('oversized content clamp', () => {
    it('drops oversized content but preserves tab metadata', () => {
      installStorage();
      const big = 'x'.repeat(256 * 1024 + 10);
      const tabs = [makeTab({ id: 'big', content: big }), makeTab({ id: 'small' })];
      writeTabCache(tabs, 'small');
      const restored = readTabCache()!;
      expect(restored.tabs.find(t => t.id === 'big')!.content).toBe('');
      expect(restored.tabs.find(t => t.id === 'small')!.content).toBe('content');
    });

    it('keeps content at or under the 256 KB budget intact', () => {
      installStorage();
      const exact = 'y'.repeat(256 * 1024);
      writeTabCache([makeTab({ id: 'ok', content: exact })], 'ok');
      expect(readTabCache()!.tabs[0].content).toBe(exact);
    });
  });

  describe('clear', () => {
    it('removes the cache entry so a later read returns null', () => {
      installStorage();
      writeTabCache([makeTab({})], 't1');
      expect(rawEntry()).not.toBeNull();
      clearTabCache();
      expect(rawEntry()).toBeNull();
      expect(readTabCache()).toBeNull();
    });

    it('clear on an empty cache is a safe no-op', () => {
      installStorage();
      expect(() => clearTabCache()).not.toThrow();
    });
  });
});