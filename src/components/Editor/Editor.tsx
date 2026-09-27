import React, { useState, useEffect, useRef } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo, selectAll, indentMore, indentLess } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { search, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap, startCompletion } from '@codemirror/autocomplete';

import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { resolveCodeLanguage } from '../../services/codeLanguages';

import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getEditorThemeExtension } from '../../themes';
import { slashCommandExtension } from '../../extensions/slashCommands';
import { templateVariablesExtension, variableTabKeymap } from '../../extensions/templateVariables';
import { inlineFormulasExtension } from '../../extensions/inlineFormulas';
import { base64FoldExtension } from '../../extensions/base64FoldExtension';
import { liveMarkdownExtension, refreshLiveMarkdownEffect } from '../../extensions/liveMarkdown';
import { createMarkdownHighlighting } from '../../themes/markdownHighlighting';
import { useActionStore } from '../../store/actionStore';
import { lineCounterSelectionExtension } from '../../extensions/lineNumberSelection';
import { imageDropPasteExtension } from '../../extensions/imageDropPasteExtension';
import { SupportedLanguage, ViewSettings, Tab } from '../../types';
import { editorRegistry } from '../../services/editor/editorRegistry';
import {
  languageCompartment,
  themeCompartment,
  fontThemeCompartment,
  base64FoldCompartment,
  templateVariablesCompartment,
  inlineFormulasCompartment,
  markdownHighlightingCompartment,
  liveMarkdownCompartment,
  guttersCompartment,
  bracketMatchingCompartment,
  layoutCompartment,
  wordWrapCompartment
} from '../../services/editor/editorCompartments';
import { editorStateCache } from '../../services/editor/editorStateCache';
import { searchHighlighterExtension } from './searchHighlighter';
import { useRuntimeBridge } from '../../adapters';
import { FloatingSearch } from './FloatingSearch';

interface EditorViewInternal extends EditorView {
  updating?: boolean;
}

interface EditorProps {
  tabId: string;
  content: string;
  language: SupportedLanguage;
}

// Build mode-dependent cm-content layout (margins, max-width, padding).
// These MUST live inside EditorView.theme() because CodeMirror's scoped
// class names have higher specificity than external CSS selectors.
const editorWidthPx: Record<NonNullable<ViewSettings['editorMaxWidth']>, string> = {
  narrow: '680px',
  standard: '880px',
  wide: '1160px',
  full: '100%',
};

const editorPaddingPx: Record<NonNullable<ViewSettings['editorPadding']>, string> = {
  compact: '12px',
  normal: '24px',
  spacious: '36px',
};

const getContentLayoutTheme = (
  isRendered: boolean,
  isMdOrText: boolean,
  wordWrap: boolean,
  editorMaxWidth: ViewSettings['editorMaxWidth'],
  editorPadding: ViewSettings['editorPadding']
) => {
  const hPadding = editorPaddingPx[editorPadding ?? 'normal'];
  if (!isRendered || !isMdOrText) {
    // Raw mode / code / continuous text: full-width editor
    return {
      '.cm-content': {
        maxWidth: '100%',
        margin: '0',
        padding: `8px ${hPadding} 120px ${hPadding}`,
      }
    };
  }
  if (!wordWrap) {
    // Continuous text in rendered mode: promote to full-width column 0 for horizontal scrolling
    return {
      '.cm-content': {
        maxWidth: '100%',
        margin: '0',
        padding: `24px ${hPadding} 120px ${hPadding}`,
      }
    };
  }
  // Rendered mode with wrap: centered prose container with generous writing margins
  return {
    '.cm-content': {
      maxWidth: editorWidthPx[editorMaxWidth ?? 'standard'],
      margin: '0 auto',
      padding: `24px ${hPadding} 120px ${hPadding}`,
    }
  };
};

const getFontThemeExtension = (fontFamily: string, fontSize: number): Extension => {
  return EditorView.theme({
    '&': {
      fontSize: `${fontSize}px`,
      fontFamily: `${fontFamily} !important`,
      height: '100%',
      maxHeight: '100%',
      outline: 'none !important',
      border: 'none !important',
    },
    '&.cm-focused': {
      outline: 'none !important',
      border: 'none !important',
    },
    '.cm-scroller': {
      fontFamily: `${fontFamily} !important`,
      lineHeight: '1.6',
      height: '100%',
      maxHeight: '100%',
      outline: 'none !important',
      border: 'none !important',
      padding: '0 !important',
    },
    '.cm-content': {
      fontFamily: `${fontFamily} !important`,
      lineHeight: '1.6',
      minWidth: '0',
      flexGrow: '1',
      outline: 'none !important',
      border: 'none !important',
    },
    '.cm-line': {
      fontFamily: `${fontFamily} !important`,
      lineHeight: '1.6',
    },
    '.cm-gutters': {
      fontFamily: `${fontFamily} !important`,
      lineHeight: '1.6',
      padding: '0 !important',
      border: 'none !important',
      borderRight: '1px solid var(--border-subtle, rgba(0,0,0,0.1)) !important',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      lineHeight: '1.6 !important',
      fontSize: 'inherit !important',
      padding: '0 8px !important',
    }
  });
};

