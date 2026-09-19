import { describe, it, expect, beforeEach } from 'vitest';
import { useTabStore } from '../src/store/tabStore';

describe('TabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: '', isSaving: false });
  });

  it('creates a new tab with default parameters', () => {
    const tabId = useTabStore.getState().createTab();
    const state = useTabStore.getState();

    expect(state.tabs.length).toBe(1);
    expect(state.activeTabId).toBe(tabId);
    expect(state.tabs[0].title).toBe('Untitled.md');
    expect(state.tabs[0].content).toBe('');
    expect(state.tabs[0].isDirty).toBe(false);
  });

  it('creates a tab with custom title and content', () => {
    const tabId = useTabStore.getState().createTab('Notes.txt', 'Sample text', 'text');
    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);

    expect(tab).toBeDefined();
    expect(tab?.title).toBe('Notes.txt');
    expect(tab?.content).toBe('Sample text');
    expect(tab?.language).toBe('text');
  });

  it('updates tab content and marks tab as dirty', () => {
    const tabId = useTabStore.getState().createTab('Doc.md', 'Original');
    useTabStore.getState().updateTabContent(tabId, 'Modified');

    const tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab?.content).toBe('Modified');
    expect(tab?.isDirty).toBe(true);
  });

  it('closes a tab and creates an untitled tab if all tabs are closed', () => {
    const tabId = useTabStore.getState().createTab('Doc.md', 'Content');
    useTabStore.getState().closeTab(tabId);

    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].title).toBe('Untitled.md');
  });

  it('toggles tab pin state', () => {
    const tabId = useTabStore.getState().createTab('PinMe.md');
    useTabStore.getState().togglePinTab(tabId);

    let tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab?.isPinned).toBe(true);

    useTabStore.getState().togglePinTab(tabId);
    tab = useTabStore.getState().tabs.find(t => t.id === tabId);
    expect(tab?.isPinned).toBe(false);
  });

  it('resets welcome tab to canonical state', async () => {
    // Open welcome tab and modify content
    useTabStore.getState().openWelcomeTab();
    useTabStore.getState().updateTabContent('welcome-doc', 'corrupted user typing');

    let tab = useTabStore.getState().tabs.find(t => t.id === 'welcome-doc');
    expect(tab?.content).toBe('corrupted user typing');

    // Reset
    await useTabStore.getState().resetWelcomeTab();

    tab = useTabStore.getState().tabs.find(t => t.id === 'welcome-doc');
    expect(tab?.content).not.toBe('corrupted user typing');
    expect(tab?.content).toContain('# 🚀 Welcome to ContextPad');
    expect(tab?.isPinned).toBe(true);
  });
});
