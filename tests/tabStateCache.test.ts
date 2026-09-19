import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { history, undo, redo, isolateHistory } from '@codemirror/commands';
import { editorStateCache } from '../src/services/editor/editorStateCache';
import {
  themeCompartment,
  wordWrapCompartment,
  languageCompartment
} from '../src/services/editor/editorCompartments';
import { editorRegistry } from '../src/services/editor/editorRegistry';
import { useTabStore } from '../src/store/tabStore';

describe('editorStateCache & multi-tab undo/redo state preservation', () => {
  beforeEach(() => {
    editorStateCache.clearAllTabStates();
  });

  it('correctly stores, retrieves, checks, and evicts cached tab states', () => {
    const state = EditorState.create({ doc: 'Hello Tab 1' });
    editorStateCache.saveTabState('tab_1', state, 150, 20, 'markdown');

    expect(editorStateCache.hasTabState('tab_1')).toBe(true);
    expect(editorStateCache.getCacheSize()).toBe(1);

    const retrieved = editorStateCache.getTabState('tab_1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.state.doc.toString()).toBe('Hello Tab 1');
    expect(retrieved?.scrollTop).toBe(150);
    expect(retrieved?.scrollLeft).toBe(20);
    expect(retrieved?.language).toBe('markdown');

    const evicted = editorStateCache.evictTabState('tab_1');
    expect(evicted).toBe(true);
    expect(editorStateCache.hasTabState('tab_1')).toBe(false);
    expect(editorStateCache.getCacheSize()).toBe(0);
  });

  it('preserves independent undo and redo history across tab switches using state swapping', () => {
    const extensions = [
      history(),
      themeCompartment.of([]),
      wordWrapCompartment.of([]),
      languageCompartment.of([])
    ];

    // Simulated editor target that acts like an EditorView dispatcher
    class MockEditorHost {
      state: EditorState;
      constructor(initialState: EditorState) {
        this.state = initialState;
        this.dispatch = this.dispatch.bind(this);
      }
      dispatch(tr: any) {
        if (tr.state) {
          this.state = tr.state;
        } else {
          const transaction = this.state.update(tr);
          this.state = transaction.state;
        }
      }
      setState(newState: EditorState) {
        this.state = newState;
      }
    }

    // 1. Mount Tab 1 with fresh state
    const stateA = EditorState.create({ doc: '', extensions });
    const host = new MockEditorHost(stateA);

    // Type "Hello" in Tab 1
    host.dispatch({ changes: { from: 0, insert: 'Hello' } });
    // Type " World" in Tab 1 with isolateHistory to ensure discrete undo steps
    host.dispatch({
      changes: { from: 5, insert: ' World' },
      annotations: isolateHistory.of('before')
    });
    expect(host.state.doc.toString()).toBe('Hello World');

    // Save Tab 1 state to cache
    editorStateCache.saveTabState('tab_1', host.state, 50, 0, 'markdown');

    // 2. Switch to Tab 2 (fresh state)
    const stateB = EditorState.create({ doc: '', extensions });
    host.setState(stateB);

    // Type in Tab 2
    host.dispatch({ changes: { from: 0, insert: 'Second Tab Text' } });
    expect(host.state.doc.toString()).toBe('Second Tab Text');

    // Save Tab 2 state to cache
    editorStateCache.saveTabState('tab_2', host.state, 0, 0, 'markdown');

    // 3. Switch back to Tab 1
    const cachedA = editorStateCache.getTabState('tab_1')!;
    expect(cachedA).toBeDefined();
    host.setState(cachedA.state);
    expect(host.state.doc.toString()).toBe('Hello World');

    // 4. Perform UNDO on Tab 1 (step 1: reverts " World")
    const undone1 = undo(host);
    expect(undone1).toBe(true);
    expect(host.state.doc.toString()).toBe('Hello');

    // Perform UNDO on Tab 1 (step 2: reverts "Hello")
    const undone2 = undo(host);
    expect(undone2).toBe(true);
    expect(host.state.doc.toString()).toBe('');

    // 5. Perform REDO on Tab 1 (step 1: restores "Hello")
    const redone1 = redo(host);
    expect(redone1).toBe(true);
    expect(host.state.doc.toString()).toBe('Hello');

    // Perform REDO on Tab 1 (step 2: restores " World")
    const redone2 = redo(host);
    expect(redone2).toBe(true);
    expect(host.state.doc.toString()).toBe('Hello World');

    // 6. Switch back to Tab 2 - verify Tab 2 and its undo history were completely untouched
    const cachedB = editorStateCache.getTabState('tab_2')!;
    host.setState(cachedB.state);
    expect(host.state.doc.toString()).toBe('Second Tab Text');
  });

  it('allows dynamic module-level singleton Compartment reconfiguration on swapped states', () => {
    const extensions = [
      themeCompartment.of([]),
      wordWrapCompartment.of([]),
      languageCompartment.of([])
    ];

    const state1 = EditorState.create({ doc: 'Document 1', extensions });
    const state2 = EditorState.create({ doc: 'Document 2', extensions });

    // Reconfigure singleton compartments on state 2 without errors
    expect(() => {
      const tr = state2.update({
        effects: [
          wordWrapCompartment.reconfigure([]),
          themeCompartment.reconfigure([])
        ]
      });
      expect(tr.state.doc.toString()).toBe('Document 2');
    }).not.toThrow();
  });

  it('updates cached state in editorRegistry.setContent when tab view is inactive', () => {
    const state = EditorState.create({ doc: 'Initial content' });
    editorStateCache.saveTabState('tab_inactive', state, 100, 10, 'markdown');

    const updated = editorRegistry.setContent('tab_inactive', 'Updated external content');
    expect(updated).toBe(true);

    const cached = editorStateCache.getTabState('tab_inactive');
    expect(cached?.state.doc.toString()).toBe('Updated external content');
    // Scroll offsets are preserved
    expect(cached?.scrollTop).toBe(100);
    expect(cached?.scrollLeft).toBe(10);
  });

  it('evicts cached state when tabs are closed via tabStore', () => {
    const store = useTabStore.getState();
    const tab1Id = store.createTab('Doc 1', 'Content 1');
    const tab2Id = store.createTab('Doc 2', 'Content 2');

    const state1 = EditorState.create({ doc: 'Content 1' });
    const state2 = EditorState.create({ doc: 'Content 2' });
    editorStateCache.saveTabState(tab1Id, state1);
    editorStateCache.saveTabState(tab2Id, state2);

    expect(editorStateCache.hasTabState(tab1Id)).toBe(true);
    expect(editorStateCache.hasTabState(tab2Id)).toBe(true);

    // Close tab 1
    store.closeTab(tab1Id);
    expect(editorStateCache.hasTabState(tab1Id)).toBe(false);
    expect(editorStateCache.hasTabState(tab2Id)).toBe(true);

    // Close other tabs
    const tab3Id = store.createTab('Doc 3', 'Content 3');
    editorStateCache.saveTabState(tab3Id, EditorState.create({ doc: 'Content 3' }));
    store.closeOtherTabs(tab3Id);
    expect(editorStateCache.hasTabState(tab2Id)).toBe(false);
    expect(editorStateCache.hasTabState(tab3Id)).toBe(true);

    // Close all tabs
    store.closeAllTabs();
    expect(editorStateCache.getCacheSize()).toBe(0);
  });
});
