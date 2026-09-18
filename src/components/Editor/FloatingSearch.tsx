import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  selectMatches
} from '@codemirror/search';
import {
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  CaseSensitive,
  Regex,
  WholeWord,
  Replace,
  ReplaceAll
} from 'lucide-react';
import styles from './FloatingSearch.module.css';
import { createElement, appendToBody, removeFromBody } from '../../adapters/domHelper';

export interface FloatingSearchProps {
  view: EditorView;
  onClose: () => void;
  mode: 'find' | 'replace';
}

interface MatchRange {
  from: number;
  to: number;
}

/**
 * Collect all match ranges directly using CodeMirror's search cursor.
 * Guarantees 100% parity with CodeMirror's search matching engine.
 */
function collectMatches(query: SearchQuery, doc: any): MatchRange[] {
  if (!query.valid || !query.search) return [];
  const results: MatchRange[] = [];
  try {
    const cursor = query.getCursor(doc);
    let item = cursor.next();
    let count = 0;
    while (!item.done && count < 5000) {
      if (item.value.from < item.value.to) {
        results.push({ from: item.value.from, to: item.value.to });
        count++;
      }
      item = cursor.next();
    }
  } catch {
    // Guard against invalid regex patterns or cursor errors
  }
  return results;
}

/**
 * Determine the 1-based active match index given all matches and the main selection.
 */
function resolveActiveMatchIndex(matches: MatchRange[], sel: { from: number; to: number; empty?: boolean }): number {
  if (matches.length === 0) return 0;

  // 1. Check if selection matches or overlaps an existing match
  const idx = matches.findIndex((m) =>
    (m.from === sel.from && m.to === sel.to) ||
    (!sel.empty && sel.from >= m.from && sel.to <= m.to) ||
    (sel.empty && sel.from >= m.from && sel.from <= m.to)
  );
  if (idx !== -1) return idx + 1;

  // 2. Fall back to the closest upcoming match at or after cursor
  const nextIdx = matches.findIndex((m) => m.from >= sel.from);
  return nextIdx !== -1 ? nextIdx + 1 : 1;
}

