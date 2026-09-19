import React, { useState, useEffect, useRef } from 'react';
import { EditorState, Extension, Compartment } from '@codemirror/state';
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
import { liveMarkdownExtension, refreshLiveMarkdownEffect } from '../../extensions/liveMarkdown';
import { createMarkdownHighlighting } from '../../themes/markdownHighlighting';
import { useActionStore } from '../../store/actionStore';
import { lineCounterSelectionExtension } from '../../extensions/lineNumberSelection';
import { imageDropPasteExtension } from '../../extensions/imageDropPasteExtension';
import { SupportedLanguage } from '../../types';
import { editorRegistry } from '../../services/editor/editorRegistry';
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

export const Editor: React.FC<EditorProps> = ({ tabId, content, language }) => {
  const bridge = useRuntimeBridge();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<'find' | 'replace'>('find');
  const liveMarkdownCompartmentRef = useRef<Compartment>(new Compartment());
  const markdownHighlightingCompartmentRef = useRef<Compartment>(new Compartment());
  const templateVariablesCompartmentRef = useRef<Compartment>(new Compartment());
  const inlineFormulasCompartmentRef = useRef<Compartment>(new Compartment());
  const guttersCompartmentRef = useRef<Compartment>(new Compartment());
  const bracketMatchingCompartmentRef = useRef<Compartment>(new Compartment());
  const isFirstRenderRef = useRef(true);

  const { updateTabContent, updateTabMetadata } = useTabStore();
  const { settings } = useSettingsStore();

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

  // Build mode-dependent cm-content layout (margins, max-width, padding).
  // These MUST live inside EditorView.theme() because CodeMirror's scoped
  // class names have higher specificity than external CSS selectors.
  const getContentLayoutTheme = (isRendered: boolean, isMdOrText: boolean) => {
    if (isRendered && isMdOrText) {
      // Rendered mode: centered prose container with generous writing margins
      return {
        '.cm-content': {
          maxWidth: '880px',
          margin: '0 auto',
          padding: '24px 32px 120px 32px',
        }
      };
    }
    // Raw mode / code: full-width editor
    return {
      '.cm-content': {
        maxWidth: '100%',
        margin: '0',
        padding: '8px 16px 120px 16px',
      }
    };
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
    const isMarkdownOrText = language === 'markdown' || language === 'text';
    const contentLayout = getContentLayoutTheme(isRenderedMode, isMarkdownOrText);

    // Build extension stack
    const extensions: Extension[] = [
      guttersCompartmentRef.current.of(
        getGuttersExtension(
          isRenderedMode,
          isMarkdownOrText,
          settings.showLineNumbers,
          settings.enableFoldGutter
        )
      ),
      highlightActiveLine(),
      history(),
      indentOnInput(),
      bracketMatchingCompartmentRef.current.of(
        settings.enableBracketMatching ? bracketMatching() : []
      ),
      closeBrackets(),
      search({
        top: true,
        scrollToMatch: (range) => EditorView.scrollIntoView(range, { y: 'center', x: 'nearest' })
      }),
      searchHighlighterExtension(),
      highlightSelectionMatches(),
      EditorView.lineWrapping,

      // Keymaps
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
        ...variableTabKeymap(),
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab
      ]),

      // Language support
      getLanguageExtension(language),

      // Theme
      getEditorThemeExtension(settings.theme),

      // ContextPad Custom Extensions
      slashCommandExtension(),
      templateVariablesCompartmentRef.current.of(
        templateVariablesExtension(isRenderedMode && isMarkdownOrText)
      ),
      inlineFormulasCompartmentRef.current.of(
        inlineFormulasExtension(isRenderedMode && isMarkdownOrText)
      ),
      imageDropPasteExtension(),
      markdownHighlightingCompartmentRef.current.of(
        !isRenderedMode && isMarkdownOrText ? createMarkdownHighlighting(true) : []
      ),
      liveMarkdownCompartmentRef.current.of(
        isRenderedMode && isMarkdownOrText
          ? liveMarkdownExtension(true, bridge, settings.theme || 'contextpad-dark')
          : []
      ),

      // Custom font size, line height and gutter alignment styling
      EditorView.theme({
        '&': {
          fontSize: `${settings.fontSize}px`,
          fontFamily: `${settings.fontFamily} !important`,
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
          fontFamily: `${settings.fontFamily} !important`,
          lineHeight: '1.6',
          height: '100%',
          maxHeight: '100%',
          outline: 'none !important',
          border: 'none !important',
          padding: '0 !important',
        },
        '.cm-content': {
          fontFamily: `${settings.fontFamily} !important`,
          lineHeight: '1.6',
          minWidth: '0',
          flexGrow: '1',
          outline: 'none !important',
          border: 'none !important',
          ...contentLayout['.cm-content'],
        },
        '.cm-line': {
          fontFamily: `${settings.fontFamily} !important`,
          lineHeight: '1.6',
        },
        '.cm-gutters': {
          fontFamily: `${settings.fontFamily} !important`,
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
      }),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newDoc = update.state.doc.toString();
          updateTabContent(tabId, newDoc, false);
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
            // If the selection ends at column 0 of toLine and spans multiple lines,
            // the selection does not include any characters on toLine itself.
            const effectiveEndLine = (mainSel.to === toLine.from && toLine.number > fromLine.number)
              ? toLine.number - 1
              : toLine.number;

            if (effectiveEndLine > fromLine.number) {
              selectionStartLine = fromLine.number;
              selectionEndLine = effectiveEndLine;
            }
          }

          updateTabMetadata(tabId, {
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

    const state = EditorState.create({
      doc: content,
      extensions
    });

    const view = new EditorView({
      state,
      parent: containerRef.current
    });

    viewRef.current = view;
    editorRegistry.registerCommands({ undo, redo, selectAll, indentMore, indentLess });
    editorRegistry.register(tabId, view);

    return () => {
      editorRegistry.unregister(tabId);
      view.destroy();
      viewRef.current = null;
      isFirstRenderRef.current = true;
    };
  }, [tabId, language, settings.theme, settings.fontSize, settings.fontFamily, settings.editorMode]);

  // Dynamically reconfigure live markdown mode and gutters without recreating editor
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const view = viewRef.current;
    if (!view) return;
    const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
    const isMarkdownOrText = language === 'markdown' || language === 'text';

    const templateVarEffect = templateVariablesCompartmentRef.current.reconfigure(
      templateVariablesExtension(isRenderedMode && isMarkdownOrText)
    );
    const formulasEffect = inlineFormulasCompartmentRef.current.reconfigure(
      inlineFormulasExtension(isRenderedMode && isMarkdownOrText)
    );
    const markdownHighlightingEffect = markdownHighlightingCompartmentRef.current.reconfigure(
      !isRenderedMode && isMarkdownOrText ? createMarkdownHighlighting(true) : []
    );
    const markdownEffect = liveMarkdownCompartmentRef.current.reconfigure(
      isRenderedMode && isMarkdownOrText
        ? liveMarkdownExtension(true, bridge, settings.theme || 'contextpad-dark')
        : []
    );
    const guttersEffect = guttersCompartmentRef.current.reconfigure(
      getGuttersExtension(
        isRenderedMode,
        isMarkdownOrText,
        settings.showLineNumbers,
        settings.enableFoldGutter
      )
    );
    const bracketMatchingEffect = bracketMatchingCompartmentRef.current.reconfigure(
      settings.enableBracketMatching ? bracketMatching() : []
    );

    const applyEffects = () => {
      const v = viewRef.current;
      if (!v) return;

      v.dispatch({
        effects: [
          templateVarEffect,
          formulasEffect,
          markdownHighlightingEffect,
          markdownEffect,
          guttersEffect,
          bracketMatchingEffect,
          refreshLiveMarkdownEffect.of()
        ]
      });

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
  }, [settings.editorMode, language, settings.showLineNumbers, settings.enableFoldGutter, settings.theme, settings.enableBracketMatching]);

  // Listen for open-search events from menu, command palette, or global shortcuts
  useEffect(() => {
    const handleOpenSearch = (e: CustomEvent<{ mode?: 'find' | 'replace' }>) => {
      const activeTabId = useTabStore.getState().activeTabId;
      if (activeTabId && activeTabId !== tabId) return;

      setSearchMode(e.detail?.mode || 'find');
      setShowSearch(true);
    };

    window.addEventListener('open-search', handleOpenSearch as EventListener);
    return () => window.removeEventListener('open-search', handleOpenSearch as EventListener);
  }, [tabId]);

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

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--editor-bg)] flex flex-col min-h-0">
      {/* Main CodeMirror Canvas */}
      <div 
        ref={containerRef} 
        className={`w-full h-full flex-1 overflow-hidden min-h-0 ${isRenderedMode && isMarkdownOrText ? 'cm-rendered-canvas' : 'cm-raw-canvas'}`} 
        style={{ fontFamily: settings.fontFamily }}
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
