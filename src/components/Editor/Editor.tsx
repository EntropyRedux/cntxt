import React, { useEffect, useRef } from 'react';
import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView, keymap, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';

import { markdown } from '@codemirror/lang-markdown';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';
import { resolveCodeLanguage, preloadCommonLanguages } from '../../services/codeLanguages';

import { useTabStore } from '../../store/tabStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getEditorThemeExtension } from '../../themes';
import { slashCommandExtension } from '../../extensions/slashCommands';
import { templateVariablesExtension, variableTabKeymap } from '../../extensions/templateVariables';
import { inlineFormulasExtension } from '../../extensions/inlineFormulas';
import { liveMarkdownExtension } from '../../extensions/liveMarkdown';
import { lineCounterSelectionExtension } from '../../extensions/lineNumberSelection';
import { imageDropPasteExtension } from '../../extensions/imageDropPasteExtension';
import { SupportedLanguage } from '../../types';
import { editorRegistry } from '../../services/editor/editorRegistry';
import { useRuntimeBridge } from '../../adapters';

interface EditorProps {
  tabId: string;
  content: string;
  language: SupportedLanguage;
}

export const Editor: React.FC<EditorProps> = ({ tabId, content, language }) => {
  const bridge = useRuntimeBridge();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const liveMarkdownCompartmentRef = useRef<Compartment>(new Compartment());
  const templateVariablesCompartmentRef = useRef<Compartment>(new Compartment());
  const inlineFormulasCompartmentRef = useRef<Compartment>(new Compartment());
  const guttersCompartmentRef = useRef<Compartment>(new Compartment());
  const updatingFromStoreRef = useRef(false);
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
        preloadCommonLanguages();
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

  useEffect(() => {
    if (!containerRef.current) return;

    const isRenderedMode = (settings.editorMode || 'rendered') === 'rendered';
    const isMarkdownOrText = language === 'markdown' || language === 'text';

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
      settings.enableBracketMatching ? bracketMatching() : [],
      closeBrackets(),
      highlightSelectionMatches(),
      EditorView.lineWrapping,

      // Keymaps
      keymap.of([
        ...variableTabKeymap(),
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
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
      liveMarkdownCompartmentRef.current.of(
        liveMarkdownExtension(isRenderedMode && isMarkdownOrText, bridge)
      ),

      // Custom font size and line height styling
      EditorView.theme({
        '&': {
          fontSize: `${settings.fontSize}px`,
          fontFamily: `${settings.fontFamily} !important`,
          height: '100%'
        },
        '.cm-scroller': {
          fontFamily: `${settings.fontFamily} !important`,
          lineHeight: '1.6',
          padding: '10px 14px'
        },
        '.cm-content': {
          fontFamily: `${settings.fontFamily} !important`,
          minWidth: '0',
          maxWidth: '100%',
          flexGrow: '1'
        },
        '.cm-line': {
          fontFamily: `${settings.fontFamily} !important`
        }
      }),

      // Update listener
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !updatingFromStoreRef.current) {
          const newDoc = update.state.doc.toString();
          updateTabContent(tabId, newDoc);
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
    editorRegistry.register(tabId, view);

    return () => {
      editorRegistry.unregister(tabId);
      view.destroy();
      viewRef.current = null;
      isFirstRenderRef.current = true;
    };
  }, [tabId, language, settings.theme, settings.fontSize, settings.fontFamily]);

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
    const markdownEffect = liveMarkdownCompartmentRef.current.reconfigure(
      liveMarkdownExtension(isRenderedMode && isMarkdownOrText, bridge)
    );
    const guttersEffect = guttersCompartmentRef.current.reconfigure(
      getGuttersExtension(
        isRenderedMode,
        isMarkdownOrText,
        settings.showLineNumbers,
        settings.enableFoldGutter
      )
    );

    const applyEffects = () => {
      if (viewRef.current) {
        viewRef.current.dispatch({ effects: [templateVarEffect, formulasEffect, markdownEffect, guttersEffect] });
      }
    };

    if ((view as any).updating) {
      queueMicrotask(applyEffects);
    } else {
      applyEffects();
    }
  }, [settings.editorMode, language, settings.showLineNumbers, settings.enableFoldGutter]);

  // Keep editor content synchronized with external updates without losing cursor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const syncContent = () => {
      const activeView = viewRef.current;
      if (!activeView) return;
      const currentDoc = activeView.state.doc.toString();
      if (content !== currentDoc) {
        updatingFromStoreRef.current = true;
        activeView.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: content
          }
        });
        updatingFromStoreRef.current = false;
      }
    };

    if ((view as any).updating) {
      queueMicrotask(syncContent);
    } else {
      syncContent();
    }
  }, [content]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--editor-bg)] flex flex-col">
      {/* Main CodeMirror Canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full flex-1 overflow-hidden" 
        style={{ fontFamily: settings.fontFamily }}
      />
    </div>
  );
};