export const FloatingSearch: React.FC<FloatingSearchProps> = ({ view, onClose: onCloseProp, mode: initialMode }) => {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [showReplace, setShowReplace] = useState(initialMode === 'replace');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<MatchRange[]>([]);

  // Update showReplace when mode prop changes
  useEffect(() => {
    setShowReplace(initialMode === 'replace');
  }, [initialMode]);

  // Function to clear search state from CodeMirror
  const clearSearchState = useCallback(() => {
    try {
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: '' }))
      });
    } catch {
      // view might already be destroyed
    }
  }, [view]);

  // Wrap onClose to clear search state and restore editor focus
  const handleClose = useCallback(() => {
    clearSearchState();
    try {
      view.focus();
    } catch {}
    onCloseProp();
  }, [clearSearchState, onCloseProp, view]);

  // Create portal container
  const [portalRoot] = useState(() => {
    return createElement('div', { id: 'floating-search-portal' });
  });

  useEffect(() => {
    appendToBody(portalRoot);
    return () => {
      removeFromBody(portalRoot);
    };
  }, [portalRoot]);

  // Cleanup search state on unmount
  useEffect(() => {
    return () => {
      clearSearchState();
    };
  }, [clearSearchState]);

  // Focus search input on mount and initialize with current editor selection if non-empty
  useEffect(() => {
    const mainSel = view.state.selection.main;
    if (!mainSel.empty && mainSel.to - mainSel.from <= 100) {
      const initialText = view.state.sliceDoc(mainSel.from, mainSel.to);
      if (initialText && !initialText.includes('\n')) {
        setSearchText(initialText);
      }
    }
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [view]);

  // Recompute and sync matches
  const syncMatches = useCallback(
    (query: SearchQuery, autoSelectClosest = false) => {
      if (!query.valid || !query.search) {
        matchesRef.current = [];
        setMatchCount(0);
        setCurrentMatch(0);
        return;
      }

      const matches = collectMatches(query, view.state.doc);
      matchesRef.current = matches;
      setMatchCount(matches.length);

      if (matches.length > 0) {
        const activeIdx = resolveActiveMatchIndex(matches, view.state.selection.main);
        setCurrentMatch(activeIdx);

        if (autoSelectClosest) {
          const target = matches[activeIdx - 1];
          if (target) {
            view.dispatch({
              selection: EditorSelection.single(target.from, target.to),
              effects: EditorView.scrollIntoView(EditorSelection.range(target.from, target.to), { y: 'center', x: 'nearest' }),
              userEvent: 'select.search'
            });
          }
        }
      } else {
        setCurrentMatch(0);
      }
    },
    [view]
  );

  // Update CodeMirror search state whenever search inputs or options change
  useEffect(() => {
    if (searchText) {
      try {
        const query = new SearchQuery({
          search: searchText,
          caseSensitive,
          regexp: useRegex,
          wholeWord
        });

        view.dispatch({
          effects: setSearchQuery.of(query)
        });

        syncMatches(query, true);
      } catch {
        setMatchCount(0);
        setCurrentMatch(0);
      }
    } else {
      clearSearchState();
      matchesRef.current = [];
      setMatchCount(0);
      setCurrentMatch(0);
    }
  }, [searchText, caseSensitive, useRegex, wholeWord, view, syncMatches, clearSearchState]);

  // Keep current match index in sync when user clicks or moves cursor inside the editor
  useEffect(() => {
    const handleEditorActivity = () => {
      if (matchesRef.current.length > 0) {
        const activeIdx = resolveActiveMatchIndex(matchesRef.current, view.state.selection.main);
        setCurrentMatch(activeIdx);
      }
    };

    const dom = view.dom;
    dom.addEventListener('pointerup', handleEditorActivity);
    dom.addEventListener('keyup', handleEditorActivity);
    return () => {
      dom.removeEventListener('pointerup', handleEditorActivity);
      dom.removeEventListener('keyup', handleEditorActivity);
    };
  }, [view]);

  const jumpToMatch = (target: MatchRange) => {
    view.dispatch({
      selection: EditorSelection.single(target.from, target.to),
      effects: EditorView.scrollIntoView(EditorSelection.range(target.from, target.to), { y: 'center', x: 'nearest' }),
      userEvent: 'select.search'
    });
  };

  const handleFindNext = () => {
    const matches = matchesRef.current;
    if (matches.length === 0) return;

    const res = findNext(view);
    const sel = view.state.selection.main;

    if (res) {
      view.dispatch({
        effects: EditorView.scrollIntoView(sel, { y: 'center', x: 'nearest' })
      });
      const activeIdx = resolveActiveMatchIndex(matches, sel);
      setCurrentMatch(activeIdx);
    } else {
      // Fallback: manually jump to next match after current selection
      const nextIdx = matches.findIndex((m) => m.from >= sel.to);
      const targetIdx = nextIdx !== -1 ? nextIdx : 0;
      const target = matches[targetIdx];
      jumpToMatch(target);
      setCurrentMatch(targetIdx + 1);
    }
  };

  const handleFindPrevious = () => {
    const matches = matchesRef.current;
    if (matches.length === 0) return;

    const res = findPrevious(view);
    const sel = view.state.selection.main;

    if (res) {
      view.dispatch({
        effects: EditorView.scrollIntoView(sel, { y: 'center', x: 'nearest' })
      });
      const activeIdx = resolveActiveMatchIndex(matches, sel);
      setCurrentMatch(activeIdx);
    } else {
      // Fallback: manually jump to previous match before current selection
      let prevIdx = -1;
      for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i].to <= sel.from) {
          prevIdx = i;
          break;
        }
      }
      const targetIdx = prevIdx !== -1 ? prevIdx : matches.length - 1;
      const target = matches[targetIdx];
      jumpToMatch(target);
      setCurrentMatch(targetIdx + 1);
    }
  };

  const handleReplace = () => {
    if (!searchText) return;
    const query = new SearchQuery({
      search: searchText,
      replace: replaceText,
      caseSensitive,
      regexp: useRegex,
      wholeWord
    });
    view.dispatch({ effects: setSearchQuery.of(query) });
    replaceNext(view);

    setTimeout(() => {
      syncMatches(query);
      view.dispatch({
        effects: EditorView.scrollIntoView(view.state.selection.main, { y: 'center', x: 'nearest' })
      });
    }, 10);
  };

  const handleReplaceAll = () => {
    if (!searchText) return;
    const query = new SearchQuery({
      search: searchText,
      replace: replaceText,
      caseSensitive,
      regexp: useRegex,
      wholeWord
    });
    view.dispatch({ effects: setSearchQuery.of(query) });
    replaceAll(view);

    setTimeout(() => {
      syncMatches(query);
    }, 10);
  };

  const handleSelectAll = () => {
    selectMatches(view);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    } else if (e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindPrevious();
      } else {
        handleFindNext();
      }
    } else if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      setCaseSensitive((prev) => !prev);
    } else if (e.altKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      setWholeWord((prev) => !prev);
    } else if (e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      setUseRegex((prev) => !prev);
    } else if (e.key === 'h' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setShowReplace((prev) => !prev);
    }
  };

  const content = (
    <div className={styles.floatingSearch} onKeyDown={handleKeyDown}>
      {/* Toggle replace row button */}
      <button
        className={styles.toggleReplace}
        onClick={() => setShowReplace((prev) => !prev)}
        title={showReplace ? 'Hide Replace' : 'Show Replace (Ctrl+H)'}
        aria-label={showReplace ? 'Hide Replace' : 'Show Replace'}
      >
        <ChevronRight size={14} className={showReplace ? styles.rotated : ''} />
      </button>

      <div className={styles.searchContent}>
        {/* Find row */}
        <div className={styles.searchRow}>
          <div className={styles.inputWrapper}>
            <input
              id="floating-search-find-input"
              name="floatingSearchFind"
              ref={searchInputRef}
              type="text"
              className={styles.searchInput}
              placeholder="Find"
              aria-label="Find"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <div className={styles.inputOptions}>
              <button
                className={`${styles.optionBtn} ${caseSensitive ? styles.active : ''}`}
                onClick={() => setCaseSensitive((prev) => !prev)}
                title="Match Case (Alt+C)"
                aria-label="Match Case"
              >
                <CaseSensitive size={14} />
              </button>
              <button
                className={`${styles.optionBtn} ${wholeWord ? styles.active : ''}`}
                onClick={() => setWholeWord((prev) => !prev)}
                title="Match Whole Word (Alt+W)"
                aria-label="Match Whole Word"
              >
                <WholeWord size={14} />
              </button>
              <button
                className={`${styles.optionBtn} ${useRegex ? styles.active : ''}`}
                onClick={() => setUseRegex((prev) => !prev)}
                title="Use Regular Expression (Alt+R)"
                aria-label="Use Regular Expression"
              >
                <Regex size={14} />
              </button>
            </div>
          </div>

          <div className={styles.matchInfo}>
            {searchText && (
              <span className={styles.matchCount}>
                {matchCount === 0 ? 'No results' : `${currentMatch} of ${matchCount}`}
              </span>
            )}
          </div>

          <div className={styles.navButtons}>
            <button
              className={styles.navBtn}
              onClick={handleFindPrevious}
              disabled={!searchText || matchCount === 0}
              title="Previous Match (Shift+Enter)"
              aria-label="Previous Match"
            >
              <ChevronUp size={16} />
            </button>
            <button
              className={styles.navBtn}
              onClick={handleFindNext}
              disabled={!searchText || matchCount === 0}
              title="Next Match (Enter)"
              aria-label="Next Match"
            >
              <ChevronDown size={16} />
            </button>
            <button
              className={styles.navBtn}
              onClick={handleSelectAll}
              disabled={!searchText || matchCount === 0}
              title="Select All Matches"
              aria-label="Select All Matches"
            >
              <span className={styles.selectAllIcon}>⊞</span>
            </button>
            <button
              className={styles.closeBtn}
              onClick={handleClose}
              title="Close (Esc)"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Replace row */}
        {showReplace && (
          <div className={styles.replaceRow}>
            <div className={styles.inputWrapper}>
              <input
                id="floating-search-replace-input"
                name="floatingSearchReplace"
                type="text"
                className={styles.searchInput}
                placeholder="Replace"
                aria-label="Replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
              />
            </div>

            <div className={styles.replaceButtons}>
              <button
                className={styles.replaceBtn}
                onClick={handleReplace}
                disabled={!searchText || matchCount === 0}
                title="Replace (Ctrl+Shift+1)"
                aria-label="Replace Next"
              >
                <Replace size={14} />
              </button>
              <button
                className={styles.replaceBtn}
                onClick={handleReplaceAll}
                disabled={!searchText || matchCount === 0}
                title="Replace All (Ctrl+Shift+Enter)"
                aria-label="Replace All"
              >
                <ReplaceAll size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, portalRoot);
};