const getLanguageExtension = (lang: SupportedLanguage): Extension => {
  switch (lang) {
    case 'javascript':
    case 'typescript':
      return javascript({ typescript: true });
    case 'python':
      return python();
    case 'json':
      return json();
    case 'markdown':
    default:
      return markdown({ codeLanguages: resolveCodeLanguage });
  }
};

const getGuttersExtension = (
  isRendered: boolean,
  isMarkdownOrText: boolean,
  showLineNumbers: boolean,
  enableFoldGutter: boolean
): Extension => {
  // In Rendered mode for markdown/text, omit all gutters so the editor area
  // extends fully and occupies the space where line numbers appear in raw mode.
  if (isRendered && isMarkdownOrText) {
    return [];
  }

  const extensions: Extension[] = [];
  if (showLineNumbers) {
    extensions.push(
      lineCounterSelectionExtension(),
      highlightActiveLineGutter()
    );
  }
  if (enableFoldGutter) {
    extensions.push(foldGutter());
  }
  return extensions;
};

const buildEditorExtensions = (
  isRenderedMode: boolean,
  isMarkdownOrText: boolean,
  isLargeDoc: boolean,
  contentLayout: Record<string, Record<string, string>>,
  settings: ViewSettings,
  language: SupportedLanguage,
  bridge: ReturnType<typeof useRuntimeBridge>,
  currentTabIdRef: React.MutableRefObject<string>,
  updateTabContent: (tabId: string, content: string, isExternal?: boolean) => void,
  updateTabMetadata: (tabId: string, updates: Partial<Tab>) => void
): Extension[] => {
  return [
    languageCompartment.of(getLanguageExtension(language)),
    guttersCompartment.of(
      getGuttersExtension(
        isRenderedMode,
        isMarkdownOrText,
        settings.showLineNumbers,
        settings.enableFoldGutter && !isLargeDoc
      )
    ),
    highlightActiveLine(),
    history({ minDepth: 250, newGroupDelay: 300 }),
    indentOnInput(),
    bracketMatchingCompartment.of(
      settings.enableBracketMatching && !isLargeDoc ? bracketMatching() : []
    ),
    closeBrackets(),
    search({
      top: true,
      scrollToMatch: (range) => EditorView.scrollIntoView(range, { y: 'center', x: 'nearest' })
    }),
    searchHighlighterExtension(),
    highlightSelectionMatches(),
    wordWrapCompartment.of(
      settings.wordWrap ? EditorView.lineWrapping : []
    ),
    layoutCompartment.of(EditorView.theme(contentLayout)),
    keymap.of([
      {
        key: 'Ctrl-Space',
        run: (view) => {
          startCompletion(view);
          return true;
        }
      },
      {
        key: 'Mod-Space',
        run: (view) => {
          startCompletion(view);
          return true;
        }
      },
      {
        key: 'Alt-/',
        run: (view) => {
          startCompletion(view);
          return true;
        }
      },
      {
        key: 'Alt-z',
        run: () => {
          useSettingsStore.getState().toggleWordWrap();
          return true;
        }
      },
      {
        key: 'Enter',
        run: (view) => {
          const { typingDirection } = useSettingsStore.getState().settings;
          if (typingDirection === 'bottom-to-up') {
            const { from, to } = view.state.selection.main;
            if (from === to) {
              const line = view.state.doc.lineAt(from);
              if (line.number === 1) {
                view.dispatch({
                  changes: { from: 0, insert: '\n' },
                  selection: { anchor: 0 },
                  scrollIntoView: true
                });
                return true;
              }
            }
          }
          return false;
        }
      },
      ...variableTabKeymap(),
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab
    ]),
    themeCompartment.of(getEditorThemeExtension(settings.theme)),
    slashCommandExtension(),
    templateVariablesCompartment.of(
      templateVariablesExtension(isRenderedMode && isMarkdownOrText)
    ),
    inlineFormulasCompartment.of(
      inlineFormulasExtension(isRenderedMode && isMarkdownOrText)
    ),
    imageDropPasteExtension(),
    base64FoldCompartment.of(
      base64FoldExtension(!isRenderedMode && isMarkdownOrText)
    ),
    markdownHighlightingCompartment.of(
      !isRenderedMode && isMarkdownOrText ? createMarkdownHighlighting(true) : []
    ),
    liveMarkdownCompartment.of(
      isRenderedMode && isMarkdownOrText
        ? liveMarkdownExtension(true, bridge, settings.theme || 'contextpad-dark')
        : []
    ),
    fontThemeCompartment.of(
      getFontThemeExtension(settings.fontFamily, settings.fontSize)
    ),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && update.transactions.length > 0) {
        const newDoc = update.state.doc.toString();
        updateTabContent(currentTabIdRef.current, newDoc, false);
      }

      if (update.selectionSet || update.docChanged) {
        const mainSel = update.state.selection.main;
        const pos = mainSel.head;
        const line = update.state.doc.lineAt(pos);

        let selectionStartLine: number | null = null;
        let selectionEndLine: number | null = null;

        if (mainSel.from !== mainSel.to) {
          const fromLine = update.state.doc.lineAt(mainSel.from);
          const toLine = update.state.doc.lineAt(mainSel.to);
          const effectiveEndLine = (mainSel.to === toLine.from && toLine.number > fromLine.number)
            ? toLine.number - 1
            : toLine.number;

          if (effectiveEndLine > fromLine.number) {
            selectionStartLine = fromLine.number;
            selectionEndLine = effectiveEndLine;
          }
        }

        updateTabMetadata(currentTabIdRef.current, {
          cursorLine: line.number,
          cursorCol: pos - line.from + 1,
          cursorOffset: pos,
          selectionFrom: mainSel.from,
          selectionTo: mainSel.to,
          selectionStartLine,
          selectionEndLine
        });
      }
    })
  ];
};

