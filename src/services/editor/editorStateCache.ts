import { EditorState } from '@codemirror/state';
import { SupportedLanguage } from '../../types';

export interface CachedTabState {
  state: EditorState;
  scrollTop: number;
  scrollLeft: number;
  language: SupportedLanguage;
}

/**
 * In-memory cache for CodeMirror EditorState and viewport scroll offsets per tab.
 *
 * Preserves complete undo/redo history stacks, selection ranges, cursor positions,
 * and viewport scroll positions across tab switches without destroying the EditorView
 * or maintaining multiple heavy DOM trees.
 */
class EditorStateCache {
  private cache = new Map<string, CachedTabState>();

  saveTabState(
    tabId: string,
    state: EditorState,
    scrollTop: number = 0,
    scrollLeft: number = 0,
    language: SupportedLanguage = 'markdown'
  ): void {
    if (!tabId) return;
    this.cache.set(tabId, {
      state,
      scrollTop,
      scrollLeft,
      language
    });
  }

  getTabState(tabId: string): CachedTabState | undefined {
    return this.cache.get(tabId);
  }

  hasTabState(tabId: string): boolean {
    return this.cache.has(tabId);
  }

  evictTabState(tabId: string): boolean {
    return this.cache.delete(tabId);
  }

  clearAllTabStates(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

export const editorStateCache = new EditorStateCache();
