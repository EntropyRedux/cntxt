import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { safePersist, safeRemove } from '../src/services/storageHelper';
import { useNotificationStore } from '../src/store/notificationStore';
import type { IStorageBridge } from '../src/ui-contract/bridgeContract';

function makeStorage(opts: {
  failSet?: boolean;
  failRemove?: boolean;
  store?: Map<string, string>;
} = {}): IStorageBridge {
  const mem = opts.store ?? new Map<string, string>();
  return {
    getItem: async (key: string) => (mem.has(key) ? (mem.get(key) as string) : null),
    setItem: async (key: string, value: string) => {
      if (opts.failSet) throw new Error('quota exceeded');
      mem.set(key, value);
    },
    removeItem: async (key: string) => {
      if (opts.failRemove) throw new Error('storage restricted');
      mem.delete(key);
    },
  } as unknown as IStorageBridge;
}

describe('storageHelper', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  afterEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  describe('safePersist', () => {
    it('persists the value and reports success', async () => {
      const mem = new Map<string, string>();
      const result = await safePersist(makeStorage({ store: mem }), 'k1', 'v1', 'test-doc');
      expect(result).toBe(true);
      expect(mem.get('k1')).toBe('v1');
    });

    it('reports failure without throwing when the bridge is null', async () => {
      await expect(safePersist(null, 'k', 'v', 'test-doc')).resolves.toBe(false);
    });

    it('catches quota failure, returns false, and notifies the user', async () => {
      const result = await safePersist(makeStorage({ failSet: true }), 'k', 'v', 'Test Document');
      expect(result).toBe(false);
      const notes = useNotificationStore.getState().notifications;
      expect(notes.some(n => n.title === 'Storage Error')).toBe(true);
      expect(notes.some(n => n.message.includes('Could not save Test Document'))).toBe(true);
    });

    it('failed persist leaves the target key unwritten (no silent partial write)', async () => {
      const mem = new Map<string, string>();
      const result = await safePersist(makeStorage({ failSet: true, store: mem }), 'k', 'v', 'Audit');
      expect(result).toBe(false);
      expect(mem.has('k')).toBe(false);
    });
  });

  describe('safeRemove', () => {
    it('removes the key and reports success', async () => {
      const mem = new Map<string, string>([['gone', 'x']]);
      const result = await safeRemove(makeStorage({ store: mem }), 'gone', 'test-doc');
      expect(result).toBe(true);
      expect(mem.has('gone')).toBe(false);
    });

    it('reports failure without throwing when the bridge is null', async () => {
      await expect(safeRemove(null, 'k', 'test-doc')).resolves.toBe(false);
    });

    it('catches removal failure, returns false, and notifies the user', async () => {
      const result = await safeRemove(makeStorage({ failRemove: true }), 'k', 'Cleanup');
      expect(result).toBe(false);
      const notes = useNotificationStore.getState().notifications;
      expect(notes.some(n => n.title === 'Storage Error')).toBe(true);
      expect(notes.some(n => n.message.includes('Could not delete Cleanup'))).toBe(true);
    });
  });
});