const buildReconfigureEffects = (
  view: EditorView,
  lang: SupportedLanguage,
  currentSettings: ViewSettings,
  bridge: ReturnType<typeof useRuntimeBridge>
) => {
  const isRenderedMode = (currentSettings.editorMode || 'rendered') === 'rendered';
  const isMarkdownOrText = lang === 'markdown' || lang === 'text';
  const isLargeDoc = (view.state.doc.lines || 0) > (currentSettings.largeFileThreshold || 5000);
  const contentLayout = getContentLayoutTheme(
    isRenderedMode,
    isMarkdownOrText,
    currentSettings.wordWrap,
    currentSettings.editorMaxWidth,
    currentSettings.editorPadding
  );

  return [
    languageCompartment.reconfigure(getLanguageExtension(lang)),
    themeCompartment.reconfigure(getEditorThemeExtension(currentSettings.theme)),
    fontThemeCompartment.reconfigure(
      getFontThemeExtension(currentSettings.fontFamily, currentSettings.fontSize)
    ),
    base64FoldCompartment.reconfigure(
      base64FoldExtension(!isRenderedMode && isMarkdownOrText)
    ),
    templateVariablesCompartment.reconfigure(
      templateVariablesExtension(isRenderedMode && isMarkdownOrText)
    ),
    inlineFormulasCompartment.reconfigure(
      inlineFormulasExtension(isRenderedMode && isMarkdownOrText)
    ),
    markdownHighlightingCompartment.reconfigure(
      !isRenderedMode && isMarkdownOrText ? createMarkdownHighlighting(true) : []
    ),
    liveMarkdownCompartment.reconfigure(
      isRenderedMode && isMarkdownOrText
        ? liveMarkdownExtension(true, bridge, currentSettings.theme || 'contextpad-dark')
        : []
    ),
    guttersCompartment.reconfigure(
      getGuttersExtension(
        isRenderedMode,
        isMarkdownOrText,
        currentSettings.showLineNumbers,
        currentSettings.enableFoldGutter && !isLargeDoc
      )
    ),
    bracketMatchingCompartment.reconfigure(
      currentSettings.enableBracketMatching && !isLargeDoc ? bracketMatching() : []
    ),
    layoutCompartment.reconfigure(EditorView.theme(contentLayout)),
    wordWrapCompartment.reconfigure(
      currentSettings.wordWrap ? EditorView.lineWrapping : []
    ),
    refreshLiveMarkdownEffect.of()
  ];
};

