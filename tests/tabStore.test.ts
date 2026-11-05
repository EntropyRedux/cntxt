import { describe, it, expect, beforeEach } from 'vitest';
import { useTabStore, flushPendingSaves, setDemoWelcomeDisabled, isDemoWelcomeDisabled } from '../src/store/tabStore';
import { useConfirmStore } from '../src/store/confirmStore';

describe('TabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: '', closedTabsHistory: [], isSaving: false });
    useConfirmStore.setState({ isOpen: false, options: null, isLoading: false });
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

  it('closes a clean tab and creates an untitled tab if all tabs are closed', () => {
    const tabId = useTabStore.getState().createTab('Doc.md', 'Content');
    useTabStore.getState().closeTab(tabId);

    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(1);
    expect(state.tabs[0].title).toBe('Untitled.md');
  });

  it('intercepts closing a dirty tab and requests user confirmation', () => {
    const tabId = useTabStore.getState().createTab('UnsavedDoc.md', 'Initial');
    useTabStore.getState().updateTabContent(tabId, 'Modified content');
    expect(useTabStore.getState().tabs.find(t => t.id === tabId)?.isDirty).toBe(true);

    // Attempt close without force
    useTabStore.getState().closeTab(tabId);

    // Tab must remain open pending confirmation
    expect(useTabStore.getState().tabs.some(t => t.id === tabId)).toBe(true);
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useConfirmStore.getState().options?.title).toBe('Unsaved Changes');
    expect(useConfirmStore.getState().options?.message).toContain('UnsavedDoc.md');

    // Canceling keeps tab open
    useConfirmStore.getState().closeConfirm();
    expect(useConfirmStore.getState().isOpen).toBe(false);
    expect(useTabStore.getState().tabs.some(t => t.id === tabId)).toBe(true);

    // Re-attempt and confirm discard
    useTabStore.getState().closeTab(tabId);
    useConfirmStore.getState().triggerConfirm();
    expect(useTabStore.getState().tabs.some(t => t.id === tabId)).toBe(false);
  });

  it('closes a dirty tab immediately when force is true', () => {
    const tabId = useTabStore.getState().createTab('DirtyForce.md', 'Initial');
    useTabStore.getState().updateTabContent(tabId, 'Changed');
    expect(useTabStore.getState().tabs.find(t => t.id === tabId)?.isDirty).toBe(true);

    useTabStore.getState().closeTab(tabId, true);
    expect(useConfirmStore.getState().isOpen).toBe(false);
    expect(useTabStore.getState().tabs.some(t => t.id === tabId)).toBe(false);
  });

  it('prompts confirmation when closeOtherTabs includes dirty tabs', () => {
    const keepId = useTabStore.getState().createTab('Keep.md');
    const dirtyId = useTabStore.getState().createTab('DirtyOther.md');
    useTabStore.getState().updateTabContent(dirtyId, 'Modified');

    useTabStore.getState().closeOtherTabs(keepId);
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useTabStore.getState().tabs.length).toBe(2);

    useConfirmStore.getState().triggerConfirm();
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().tabs[0].id).toBe(keepId);
  });

  it('prompts confirmation when closeTabsToRight includes dirty tabs', () => {
    const leftId = useTabStore.getState().createTab('Left.md');
    const rightId = useTabStore.getState().createTab('RightDirty.md');
    useTabStore.getState().updateTabContent(rightId, 'Dirty Content');

    useTabStore.getState().closeTabsToRight(leftId);
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useTabStore.getState().tabs.length).toBe(2);

    useConfirmStore.getState().triggerConfirm();
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().tabs[0].id).toBe(leftId);
  });

  it('prompts confirmation when closeAllTabs includes dirty tabs', () => {
    const cleanId = useTabStore.getState().createTab('Clean.md');
    const dirtyId = useTabStore.getState().createTab('DirtyAll.md');
    useTabStore.getState().updateTabContent(dirtyId, 'Dirty Content');

    useTabStore.getState().closeAllTabs();
    expect(useConfirmStore.getState().isOpen).toBe(true);
    expect(useTabStore.getState().tabs.length).toBe(2);

    useConfirmStore.getState().triggerConfirm();
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().tabs[0].title).toBe('Untitled.md');
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

  it('opens markdown formatting guide tab and re-focuses if already open', () => {
    const guideId = useTabStore.getState().openMarkdownGuideTab();
    expect(guideId).toBe('markdown-guide-doc');

    let state = useTabStore.getState();
    expect(state.activeTabId).toBe('markdown-guide-doc');
    let tab = state.tabs.find(t => t.id === 'markdown-guide-doc');
    expect(tab).toBeDefined();
    expect(tab?.title).toBe('Markdown-Guide.md');
    expect(tab?.content).toContain('# CNTXT Markdown Formatting Guide');

    // Call again - should focus without duplicating
    const secondId = useTabStore.getState().openMarkdownGuideTab();
    expect(secondId).toBe('markdown-guide-doc');
    state = useTabStore.getState();
    expect(state.tabs.filter(t => t.id === 'markdown-guide-doc').length).toBe(1);
  });

  it('opens CNTXT power user guide tab and re-focuses if already open', () => {
    const guideId = useTabStore.getState().openPowerUserGuideTab();
    expect(guideId).toBe('power-user-guide-doc');

    let state = useTabStore.getState();
    expect(state.activeTabId).toBe('power-user-guide-doc');
    let tab = state.tabs.find(t => t.id === 'power-user-guide-doc');
    expect(tab).toBeDefined();
    expect(tab?.title).toBe('Power-User-Guide.md');
    expect(tab?.content).toContain('# ⚡ CNTXT Power User Guide');
    expect(tab?.content).toContain('[[action:uppercase|UPPERCASE Selected Text]]');
    expect(tab?.content).toContain('{=FORMULA()}');

    // Call again - should focus without duplicating
    const secondId = useTabStore.getState().openPowerUserGuideTab();
    expect(secondId).toBe('power-user-guide-doc');
    state = useTabStore.getState();
    expect(state.tabs.filter(t => t.id === 'power-user-guide-doc').length).toBe(1);
  });

  it('flushes pending autosaves without error', () => {
    const tabId = useTabStore.getState().createTab('AutosaveDoc.md', 'Initial Content');
    useTabStore.getState().updateTabContent(tabId, 'Pending Content');

    expect(() => {
      flushPendingSaves();
    }).not.toThrow();
  });

  it('supports explicit demo welcome suppression without ambient window flags', async () => {
    setDemoWelcomeDisabled(true);
    expect(isDemoWelcomeDisabled()).toBe(true);

    useTabStore.setState({ tabs: [], activeTabId: '', isHydrating: true });
    await useTabStore.getState().initializeTabs(undefined, true);

    const state = useTabStore.getState();
    expect(state.tabs.length).toBe(0);
    expect(state.activeTabId).toBe('');

    // Restore default
    setDemoWelcomeDisabled(false);
    expect(isDemoWelcomeDisabled()).toBe(false);
  });

  it('reorders tabs correctly from source to target index', () => {
    const idA = useTabStore.getState().createTab('A.md', 'Content A');
    const idB = useTabStore.getState().createTab('B.md', 'Content B');
    const idC = useTabStore.getState().createTab('C.md', 'Content C');

    let state = useTabStore.getState();
    expect(state.tabs.map(t => t.id)).toEqual([idA, idB, idC]);

    // Move first tab (index 0) to third position (index 2)
    useTabStore.getState().reorderTabs(0, 2);
    state = useTabStore.getState();
    expect(state.tabs.map(t => t.id)).toEqual([idB, idC, idA]);

    // Move last tab (index 2) back to first position (index 0)
    useTabStore.getState().reorderTabs(2, 0);
    state = useTabStore.getState();
    expect(state.tabs.map(t => t.id)).toEqual([idA, idB, idC]);
  });
  it('pushes closed tabs to closedTabsHistory and reopens the most recently closed tab', () => {
    const tab1Id = useTabStore.getState().createTab('FirstDoc.md', 'Content 1');
    const tab2Id = useTabStore.getState().createTab('SecondDoc.md', 'Content 2');

    // Close tab 2
    useTabStore.getState().closeTab(tab2Id);
    expect(useTabStore.getState().tabs.some(t => t.id === tab2Id)).toBe(false);
    expect(useTabStore.getState().closedTabsHistory.length).toBe(1);
    expect(useTabStore.getState().closedTabsHistory[0].title).toBe('SecondDoc.md');

    // Reopen closed tab
    const restoredId = useTabStore.getState().reopenClosedTab();
    expect(restoredId).toBeDefined();
    expect(useTabStore.getState().tabs.length).toBe(2);
    expect(useTabStore.getState().activeTabId).toBe(restoredId);

    const restoredTab = useTabStore.getState().tabs.find(t => t.id === restoredId);
    expect(restoredTab?.title).toBe('SecondDoc.md');
    expect(restoredTab?.content).toBe('Content 2');
    expect(useTabStore.getState().closedTabsHistory.length).toBe(0);
  });

  it('handles reopenClosedTab when history is empty without throwing', () => {
    useTabStore.setState({ closedTabsHistory: [] });
    const result = useTabStore.getState().reopenClosedTab();
    expect(result).toBeNull();
  });

  it('replaces pristine empty placeholder tab when reopening a closed tab', () => {
    const tabId = useTabStore.getState().createTab('Important.md', 'Critical data');
    useTabStore.getState().closeTab(tabId);

    // Only the default fresh untitled tab remains
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().tabs[0].title).toBe('Untitled.md');

    // Reopen should replace the untouched empty untitled placeholder
    const restoredId = useTabStore.getState().reopenClosedTab();
    expect(useTabStore.getState().tabs.length).toBe(1);
    expect(useTabStore.getState().tabs[0].id).toBe(restoredId);
    expect(useTabStore.getState().tabs[0].title).toBe('Important.md');
    expect(useTabStore.getState().tabs[0].content).toBe('Critical data');
  });
});
