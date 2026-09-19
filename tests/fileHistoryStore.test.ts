import { describe, it, expect, beforeEach } from 'vitest';
import { useFileHistoryStore } from '../src/store/fileHistoryStore';

describe('FileHistoryStore', () => {
  beforeEach(() => {
    useFileHistoryStore.setState({
      pinnedItems: [],
      openedHistory: []
    });
  });

  describe('Initialization', () => {
    it('initializes with empty history', () => {
      expect(useFileHistoryStore.getState().pinnedItems).toEqual([]);
      expect(useFileHistoryStore.getState().openedHistory).toEqual([]);
    });
  });

  describe('Opened File History', () => {
    it('records opened file', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({
        name: 'test.md',
        path: '/home/user/test.md',
        language: 'markdown',
      });
      
      const history = useFileHistoryStore.getState().openedHistory;
      expect(history.length).toBe(1);
      expect(history[0].name).toBe('test.md');
      expect(history[0].type).toBe('file');
      expect(history[0].openedAt).toBeDefined();
    });

    it('deduplicates repeated file opens', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({ name: 'doc.md', path: '/doc.md' });
      store.recordOpenedFile({ name: 'doc.md', path: '/doc.md' });
      store.recordOpenedFile({ name: 'doc.md', path: '/doc.md' });
      
      const history = useFileHistoryStore.getState().openedHistory;
      expect(history.length).toBe(1);
      expect(history[0].name).toBe('doc.md');
    });

    it('maintains max 25 items in history', () => {
      const store = useFileHistoryStore.getState();
      for (let i = 0; i < 30; i++) {
        store.recordOpenedFile({ name: `file${i}.md`, path: `/file${i}.md` });
      }
      
      const history = useFileHistoryStore.getState().openedHistory;
      expect(history.length).toBe(25);
    });

    it('moves recently opened file to top', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({ name: 'old.md', path: '/old.md' });
      store.recordOpenedFile({ name: 'new.md', path: '/new.md' });
      store.recordOpenedFile({ name: 'old.md', path: '/old.md' });
      
      const history = useFileHistoryStore.getState().openedHistory;
      expect(history[0].name).toBe('old.md');
    });

    it('removes file from history', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({ name: 'test.md', path: '/test.md' });
      store.removeOpenedFile('test.md');
      
      expect(useFileHistoryStore.getState().openedHistory.length).toBe(0);
    });

    it('clears all history', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({ name: 'a.md' });
      store.recordOpenedFile({ name: 'b.md' });
      store.clearOpenedHistory();
      
      expect(useFileHistoryStore.getState().openedHistory).toEqual([]);
    });

    it('handles empty file record', () => {
      const store = useFileHistoryStore.getState();
      store.recordOpenedFile({} as any);
      store.recordOpenedFile({ name: '' });
      
      expect(useFileHistoryStore.getState().openedHistory.length).toBe(0);
    });
  });

  describe('Pinned Items', () => {
    it('pins item', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({
        id: 'pin1',
        name: 'Pinned File',
        type: 'file',
        path: '/pinned.md',
      });
      
      expect(useFileHistoryStore.getState().pinnedItems.length).toBe(1);
      expect(useFileHistoryStore.getState().pinnedItems[0].name).toBe('Pinned File');
    });

    it('unpins item by id', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({ id: 'pin1', name: 'File', type: 'file' });
      store.unpinItem('pin1');
      
      expect(useFileHistoryStore.getState().pinnedItems.length).toBe(0);
    });

    it('unpins item by name', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({ id: 'pin1', name: 'File', type: 'file' });
      store.unpinItem('File');
      
      expect(useFileHistoryStore.getState().pinnedItems.length).toBe(0);
    });

    it('toggles pin status', () => {
      const store = useFileHistoryStore.getState();
      const item = { id: 'item1', name: 'Item', type: 'file' };
      
      expect(store.isPinned('item1')).toBe(false);
      store.togglePinItem(item);
      expect(store.isPinned('item1')).toBe(true);
      store.togglePinItem(item);
      expect(store.isPinned('item1')).toBe(false);
    });

    it('checks if item is pinned', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({ id: 'pin1', name: 'File', type: 'file' });
      
      expect(store.isPinned('pin1')).toBe(true);
      expect(store.isPinned('File')).toBe(true);
      expect(store.isPinned('non-existent')).toBe(false);
    });

    it('removes duplicate when re-pinning', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({ id: 'pin1', name: 'File', type: 'file', path: '/a.md' });
      store.pinItem({ id: 'pin1', name: 'File', type: 'file', path: '/b.md' });
      
      const pinned = useFileHistoryStore.getState().pinnedItems;
      expect(pinned.length).toBe(1);
      expect(pinned[0].path).toBe('/b.md'); // updated
    });

    it('pins folder type', () => {
      const store = useFileHistoryStore.getState();
      store.pinItem({
        id: 'folder1',
        name: 'My Folder',
        type: 'folder',
        path: '/folders/myfolder',
      });
      
      const pinned = useFileHistoryStore.getState().pinnedItems[0];
      expect(pinned.type).toBe('folder');
      expect(pinned.name).toBe('My Folder');
    });
  });
});