export const Editor: React.FC<EditorProps> = ({ tabId, content, language }) => {
  const bridge = useRuntimeBridge();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<'find' | 'replace'>('find');

  const { updateTabContent, updateTabMetadata } = useTabStore();
  const { settings } = useSettingsStore();

  const currentTabIdRef = useRef<string>(tabId);
  const currentLanguageRef = useRef<SupportedLanguage>(language);

  // Initialize persistent EditorView once on mount, and tear down on unmount
  useEffect(() => {
    if (!containerRef.current) return;

    let initialState: EditorState;
    let initialScrollTop = 0;
    let initialScrollLeft = 0;

    if (editorStateCache.hasTabState(tabId)) {
      const cached = editorStateCache.getTabState(tabId)!;
      initialState = cached.state;
      if (initialState.doc.toString() !== content) {
        initialState = initialState.update({
          changes: { from: 0, to: initialState.doc.length, insert: content }
        }).state;
      }
      initialScrollTop = cached.scrollTop;
      initialScrollLeft = cached.scrollLeft;
    } else {
      const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
      const isMarkdownOrText = language === 'markdown' || language === 'text';
      const isLargeDoc = content.length > 100_000 || content.split('\n').length > (settings.largeFileThreshold || 5000);
      const contentLayout = getContentLayoutTheme(
        isRenderedMode,
        isMarkdownOrText,
        settings.wordWrap,
        settings.editorMaxWidth,
        settings.editorPadding
      );

      initialState = EditorState.create({
        doc: content,
        extensions: buildEditorExtensions(
          isRenderedMode,
          isMarkdownOrText,
          isLargeDoc,
          contentLayout,
          settings,
          language,
          bridge,
          currentTabIdRef,
          updateTabContent,
          updateTabMetadata
        )
      });
    }

    const view = new EditorView({
      state: initialState,
      parent: containerRef.current
    });

    viewRef.current = view;
    currentTabIdRef.current = tabId;
    currentLanguageRef.current = language;

    if (initialScrollTop > 0 || initialScrollLeft > 0) {
      view.scrollDOM.scrollTop = initialScrollTop;
      view.scrollDOM.scrollLeft = initialScrollLeft;
    }

    // Check large document threshold (>100KB) and offer section selection
    if (content.length > 100_000 && !editorStateCache.hasTabState(tabId)) {
      const activeTab = useTabStore.getState().tabs.find(t => t.id === tabId);
      const title = activeTab?.title || 'Document';
      // Only open if headings exist to choose from
      if (/^(#{1,6})\s+/m.test(content)) {
        import('../../store/largeDocModalStore').then(({ useLargeDocModalStore }) => {
          useLargeDocModalStore.getState().openLargeDocModal(tabId, title, content);
        });
      }
    }

    editorRegistry.registerCommands({ undo, redo, selectAll, indentMore, indentLess });
    editorRegistry.register(tabId, view);

    return () => {
      const activeView = viewRef.current;
      const activeTabId = currentTabIdRef.current;
      if (activeView && activeTabId) {
        editorStateCache.saveTabState(
          activeTabId,
          activeView.state,
          activeView.scrollDOM.scrollTop,
          activeView.scrollDOM.scrollLeft,
          currentLanguageRef.current
        );
        editorRegistry.unregister(activeTabId);
      }
      activeView?.destroy();
      viewRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seamless tab switching & language reconfiguration without destroying EditorView
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (currentTabIdRef.current !== tabId) {
      const prevTabId = currentTabIdRef.current;
      if (prevTabId) {
        editorStateCache.saveTabState(
          prevTabId,
          view.state,
          view.scrollDOM.scrollTop,
          view.scrollDOM.scrollLeft,
          currentLanguageRef.current
        );
        editorRegistry.unregister(prevTabId);
      }

      currentTabIdRef.current = tabId;
      currentLanguageRef.current = language;

      let targetState: EditorState;
      let targetScrollTop = 0;
      let targetScrollLeft = 0;

      if (editorStateCache.hasTabState(tabId)) {
        const cached = editorStateCache.getTabState(tabId)!;
        targetState = cached.state;
        if (targetState.doc.toString() !== content) {
          targetState = targetState.update({
            changes: { from: 0, to: targetState.doc.length, insert: content }
          }).state;
        }
        targetScrollTop = cached.scrollTop;
        targetScrollLeft = cached.scrollLeft;
      } else {
        const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
        const isMarkdownOrText = language === 'markdown' || language === 'text';
        const isLargeDoc = content.length > 100_000 || content.split('\n').length > (settings.largeFileThreshold || 5000);
        const contentLayout = getContentLayoutTheme(
          isRenderedMode,
          isMarkdownOrText,
          settings.wordWrap,
          settings.editorMaxWidth,
          settings.editorPadding
        );

        targetState = EditorState.create({
          doc: content,
          extensions: buildEditorExtensions(
            isRenderedMode,
            isMarkdownOrText,
            isLargeDoc,
            contentLayout,
            settings,
            language,
            bridge,
            currentTabIdRef,
            updateTabContent,
            updateTabMetadata
          )
        });
      }

      view.setState(targetState);
      editorRegistry.register(tabId, view);

      // Reconfigure dynamic settings compartments for incoming state & language
      const effects = buildReconfigureEffects(view, language, settings, bridge);
      view.dispatch({ effects });
      view.requestMeasure();

      // Restore scroll position
      view.scrollDOM.scrollTop = targetScrollTop;
      view.scrollDOM.scrollLeft = targetScrollLeft;
      requestAnimationFrame(() => {
        if (viewRef.current && currentTabIdRef.current === tabId) {
          viewRef.current.scrollDOM.scrollTop = targetScrollTop;
          viewRef.current.scrollDOM.scrollLeft = targetScrollLeft;
        }
      });
    } else if (currentLanguageRef.current !== language) {
      currentLanguageRef.current = language;
      view.dispatch({
        effects: [languageCompartment.reconfigure(getLanguageExtension(language))]
      });
      view.requestMeasure();
    }
  }, [tabId, language, content, settings, bridge, updateTabContent, updateTabMetadata]);

  // Dynamically reconfigure live markdown mode, theme, typography and gutters when settings change
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const effects = buildReconfigureEffects(view, currentLanguageRef.current, settings, bridge);

    const applyEffects = () => {
      const v = viewRef.current;
      if (!v) return;

      v.dispatch({ effects });

      // CRITICAL: Force CodeMirror to recalculate its internal height map.
      // When switching between Rendered mode (which has block widgets that expand
      // virtual document height) and Raw mode (zero widgets), the stale cached
      // line heights from the widget era create phantom blank space.
      // requestMeasure() forces a fresh viewport measurement cycle.
      v.requestMeasure();

      // Scroll cursor into view after mode switch to prevent user disorientation
      const cursorPos = v.state.selection.main.head;
      v.dispatch({
        effects: EditorView.scrollIntoView(cursorPos, { y: 'center' })
      });
    };

    if ((view as EditorViewInternal).updating) {
      queueMicrotask(applyEffects);
    } else {
      applyEffects();
    }
  }, [
    settings.editorMode,
    settings.showLineNumbers,
    settings.enableFoldGutter,
    settings.theme,
    settings.fontSize,
    settings.fontFamily,
    settings.enableBracketMatching,
    settings.wordWrap,
    settings.editorMaxWidth,
    settings.editorPadding,
    settings.largeFileThreshold,
    bridge
  ]);

  // Listen for open-search events from menu, command palette, or global shortcuts
  useEffect(() => {
    const handleOpenSearch = (e: CustomEvent<{ mode?: 'find' | 'replace' }>) => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId && activeTabId !== currentTabIdRef.current) return;

      setSearchMode(e.detail?.mode || 'find');
      setShowSearch(true);
    };

    window.addEventListener('open-search', handleOpenSearch as EventListener);
    return () => window.removeEventListener('open-search', handleOpenSearch as EventListener);
  }, []);

  // Refresh live rendered markdown widgets when action store actions change
  useEffect(() => {
    const unsub = useActionStore.subscribe((state, prevState) => {
      if (state.actions !== prevState.actions && viewRef.current) {
        viewRef.current.dispatch({ effects: [refreshLiveMarkdownEffect.of()] });
      }
    });
    return unsub;
  }, []);

  const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
  const isMarkdownOrText = language === 'markdown' || language === 'text';

  const activeMaxWidth = !settings.wordWrap || !isRenderedMode || !isMarkdownOrText
    ? '100%'
    : editorWidthPx[settings.editorMaxWidth ?? 'standard'];
  const activePadding = editorPaddingPx[settings.editorPadding ?? 'normal'];

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--editor-bg)] flex flex-col min-h-0">
      {/* Main CodeMirror Canvas */}
      <div 
        ref={containerRef} 
        className={`w-full h-full flex-1 overflow-hidden min-h-0 ${isRenderedMode && isMarkdownOrText ? 'cm-rendered-canvas' : 'cm-raw-canvas'} ${!settings.wordWrap ? 'cm-wrap-off' : ''}`} 
        style={{ 
          fontFamily: settings.fontFamily,
          '--editor-max-width': activeMaxWidth,
          '--editor-padding-x': activePadding,
        } as React.CSSProperties}
      />
      {showSearch && viewRef.current && (
        <FloatingSearch
          view={viewRef.current}
          mode={searchMode}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
};
