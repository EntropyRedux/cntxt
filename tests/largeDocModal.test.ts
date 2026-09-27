import { describe, it, expect, beforeEach } from 'vitest';
import { isDocumentLarge, openDocumentWithLargeDocCheck } from '../src/services/largeDocHelper';
import { useSettingsStore } from '../src/store/settingsStore';
import { useTabStore } from '../src/store/tabStore';
import { useLargeDocModalStore } from '../src/store/largeDocModalStore';

describe('Large Document Truncation & Interception Engine', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetSettings();
    useTabStore.setState({ tabs: [], activeTabId: '', isHydrating: false });
    useLargeDocModalStore.getState().closeLargeDocModal();
  });

  describe('isDocumentLarge', () => {
    it('returns false for small documents', () => {
      const normalDoc = '# Normal Document\nThis is a brief markdown note with a few paragraphs.';
      expect(isDocumentLarge(normalDoc)).toBe(false);
    });

    it('returns true when line count threshold is exceeded', () => {
      useSettingsStore.getState().updateSettings({
        enableLargeDocDetection: true,
        largeDocThresholdLines: 50,
        largeDocThresholdKb: 500
      });

      const multiline = Array.from({ length: 60 }, (_, i) => `Line ${i + 1}`).join('\n');
      expect(isDocumentLarge(multiline)).toBe(true);
    });

    it('returns true when file size threshold is exceeded', () => {
      useSettingsStore.getState().updateSettings({
        enableLargeDocDetection: true,
        largeDocThresholdKb: 1, // 1 KB
        largeDocThresholdLines: 10000
      });

      // Generate string larger than 1.5 KB
      const bigContent = 'x'.repeat(1600);
      expect(isDocumentLarge(bigContent)).toBe(true);
    });

    it('returns false when enableLargeDocDetection is explicitly disabled', () => {
      useSettingsStore.getState().updateSettings({
        enableLargeDocDetection: false,
        largeDocThresholdKb: 1,
        largeDocThresholdLines: 10
      });

      const bigContent = 'x'.repeat(1600);
      expect(isDocumentLarge(bigContent)).toBe(false);
    });
  });

  describe('openDocumentWithLargeDocCheck', () => {
    it('creates tab with full content immediately when document is below thresholds', () => {
      const content = '# Small Doc\nContent here';
      const tabId = openDocumentWithLargeDocCheck({
        title: 'Small.md',
        content,
        language: 'markdown'
      });

      expect(tabId).toBeDefined();
      const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
      expect(tab?.content).toBe(content);
      expect(useLargeDocModalStore.getState().isOpen).toBe(false);
    });

    it('intercepts opening and opens LargeDocModal when document exceeds thresholds', () => {
      useSettingsStore.getState().updateSettings({
        enableLargeDocDetection: true,
        largeDocThresholdLines: 20
      });

      const largeContent = `# Section 1\nSome initial content\n## Section 2\nMore details\n` +
        Array.from({ length: 30 }, (_, i) => `Content line ${i}`).join('\n');

      const tabId = openDocumentWithLargeDocCheck({
        title: 'LargeDoc.md',
        content: largeContent,
        language: 'markdown'
      });

      expect(tabId).toBeDefined();
      const modalState = useLargeDocModalStore.getState();
      expect(modalState.isOpen).toBe(true);
      expect(modalState.tabId).toBe(tabId);
      expect(modalState.fileTitle).toBe('LargeDoc.md');
      expect(modalState.headings.length).toBe(2);
      expect(modalState.headings[0].text).toBe('Section 1');
      expect(modalState.headings[1].text).toBe('Section 2');
    });

    it('updates existing tab when existingTabId is provided for normal files', () => {
      const initialTabId = useTabStore.getState().createTab('Existing.md', 'Old content');
      
      openDocumentWithLargeDocCheck({
        title: 'Existing.md',
        content: 'New refreshed content',
        existingTabId: initialTabId
      });

      const tab = useTabStore.getState().tabs.find(t => t.id === initialTabId);
      expect(tab?.content).toBe('New refreshed content');
      expect(useLargeDocModalStore.getState().isOpen).toBe(false);
    });
  });

  describe('LargeDocModal Headings Extraction', () => {
    it('correctly parses markdown heading levels and line numbers', () => {
      const content = `# Top Header\nParagraph\n## Subheader A\nContent\n### Deep Header\n#### Sub 4\n##### Sub 5\n###### Sub 6`;
      
      useLargeDocModalStore.getState().openLargeDocModal('tab-1', 'Test.md', content);
      const { headings } = useLargeDocModalStore.getState();

      expect(headings).toHaveLength(6);
      expect(headings[0]).toEqual({ level: 1, text: 'Top Header', lineNumber: 1 });
      expect(headings[1]).toEqual({ level: 2, text: 'Subheader A', lineNumber: 3 });
      expect(headings[2]).toEqual({ level: 3, text: 'Deep Header', lineNumber: 5 });
      expect(headings[3]).toEqual({ level: 4, text: 'Sub 4', lineNumber: 6 });
      expect(headings[4]).toEqual({ level: 5, text: 'Sub 5', lineNumber: 7 });
      expect(headings[5]).toEqual({ level: 6, text: 'Sub 6', lineNumber: 8 });
    });
  });
});
